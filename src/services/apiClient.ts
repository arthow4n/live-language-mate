import type { AiChatRequest, ModelsResponse } from '@/schemas/api';

const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL as string | undefined) ??
  'http://localhost:8000';

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
      const errorData = JSON.parse(errorText) as { error?: string };
      errorMessage =
        errorData.error ?? `API request failed: ${response.status.toString()}`;
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
      const errorData = JSON.parse(errorText) as { error?: string };
      errorMessage =
        errorData.error ?? `API request failed: ${response.status.toString()}`;
    } catch {
      errorMessage = `API request failed: ${response.status.toString()}`;
    }
    throw new Error(errorMessage);
  }

  return response.json() as Promise<ModelsResponse>;
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
