import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from '@/schemas/api';

import { aiChatRequestSchema } from '@/schemas/api';

import { createMockAiResponse } from '../__tests__/factories';
import { server } from '../__tests__/setup';
import { generateChatTitle } from './chatTitleGenerator';

// Use the global server from setup instead of creating a new one

describe('Chat Title Generator Integration Tests', () => {
  test('generates title with valid API request', async () => {
    const mockResponse = createMockAiResponse({
      response: 'Swedish Greetings',
    });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture the request
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();

        // Use Zod to validate the entire request structure
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        if (validationResult.success) {
          capturedRequest = validationResult.data;
        }

        return HttpResponse.json(mockResponse);
      })
    );

    const history: { content: string; message_type: string }[] = [
      { content: 'How do I say hello in Swedish?', message_type: 'user' },
      { content: 'You can say "Hej" or "Hallo"', message_type: 'assistant' },
    ];

    const title = await generateChatTitle({
      conversationHistory: history,
      model: 'google/gemini-2.5-flash',
      targetLanguage: 'Swedish',
    });

    expect(title).toBe('Swedish Greetings');

    // Additional specific checks beyond Zod validation
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('messageType', 'title-generation');
    expect(capturedRequest).toHaveProperty('chatMatePrompt', 'N/A');
    expect(capturedRequest).toHaveProperty('editorMatePrompt', 'N/A');
  });
});
