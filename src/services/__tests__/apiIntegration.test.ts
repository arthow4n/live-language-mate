import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test, vi } from 'vitest';
import { z } from 'zod/v4';

import type { ModelsResponse } from '@/schemas/api';
import type { ImageAttachment } from '@/schemas/imageAttachment';
import type { AiChatRequest } from '@/services/apiClient';

import { server } from '@/__tests__/setup';
import { createTestFile } from '@/__tests__/testUtilities';
import {
  expectToBe,
  expectToNotBeNull,
  expectToNotBeUndefined,
} from '@/__tests__/typedExpectHelpers';
import { apiClient } from '@/services/apiClient';
import { imageStorage } from '@/services/imageStorage';
import { modelCapabilities } from '@/services/modelCapabilities';

// Schema for validating captured AI chat requests
const aiChatRequestSchema = z.looseObject({
  attachments: z
    .array(
      z.looseObject({
        filename: z.string(),
        id: z.string(),
      })
    )
    .optional(),
  multimodalMessage: z
    .array(
      z.looseObject({
        image_url: z
          .looseObject({
            url: z.string(),
          })
          .optional(),
        text: z.string().optional(),
        type: z.string(),
      })
    )
    .optional(),
});

// Schema for validating API response data
const apiResponseSchema = z.looseObject({
  requestData: z.unknown().optional(),
  response: z.string(),
});

