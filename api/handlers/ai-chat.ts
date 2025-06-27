import {
  aiChatRequestSchema,
  type AiChatRequest,
  type AiChatStreamResponse,
  openRouterNonStreamingResponseSchema,
  openRouterStreamingResponseSchema,
} from '../../src/schemas/api.ts';
import { validateApiRequest } from '../../src/utils/validation.ts';
import { systemPrompts } from '../../src/services/prompts/templates/systemPrompts.ts';

export async function aiChatHandler(req: Request): Promise<Response> {
  try {
    // Strict validation with no defaults - BREAKING CHANGE
    const requestData = (await validateApiRequest(
      req,
      aiChatRequestSchema
    )) as AiChatRequest;

    const {
      message,
      multimodalMessage,
      conversationHistory,
      systemPrompt,
      model: originalModel,
      apiKey,
      streaming,
      currentDateTime,
      userTimezone,
      enableReasoning,
    } = requestData;

    const model = originalModel.replace(/:thinking$/, '');

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

    // System prompt is always provided by the new prompt system
    if (!systemPrompt) {
      throw new Error('System prompt is required but not provided');
    }

    const finalSystemPrompt = systemPrompt;

    const messages = [
      // Conversation history is less likely to change, put it at the beginning to improve implicit caching.
      ...conversationHistory,
      // System prompt is different depending on the character.
      { role: 'system', content: finalSystemPrompt },
      // Some jailbreak prompts to reduce strange behaviours.
      {
        role: 'system',
        content: systemPrompts.jailbreakPrevention.content,
      },
    ];

    // Dynamic content should go to the end of context to improve implicit caching.
    if (dateTimeContext) {
      messages.push({ role: 'system', content: dateTimeContext });
    }

    // Use multimodal content if available, otherwise fall back to simple text message
    if (multimodalMessage && multimodalMessage.length > 0) {
      messages.push({ role: 'user', content: multimodalMessage as any });
    } else {
      messages.push({ role: 'user', content: message });
    }

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
                const rawData: unknown = JSON.parse(line.slice(6));
                const parseResult =
                  openRouterStreamingResponseSchema.parse(rawData);
                const delta = parseResult.choices?.[0]?.delta;

                if (delta?.content) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'content',
                        content: delta.content,
                      } satisfies AiChatStreamResponse)}\n\n`
                    )
                  );
                }

                if (delta?.reasoning) {
                  controller.enqueue(
                    new TextEncoder().encode(
                      `data: ${JSON.stringify({
                        type: 'reasoning',
                        content: delta.reasoning,
                      } satisfies AiChatStreamResponse)}\n\n`
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
                  } satisfies AiChatStreamResponse)}\n\n`
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
      const rawData: unknown = await response.json();
      const data = openRouterNonStreamingResponseSchema.parse(rawData);
      const message = data.choices[0].message;
      const aiResponse = message.content;

      const reasoning = message.reasoning ? message.reasoning : undefined;

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
