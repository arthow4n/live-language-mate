import { z } from 'zod';
import {
  aiChatRequestSchema,
  aiChatNonStreamResponseSchema,
  modelsResponseSchema,
  apiErrorResponseSchema,
} from '@/schemas/api';
import { parseStoredData } from '@/utils/validation';

// Configuration for the standalone API
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

// Import types from schemas - no more manual interfaces
import type {
  AiChatRequest,
  AiChatNonStreamResponse,
  ModelsResponse,
  ApiErrorResponse,
} from '@/types/api';

// Generic API Response wrapper
interface ApiResponse<T> {
  data?: T;
  error?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async aiChat(
    request: AiChatRequest,
    options?: { signal?: AbortSignal }
  ): Promise<Response> {
    // Validate request before sending - strict validation
    const validatedRequest = aiChatRequestSchema.parse(request);

    const response = await fetch(`${this.baseUrl}/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(validatedRequest),
      signal: options?.signal,
    });

    if (!response.ok) {
      try {
        const errorData = await response.json();
        const validatedError = apiErrorResponseSchema.parse(errorData);
        throw new Error(validatedError.error);
      } catch (parseError) {
        throw new Error(`API request failed: ${response.status}`);
      }
    }

    return response;
  }

  async getModels(): Promise<ApiResponse<ModelsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        try {
          const errorData = await response.json();
          const validatedError = apiErrorResponseSchema.parse(errorData);
          throw new Error(validatedError.error);
        } catch (parseError) {
          throw new Error(`API request failed: ${response.status}`);
        }
      }

      const data = await response.json();
      // Validate response data - strict validation
      const validatedData = modelsResponseSchema.parse(data);
      return { data: validatedData };
    } catch (error) {
      console.error('Failed to fetch models from API:', error);
      return {
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();

// Re-export types from schemas for convenience
export type {
  AiChatRequest,
  AiChatNonStreamResponse as AiChatResponse,
  ModelsResponse,
} from '@/types/api';
