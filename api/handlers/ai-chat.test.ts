import {
  assertEquals,
  assertExists,
} from 'https://deno.land/std@0.208.0/assert/mod.ts';
import { aiChatHandler } from './ai-chat.ts';
import type { AiChatRequest } from '../../src/schemas/api.ts';

// Import factory function (needs to be created for Deno)
const createRealChatRequest = (
  overrides: Partial<AiChatRequest> = {}
): AiChatRequest => ({
  message: 'Hello, how do I say this in Swedish?',
  messageType: 'chat-mate-response',
  conversationHistory: [],
  systemPrompt: 'You are a helpful Swedish language tutor.',
  chatMatePrompt:
    'A friendly native Swedish speaker who enjoys helping people learn.',
  editorMatePrompt:
    'A patient Swedish teacher who provides helpful corrections.',
  targetLanguage: 'Swedish',
  model: 'google/gemini-2.5-flash',
  chatMateBackground:
    'A friendly local who enjoys helping people learn the language and culture.',
  editorMateExpertise: '10+ years teaching Swedish as a second language',
  feedbackStyle: 'encouraging',
  culturalContext: true,
  progressiveComplexity: true,
  streaming: false,
  currentDateTime: new Date().toLocaleString('en-US', {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }),
  userTimezone: 'America/New_York',
  enableReasoning: false,
  ...overrides,
});

// OpenRouter API payload interface (what gets sent to OpenRouter)
interface OpenRouterPayload {
  model: string;
  messages: { role: string; content: string }[];
  stream: boolean;
  temperature: number;
  max_tokens: number;
  reasoning?: {
    max_tokens: number;
  };
}

Deno.test('AI Chat Handler - validates real frontend requests', async () => {
  // Mock OpenRouter API
  const originalFetch = globalThis.fetch;
  // deno-lint-ignore require-await -- mocking fetch
  globalThis.fetch = async (
    url: string | URL | Request,
    init?: RequestInit
  ): Promise<Response> => {
    const urlString =
      typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
    if (urlString.includes('openrouter.ai')) {
      return new Response(
        JSON.stringify({
          id: 'gen-12345',
          object: 'chat.completion',
          created: 1234567890,
          model: 'google/gemini-2.5-flash',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Test response',
                reasoning: null,
                refusal: null,
              },
              logprobs: null,
              finish_reason: 'stop',
              native_finish_reason: 'stop',
              index: 0,
            },
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 5,
            total_tokens: 15,
          },
        }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }
    return originalFetch(url, init);
  };

  const validRequestBody = createRealChatRequest({
    currentDateTime: new Date().toISOString(),
    userTimezone: 'UTC',
  });

  const realFrontendRequest = new Request('http://localhost:8000/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(validRequestBody),
  });

  // Mock environment variable
  Deno.env.set('OPENAI_API_KEY', 'test-key');

  const response = await aiChatHandler(realFrontendRequest);

  // Should not fail validation
  assertEquals(response.status, 200);

  // Restore fetch
  globalThis.fetch = originalFetch;
});

Deno.test('AI Chat Handler - rejects invalid requests', async () => {
  const invalidRequestBody = {
    message: 'Hello',
    // Missing all required fields
  } satisfies Partial<AiChatRequest>;

  const invalidRequest = new Request('http://localhost:8000/ai-chat', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(invalidRequestBody),
  });

  const response = await aiChatHandler(invalidRequest);

  assertEquals(response.status, 400);

  const errorBody = await response.text();
  assertExists(errorBody.includes('chatMatePrompt'));
});

Deno.test(
  'AI Chat Handler - OpenRouter payload structure validation',
  async () => {
    let capturedPayload: OpenRouterPayload | null = null;

    // Mock fetch to capture the payload sent to OpenRouter
    const originalFetch = globalThis.fetch;
    // deno-lint-ignore require-await -- mocking fetch
    globalThis.fetch = async (
      url: string | URL | Request,
      init?: RequestInit
    ): Promise<Response> => {
      const urlString =
        typeof url === 'string' ? url : url instanceof URL ? url.href : url.url;
      if (urlString.includes('openrouter.ai')) {
        const bodyString = init?.body;
        if (typeof bodyString === 'string') {
          capturedPayload = JSON.parse(bodyString) as OpenRouterPayload;
        }

        // Return properly typed mock response
        const mockOpenRouterResponse = {
          id: 'gen-67890',
          object: 'chat.completion',
          created: 1234567890,
          model: 'google/gemini-2.5-flash',
          choices: [
            {
              message: {
                role: 'assistant',
                content: 'Test response',
                reasoning: null,
                refusal: null,
              },
              logprobs: null,
              finish_reason: 'stop',
              native_finish_reason: 'stop',
              index: 0,
            },
          ],
          usage: {
            prompt_tokens: 20,
            completion_tokens: 10,
            total_tokens: 30,
          },
        };

        return new Response(JSON.stringify(mockOpenRouterResponse), {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        });
      }
      return originalFetch(url, init);
    };

    const validRequestBody = createRealChatRequest({
      conversationHistory: [{ role: 'user', content: 'Previous message' }],
      currentDateTime: new Date().toISOString(),
      userTimezone: 'UTC',
      enableReasoning: true,
    });

    const realFrontendRequest = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(validRequestBody),
    });

    Deno.env.set('OPENAI_API_KEY', 'test-key');
    await aiChatHandler(realFrontendRequest);

    // Verify the OpenRouter payload structure with proper null check
    assertExists(capturedPayload);
    const payload = capturedPayload as OpenRouterPayload;

    assertEquals(payload.model, 'google/gemini-2.5-flash');
    assertEquals(payload.stream, false);
    assertEquals(payload.temperature, 0.7);
    assertEquals(payload.max_tokens, 4096); // Should be 4096 when reasoning enabled
    assertExists(payload.reasoning);
    assertEquals(payload.reasoning!.max_tokens, 2000);
    assertExists(payload.messages);
    assertEquals(Array.isArray(payload.messages), true);

    // Restore original fetch
    globalThis.fetch = originalFetch;
  }
);
