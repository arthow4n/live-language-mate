import {
  assertEquals,
  assertStringIncludes,
} from 'https://deno.land/std@0.224.0/assert/mod.ts';
import { aiChatHandler } from '../handlers/ai-chat.ts';
import type { AiChatRequest } from '../../src/schemas/api.ts';

// Store original fetch and env
const originalFetch = globalThis.fetch;
const originalEnvGet = Deno.env.get;

// Mock fetch
let mockFetchCall: any = null;
function mockFetch(input: any, init?: any): Promise<any> {
  mockFetchCall = { input, init };
  return Promise.resolve({
    ok: true,
    json: async () => ({
      choices: [
        {
          message: {
            content: 'Test response',
            role: 'assistant',
          },
        },
      ],
    }),
  });
}

Deno.test(
  'AI Chat Handler - handles text-only messages correctly',
  async () => {
    // Setup mocks
    globalThis.fetch = mockFetch;
    Deno.env.get = () => 'test-api-key';
    mockFetchCall = null;
    const request = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello world',
        conversationHistory: [],
        systemPrompt: 'You are a helpful assistant.',
        model: 'google/gemini-2.5-flash',
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

    assertEquals(response.status, 200);
    assertEquals(responseData.response, 'Test response');

    // Verify that fetch was called with correct parameters
    assertEquals(
      mockFetchCall.input,
      'https://openrouter.ai/api/v1/chat/completions'
    );
    assertStringIncludes(mockFetchCall.init.body, '"content":"Hello world"');

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);

Deno.test(
  'AI Chat Handler - handles multimodal messages with images correctly',
  async () => {
    // Setup mocks
    globalThis.fetch = (input: any, init?: any): Promise<any> => {
      mockFetchCall = { input, init };
      return Promise.resolve({
        ok: true,
        json: async () => ({
          choices: [
            {
              message: {
                content: 'I can see the image you shared.',
                role: 'assistant',
              },
            },
          ],
        }),
      });
    };
    Deno.env.get = () => 'test-api-key';
    mockFetchCall = null;

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
        model: 'google/gemini-2.5-flash',
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

    assertEquals(response.status, 200);
    assertEquals(responseData.response, 'I can see the image you shared.');

    // Verify that fetch was called with multimodal content array
    assertEquals(
      mockFetchCall.input,
      'https://openrouter.ai/api/v1/chat/completions'
    );
    assertStringIncludes(mockFetchCall.init.body, '"content":[');
    assertStringIncludes(
      mockFetchCall.init.body,
      '"text":"What do you see in this image?"'
    );
    assertStringIncludes(mockFetchCall.init.body, '"type":"text"');
    assertStringIncludes(mockFetchCall.init.body, '"type":"image_url"');

    // Verify the content array structure is preserved
    const requestBody = JSON.parse(mockFetchCall.init.body);
    const userMessage = requestBody.messages.find(
      (msg: any) => msg.role === 'user'
    );

    assertEquals(userMessage.content, multimodalContent);

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);

Deno.test(
  'AI Chat Handler - falls back to text message when multimodalMessage is empty',
  async () => {
    // Setup mocks
    globalThis.fetch = mockFetch;
    Deno.env.get = () => 'test-api-key';
    mockFetchCall = null;

    const request = new Request('http://localhost:8000/ai-chat', {
      method: 'POST',
      body: JSON.stringify({
        message: 'Hello world',
        multimodalMessage: [], // Empty array should fall back to text
        conversationHistory: [],
        systemPrompt: 'You are a helpful assistant.',
        model: 'google/gemini-2.5-flash',
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

    assertEquals(response.status, 200);
    assertEquals(responseData.response, 'Test response');

    // Verify it falls back to simple text content
    const requestBody = JSON.parse(mockFetchCall.init.body);
    const userMessage = requestBody.messages.find(
      (msg: any) => msg.role === 'user'
    );

    assertEquals(userMessage.content, 'Hello world');

    // Restore mocks
    globalThis.fetch = originalFetch;
    Deno.env.get = originalEnvGet;
  }
);
