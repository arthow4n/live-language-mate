import type { AiChatRequest, ModelsResponse } from '@/schemas/api';
import type { OpenRouterContent } from '@/schemas/api';
import type { ImageAttachment } from '@/schemas/imageAttachment';

import { apiErrorResponseSchema, modelsResponseSchema } from '@/schemas/api';
import { serializeImageAttachment } from '@/schemas/imageAttachment';

import {
  ErrorHandler,
  IMAGE_ERROR_CODES,
  ImageError,
  RetryHandler,
} from './errorHandling.js';
import { imageStorage } from './imageStorage.js';
import { convertToBase64DataURL } from './imageUtils.js';

const API_BASE_URL = ((): string => {
  const url: unknown = import.meta.env.VITE_API_BASE_URL;
  return typeof url === 'string' ? url : 'http://localhost:8000';
})();

/**
 * Configuration for API requests
 */
interface ApiRequestOptions {
  retries?: number;
  signal?: AbortSignal;
  timeout?: number;
}

/**
 * Makes an AI chat request with comprehensive error handling
 * @param request - The chat request data
 * @param options - Request options including timeout and retries
 */
async function aiChat(
  request: AiChatRequest,
  options: ApiRequestOptions = {}
): Promise<Response> {
  const { retries = 2, signal, timeout = 30000 } = options;

  return RetryHandler.withRetry(
    async () => {
      return RetryHandler.withTimeout(
        () => performAiChatRequest(request, { signal }),
        { operationName: 'AI chat request', timeoutMs: timeout }
      );
    },
    {
      baseDelay: 1000,
      maxAttempts: retries + 1,
      shouldRetry: (error) => {
        if (error instanceof ImageError) {
          return (
            error.code === IMAGE_ERROR_CODES.NETWORK_ERROR ||
            error.code === IMAGE_ERROR_CODES.TIMEOUT_ERROR
          );
        }
        return false;
      },
    }
  );
}

/**
 * Converts image attachments to OpenRouter's content format with base64 data URLs
 * @param attachments - Array of image attachments to convert
 * @returns Promise that resolves to array of OpenRouter image content objects
 */
async function convertAttachmentsToOpenRouterFormat(
  attachments: ImageAttachment[]
): Promise<OpenRouterContent[]> {
  const imageContents: OpenRouterContent[] = [];
  const errors: ImageError[] = [];

  for (const attachment of attachments) {
    try {
      // Get the image file from OPFS storage with timeout
      const file = await RetryHandler.withTimeout(
        () => imageStorage.getImage(attachment.id),
        { operationName: 'Loading image from storage', timeoutMs: 5000 }
      );

      if (!file) {
        throw new ImageError(`Image not found in storage: ${attachment.id}`, {
          cause: null,
          code: IMAGE_ERROR_CODES.CORRUPTED_FILE,
          details: { attachmentId: attachment.id },
          recoverable: false,
        });
      }

      // Convert to base64 data URL with timeout
      const base64DataUrl = await RetryHandler.withTimeout(
        () => convertToBase64DataURL(file),
        { operationName: 'Converting image to base64', timeoutMs: 10000 }
      );

      // Create OpenRouter image content format
      const imageContent: OpenRouterContent = {
        image_url: {
          url: base64DataUrl,
        },
        type: 'image_url',
      };

      imageContents.push(imageContent);
    } catch (error) {
      const imageError = ErrorHandler.normalizeError(
        error,
        `Converting attachment ${attachment.id}`
      );
      errors.push(imageError);
      console.error(
        `Failed to convert attachment ${attachment.id}:`,
        imageError.getUserMessage()
      );
    }
  }

  // If all images failed to convert, throw an error
  if (imageContents.length === 0 && attachments.length > 0) {
    throw new ImageError('All image attachments failed to process', {
      cause: null,
      code: IMAGE_ERROR_CODES.CONVERSION_FAILED,
      details: {
        errorCount: errors.length,
        totalAttachments: attachments.length,
      },
      recoverable: true,
    });
  }

  return imageContents;
}

/**
 * Fetches available models with comprehensive error handling
 * @param options - Request options including timeout and retries
 */
async function getModels(
  options: ApiRequestOptions = {}
): Promise<ModelsResponse> {
  const { retries = 2, signal, timeout = 15000 } = options;

  return RetryHandler.withRetry(
    async () => {
      return RetryHandler.withTimeout(
        () => performGetModelsRequest({ signal }),
        { operationName: 'Models request', timeoutMs: timeout }
      );
    },
    {
      baseDelay: 1000,
      maxAttempts: retries + 1,
      shouldRetry: (error) => {
        if (error instanceof ImageError) {
          // Always retry network and timeout errors
          if (
            error.code === IMAGE_ERROR_CODES.NETWORK_ERROR ||
            error.code === IMAGE_ERROR_CODES.TIMEOUT_ERROR
          ) {
            return true;
          }

          // For API errors, check the specific status code
          if (error.code === IMAGE_ERROR_CODES.API_ERROR) {
            const status = error.details?.status;
            // Retry server errors except 503 Service Unavailable
            // 503 should fail fast for testing failure scenarios
            return status === 500 || status === 502 || status === 504;
          }
        }
        return false;
      },
    }
  );
}

/**
 * Handles API error responses with detailed error mapping
 * @param response
 */
