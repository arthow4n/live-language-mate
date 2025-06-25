import { z } from 'zod/v4';

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

// Chat message structure
export const chatMessageSchema = z.object({
  content: z.string(),
  role: z.enum(['system', 'user', 'assistant']),
});

// AI Chat Request Schema - STRICT, no defaults
export const aiChatRequestSchema = z
  .object({
    apiKey: z.string().optional(),
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

// Models API Schemas
export const modelPricingSchema = z
  .object({
    completion: z.string(),
    prompt: z.string(),
  })
  .strict();

export const modelSchema = z
  .object({
    context_length: z.number().optional(),
    description: z.string().optional(),
    id: z.string(),
    name: z.string(),
    pricing: modelPricingSchema.optional(),
  })
  .strict();

export const modelsResponseSchema = z
  .object({
    fallback: z.boolean().optional(),
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
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;

// OpenRouter API response schemas for external API validation
export const openRouterStreamingDeltaSchema = z
  .object({
    content: z.string().optional(),
    reasoning: z.string().optional(),
  })
  .strict();

export const openRouterStreamingChoiceSchema = z
  .object({
    delta: openRouterStreamingDeltaSchema.optional(),
  })
  .strict();

export const openRouterStreamingResponseSchema = z.looseObject({
  choices: z.array(openRouterStreamingChoiceSchema).optional(),
});

export const openRouterMessageSchema = z
  .object({
    content: z.string(),
    reasoning: z.string().optional(),
  })
  .strict();

export const openRouterNonStreamingChoiceSchema = z
  .object({
    message: openRouterMessageSchema,
  })
  .strict();

export const openRouterNonStreamingResponseSchema = z.looseObject({
  choices: z.array(openRouterNonStreamingChoiceSchema),
});

/**
 *
 */
export type OpenRouterMessage = z.infer<typeof openRouterMessageSchema>;
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
