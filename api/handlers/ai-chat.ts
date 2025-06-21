import { aiChatRequestSchema } from '../../src/schemas/api.ts';
import { validateApiRequest } from '../../src/utils/validation.ts';

export async function aiChatHandler(req: Request): Promise<Response> {
  try {
    // Strict validation with no defaults - BREAKING CHANGE
    const requestData = await validateApiRequest(req, aiChatRequestSchema);

    const {
      message,
      messageType,
      conversationHistory,
      systemPrompt,
      chatMatePrompt,
      editorMatePrompt,
      targetLanguage,
      model: originalModel,
      apiKey,
      chatMateBackground,
      editorMateExpertise,
      feedbackStyle,
      culturalContext,
      progressiveComplexity,
      streaming,
      currentDateTime,
      userTimezone,
      enableReasoning,
    } = requestData;

    const model = (originalModel as string).replace(/:thinking$/, '');

    const openRouterApiKey = apiKey?.trim()
      ? apiKey.trim()
      : (Deno.env.get('OPENAI_API_KEY') ?? '');

    if (!openRouterApiKey) {
      throw new Error(
        'No API key provided. Please set your OpenRouter API key in the settings.'
      );
    }

    const dateTimeContext =
      currentDateTime && userTimezone
        ? `Current date and time: ${currentDateTime} (${userTimezone})`
        : '';

    let finalSystemPrompt = '';

    // Use pre-built system prompt if provided, otherwise build dynamically (legacy support)
    if (systemPrompt) {
      finalSystemPrompt = systemPrompt;
    } else {
      const editorMateChatMateCommentScenarioContext = `In the conversation history, there are three people:
- the [user], who is talking with [chat-mate].
- [chat-mate], which is the person talking with the user.
- [editor-mate], which is you.
`;
      const editorMateUserCommentScenarioContext = `${editorMateChatMateCommentScenarioContext} Since the [user] is talking with [chat-mate], you should not reply to the [user] like [chat-mate] would do. Even if the [user] is writing a question, you should not answer the question or engage in the conversation, as answering question and engaging in the conversation are for [chat-mate] instead of you.
`;

      if (messageType === 'chat-mate-response') {
        finalSystemPrompt = `You are [chat-mate], a friendly native speaker of ${targetLanguage} talking with [user]. ${chatMatePrompt} 

Background: ${chatMateBackground}
        
You respond naturally in ${targetLanguage}, treating the conversation as if speaking with a local friend. You assume the user is already part of the community and don't focus on language learning explicitly - just have a natural conversation.

${
  culturalContext
    ? `Include cultural context and local references when relevant to make the conversation authentic.`
    : ''
}
${
  progressiveComplexity
    ? `Gradually increase complexity based on the user's demonstrated language level.`
    : ''
}

Do not begin your response with "[chat-mate]: ", just respond as if you are [chat-mate].
`;
      } else if (messageType === 'editor-mate-response') {
        // For Editor Mate chat panel
        finalSystemPrompt = `You are [editor-mate], an experienced ${targetLanguage} language teacher. The [user] is your student. ${editorMatePrompt}

Expertise: ${editorMateExpertise}
Feedback style: ${feedbackStyle}

${
  culturalContext
    ? `Include cultural context in your feedback when relevant.`
    : ''
}

Keep your feedback ${feedbackStyle} and encouraging.

Do not begin your response with "[editor-mate]: ", just respond as if you are [editor-mate].
Respond only in the following format inside the format tag, replacing the {{}} content.
<format>
{{
Review the [user]'s last message and provide constructive feedback. If the message is well-written, just give a thumbs up 👍. If there are improvements to suggest, provide:
1. Corrections for any grammatical errors
2. Better word choices if applicable  
3. More natural expressions
4. Cultural context if relevant
}}
</format>
`;
      } else if (messageType === 'editor-mate-user-comment') {
        finalSystemPrompt = `You are [editor-mate], an experienced ${targetLanguage} language teacher. The [user] is your student. ${editorMatePrompt} 

Expertise: ${editorMateExpertise}
Feedback style: ${feedbackStyle}

${
  culturalContext
    ? `Include cultural context in your feedback when relevant.`
    : ''
}

Keep your feedback ${feedbackStyle} and encouraging.

${editorMateUserCommentScenarioContext}

Do not begin your response with "[editor-mate]: ", just respond as if you are [editor-mate].
Respond only in the following format inside the format tag, replacing the {{}} content.
<format>
{{
Review the [user]'s last message and provide constructive feedback as a proofreader and don't engage in the conversation with [user] or [chat-mate].
If the message is well-written, just give a thumbs up 👍. If there are improvements to suggest, provide:
1. Corrections for any grammatical errors
2. Better word choices if applicable  
3. More natural expressions
4. Cultural context if relevant
}}
</format>
`;
      } else if (messageType === 'editor-mate-chatmate-comment') {
        finalSystemPrompt = `You are [editor-mate], an experienced ${targetLanguage} language teacher helping a student understand a response from a native speaker. The [user] is your student.

Keep responses natural and conversational.

${editorMateChatMateCommentScenarioContext}

Do not begin your response with "[editor-mate]: " or "[user]: ".
Respond only in the following format inside the format tag, replacing the {{}} content.
<format>
{{As if you were the [user], provide a natural response to the [chat-mate]'s last message in ${targetLanguage}.}}

Language notes:

{{As [editor-mate], add helpful language notes about the [chat-mate]'s last message, especially when there are interesting expressions, cultural references worth explaining, or words and expression which might be hard to understand for the [user].}}
</format>
`;
      }
    }

    const messages = [
      // Conversation history is less likely to change, put it at the beginning to improve implicit caching.
      ...conversationHistory,
      // System prompt is different depending on the character.
      { role: 'system', content: finalSystemPrompt },
      // Some jailbreak prompts to reduce strange behaviours.
      {
        role: 'system',
        content:
          'In your response, you should not repeat the conversation history.',
      },
    ];

    // Dynamic content should go to the end of context to improve implicit caching.
    if (dateTimeContext) {
      messages.push({ role: 'system', content: dateTimeContext });
    }
    messages.push({ role: 'user', content: message });

    const payload: Record<string, unknown> = {
      model,
      messages,
      stream: streaming,
      temperature: 0.7,
      max_tokens: 2048,
    };

    if (enableReasoning) {
      payload.reasoning = {
        max_tokens: 2000,
      };
      payload.max_tokens = 4096;
    }

    const response = await fetch(
      'https://openrouter.ai/api/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${openRouterApiKey}`,
          'Content-Type': 'application/json',
          'HTTP-Referer': 'https://expat-language-mate.lovable.app',
          'X-Title': 'Live Language Mate',
        },
        body: JSON.stringify(payload),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();
      // deno-lint-ignore no-console -- error log
      console.error('❌ OpenRouter API error:', response.status, errorText);
      throw new Error(
        `OpenRouter API error: ${response.status} - ${errorText}`
      );
    }

    if (streaming) {
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const decoder = new TextDecoder();
          const text = decoder.decode(chunk);

          const lines = text.split('\n');
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6));
                const delta = data.choices?.[0]?.delta;

                if (delta?.content) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'content',
                        content: delta.content,
                      })}\n\n`
                    )
                  );
                }

                if (delta?.reasoning) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'reasoning',
                        content: delta.reasoning,
                      })}\n\n`
                    )
                  );
                }
              } catch (e) {
                // deno-lint-ignore no-console -- error log
                console.error('Error parsing stream chunk:', e, 'line:', line);
              }
            } else if (line.trim() === 'data: [DONE]') {
              controller.enqueue(
                new TextEncoder().encode(
                  `data: ${JSON.stringify({
                    type: 'done',
                  })}\n\n`
                )
              );
              return;
            }
          }
        },
      });

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          Connection: 'keep-alive',
        },
      });
    } else {
      const data = await response.json();
      const message = data.choices[0].message;
      const aiResponse = message.content;

      const reasoning = message.reasoning || undefined;

      // Validate response before sending - strict validation
      const responseData = {
        response: aiResponse || '',
        reasoning,
      };

      return new Response(JSON.stringify(responseData), {
        headers: { 'Content-Type': 'application/json' },
      });
    }
  } catch (error) {
    // deno-lint-ignore no-console -- error log
    console.error('❌ Error in AI chat function:', error);

    // Determine status code based on error type
    const isValidationError =
      error instanceof Error && error.message.includes('Invalid API request');
    const status = isValidationError ? 400 : 500;

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : 'An error occurred while processing your request',
      }),
      {
        status,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
