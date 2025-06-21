import { describe, test, expect } from 'vitest';
import { http, HttpResponse } from 'msw';
import { server } from '../__tests__/setup';
import { generateChatTitle } from './chatTitleGenerator';
import { createMockAiResponse } from '../__tests__/factories';
import { aiChatRequestSchema } from '@/schemas/api';
import type { AiChatRequest } from '@/schemas/api';

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
        capturedRequest = body as AiChatRequest;

        // Use Zod to validate the entire request structure
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        return HttpResponse.json(mockResponse);
      })
    );

    const history: { message_type: string; content: string }[] = [
      { message_type: 'user', content: 'How do I say hello in Swedish?' },
      { message_type: 'assistant', content: 'You can say "Hej" or "Hallo"' },
    ];

    const title = await generateChatTitle(
      history,
      'Swedish',
      'google/gemini-2.5-flash'
    );

    expect(title).toBe('Swedish Greetings');

    // Additional specific checks beyond Zod validation
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest.messageType).toBe('title-generation');
    expect(capturedRequest.chatMatePrompt).toBe('N/A');
    expect(capturedRequest.editorMatePrompt).toBe('N/A');
  });
});
