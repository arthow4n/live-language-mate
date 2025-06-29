import { z } from 'zod/v4';

import { attachmentSchema } from './imageAttachment.js';

// Message types for UI/storage
export const uiMessageTypeSchema = z.enum(['user', 'chat-mate', 'editor-mate']);

// Message metadata schema
export const messageMetadataSchema = z
  .object({
    endTime: z.number().optional(),
    generationTime: z.number().optional(), // in milliseconds
    model: z.string().optional(),
    startTime: z.number().optional(),
  })
  .strict();

// Core message schema - STRICT, no defaults
export const messageSchema = z
  .object({
    attachments: z.array(attachmentSchema).optional(),
    content: z.string(),
    id: z.string().min(1),
    isStreaming: z.boolean().optional(),
    metadata: messageMetadataSchema.optional(),
    parentMessageId: z.string().optional(),
    reasoning: z.string().optional(),
    timestamp: z.date(),
    type: uiMessageTypeSchema,
  })
  .strict();

// Local message schema (for localStorage) - uses same structure as Message
export const localMessageSchema = messageSchema;

// Conversation schema - STRICT, no defaults
export const conversationSchema = z
  .object({
    created_at: z.date(),
    id: z.string().min(1),
    language: z.string().min(1),
    messages: z.array(localMessageSchema),
    title: z.string().min(1),
    updated_at: z.date(),
  })
  .strict();

// Local conversation schema (for localStorage) - uses same structure
export const localConversationSchema = conversationSchema;

// Message creation input schema (excludes auto-generated fields)
export const messageCreateSchema = messageSchema.omit({
  id: true,
  timestamp: true,
});

// Message update schema (partial for updates)
export const messageUpdateSchema = messageSchema.partial();

// Conversation creation input schema (excludes auto-generated fields)
export const conversationCreateSchema = conversationSchema
  .omit({
    created_at: true,
    id: true,
    messages: true,
    updated_at: true,
  })
  .extend({
    messages: z.array(localMessageSchema).default([]),
  });

// Conversation update schema (partial for updates)
export const conversationUpdateSchema = conversationSchema.partial();

/**
 *
 */
export type Conversation = z.infer<typeof conversationSchema>;
/**
 *
 */
export type ConversationCreate = z.infer<typeof conversationCreateSchema>;
/**
 *
 */
export type ConversationUpdate = z.infer<typeof conversationUpdateSchema>;
/**
 *
 */
export type LocalConversation = z.infer<typeof localConversationSchema>;
/**
 *
 */
export type LocalMessage = z.infer<typeof localMessageSchema>;
/**
 *
 */
export type Message = z.infer<typeof messageSchema>;
/**
 *
 */
export type MessageCreate = z.infer<typeof messageCreateSchema>;
/**
 *
 */
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
/**
 *
 */
export type MessageUpdate = z.infer<typeof messageUpdateSchema>;
// Export type helpers
/**
 *
 */
export type UiMessageType = z.infer<typeof uiMessageTypeSchema>;