describe('API Integration Tests - Image Handling and Model Capabilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    modelCapabilities.clearCache();
  });

  test('end-to-end image attachment processing with model validation', async () => {
    // Create test image and attachment
    const testFile = createTestFile({
      mimeType: 'image/png',
      name: 'test-image.png',
      size: 2048,
    });

    const testAttachment: ImageAttachment = {
      aspectRatio: 1.5,
      filename: 'test-image.png',
      height: 400,
      id: 'test-image-id',
      mimeType: 'image/png',
      savedAt: new Date(),
      size: 2048,
      type: 'file',
      width: 600,
    };

    // Mock OPFS storage
    vi.spyOn(imageStorage, 'getImage').mockResolvedValue(testFile);

    // Mock models API to return image-capable model
    const mockModelsResponse: ModelsResponse = {
      models: [
        {
          architecture: {
            input_modalities: ['text', 'image'],
            instruct_type: 'chat',
            output_modalities: ['text'],
            tokenizer: 'gemini',
          },
          canonical_slug: 'gemini-2.5-flash',
          context_length: 1000000,
          created: 1234567890,
          description: 'Multimodal model',
          id: 'google/gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          per_request_limits: null,
          pricing: {
            completion: '0.000002',
            image: '0.000003',
            input_cache_read: '0',
            input_cache_write: '0',
            internal_reasoning: '0',
            prompt: '0.000001',
            request: '0',
            web_search: '0',
          },
          supported_parameters: ['tools', 'temperature'],
          top_provider: {
            context_length: 1000000,
            is_moderated: false,
            max_completion_tokens: 8192,
          },
        },
      ],
    };

    // Setup API handlers
    let capturedAiChatRequest: unknown = null;
    let capturedModelsRequest = false;

    server.use(
      // Models API endpoint
      http.get('http://*/models', () => {
        capturedModelsRequest = true;
        return HttpResponse.json(mockModelsResponse);
      }),
      // AI Chat endpoint
      http.post('http://*/ai-chat', async ({ request }) => {
        capturedAiChatRequest = await request.json();
        return HttpResponse.json({
          response: 'I can see the image you uploaded!',
        });
      })
    );

    // Test the full flow
    const requestWithImage: AiChatRequest = {
      apiKey: 'test-key',
      attachments: [testAttachment],
      chatMateBackground: 'Friendly assistant',
      chatMatePrompt: 'Help with image analysis',
      conversationHistory: [],
      culturalContext: false,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Image analysis expert',
      editorMatePrompt: 'Analyze images carefully',
      enableReasoning: false,
      feedbackStyle: 'detailed',
      message: 'What do you see in this image?',
      messageType: 'chat-mate-response',
      model: 'google/gemini-2.5-flash',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'English',
      userTimezone: 'UTC',
    };

    // Test model capability checking
    const supportsImages = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );
    expectToBe(supportsImages, true);

    // Test API client with image processing
    const response = await apiClient.aiChat(requestWithImage);
    expect(response.status).toBe(200);

    const responseData: unknown = await response.json();
    const validResponseData = apiResponseSchema.parse(responseData);
    expect(validResponseData.response).toBe(
      'I can see the image you uploaded!'
    );

    // Verify models API was called
    expectToBe(capturedModelsRequest, true);

    // Verify AI chat request was properly formatted
    expectToNotBeNull(capturedAiChatRequest);
    const aiChatData = aiChatRequestSchema.parse(capturedAiChatRequest);

    // Check attachment serialization
    expectToNotBeUndefined(aiChatData.attachments);
    expect(aiChatData.attachments).toHaveLength(1);
    expect(aiChatData.attachments[0].filename).toBe('test-image.png');
    expect(aiChatData.attachments[0].id).toBe('test-image-id');

    // Check multimodal content creation
    expectToNotBeUndefined(aiChatData.multimodalMessage);
    expect(aiChatData.multimodalMessage).toHaveLength(2);
    expect(aiChatData.multimodalMessage[0]).toEqual({
      text: 'What do you see in this image?',
      type: 'text',
    });
    expect(aiChatData.multimodalMessage[1].type).toBe('image_url');
    const imageUrlObject = aiChatData.multimodalMessage[1].image_url;
    expectToNotBeUndefined(imageUrlObject);
    expect(imageUrlObject.url).toMatch(/^data:image\/png;base64,/);

    // Cleanup
    vi.restoreAllMocks();
  });

  test('handles model capability validation failure', async () => {
    // Mock models API to return text-only model
    const mockModelsResponse: ModelsResponse = {
      models: [
        {
          architecture: {
            input_modalities: ['text'], // No image support
            instruct_type: 'chat',
            output_modalities: ['text'],
            tokenizer: 'llama',
          },
          canonical_slug: 'llama-3.2-1b-instruct',
          context_length: 131072,
          created: 1234567890,
          description: 'Text-only model',
          id: 'meta-llama/llama-3.2-1b-instruct',
          name: 'Llama 3.2 1B',
          per_request_limits: null,
          pricing: {
            completion: '0.0000004',
            image: '0',
            input_cache_read: '0',
            input_cache_write: '0',
            internal_reasoning: '0',
            prompt: '0.0000004',
            request: '0',
            web_search: '0',
          },
          supported_parameters: ['temperature'],
          top_provider: {
            context_length: 131072,
            is_moderated: false,
            max_completion_tokens: 4096,
          },
        },
      ],
    };

    server.use(
      http.get('http://*/models', () => {
        return HttpResponse.json(mockModelsResponse);
      })
    );

    // Test model capability checking
    const supportsImages = await modelCapabilities.supportsImages(
      'meta-llama/llama-3.2-1b-instruct'
    );
    expectToBe(supportsImages, false);

    // Test retrieving models by modality
    const imageModels =
      await modelCapabilities.getModelsSupportingModality('image');
    expectToBe(imageModels.length, 0);

    const textModels =
      await modelCapabilities.getModelsSupportingModality('text');
    expectToBe(textModels.length, 1);
    expectToBe(textModels[0].id, 'meta-llama/llama-3.2-1b-instruct');
  });

  test('handles API errors gracefully during image processing', async () => {
    const testAttachment: ImageAttachment = {
      aspectRatio: 1.5,
      filename: 'error-test.jpg',
      height: 400,
      id: 'error-image-id',
      mimeType: 'image/jpeg',
      savedAt: new Date(),
      size: 1024,
      type: 'file',
      width: 600,
    };

    // Mock image storage failure
    vi.spyOn(imageStorage, 'getImage').mockResolvedValue(null);

    // Mock successful models API
    server.use(
      http.get('http://*/models', () => {
        return HttpResponse.json({
          models: [
            {
              architecture: { input_modalities: ['text', 'image'] },
              id: 'google/gemini-2.5-flash',
            },
          ],
        });
      }),
      http.post('http://*/ai-chat', async ({ request }) => {
        const requestData = await request.json();
        return HttpResponse.json({
          requestData,
          response: 'Processed request without image',
        });
      })
    );

    const requestWithFailedImage: AiChatRequest = {
      apiKey: 'test-key',
      attachments: [testAttachment],
      chatMateBackground: 'Assistant',
      chatMatePrompt: 'Help user',
      conversationHistory: [],
      culturalContext: false,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Expert',
      editorMatePrompt: 'Provide expertise',
      enableReasoning: false,
      feedbackStyle: 'encouraging',
      message: 'Describe this image',
      messageType: 'chat-mate-response',
      model: 'google/gemini-2.5-flash',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'English',
      userTimezone: 'UTC',
    };

    // Should handle missing image gracefully
    const response = await apiClient.aiChat(requestWithFailedImage);
    expect(response.status).toBe(200);

    const responseData: unknown = await response.json();
    const validResponseData = apiResponseSchema.parse(responseData);
    expect(validResponseData.response).toBe('Processed request without image');

    // Verify that request was sent without multimodal content
    expectToNotBeUndefined(validResponseData.requestData);
    const sentDataSchema = z.looseObject({
      multimodalMessage: z.unknown().optional(),
    });
    const sentData = sentDataSchema.parse(validResponseData.requestData);
    expect(sentData.multimodalMessage).toBeUndefined();

    vi.restoreAllMocks();
  });

  test('handles models API failure with graceful fallback', async () => {
    // Mock models API failure
    server.use(
      http.get('http://*/models', () => {
        return HttpResponse.json(
          { error: 'Service temporarily unavailable' },
          { status: 503 }
        );
      })
    );

    // Test model capability checking with API failure
    const supportsImages = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );
    expectToBe(supportsImages, false); // Graceful fallback

    // Test that getModels throws error when there's no cache
    await expect(modelCapabilities.getModels()).rejects.toThrow(
      'Service temporarily unavailable'
    );

    const modelDetails = await modelCapabilities.getModelCapabilities(
      'google/gemini-2.5-flash'
    );
    expectToBe(modelDetails, null); // Null on failure
  }, 10000);

  test('integrates caching behavior across multiple requests', async () => {
    const mockModelsResponse: ModelsResponse = {
      models: [
        {
          architecture: {
            input_modalities: ['text', 'image'],
            instruct_type: 'chat',
            output_modalities: ['text'],
            tokenizer: 'gemini',
          },
          canonical_slug: 'gemini-2.5-flash',
          context_length: 1000000,
          created: 1234567890,
          description: 'Test model',
          id: 'google/gemini-2.5-flash',
          name: 'Gemini 2.5 Flash',
          per_request_limits: null,
          pricing: {
            completion: '0.000002',
            image: '0.000003',
            input_cache_read: '0',
            input_cache_write: '0',
            internal_reasoning: '0',
            prompt: '0.000001',
            request: '0',
            web_search: '0',
          },
          supported_parameters: ['temperature'],
          top_provider: {
            context_length: 1000000,
            is_moderated: false,
            max_completion_tokens: 8192,
          },
        },
      ],
    };

    let modelsApiCallCount = 0;
    server.use(
      http.get('http://*/models', () => {
        modelsApiCallCount++;
        return HttpResponse.json(mockModelsResponse);
      })
    );

    // First request should call models API
    const supportsImages1 = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );
    expectToBe(supportsImages1, true);
    expectToBe(modelsApiCallCount, 1);

    // Second request should use cache
    const supportsImages2 = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );
    expectToBe(supportsImages2, true);
    expectToBe(modelsApiCallCount, 1); // No additional API call

    // Third request with different operation should still use cache
    const model = await modelCapabilities.getModelCapabilities(
      'google/gemini-2.5-flash'
    );
    expectToNotBeNull(model);
    expectToBe(model.name, 'Gemini 2.5 Flash');
    expectToBe(modelsApiCallCount, 1); // Still using cache

    // Clear cache and verify API is called again
    modelCapabilities.clearCache();
    const supportsImages3 = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );
    expectToBe(supportsImages3, true);
    expectToBe(modelsApiCallCount, 2); // New API call after cache clear
  });

  test('handles multiple concurrent image attachments', async () => {
    // Create multiple test images
    const testFiles = [
      createTestFile({
        mimeType: 'image/png',
        name: 'image1.png',
        size: 1024,
      }),
      createTestFile({
        mimeType: 'image/jpeg',
        name: 'image2.jpg',
        size: 2048,
      }),
      createTestFile({
        mimeType: 'image/webp',
        name: 'image3.webp',
        size: 1536,
      }),
    ];

    const testAttachments: ImageAttachment[] = [
      {
        aspectRatio: 1.5,
        filename: 'image1.png',
        height: 400,
        id: 'image-1',
        mimeType: 'image/png',
        savedAt: new Date(),
        size: 1024,
        type: 'file',
        width: 600,
      },
      {
        aspectRatio: 1.5,
        filename: 'image2.jpg',
        height: 400,
        id: 'image-2',
        mimeType: 'image/jpeg',
        savedAt: new Date(),
        size: 2048,
        type: 'file',
        width: 600,
      },
      {
        aspectRatio: 1.5,
        filename: 'image3.webp',
        height: 400,
        id: 'image-3',
        mimeType: 'image/webp',
        savedAt: new Date(),
        size: 1536,
        type: 'file',
        width: 600,
      },
    ];

    // Mock OPFS storage for all images
    vi.spyOn(imageStorage, 'getImage').mockImplementation((id: string) => {
      switch (id) {
        case 'image-1':
          return Promise.resolve(testFiles[0]);
        case 'image-2':
          return Promise.resolve(testFiles[1]);
        case 'image-3':
          return Promise.resolve(testFiles[2]);
        default:
          return Promise.resolve(null);
      }
    });

    let capturedRequest: unknown = null;
    server.use(
      http.get('http://*/models', () => {
        return HttpResponse.json({
          models: [
            {
              architecture: { input_modalities: ['text', 'image'] },
              id: 'google/gemini-2.5-flash',
            },
          ],
        });
      }),
      http.post('http://*/ai-chat', async ({ request }) => {
        capturedRequest = await request.json();
        return HttpResponse.json({
          response: 'I can see all your images!',
        });
      })
    );

    const requestWithMultipleImages: AiChatRequest = {
      apiKey: 'test-key',
      attachments: testAttachments,
      chatMateBackground: 'Assistant',
      chatMatePrompt: 'Analyze images',
      conversationHistory: [],
      culturalContext: false,
      currentDateTime: '2023-01-01T00:00:00Z',
      editorMateExpertise: 'Image expert',
      editorMatePrompt: 'Provide detailed analysis',
      enableReasoning: false,
      feedbackStyle: 'detailed',
      message: 'What do you see in these multiple images?',
      messageType: 'chat-mate-response',
      model: 'google/gemini-2.5-flash',
      progressiveComplexity: false,
      streaming: false,
      systemPrompt: null,
      targetLanguage: 'English',
      userTimezone: 'UTC',
    };

    const response = await apiClient.aiChat(requestWithMultipleImages);
    expect(response.status).toBe(200);

    // Verify all images were processed
    expectToNotBeNull(capturedRequest);
    const requestData = aiChatRequestSchema.parse(capturedRequest);

    expectToNotBeUndefined(requestData.attachments);
    expect(requestData.attachments).toHaveLength(3);

    expectToNotBeUndefined(requestData.multimodalMessage);
    expect(requestData.multimodalMessage).toHaveLength(4); // 1 text + 3 images

    // Verify text message comes first
    expect(requestData.multimodalMessage[0]).toEqual({
      text: 'What do you see in these multiple images?',
      type: 'text',
    });

    // Verify all images are in correct format
    for (let i = 1; i <= 3; i++) {
      const imageContent: { image_url?: { url: string }; type: string } =
        requestData.multimodalMessage[i];
      expectToNotBeUndefined(imageContent);
      expectToBe(imageContent.type, 'image_url');
      expectToNotBeUndefined(imageContent.image_url);
      expect(imageContent.image_url.url).toMatch(/^data:image\/[^;]+;base64,/);
    }

    vi.restoreAllMocks();
  });
});
