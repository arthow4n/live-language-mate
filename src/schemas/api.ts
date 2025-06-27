import { z } from 'zod/v4';

import {
  imageAttachmentInputSchema,
  imageAttachmentSchema,
} from './imageAttachment.js';

// Message types for AI chat API requests
export const apiMessageTypeSchema = z.enum([
  'chat-mate-response',
  'editor-mate-response',
  'editor-mate-user-comment',
  'editor-mate-chatmate-comment',
  'title-generation',
]);

// Feedback styles
export const feedbackStyleSchema = z.enum([
  'encouraging',
  'gentle',
  'direct',
  'detailed',
]);

// OpenRouter content types for multi-modal messages
export const openRouterTextContentSchema = z.strictObject({
  text: z.string(),
  type: z.literal('text'),
});

export const openRouterImageUrlSchema = z.strictObject({
  url: z.string(),
});

export const openRouterImageContentSchema = z.strictObject({
  image_url: openRouterImageUrlSchema,
  type: z.literal('image_url'),
});

export const openRouterContentSchema = z.union([
  openRouterTextContentSchema,
  openRouterImageContentSchema,
]);

export const openRouterMessageContentSchema = z.union([
  z.string(), // Simple text message
  z.array(openRouterContentSchema), // Multi-modal content array
]);

// Chat message structure (backwards compatible)
export const chatMessageSchema = z.object({
  content: z.string(),
  role: z.enum(['system', 'user', 'assistant']),
});

// OpenRouter-compatible chat message structure for API requests
export const openRouterChatMessageSchema = z.strictObject({
  content: openRouterMessageContentSchema,
  role: z.enum(['system', 'user', 'assistant']),
});

// AI Chat Request Schema - STRICT, no defaults
export const aiChatRequestSchema = z
  .object({
    apiKey: z.string().optional(),
    attachments: z.array(imageAttachmentSchema).optional(),
    chatMateBackground: z.string(),
    chatMatePrompt: z.string(),
    conversationHistory: z.array(chatMessageSchema),
    culturalContext: z.boolean(),
    currentDateTime: z.string().nullable(),
    editorMateExpertise: z.string(),
    editorMatePrompt: z.string(),
    enableReasoning: z.boolean(),
    feedbackStyle: feedbackStyleSchema,
    message: z.string().min(1),
    messageType: apiMessageTypeSchema,
    model: z.string().min(1),
    multimodalMessage: z.array(openRouterContentSchema).optional(),
    progressiveComplexity: z.boolean(),
    streaming: z.boolean(),
    systemPrompt: z.string().nullable(),
    targetLanguage: z.string().min(1),
    userTimezone: z.string().nullable(),
  })
  .strict();

// AI Chat Request Wire Format Schema - for actual API calls with serialized dates
export const aiChatRequestWireSchema = z
  .object({
    apiKey: z.string().optional(),
    attachments: z.array(imageAttachmentInputSchema).optional(),
    chatMateBackground: z.string(),
    chatMatePrompt: z.string(),
    conversationHistory: z.array(chatMessageSchema),
    culturalContext: z.boolean(),
    currentDateTime: z.string().nullable(),
    editorMateExpertise: z.string(),
    editorMatePrompt: z.string(),
    enableReasoning: z.boolean(),
    feedbackStyle: feedbackStyleSchema,
    message: z.string().min(1),
    messageType: apiMessageTypeSchema,
    model: z.string().min(1),
    multimodalMessage: z.array(openRouterContentSchema).optional(),
    progressiveComplexity: z.boolean(),
    streaming: z.boolean(),
    systemPrompt: z.string().nullable(),
    targetLanguage: z.string().min(1),
    userTimezone: z.string().nullable(),
  })
  .strict();

// AI Chat Response Schemas
export const aiChatStreamResponseSchema = z
  .object({
    content: z.string().optional(),
    type: z.enum(['content', 'reasoning', 'done']),
  })
  .strict();

export const aiChatNonStreamResponseSchema = z
  .object({
    reasoning: z.string().optional(),
    response: z.string(),
  })
  .strict();

// Models API Schemas - Updated to match OpenRouter API format
export const modelArchitectureSchema = z
  .object({
    input_modalities: z.array(z.string()),
    instruct_type: z.string().nullable(),
    output_modalities: z.array(z.string()),
    tokenizer: z.string(),
  })
  .strict();

export const modelPricingSchema = z
  .object({
    completion: z.string(),
    image: z.string(),
    input_cache_read: z.string(),
    input_cache_write: z.string(),
    internal_reasoning: z.string(),
    prompt: z.string(),
    request: z.string(),
    web_search: z.string(),
  })
  .strict();