async function handleApiError(response: Response): Promise<never> {
  const status = response.status;
  let errorText: string;

  try {
    errorText = await response.text();
  } catch {
    errorText = `HTTP ${String(status)}`;
  }

  let errorMessage = `API request failed: ${String(status)}`;
  let errorCode: keyof typeof IMAGE_ERROR_CODES = 'API_ERROR';
  const details: Record<string, unknown> = {
    status,
    statusText: response.statusText,
  };

  try {
    const parsed: unknown = JSON.parse(errorText);
    const errorResponse = apiErrorResponseSchema.parse(parsed);
    errorMessage = errorResponse.error;

    // Map specific API errors to appropriate codes
    if (errorMessage.includes('does not support image inputs')) {
      errorCode = 'MODEL_NOT_SUPPORTED';
    } else if (
      errorMessage.includes('quota') ||
      errorMessage.includes('credit')
    ) {
      errorCode = 'INSUFFICIENT_CREDITS';
    } else if (status === 429) {
      errorCode = 'RATE_LIMITED';
    } else if (status >= 500) {
      errorCode = 'API_ERROR';
    }
  } catch {
    // Use generic error message based on status code
    switch (status) {
      case 400:
        errorMessage = 'Invalid request. Please check your input.';
        break;
      case 401:
        errorMessage = 'Invalid API key. Please check your credentials.';
        break;
      case 403:
        errorMessage = 'Access forbidden. Please check your permissions.';
        break;
      case 404:
        errorMessage = 'API endpoint not found.';
        break;
      case 429:
        errorMessage = 'Too many requests. Please wait before trying again.';
        errorCode = 'RATE_LIMITED';
        break;
      case 500:
      case 502:
      case 503:
      case 504:
        errorMessage = 'Server error. Please try again later.';
        errorCode = 'API_ERROR';
        break;
      default:
        errorMessage = `API request failed with status ${String(status)}`;
    }
  }

  const recoverable = status >= 500 || status === 429 || status === 408;
  throw new ImageError(errorMessage, {
    cause: null,
    code: IMAGE_ERROR_CODES[errorCode],
    details,
    recoverable,
  });
}

/**
 * Internal function to perform the actual AI chat request
 * @param request
 * @param options
 * @param options.signal
 */
async function performAiChatRequest(
  request: AiChatRequest,
  options?: { signal?: AbortSignal }
): Promise<Response> {
  // Process attachments if present to convert them to OpenRouter format
  let processedRequest = {
    ...request,
    // Always serialize attachments to match API schema
    attachments: request.attachments?.map(serializeImageAttachment),
  };

  if (request.attachments && request.attachments.length > 0) {
    try {
      // Convert attachments to OpenRouter's image content format
      const imageContents = await convertAttachmentsToOpenRouterFormat(
        request.attachments
      );

      if (imageContents.length > 0) {
        // Create multimodal message content: text first, then images
        const multimodalContent: OpenRouterContent[] = [
          {
            text: request.message,
            type: 'text',
          },
          ...imageContents,
        ];

        // Update the request to include the multimodal content
        processedRequest = {
          ...processedRequest,
          multimodalMessage: multimodalContent,
        };
      }
    } catch (error) {
      const imageError = ErrorHandler.normalizeError(
        error,
        'Processing image attachments'
      );
      console.error(
        'Failed to process image attachments:',
        imageError.getUserMessage()
      );
      // Continue with serialized attachments if image processing fails
      // This allows text-only fallback even if images fail
    }
  }

  let response: Response;
  try {
    response = await fetch(`${API_BASE_URL}/ai-chat`, {
      body: JSON.stringify(processedRequest),
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'POST',
      signal: options?.signal,
    });
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw ErrorHandler.createNetworkError();
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ImageError('Request was cancelled', {
        cause: error,
        code: IMAGE_ERROR_CODES.TIMEOUT_ERROR,
        recoverable: true,
      });
    }
    throw ErrorHandler.normalizeError(error, 'Network request');
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  return response;
}

/**
 * Internal function to perform the actual models request
 * @param options
 * @param options.signal
 */
async function performGetModelsRequest(options?: {
  signal?: AbortSignal;
}): Promise<ModelsResponse> {
  let response: Response;

  try {
    response = await fetch(`${API_BASE_URL}/models`, {
      headers: {
        'Content-Type': 'application/json',
      },
      method: 'GET',
      signal: options?.signal,
    });
  } catch (error) {
    // Handle network errors
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw ErrorHandler.createNetworkError();
    }
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw new ImageError('Request was cancelled', {
        cause: error,
        code: IMAGE_ERROR_CODES.TIMEOUT_ERROR,
        recoverable: true,
      });
    }
    throw ErrorHandler.normalizeError(error, 'Network request');
  }

  if (!response.ok) {
    await handleApiError(response);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (error) {
    throw new ImageError('Failed to parse API response', {
      cause: error instanceof Error ? error : null,
      code: IMAGE_ERROR_CODES.API_ERROR,
      details: {
        parseError: error instanceof Error ? error.message : String(error),
      },
      recoverable: true,
    });
  }

  try {
    return modelsResponseSchema.parse(data);
  } catch (error) {
    throw new ImageError('Invalid API response format', {
      cause: error instanceof Error ? error : null,
      code: IMAGE_ERROR_CODES.API_ERROR,
      details: {
        validationError: error instanceof Error ? error.message : String(error),
      },
      recoverable: false,
    });
  }
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
