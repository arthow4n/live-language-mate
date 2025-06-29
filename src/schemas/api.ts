import { z } from 'zod/v4';

import { attachmentInputSchema, attachmentSchema } from './imageAttachment.ts';

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
    attachments: z.array(attachmentSchema).optional(),
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
    attachments: z.array(attachmentInputSchema).optional(),
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
export const modelArchitectureSchema = z.looseObject({
  input_modalities: z.array(z.string()),
  instruct_type: z.string().nullable(),
  output_modalities: z.array(z.string()),
  tokenizer: z.string(),
});

export const modelPricingSchema = z.looseObject({
  completion: z.string().nullish(),
  image: z.string().nullish(),
  input_cache_read: z.string().nullish(),
  input_cache_write: z.string().nullish(),
  internal_reasoning: z.string().nullish(),
  prompt: z.string().nullish(),
  request: z.string().nullish(),
  web_search: z.string().nullish(),
});

export const topProviderSchema = z.looseObject({
  context_length: z.number().nullish(),
  is_moderated: z.boolean().nullish(),
  max_completion_tokens: z.number().nullish(),
});

export const modelSchema = z.looseObject({
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
});

export const modelsResponseSchema = z
  .object({
    models: z.array(modelSchema),
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
export type AiChatRequestWire = z.infer<typeof aiChatRequestWireSchema>;
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
