
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
    const { message, aiMode, conversationHistory } = await req.json();
    
    console.log('AI Chat request:', { message, aiMode, historyLength: conversationHistory?.length });

    const openrouterApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Create system prompts based on AI mode
    const systemPrompts = {
      'chat-mate': `You are Chat Mate, a friendly Swedish conversation partner. Your role is to:
- Have natural, engaging conversations in Swedish
- Gently correct mistakes in a supportive way
- Provide cultural context when relevant
- Keep conversations flowing naturally
- Use everyday Swedish expressions and vocabulary
- Be encouraging and patient with language learners
- Respond primarily in Swedish, but explain difficult concepts in English when needed

Always maintain a warm, friendly tone as if chatting with a good friend who's learning Swedish.`,

      'editor-mate': `You are Editor Mate, a professional Swedish language teacher and editor. Your role is to:
- Provide detailed feedback on Swedish text submissions
- Highlight grammatical errors and suggest corrections
- Explain grammar rules and language patterns
- Suggest more natural or sophisticated expressions
- Point out cultural nuances in language use
- Provide structured, educational feedback
- Use both Swedish and English for explanations

Format your feedback clearly with corrections, explanations, and suggestions for improvement.`
    };

    // Prepare messages for OpenRouter
    const messages = [
      { role: 'system', content: systemPrompts[aiMode] || systemPrompts['chat-mate'] },
      ...(conversationHistory || []),
      { role: 'user', content: message }
    ];

    console.log('Sending request to OpenRouter with', messages.length, 'messages');

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
    console.log('OpenRouter response received');

    const aiResponse = data.choices[0]?.message?.content;
    if (!aiResponse) {
      throw new Error('No response from AI model');
    }

    return new Response(JSON.stringify({ 
      response: aiResponse,
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
