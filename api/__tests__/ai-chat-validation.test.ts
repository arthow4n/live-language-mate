import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { aiChatHandler } from '../handlers/ai-chat.ts';
import type { AiChatRequest } from '../../src/schemas/api.ts';

// Store original fetch and env
const originalFetch = globalThis.fetch;
const originalEnvGet = Deno.env.get;

// Track API calls
let fetchCalls: { input: string; init?: any }[] = [];

Deno.test(
  'AI Chat Handler - validates model capabilities for multimodal requests',
  async () => {
    // Setup mocks - model does NOT support images
    fetchCalls = [];
    Deno.env.get = () => 'test-api-key';

    globalThis.fetch = (input: any, init?: any): Promise<any> => {
      fetchCalls.push({ input, init });

      // Mock models API response
      if (input === 'https://openrouter.ai/api/v1/models') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'meta-llama/llama-3.2-1b-instruct',
                architecture: {
                  input_modalities: ['text'], // Does NOT support images
                },
              },
              {
                id: 'google/gemini-2.5-flash',
                architecture: {
                  input_modalities: ['text', 'image'], // DOES support images
                },
              },
            ],
          }),
        });
      }

      // Mock chat completions (should not be called due to validation error)
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: 'Test response', role: 'assistant' } },
          ],
        }),
      });
    };

    const multimodalContent = [
      {
        type: 'text' as const,
        text: 'What do you see in this image?',
      },
      {
        type: 'image_url' as const,
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        },
      },
    ];

    const request = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What do you see in this image?',
        multimodalMessage: multimodalContent,
        conversationHistory: [],
        systemPrompt: 'You are a helpful assistant.',
        model: 'meta-llama/llama-3.2-1b-instruct', // This model does NOT support images
        streaming: false,
        currentDateTime: '2024-01-01T00:00:00Z',
        userTimezone: 'UTC',
        enableReasoning: false,
        chatMateBackground: 'test',
        chatMatePrompt: 'test',
        culturalContext: false,
        editorMateExpertise: 'test',
        editorMatePrompt: 'test',
        feedbackStyle: 'encouraging',
        messageType: 'chat-mate-response',
        progressiveComplexity: false,
        targetLanguage: 'English',
      } satisfies AiChatRequest),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await aiChatHandler(request);
    const responseData = await response.json();

    assertEquals(response.status, 500);
    assertStringIncludes(responseData.error, 'does not support image inputs');
    assertStringIncludes(
      responseData.error,
      'meta-llama/llama-3.2-1b-instruct'
    );

    // Verify models API was called for validation
    const modelsCall = fetchCalls.find(
      (call) => call.input === 'https://openrouter.ai/api/v1/models'
    );
    assertEquals(!!modelsCall, true);

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);

Deno.test(
  'AI Chat Handler - allows multimodal requests for image-capable models',
  async () => {
    // Setup mocks - model DOES support images
    fetchCalls = [];
    Deno.env.get = () => 'test-api-key';

    globalThis.fetch = (input: any, init?: any): Promise<any> => {
      fetchCalls.push({ input, init });

      // Mock models API response
      if (input === 'https://openrouter.ai/api/v1/models') {
        return Promise.resolve({
          ok: true,
          json: async () => ({
            data: [
              {
                id: 'google/gemini-2.5-flash',
                architecture: {
                  input_modalities: ['text', 'image'], // DOES support images
                },
              },
            ],
          }),
        });
      }

      // Mock chat completions
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: 'Test response', role: 'assistant' } },
          ],
        }),
      });
    };

    const multimodalContent = [
      {
        type: 'text' as const,
        text: 'What do you see in this image?',
      },
      {
        type: 'image_url' as const,
        image_url: {
          url: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==',
        },
      },
    ];

    const request = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'What do you see in this image?',
        multimodalMessage: multimodalContent,
        conversationHistory: [],
        systemPrompt: 'You are a helpful assistant.',
        model: 'google/gemini-2.5-flash', // This model DOES support images
        streaming: false,
        currentDateTime: '2024-01-01T00:00:00Z',
        userTimezone: 'UTC',
        enableReasoning: false,
        chatMateBackground: 'test',
        chatMatePrompt: 'test',
        culturalContext: false,
        editorMateExpertise: 'test',
        editorMatePrompt: 'test',
        feedbackStyle: 'encouraging',
        messageType: 'chat-mate-response',
        progressiveComplexity: false,
        targetLanguage: 'English',
      } satisfies AiChatRequest),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await aiChatHandler(request);
    const responseData = await response.json();

    // Should succeed since gemini supports images
    assertEquals(response.status, 200);
    assertEquals(responseData.response, 'Test response');

    // Verify models API was called for validation
    const modelsCall = fetchCalls.find(
      (call) => call.input === 'https://openrouter.ai/api/v1/models'
    );
    assertEquals(!!modelsCall, true);

    // Verify chat completions was called with multimodal content
    const chatCall = fetchCalls.find(
      (call) => call.input === 'https://openrouter.ai/api/v1/chat/completions'
    );
    assertEquals(!!chatCall, true);
    assertStringIncludes(chatCall!.init.body, '"content":[');
    assertStringIncludes(chatCall!.init.body, '"type":"image_url"');

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);

Deno.test(
  'AI Chat Handler - allows text-only requests for any model',
  async () => {
    // Setup mocks
    fetchCalls = [];
    Deno.env.get = () => 'test-api-key';

    globalThis.fetch = (input: any, init?: any): Promise<any> => {
      fetchCalls.push({ input, init });

      // Should only call chat completions, not models API for text-only
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [
            { message: { content: 'Test response', role: 'assistant' } },
          ],
        }),
      });
    };

    const request = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello world', // Text-only, no multimodal content
        conversationHistory: [],
        systemPrompt: 'You are a helpful assistant.',
        model: 'meta-llama/llama-3.2-1b-instruct', // Text-only model
        streaming: false,
        currentDateTime: '2024-01-01T00:00:00Z',
        userTimezone: 'UTC',
        enableReasoning: false,
        chatMateBackground: 'test',
        chatMatePrompt: 'test',
        culturalContext: false,
        editorMateExpertise: 'test',
        editorMatePrompt: 'test',
        feedbackStyle: 'encouraging',
        messageType: 'chat-mate-response',
        progressiveComplexity: false,
        targetLanguage: 'English',
      } satisfies AiChatRequest),
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const response = await aiChatHandler(request);
    const responseData = await response.json();

    // Should succeed since no validation needed for text-only
    assertEquals(response.status, 200);
    assertEquals(responseData.response, 'Test response');

    // Verify models API was NOT called for text-only requests
    const modelsCall = fetchCalls.find(
      (call) => call.input === 'https://openrouter.ai/api/v1/models'
    );
    assertEquals(!!modelsCall, false);

    // Verify chat completions was called with simple text content
    const chatCall = fetchCalls.find(
      (call) => call.input === 'https://openrouter.ai/api/v1/chat/completions'
    );
    assertEquals(!!chatCall, true);
    assertStringIncludes(chatCall!.init.body, '"content":"Hello world"');

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);
