import { http, HttpResponse } from 'msw';
import { describe, expect, test, vi } from 'vitest';

import type { ImageAttachment } from '@/schemas/imageAttachment';

import { aiChatRequestWireSchema } from '@/schemas/api';

import type { AiChatRequest } from './apiClient';

import { server } from '../__tests__/setup';
import { createTestFile } from '../__tests__/testUtilities';
import {
  expectToBe,
  expectToNotBeNull,
  expectToNotBeUndefined,
} from '../__tests__/typedExpectHelpers';
import { apiClient } from './apiClient';
import { imageStorage } from './imageStorage';

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

  test('aiChat processes image attachments and creates multimodal content', async () => {
    // Create a test image and attachment
    const testFile = createTestFile({
      mimeType: 'image/png',
      name: 'test-image.png',
      size: 1024,
    });

    // Mock the imageStorage.saveImage method to return an attachment
    const testAttachment: ImageAttachment = {
      filename: 'test-image.png',
      id: 'test-image-id',
      mimeType: 'image/png',
      savedAt: new Date(),
      size: 1024,
    };

    // Mock imageStorage.getImage to return our test file
    vi.spyOn(imageStorage, 'getImage').mockResolvedValue(testFile);

    // Mock server to capture the request body and validate using the wire schema
    let capturedRequestBody: unknown = null;
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const requestData: unknown = await request.json();
        const parseResult = aiChatRequestWireSchema.safeParse(requestData);
        if (parseResult.success) {
          capturedRequestBody = parseResult.data;
        }
        return HttpResponse.json({
          response: 'Test response with image',
        });
      })
    );

    const requestWithAttachments: AiChatRequest = {
      apiKey: 'test-key',
      attachments: [testAttachment],
      chatMateBackground: 'Friendly Swedish native speaker',
      chatMatePrompt: 'Respond naturally in Swedish',
      conversationHistory: [],
      culturalContext: true,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Swedish language teacher',
      editorMatePrompt: 'Help with Swedish language learning',
      enableReasoning: false,
      feedbackStyle: 'encouraging',
      message: 'What do you see in this image?',
      messageType: 'chat-mate-response',
      model: 'gpt-4-vision-preview',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'Swedish',
      userTimezone: 'UTC',
    };

    const response = await apiClient.aiChat(requestWithAttachments);

    expect(response.status).toBe(200);

    // Verify that the request was captured and properly validated by the schema
    expectToNotBeNull(capturedRequestBody);

    // Parse and validate the captured request with our wire schema
    const validatedRequest = aiChatRequestWireSchema.parse(capturedRequestBody);

    // Verify that the request includes the expected fields
    expect(validatedRequest.message).toBe('What do you see in this image?');

    // Type-safe verification of attachments
    expectToNotBeUndefined(validatedRequest.attachments);
    expect(validatedRequest.attachments).toHaveLength(1);
    const attachment = validatedRequest.attachments[0];
    expect(attachment.filename).toBe('test-image.png');
    expect(attachment.id).toBe('test-image-id');
    expect(attachment.mimeType).toBe('image/png');
    expect(attachment.savedAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    expect(attachment.size).toBe(1024);

    // Type-safe verification of multimodal message
    expectToNotBeUndefined(validatedRequest.multimodalMessage);
    expect(validatedRequest.multimodalMessage).toHaveLength(2);
    expect(validatedRequest.multimodalMessage[0]).toEqual({
      text: 'What do you see in this image?',
      type: 'text',
    });
    const imageContent = validatedRequest.multimodalMessage[1];
    expectToBe(imageContent.type, 'image_url');
    const imageUrl = imageContent.image_url.url;
    expect(imageUrl).toMatch(/^data:image\/png;base64,/);

    // Restore the mock
    vi.restoreAllMocks();
  });
});