export const topProviderSchema = z
  .object({
    context_length: z.number(),
    is_moderated: z.boolean(),
    max_completion_tokens: z.number(),
  })
  .strict();

export const modelSchema = z
  .object({
    architecture: modelArchitectureSchema,
    canonical_slug: z.string(),
    context_length: z.number(),
    created: z.number(),
    description: z.string(),
    id: z.string(),
    name: z.string(),
    per_request_limits: z.unknown().nullable(),
    pricing: modelPricingSchema,
    supported_parameters: z.array(z.string()),
    top_provider: topProviderSchema,
  })
  .strict();

export const modelsResponseSchema = z
  .object({
    data: z.array(modelSchema),
  })
  .strict();

// Generic API Response wrapper
export const apiResponseSchema = <T extends z.ZodType>(
  dataSchema: T
): z.ZodObject<{ data: z.ZodOptional<T>; error: z.ZodOptional<z.ZodString> }> =>
  z
    .object({
      data: dataSchema.optional(),
      error: z.string().optional(),
    })
    .strict();

// API Error Response
export const apiErrorResponseSchema = z
  .object({
    error: z.string(),
  })
  .strict();

/**
 *
 */
export type AiChatNonStreamResponse = z.infer<
  typeof aiChatNonStreamResponseSchema
>;
/**
 *
 */
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
/**
 *
 */
export type AiChatStreamResponse = z.infer<typeof aiChatStreamResponseSchema>;
/**
 *
 */
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
// Export type helpers for better DX
/**
 *
 */
export type ApiMessageType = z.infer<typeof apiMessageTypeSchema>;
/**
 *
 */
export type ChatMessage = z.infer<typeof chatMessageSchema>;
/**
 *
 */
export type FeedbackStyle = z.infer<typeof feedbackStyleSchema>;
/**
 *
 */
export type Model = z.infer<typeof modelSchema>;
/**
 *
 */
export type ModelArchitecture = z.infer<typeof modelArchitectureSchema>;
/**
 *
 */
export type ModelPricing = z.infer<typeof modelPricingSchema>;
/**
 *
 */
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;
/**
 *
 */
export type TopProvider = z.infer<typeof topProviderSchema>;

// OpenRouter API response schemas for external API validation
export const openRouterStreamingDeltaSchema = z.looseObject({
  content: z.string().nullable().optional(),
  reasoning: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
});

export const openRouterStreamingChoiceSchema = z.looseObject({
  delta: openRouterStreamingDeltaSchema.nullable().optional(),
  finish_reason: z.string().nullable().optional(),
  index: z.number().nullable().optional(),
  logprobs: z.unknown().nullable().optional(),
  native_finish_reason: z.string().nullable().optional(),
});

export const openRouterStreamingResponseSchema = z.looseObject({
  choices: z.array(openRouterStreamingChoiceSchema).nullable().optional(),
});

export const openRouterMessageSchema = z.looseObject({
  content: z.string(),
  reasoning: z.string().nullable().optional(),
  refusal: z.string().nullable().optional(),
  role: z.string().nullable().optional(),
});

export const openRouterNonStreamingChoiceSchema = z.looseObject({
  finish_reason: z.string().nullable().optional(),
  index: z.number().nullable().optional(),
  logprobs: z.unknown().nullable().optional(),
  message: openRouterMessageSchema,
  native_finish_reason: z.string().nullable().optional(),
});

export const openRouterNonStreamingResponseSchema = z.looseObject({
  choices: z.array(openRouterNonStreamingChoiceSchema),
});

/**
 *
 */
export type OpenRouterChatMessage = z.infer<typeof openRouterChatMessageSchema>;
/**
 *
 */
export type OpenRouterContent = z.infer<typeof openRouterContentSchema>;
/**
 *
 */
export type OpenRouterImageContent = z.infer<
  typeof openRouterImageContentSchema
>;
/**
 *
 */
export type OpenRouterMessage = z.infer<typeof openRouterMessageSchema>;

/**
 *
 */
export type OpenRouterMessageContent = z.infer<
  typeof openRouterMessageContentSchema
>;
/**
 *
 */
export type OpenRouterNonStreamingResponse = z.infer<
  typeof openRouterNonStreamingResponseSchema
>;
/**
 *
 */
export type OpenRouterStreamingDelta = z.infer<
  typeof openRouterStreamingDeltaSchema
>;
/**
 *
 */
export type OpenRouterStreamingResponse = z.infer<
  typeof openRouterStreamingResponseSchema
>;
// OpenRouter content types
/**
 *
 */
export type OpenRouterTextContent = z.infer<typeof openRouterTextContentSchema>;
