import { http, HttpResponse } from 'msw';

import type { AiChatNonStreamResponse } from '@/schemas/api';

// Default responses for different API endpoints
const defaultAiChatResponse: AiChatNonStreamResponse = {
  reasoning: undefined,
  response: 'Default mock AI response',
};

const defaultModelsResponse = {
  fallback: false,
  models: [
    {
      context_length: 8192,
      description: 'Fast and efficient model',
      id: 'google/gemini-2.5-flash',
      name: 'Gemini 2.5 Flash',
      pricing: { completion: '0.00002', prompt: '0.00001' },
    },
  ],
};

// OpenRouter API handlers
export const openRouterHandlers = [
  // OpenRouter chat completions
  http.post(
    'https://openrouter.ai/api/v1/chat/completions',
    async ({ request }) => {
      const body = await request.json();

      // You can inspect the request body for different test scenarios
      const payload = body as Record<string, unknown>;

      // Default non-streaming response
      if (!payload.stream) {
        return HttpResponse.json({
          choices: [
            {
              message: {
                content: defaultAiChatResponse.response,
                reasoning: defaultAiChatResponse.reasoning,
              },
            },
          ],
          usage: { total_tokens: 100 },
        });
      }

      // Streaming response (if needed for future tests)
      const encoder = new TextEncoder();
      const stream = new ReadableStream({
        start(controller) {
          controller.enqueue(
            encoder.encode(
              'data: {"choices":[{"delta":{"content":"Streaming response"}}]}\n\n'
            )
          );
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
        },
      });

      return new Response(stream, {
        headers: { 'Content-Type': 'text/event-stream' },
      });
    }
  ),

  // OpenRouter models list
  http.get('https://openrouter.ai/api/v1/models', () => {
    return HttpResponse.json(defaultModelsResponse);
  }),
];

// Internal API handlers (for your Deno backend)
export const internalApiHandlers = [
  // Your internal /ai-chat endpoint - match any localhost variation
  http.post('http://*/ai-chat', async ({ request }) => {
    const body = await request.json();

    // Validate the request has required fields (basic check)
    const hasRequiredFields = [
      'chatMatePrompt',
      'editorMatePrompt',
      'chatMateBackground',
    ].every((field) => field in (body as Record<string, unknown>));

    if (!hasRequiredFields) {
      return HttpResponse.json(
        { error: 'Missing required fields like chatMatePrompt' },
        { status: 400 }
      );
    }

    return HttpResponse.json(defaultAiChatResponse);
  }),

  // Your internal /models endpoint - match any localhost variation
  http.get('http://*/models', () => {
    return HttpResponse.json(defaultModelsResponse);
  }),
];

// Export all handlers
export const apiHandlers = [...openRouterHandlers, ...internalApiHandlers];
