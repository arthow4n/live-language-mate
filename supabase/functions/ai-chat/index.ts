
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.50.0';

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
    const { message, messageType, conversationHistory, chatMatePrompt, editorMatePrompt, targetLanguage = 'Swedish' } = await req.json();
    
    console.log('AI Chat request:', { messageType, targetLanguage, historyLength: conversationHistory?.length });

    const openrouterApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    let systemPrompt = '';
    let responseType = '';

    if (messageType === 'chat-mate-response') {
      systemPrompt = `You are Chat Mate, a native speaker of ${targetLanguage} and a local from the country. ${chatMatePrompt || ''}

Key instructions:
- You are unaware that the user is learning your language - treat them as a fully integrated local
- Respond naturally in ${targetLanguage} as if chatting with a friend
- You cannot see any comments from Editor Mate - only respond to the user's messages
- Keep conversations natural and culturally appropriate
- Use everyday expressions and vocabulary
- Be friendly and engaging

Always respond only in ${targetLanguage}.`;
      responseType = 'chat-mate';

    } else if (messageType === 'editor-mate-user-comment') {
      systemPrompt = `You are Editor Mate, an experienced ${targetLanguage} teacher observing the conversation. ${editorMatePrompt || ''}

Instructions for commenting on USER messages:
- If the message has language mistakes: Point out grammar errors, wrong word choices, and suggest corrections with examples
- If the message is in a different language: Provide a ${targetLanguage} translation considering the chat context
- If the message is well-written in ${targetLanguage}: Simply respond with 👍
- Be constructive and educational
- Keep comments concise but helpful
- Always respond in ${targetLanguage}

Comment on this user message in the context of their conversation. Respond only in ${targetLanguage}.`;
      responseType = 'editor-mate';

    } else if (messageType === 'editor-mate-chatmate-comment') {
      systemPrompt = `You are Editor Mate, an experienced ${targetLanguage} teacher observing the conversation. ${editorMatePrompt || ''}

Instructions for commenting on CHAT MATE messages:
- Check for any language mistakes or unnatural expressions
- If mistakes found: Point out issues and suggest improvements
- If well-written: Simply respond with 👍
- Focus on teaching opportunities for the user
- Keep comments brief and educational
- Always respond in ${targetLanguage}

Comment on Chat Mate's response to help the user learn. Respond only in ${targetLanguage}.`;
      responseType = 'editor-mate';

    } else {
      throw new Error('Invalid message type');
    }

    // Prepare messages for OpenRouter
    const messages = [
      { role: 'system', content: systemPrompt },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenRouter for', responseType);

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://your-app-domain.com',
        'X-Title': 'Language Mate',
      },
      body: JSON.stringify({
        model: 'anthropic/claude-3.5-sonnet',
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error('OpenRouter API error:', response.status, errorText);
      throw new Error(`OpenRouter API error: ${response.status}`);
    }

    const data = await response.json();
    console.log('OpenRouter response received for', responseType);

    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
      responseType: responseType,
      usage: data.usage 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error in ai-chat function:', error);
    return new Response(JSON.stringify({ 
      error: error.message || 'Internal server error' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
