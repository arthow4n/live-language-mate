import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from '@/schemas/api';

import { expectToBeInstanceOf } from '@/__tests__/typedExpectHelpers';
import { aiChatRequestSchema } from '@/schemas/api';

import {
  createMockAiResponse,
  createRealChatRequest,
} from '../__tests__/factories';
import { server } from '../__tests__/setup';
import { apiClient } from './apiClient';

// Import the global server from setup instead of creating a new one

describe('API Client Integration Tests', () => {
  test('aiChat constructs valid requests that pass Zod validation', async () => {
    const mockResponse = createMockAiResponse({ response: 'Test response' });

    // Override default handler for this specific test
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();

        // Use Zod to validate the request structure instead of manual assertions
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        if (validationResult.success) {
          // Additional specific checks if needed
          expect(validationResult.data.chatMatePrompt).not.toBe('');
          expect(validationResult.data.editorMatePrompt).not.toBe('');
        }

        return HttpResponse.json(mockResponse);
      })
    );

    const request = createRealChatRequest();

    // This should not throw Zod validation errors
    const response = await apiClient.aiChat(request);

    // Validate the response is a Response object and can be parsed
    expectToBeInstanceOf(response, Response);
    expect(response.ok).toBe(true);

    const result = await response.json();
    expect(result).toEqual(mockResponse);
  });

  test('aiChat rejects invalid requests with server validation', async () => {
    const invalidRequest = { message: 'test' } satisfies Partial<AiChatRequest>;

    await expect(apiClient.aiChat(invalidRequest)).rejects.toThrow(
      /Missing required fields/
    );
  });

  test('aiChat handles API errors properly', async () => {
    // Override handler to return error
    server.use(
      http.post('http://*/ai-chat', () => {
        return HttpResponse.json({ error: 'API key invalid' }, { status: 401 });
      })
    );

    const request = createRealChatRequest();

    await expect(apiClient.aiChat(request)).rejects.toThrow(
      /API key invalid|401/
    );
  });
});
