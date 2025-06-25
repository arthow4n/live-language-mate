import type { AiChatRequest, ModelsResponse } from '@/schemas/api';

import { apiErrorResponseSchema, modelsResponseSchema } from '@/schemas/api';

const API_BASE_URL = ((): string => {
  const url: unknown = import.meta.env.VITE_API_BASE_URL;
  return typeof url === 'string' ? url : 'http://localhost:8000';
})();

/**
 *
 * @param request
 * @param options
 * @param options.signal
 */
async function aiChat(
  request: AiChatRequest,
  options?: { signal?: AbortSignal }
): Promise<Response> {
  const response = await fetch(`${API_BASE_URL}/ai-chat`, {
    body: JSON.stringify(request),
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'POST',
    signal: options?.signal,
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const parsed: unknown = JSON.parse(errorText);
      const errorResponse = apiErrorResponseSchema.parse(parsed);
      errorMessage = errorResponse.error;
    } catch {
      errorMessage = `API request failed: ${response.status.toString()}`;
    }
    throw new Error(errorMessage);
  }

  return response;
}

/**
 *
 */
async function getModels(): Promise<ModelsResponse> {
  const response = await fetch(`${API_BASE_URL}/models`, {
    headers: {
      'Content-Type': 'application/json',
    },
    method: 'GET',
  });

  if (!response.ok) {
    const errorText = await response.text();
    let errorMessage: string;
    try {
      const parsed: unknown = JSON.parse(errorText);
      const errorResponse = apiErrorResponseSchema.parse(parsed);
      errorMessage = errorResponse.error;
    } catch {
      errorMessage = `API request failed: ${response.status.toString()}`;
    }
    throw new Error(errorMessage);
  }

  const data: unknown = await response.json();
  return modelsResponseSchema.parse(data);
}

export const apiClient = {
  aiChat,
  getModels,
};

export type {
  AiChatRequest,
  AiChatNonStreamResponse as AiChatResponse,
  ModelsResponse,
} from '@/schemas/api';
