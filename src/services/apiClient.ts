import type { AiChatRequest, ModelsResponse } from '@/schemas/api';
import type { OpenRouterContent } from '@/schemas/api';
import type { ImageAttachment } from '@/schemas/imageAttachment';

import { apiErrorResponseSchema, modelsResponseSchema } from '@/schemas/api';
import { serializeImageAttachment } from '@/schemas/imageAttachment';

import { imageStorage } from './imageStorage.js';
import { convertToBase64DataURL } from './imageUtils.js';

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
      console.error('Failed to process image attachments:', error);
      // Continue with serialized attachments if image processing fails
    }
  }

  const response = await fetch(`${API_BASE_URL}/ai-chat`, {
    body: JSON.stringify(processedRequest),
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
 * Converts image attachments to OpenRouter's content format with base64 data URLs
 * @param attachments - Array of image attachments to convert
 * @returns Promise that resolves to array of OpenRouter image content objects
 */
async function convertAttachmentsToOpenRouterFormat(
  attachments: ImageAttachment[]
): Promise<OpenRouterContent[]> {
  const imageContents: OpenRouterContent[] = [];

  for (const attachment of attachments) {
    try {
      // Get the image file from OPFS storage
      const file = await imageStorage.getImage(attachment.id);
      if (!file) {
        throw new Error(`Image not found in storage: ${attachment.id}`);
      }

      // Convert to base64 data URL
      const base64DataUrl = await convertToBase64DataURL(file);

      // Create OpenRouter image content format
      const imageContent: OpenRouterContent = {
        image_url: {
          url: base64DataUrl,
        },
        type: 'image_url',
      };

      imageContents.push(imageContent);
    } catch (error) {
      // Log error but continue with other images
      console.error(`Failed to convert attachment ${attachment.id}:`, error);
    }
  }

  return imageContents;
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
