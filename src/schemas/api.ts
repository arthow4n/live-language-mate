import { z } from 'zod';

// Message types for AI chat
export const messageTypeSchema = z.enum([
  'chat-mate-response',
  'editor-mate-response',
  'editor-mate-user-comment',
  'editor-mate-chatmate-comment',
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
  role: z.enum(['system', 'user', 'assistant']),
  content: z.string(),
});

// AI Chat Request Schema - STRICT, no defaults
export const aiChatRequestSchema = z
  .object({
    message: z.string().min(1),
    messageType: messageTypeSchema,
    conversationHistory: z.array(chatMessageSchema),
    systemPrompt: z.string().nullable(),
    chatMatePrompt: z.string(),
    editorMatePrompt: z.string(),
    targetLanguage: z.string().min(1),
    model: z.string().min(1),
    apiKey: z.string().optional(),
    chatMateBackground: z.string(),
    editorMateExpertise: z.string(),
    feedbackStyle: feedbackStyleSchema,
    culturalContext: z.boolean(),
    progressiveComplexity: z.boolean(),
    streaming: z.boolean(),
    currentDateTime: z.string().nullable(),
    userTimezone: z.string().nullable(),
    enableReasoning: z.boolean(),
  })
  .strict();

// AI Chat Response Schemas
export const aiChatStreamResponseSchema = z
  .object({
    type: z.enum(['content', 'reasoning', 'done']),
    content: z.string().optional(),
  })
  .strict();

export const aiChatNonStreamResponseSchema = z
  .object({
    response: z.string(),
    reasoning: z.string().nullable(),
  })
  .strict();

// Models API Schemas
export const modelPricingSchema = z
  .object({
    prompt: z.string(),
    completion: z.string(),
  })
  .strict();

export const modelSchema = z
  .object({
    id: z.string(),
    name: z.string(),
    description: z.string().optional(),
    pricing: modelPricingSchema.optional(),
    context_length: z.number().optional(),
  })
  .strict();

export const modelsResponseSchema = z
  .object({
    models: z.array(modelSchema),
    fallback: z.boolean().optional(),
  })
  .strict();

// Generic API Response wrapper
export const apiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
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

// Export type helpers for better DX
export type MessageType = z.infer<typeof messageTypeSchema>;
export type FeedbackStyle = z.infer<typeof feedbackStyleSchema>;
export type ChatMessage = z.infer<typeof chatMessageSchema>;
export type AiChatRequest = z.infer<typeof aiChatRequestSchema>;
export type AiChatStreamResponse = z.infer<typeof aiChatStreamResponseSchema>;
export type AiChatNonStreamResponse = z.infer<
  typeof aiChatNonStreamResponseSchema
>;
export type Model = z.infer<typeof modelSchema>;
export type ModelsResponse = z.infer<typeof modelsResponseSchema>;
export type ApiErrorResponse = z.infer<typeof apiErrorResponseSchema>;
