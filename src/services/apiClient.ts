import type { AiChatRequest, ModelsResponse } from '@/schemas/api';

import { modelsResponseSchema } from '@/schemas/api';

const API_BASE_URL = (() => {
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
      const apiError = getErrorMessage(parsed);
      errorMessage =
        apiError ?? `API request failed: ${response.status.toString()}`;
    } catch {
      errorMessage = `API request failed: ${response.status.toString()}`;
    }
    throw new Error(errorMessage);
  }

  return response;
}

/**
 *
 * @param value
 */
function getErrorMessage(value: unknown): string | undefined {
  if (value === null || typeof value !== 'object') return undefined;
  if (!('error' in value)) return undefined;
  // TypeScript knows 'error' exists in value at this point
  const errorProperty = value.error;
  return typeof errorProperty === 'string' ? errorProperty : undefined;
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
      const apiError = getErrorMessage(parsed);
      errorMessage =
        apiError ?? `API request failed: ${response.status.toString()}`;
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
