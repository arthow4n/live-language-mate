
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
    const { 
      message, 
      messageType, 
      conversationHistory, 
      chatMatePrompt, 
      editorMatePrompt, 
      targetLanguage = 'Swedish',
      // New advanced settings
      chatMateBackground = 'young professional, loves local culture',
      editorMateExpertise = '10+ years teaching experience',
      feedbackStyle = 'encouraging',
      culturalContext = true,
      progressiveComplexity = true
    } = await req.json();
    
    console.log('AI Chat request:', { messageType, targetLanguage, historyLength: conversationHistory?.length });

    const openrouterApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    // Get current date and time
    const now = new Date();
    const currentDateTime = now.toISOString();
    const currentDate = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const currentTime = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      timeZoneName: 'short'
    });

    // Helper function to get country and nationality from language
    const getCountryInfo = (lang: string) => {
      const countryMap: { [key: string]: { country: string, nationality: string, culture: string } } = {
        'Swedish': { country: 'Sweden', nationality: 'Swedish', culture: 'Scandinavian' },
        'English': { country: 'an English-speaking country', nationality: 'local', culture: 'English-speaking' },
        'German': { country: 'Germany', nationality: 'German', culture: 'German' },
        'French': { country: 'France', nationality: 'French', culture: 'French' },
        'Spanish': { country: 'Spain', nationality: 'Spanish', culture: 'Spanish' },
        'Italian': { country: 'Italy', nationality: 'Italian', culture: 'Italian' },
        'Portuguese': { country: 'Portugal', nationality: 'Portuguese', culture: 'Portuguese' },
        'Dutch': { country: 'the Netherlands', nationality: 'Dutch', culture: 'Dutch' },
        'Norwegian': { country: 'Norway', nationality: 'Norwegian', culture: 'Scandinavian' },
        'Danish': { country: 'Denmark', nationality: 'Danish', culture: 'Scandinavian' }
      };
      return countryMap[lang] || { country: 'the country', nationality: 'local', culture: 'local' };
    };

    const { country, nationality, culture } = getCountryInfo(targetLanguage);

    // Helper function to get feedback style instructions
    const getFeedbackStyleInstructions = (style: string) => {
      const styleMap: { [key: string]: string } = {
        'gentle': 'Be very gentle and patient. Frame corrections as suggestions and always encourage the learner. Use soft language like "you might consider" or "another way to say this could be".',
        'encouraging': 'Be positive and encouraging. Celebrate improvements and frame corrections as learning opportunities. Use phrases like "great effort" and "you\'re improving".',
        'direct': 'Be clear and direct in your corrections. Point out mistakes clearly but constructively. Focus on accuracy and precision.',
        'detailed': 'Provide comprehensive explanations. Include grammar rules, examples, and context. Explain why something is correct or incorrect.'
      };
      return styleMap[style] || styleMap['encouraging'];
    };

    let systemPrompt = '';
    let responseType = '';

    if (messageType === 'chat-mate-response') {
      systemPrompt = `You are Chat Mate, a ${nationality} native speaker and local resident from ${country}. 

CURRENT DATE & TIME:
Today is ${currentDate} and the current time is ${currentTime}. Use this information to provide contextually relevant responses about current events, time-sensitive topics, holidays, seasons, and daily activities.

PERSONALITY & BACKGROUND:
${chatMatePrompt}
Background details: ${chatMateBackground}

CORE INSTRUCTIONS:
- You are completely unaware that the user is learning ${targetLanguage} - treat them as a fully integrated local who speaks ${targetLanguage} fluently
- CRITICAL: No matter what language the user writes in, always interpret their message as if it were perfectly written in ${targetLanguage} and respond accordingly
- Never comment on their language usage, ask them to speak ${targetLanguage}, or acknowledge any language barriers
- You cannot see any comments from Editor Mate - only respond to the user's direct messages
- Respond naturally in ${targetLanguage} as if chatting with a close friend or colleague
- Use colloquial expressions, local slang, and everyday vocabulary that natives use
- Share personal anecdotes, local experiences, and cultural insights naturally in conversation

${culturalContext ? `CULTURAL INTEGRATION:
- Naturally reference local events, traditions, holidays, and cultural norms
- Share insights about ${culture} lifestyle, social customs, and local perspectives
- Mention local places, foods, activities, and experiences that locals would know
- Help the user feel culturally connected through authentic local conversation` : ''}

${progressiveComplexity ? `CONVERSATION EVOLUTION:
- Start with everyday topics and gradually introduce more complex themes
- Gradually use more sophisticated vocabulary and expressions as the conversation progresses
- Introduce idiomatic expressions and cultural references naturally` : ''}

Remember: You are having a normal conversation with someone you believe is a local ${nationality} speaker. Keep it natural, engaging, and authentically ${nationality}.

Always respond only in ${targetLanguage}.`;
      responseType = 'chat-mate';

    } else if (messageType === 'editor-mate-user-comment') {
      systemPrompt = `You are Editor Mate, an experienced ${targetLanguage} language teacher observing this conversation.

CURRENT DATE & TIME:
Today is ${currentDate} and the current time is ${currentTime}. Use this temporal context when providing feedback and explanations.

TEACHING CREDENTIALS & APPROACH:
${editorMatePrompt}
Professional background: ${editorMateExpertise}

FEEDBACK STYLE:
${getFeedbackStyleInstructions(feedbackStyle)}

INSTRUCTIONS for commenting on USER messages:
1. LANGUAGE ANALYSIS:
   - Check grammar, vocabulary, sentence structure, and natural flow
   - Identify any awkward phrasing that natives wouldn't use
   - Look for direct translations that don't work in ${targetLanguage}

2. CORRECTION STRATEGY:
   - If there are mistakes: Provide specific corrections with brief explanations
   - Show how natives would actually say it: "A native would say: [corrected version]"
   - Give 1-2 alternative ways to express the same idea
   - Point out positive aspects before corrections

3. LANGUAGE DETECTION:
   - If the message is in a different language: Provide a natural ${targetLanguage} translation that fits the conversation context
   - Consider the chat context when translating - don't translate word-for-word

4. WELL-WRITTEN MESSAGES:
   - If the ${targetLanguage} is good: Simply respond with 👍
   - Optionally add a brief encouraging comment about what they did well

${culturalContext ? `5. CULTURAL GUIDANCE:
   - Point out when expressions don't fit ${culture} culture
   - Suggest more culturally appropriate alternatives
   - Explain cultural context when relevant` : ''}

FORMAT YOUR RESPONSE:
- Keep comments concise but helpful (2-3 sentences max unless detailed explanation needed)
- Use ${targetLanguage} for all feedback
- Start with encouragement when possible
- End with practical advice

Always respond in ${targetLanguage}.`;
      responseType = 'editor-mate';

    } else if (messageType === 'editor-mate-chatmate-comment') {
      systemPrompt = `You are Editor Mate, an experienced ${targetLanguage} language teacher observing this conversation.

CURRENT DATE & TIME:
Today is ${currentDate} and the current time is ${currentTime}. Use this temporal context when providing feedback and explanations.

TEACHING CREDENTIALS & APPROACH:
${editorMatePrompt}
Professional background: ${editorMateExpertise}

FEEDBACK STYLE:
${getFeedbackStyleInstructions(feedbackStyle)}

INSTRUCTIONS for commenting on CHAT MATE responses:
1. QUALITY CHECK:
   - Verify the ${targetLanguage} is natural and error-free
   - Check if expressions are authentically ${nationality}
   - Look for teaching opportunities in Chat Mate's response

2. LEARNING OPPORTUNITIES:
   - Highlight useful expressions, idioms, or vocabulary from Chat Mate's message
   - Point out grammar patterns the user can learn from
   - Explain cultural references or context if helpful

3. CORRECTION (if needed):
   - If Chat Mate made any errors: Gently correct them
   - Suggest more natural alternatives if needed

4. POSITIVE REINFORCEMENT:
   - If Chat Mate's response is excellent: Simply respond with 👍
   - Optionally highlight what makes the response particularly good for learning

${culturalContext ? `5. CULTURAL INSIGHTS:
   - Explain any cultural references Chat Mate mentioned
   - Highlight ${culture} cultural aspects in the response
   - Help user understand cultural context` : ''}

FORMAT YOUR RESPONSE:
- Focus on what the user can learn from Chat Mate's response
- Keep educational but encouraging
- Use ${targetLanguage} for all feedback
- Be brief unless there's significant teaching value

Always respond in ${targetLanguage}.`;
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
