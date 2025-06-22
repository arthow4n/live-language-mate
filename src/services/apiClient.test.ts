import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from './apiClient';

import { server } from '../__tests__/setup';
import { apiClient } from './apiClient';

describe('API Client Integration Tests', () => {
  test('aiChat constructs valid requests that pass Zod validation', async () => {
    const validRequest: AiChatRequest = {
      apiKey: 'test-key',
      chatMateBackground: 'Friendly Swedish native speaker',
      chatMatePrompt: 'Respond naturally in Swedish',
      conversationHistory: [],
      culturalContext: true,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Swedish language teacher',
      editorMatePrompt: 'Help with Swedish language learning',
      enableReasoning: false,
      feedbackStyle: 'encouraging',
      message: 'Hej, hur mår du?',
      messageType: 'chat-mate-response',
      model: 'gpt-3.5-turbo',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'Swedish',
      userTimezone: 'UTC',
    };

    const response = await apiClient.aiChat(validRequest);

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data).toEqual({
      reasoning: undefined,
      response: 'Default mock AI response',
    });
  });

  test('aiChat rejects invalid requests with server validation', async () => {
    // Create an invalid request with missing required fields
    // We'll let TypeScript errors surface naturally when the request fails server validation
    const invalidRequest: Partial<AiChatRequest> = {
      message: 'test',
      // Missing required fields like chatMatePrompt, chatMateBackground, etc.
    };

    // Test server validation by sending incomplete request
    await expect(
      fetch('http://localhost:8000/ai-chat', {
        body: JSON.stringify(invalidRequest),
        headers: { 'Content-Type': 'application/json' },
        method: 'POST',
      }).then(async (response) => {
        if (!response.ok) {
          const errorText = await response.text();
          let errorMessage: string;
          try {
            const parsed: unknown = JSON.parse(errorText);
            const apiError =
              parsed &&
              typeof parsed === 'object' &&
              'error' in parsed &&
              typeof parsed.error === 'string'
                ? parsed.error
                : undefined;
            errorMessage =
              apiError ?? `API request failed: ${response.status.toString()}`;
          } catch {
            errorMessage = `API request failed: ${response.status.toString()}`;
          }
          throw new Error(errorMessage);
        }
        return response;
      })
    ).rejects.toThrow('Missing required fields like chatMatePrompt');
  });

  test('aiChat handles API errors properly', async () => {
    // Override the default handler to return a 500 error
    server.use(
      http.post('http://*/ai-chat', () => {
        return HttpResponse.json(
          { error: 'Internal server error' },
          { status: 500 }
        );
      })
    );

    const validRequest: AiChatRequest = {
      apiKey: 'test-key',
      chatMateBackground: 'Friendly Swedish native speaker',
      chatMatePrompt: 'Respond naturally in Swedish',
      conversationHistory: [],
      culturalContext: true,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Swedish language teacher',
      editorMatePrompt: 'Help with Swedish language learning',
      enableReasoning: false,
      feedbackStyle: 'encouraging',
      message: 'Hej, hur mår du?',
      messageType: 'chat-mate-response',
      model: 'gpt-3.5-turbo',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'Swedish',
      userTimezone: 'UTC',
    };

    await expect(apiClient.aiChat(validRequest)).rejects.toThrow(
      'Internal server error'
    );
  });
});
