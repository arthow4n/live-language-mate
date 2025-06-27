import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Model, ModelsResponse } from '@/schemas/api';

import { expectToBe, expectToNotBeNull } from '@/__tests__/typedExpectHelpers';
import { apiClient } from '@/services/apiClient.js';
import { modelCapabilities } from '@/services/modelCapabilities';

vi.mock('@/services/apiClient.js', () => ({
  apiClient: {
    getModels: vi.fn(),
  },
}));

const mockApiClient = vi.mocked(apiClient);

describe('ModelCapabilities Service', () => {
  const mockModelWithImages: Model = {
    architecture: {
      input_modalities: ['text', 'image'],
      instruct_type: 'chat',
      output_modalities: ['text'],
      tokenizer: 'gemini',
    },
    canonical_slug: 'gemini-2.5-flash',
    context_length: 1000000,
    created: 1234567890,
    description: 'Multimodal model with image support',
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
    supported_parameters: ['tools', 'tool_choice', 'temperature'],
    top_provider: {
      context_length: 1000000,
      is_moderated: false,
      max_completion_tokens: 8192,
    },
  };

  const mockModelTextOnly: Model = {
    architecture: {
      input_modalities: ['text'],
      instruct_type: 'chat',
      output_modalities: ['text'],
      tokenizer: 'llama',
    },
    canonical_slug: 'llama-3.2-1b-instruct',
    context_length: 131072,
    created: 1234567890,
    description: 'Text-only model',
    id: 'meta-llama/llama-3.2-1b-instruct',
    name: 'Llama 3.2 1B Instruct',
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
    supported_parameters: ['temperature', 'top_p'],
    top_provider: {
      context_length: 131072,
      is_moderated: false,
      max_completion_tokens: 4096,
    },
  };

  const mockModelsResponse: ModelsResponse = {
    data: [mockModelWithImages, mockModelTextOnly],
  };

  beforeEach(() => {
    vi.clearAllMocks();
    modelCapabilities.clearCache();
  });

  test('getModels fetches and caches models from API', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const models = await modelCapabilities.getModels();

    expectToBe(models.length, 2);
    expectToBe(models[0].id, 'google/gemini-2.5-flash');
    expectToBe(models[1].id, 'meta-llama/llama-3.2-1b-instruct');
    expect(mockApiClient.getModels).toHaveBeenCalledTimes(1);
  });

  test('getModels returns cached data on subsequent calls', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const models1 = await modelCapabilities.getModels();
    const models2 = await modelCapabilities.getModels();

    expectToBe(models1, models2);
    expect(mockApiClient.getModels).toHaveBeenCalledTimes(1);
  });

  test('getModels refreshes cache after TTL expires', async () => {
    mockApiClient.getModels
      .mockResolvedValueOnce(mockModelsResponse)
      .mockResolvedValueOnce(mockModelsResponse);

    // Set very short TTL for testing
    modelCapabilities.setCacheTTL(10);

    await modelCapabilities.getModels();

    // Wait for cache to expire
    await new Promise((resolve) => setTimeout(resolve, 15));

    await modelCapabilities.getModels();

    expect(mockApiClient.getModels).toHaveBeenCalledTimes(2);
  });

  test('getModels returns stale cache on API error if cache exists', async () => {
    mockApiClient.getModels
      .mockResolvedValueOnce(mockModelsResponse)
      .mockRejectedValueOnce(new Error('API Error'));

    // First call succeeds and caches data
    const models1 = await modelCapabilities.getModels();

    // Set very short TTL to expire cache quickly
    modelCapabilities.setCacheTTL(10);

    // Wait for cache to expire
    await new Promise((resolve) => setTimeout(resolve, 15));

    // Second call should return cached data despite API error
    const models2 = await modelCapabilities.getModels();

    expectToBe(models1.length, 2);
    expectToBe(models2.length, 2);
    expect(mockApiClient.getModels).toHaveBeenCalledTimes(2);
  });

  test('supportsImages returns true for models with image modality', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const supportsImages = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );

    expectToBe(supportsImages, true);
  });

  test('supportsImages returns false for text-only models', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const supportsImages = await modelCapabilities.supportsImages(
      'meta-llama/llama-3.2-1b-instruct'
    );

    expectToBe(supportsImages, false);
  });

  test('supportsImages returns false for unknown models', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const supportsImages =
      await modelCapabilities.supportsImages('unknown/model');

    expectToBe(supportsImages, false);
  });

  test('supportsImages returns false on API error', async () => {
    mockApiClient.getModels.mockRejectedValueOnce(new Error('API Error'));

    const supportsImages = await modelCapabilities.supportsImages(
      'google/gemini-2.5-flash'
    );

    expectToBe(supportsImages, false);
  });

  test('getModelCapabilities returns model for valid ID', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const model = await modelCapabilities.getModelCapabilities(
      'google/gemini-2.5-flash'
    );

    expectToNotBeNull(model);
    expectToBe(model.id, 'google/gemini-2.5-flash');
    expectToBe(model.name, 'Gemini 2.5 Flash');
  });

  test('getModelCapabilities returns null for unknown model', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const model = await modelCapabilities.getModelCapabilities('unknown/model');

    expectToBe(model, null);
  });

  test('getModelCapabilities returns null on API error', async () => {
    mockApiClient.getModels.mockRejectedValueOnce(new Error('API Error'));

    const model = await modelCapabilities.getModelCapabilities(
      'google/gemini-2.5-flash'
    );

    expectToBe(model, null);
  });

  test('getModelsSupportingModality returns models with specific modality', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const imageModels =
      await modelCapabilities.getModelsSupportingModality('image');

    expectToBe(imageModels.length, 1);
    expectToBe(imageModels[0].id, 'google/gemini-2.5-flash');
  });

  test('getModelsSupportingModality returns empty array for unsupported modality', async () => {
    mockApiClient.getModels.mockResolvedValueOnce(mockModelsResponse);

    const videoModels =
      await modelCapabilities.getModelsSupportingModality('video');

    expectToBe(videoModels.length, 0);
  });

  test('getModelsSupportingModality returns empty array on API error', async () => {
    mockApiClient.getModels.mockRejectedValueOnce(new Error('API Error'));

    const models = await modelCapabilities.getModelsSupportingModality('image');

    expectToBe(models.length, 0);
  });

  test('clearCache resets cached data', async () => {
    mockApiClient.getModels
      .mockResolvedValueOnce(mockModelsResponse)
      .mockResolvedValueOnce(mockModelsResponse);

    await modelCapabilities.getModels();
    modelCapabilities.clearCache();
    await modelCapabilities.getModels();

    expect(mockApiClient.getModels).toHaveBeenCalledTimes(2);
  });

  test('setCacheTTL updates cache expiration time', async () => {
    mockApiClient.getModels
      .mockResolvedValueOnce(mockModelsResponse)
      .mockResolvedValueOnce(mockModelsResponse);

    // Set TTL to 50ms
    modelCapabilities.setCacheTTL(50);

    await modelCapabilities.getModels();

    // Wait longer than TTL
    await new Promise((resolve) => setTimeout(resolve, 60));

    await modelCapabilities.getModels();

    expect(mockApiClient.getModels).toHaveBeenCalledTimes(2);
  });
});
