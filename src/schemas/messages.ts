import { z } from 'zod';

// Message types
export const messageTypeSchema = z.enum(['user', 'chat-mate', 'editor-mate']);

// AI modes for conversations
export const aiModeSchema = z.enum(['dual', 'chat-mate-only', 'editor-mate-only']); 

// Message metadata schema
export const messageMetadataSchema = z.object({
  model: z.string().optional(),
  generationTime: z.number().optional(), // in milliseconds
  startTime: z.number().optional(),
  endTime: z.number().optional()
}).strict();

// Core message schema - STRICT, no defaults
export const messageSchema = z.object({
  id: z.string().min(1),
  type: messageTypeSchema,
  content: z.string(),
  timestamp: z.date(),
  isStreaming: z.boolean().optional(),
  parentMessageId: z.string().optional(), 
  reasoning: z.string().optional(),
  metadata: messageMetadataSchema.optional()
}).strict();

// Local message schema (for localStorage) - uses same structure as Message
export const localMessageSchema = messageSchema;

// Conversation schema - STRICT, no defaults
export const conversationSchema = z.object({
  id: z.string().min(1),
  title: z.string().min(1),
  language: z.string().min(1),
  ai_mode: aiModeSchema,
  chat_mate_prompt: z.string().optional(),
  editor_mate_prompt: z.string().optional(),
  created_at: z.date(),
  updated_at: z.date(),
  messages: z.array(localMessageSchema)
}).strict();

// Local conversation schema (for localStorage) - uses same structure
export const localConversationSchema = conversationSchema;

// Message creation input schema (excludes auto-generated fields)
export const messageCreateSchema = messageSchema.omit({
  id: true,
  timestamp: true
});

// Message update schema (partial for updates)
export const messageUpdateSchema = messageSchema.partial();

// Conversation creation input schema (excludes auto-generated fields)
export const conversationCreateSchema = conversationSchema.omit({
  id: true,
  created_at: true,
  updated_at: true,
  messages: true
}).extend({
  messages: z.array(localMessageSchema).default([])
});

// Conversation update schema (partial for updates)
export const conversationUpdateSchema = conversationSchema.partial();

// Export type helpers
export type MessageType = z.infer<typeof messageTypeSchema>;
export type AiMode = z.infer<typeof aiModeSchema>;
export type MessageMetadata = z.infer<typeof messageMetadataSchema>;
export type Message = z.infer<typeof messageSchema>;
export type LocalMessage = z.infer<typeof localMessageSchema>;
export type Conversation = z.infer<typeof conversationSchema>;
export type LocalConversation = z.infer<typeof localConversationSchema>;
export type MessageCreate = z.infer<typeof messageCreateSchema>;
export type MessageUpdate = z.infer<typeof messageUpdateSchema>;
export type ConversationCreate = z.infer<typeof conversationCreateSchema>;
export type ConversationUpdate = z.infer<typeof conversationUpdateSchema>;