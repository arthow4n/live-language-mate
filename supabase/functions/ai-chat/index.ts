
import { serve } from "https://deno.land/std@0.168.0/http/server.ts"

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { 
      message, 
      messageType, 
      conversationHistory = [], 
      chatMatePrompt = '', 
      editorMatePrompt = '',
      targetLanguage = 'swedish',
      model = 'anthropic/claude-3-5-sonnet',
      apiKey,
      chatMateBackground = '',
      editorMateExpertise = '',
      feedbackStyle = 'encouraging',
      culturalContext = true,
      progressiveComplexity = true,
      streaming = true
    } = await req.json()

    console.log('🔍 AI Chat request received:', {
      messageType,
      targetLanguage,
      model,
      apiKey: apiKey ? 'Provided by user' : 'Using environment API key',
      historyLength: conversationHistory.length,
      hasMessage: !!message,
      hasChatMatePrompt: !!chatMatePrompt,
      hasEditorMatePrompt: !!editorMatePrompt,
      streaming
    })

    // Use provided API key or fall back to environment variable
    const openRouterApiKey = apiKey || Deno.env.get('OPENROUTER_API_KEY')
    
    if (!openRouterApiKey) {
      throw new Error('No API key provided. Please set your OpenRouter API key in the settings.')
    }

    console.log('🔑 API key source:', apiKey ? 'User provided' : 'Environment variable')

    let systemPrompt = ''
    
    if (messageType === 'chat-mate-response') {
      systemPrompt = `You are a friendly native speaker of ${targetLanguage}. ${chatMatePrompt || 'You love chatting about local culture, daily life, and helping with language practice.'} 

Background: ${chatMateBackground}
      
You respond naturally in ${targetLanguage}, treating the conversation as if speaking with a local friend. You assume the user is already part of the community and don't focus on language learning explicitly - just have a natural conversation.

${culturalContext ? `Include cultural context and local references when relevant to make the conversation authentic.` : ''}
${progressiveComplexity ? `Gradually increase complexity based on the user's demonstrated language level.` : ''}`
    } else if (messageType === 'editor-mate-user-comment') {
      systemPrompt = `You are an experienced ${targetLanguage} language teacher. ${editorMatePrompt || 'You provide helpful feedback on language use.'} 

Expertise: ${editorMateExpertise}
Feedback style: ${feedbackStyle}

Review the user's message and provide constructive feedback. If the message is well-written, just give a thumbs up 👍. If there are improvements to suggest, provide:
1. Corrections for any grammatical errors
2. Better word choices if applicable  
3. More natural expressions
4. Cultural context if relevant

${culturalContext ? `Include cultural context in your feedback when relevant.` : ''}

Keep your feedback ${feedbackStyle} and encouraging.`
    } else if (messageType === 'editor-mate-chatmate-comment') {
      systemPrompt = `You are an experienced ${targetLanguage} language teacher helping a student understand a response from a native speaker.

As if you were the student, provide a natural response to the chat mate's message in ${targetLanguage}. Then optionally add any helpful language notes about the chat mate's message if there are interesting expressions or cultural references worth explaining.

Keep responses natural and conversational.`
    }

    const messages = [
      { role: 'system', content: systemPrompt },
      ...conversationHistory,
      { role: 'user', content: message }
    ]

    console.log('🚀 Sending request to OpenRouter:', {
      model,
      messageType,
      systemPromptLength: systemPrompt.length,
      messagesCount: messages.length,
      streaming
    })

    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${openRouterApiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'https://expat-language-mate.lovable.app',
        'X-Title': 'Expat Language Mate'
      },
      body: JSON.stringify({
        model,
        messages,
        stream: streaming,
        temperature: 0.7,
        max_tokens: 1000
      })
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error('❌ OpenRouter API error:', response.status, errorText)
      throw new Error(`OpenRouter API error: ${response.status} - ${errorText}`)
    }

    if (streaming) {
      console.log('📡 Setting up streaming response')
      
      // Create a transform stream to process the SSE data
      const transformStream = new TransformStream({
        transform(chunk, controller) {
          const decoder = new TextDecoder()
          const text = decoder.decode(chunk)
          
          // Process each line of the SSE stream
          const lines = text.split('\n')
          for (const line of lines) {
            if (line.startsWith('data: ') && line !== 'data: [DONE]') {
              try {
                const data = JSON.parse(line.slice(6))
                if (data.choices?.[0]?.delta?.content) {
                  // Send the content chunk
                  controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                    type: 'content',
                    content: data.choices[0].delta.content
                  })}\n\n`))
                }
              } catch (e) {
                // Skip invalid JSON lines
              }
            } else if (line === 'data: [DONE]') {
              // Send completion signal
              controller.enqueue(new TextEncoder().encode(`data: ${JSON.stringify({
                type: 'done'
              })}\n\n`))
            }
          }
        }
      })

      return new Response(response.body?.pipeThrough(transformStream), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
        },
      })
    } else {
      // Non-streaming response (fallback)
      const data = await response.json()
      const aiResponse = data.choices[0].message.content

      console.log('✅ OpenRouter response received successfully:', {
        model,
        messageType,
        responseLength: aiResponse.length,
        usage: data.usage
      })

      return new Response(JSON.stringify({ response: aiResponse }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

  } catch (error) {
    console.error('❌ Error in AI chat function:', error)
    return new Response(JSON.stringify({ 
      error: error.message || 'An error occurred while processing your request' 
    }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
