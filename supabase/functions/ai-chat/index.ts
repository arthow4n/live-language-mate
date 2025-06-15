
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { 
      message, 
      messageType, 
      conversationHistory = [],
      chatMatePrompt,
      editorMatePrompt,
      targetLanguage = 'swedish',
      model = 'anthropic/claude-3-5-sonnet',
      apiKey,
      chatMateBackground,
      editorMateExpertise,
      feedbackStyle,
      culturalContext,
      progressiveComplexity
    } = await req.json();

    console.log('AI Chat request:', {
      messageType,
      targetLanguage,
      model,
      historyLength: conversationHistory.length
    });

    // Use provided API key or fall back to environment variable
    const openrouterApiKey = apiKey || Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Build system prompt based on message type
    let systemPrompt = '';
    
    if (messageType === 'chat-mate-response') {
      systemPrompt = `${chatMatePrompt}

Target Language: ${targetLanguage}
Background: ${chatMateBackground || 'N/A'}

Cultural Context: ${culturalContext ? 'Include cultural context and local customs in your responses.' : 'Focus on language without extensive cultural context.'}
Progressive Complexity: ${progressiveComplexity ? 'Gradually increase language complexity as the conversation develops.' : 'Maintain consistent language complexity.'}

You are having a natural conversation. Respond as a native speaker would, using appropriate colloquialisms and cultural references. Do not mention that you are an AI or language learning assistant.`;
    } else if (messageType === 'editor-mate-user-comment') {
      systemPrompt = `${editorMatePrompt}

Target Language: ${targetLanguage}
Expertise: ${editorMateExpertise || 'N/A'}
Feedback Style: ${feedbackStyle || 'encouraging'}

Provide helpful corrections and suggestions for the user's ${targetLanguage} text. ${culturalContext ? 'Include cultural context when relevant.' : ''} Be ${feedbackStyle} in your feedback approach.`;
    } else if (messageType === 'editor-mate-chatmate-comment') {
      systemPrompt = `${editorMatePrompt}

Target Language: ${targetLanguage}
Expertise: ${editorMateExpertise || 'N/A'}

Review the Chat Mate's response and provide an example of how the user could reply, as if you were the user responding to Chat Mate. Also identify any language mistakes in Chat Mate's message if there are any, but if the message is correct, focus only on providing a good example response.`;
    }

    // Prepare messages for OpenRouter
    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ];

    console.log(`Sending request to OpenRouter for ${messageType.split('-')[0]} using model: ${model}`);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://lovable.dev',
        'X-Title': 'Language Mate'
      },
      body: JSON.stringify({
        model: model,
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`);
    }

    const data = await response.json();
    
    if (!data.choices || !data.choices[0] || !data.choices[0].message) {
      console.error('Invalid OpenRouter response:', data);
      throw new Error('Invalid response from OpenRouter API');
    }

    const aiResponse = data.choices[0].message.content;
    console.log(`OpenRouter response received for ${messageType.split('-')[0]} using model: ${model}`);

    return new Response(JSON.stringify({ response: aiResponse }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
