import { z } from 'zod';

// Theme options
export const themeSchema = z.enum(['light', 'dark', 'system']);

// Feedback styles (reusing from API schemas for consistency)
export const feedbackStyleSchema = z.enum([
  'encouraging',
  'gentle',
  'direct',
  'detailed',
]);

// Unified Settings Schema - contains all settings for a conversation
export const conversationSettingsSchema = z
  .object({
    // Core API settings
    model: z.string().min(1),
    apiKey: z.string(),
    targetLanguage: z.string().min(1),
    streaming: z.boolean(),
    enableReasoning: z.boolean(),
    reasoningExpanded: z.boolean(),

    // UI settings (only stored globally)
    theme: themeSchema,

    // AI Personalities (per conversation)
    chatMatePersonality: z.string().min(1),
    editorMatePersonality: z.string().min(1),
    chatMateBackground: z.string().min(1),
    editorMateExpertise: z.string().min(1),
    feedbackStyle: feedbackStyleSchema,
    culturalContext: z.boolean(),
    progressiveComplexity: z.boolean(),
  })
  .strict();

// Global Settings Schema - UI and default settings
export const globalSettingsSchema = z
  .object({
    model: z.string().min(1),
    apiKey: z.string(),
    targetLanguage: z.string().min(1),
    streaming: z.boolean(),
    theme: themeSchema,
    enableReasoning: z.boolean(),
    reasoningExpanded: z.boolean(),
    chatMatePersonality: z.string().min(1),
    editorMatePersonality: z.string().min(1),
    chatMateBackground: z.string().min(1),
    editorMateExpertise: z.string().min(1),
    feedbackStyle: feedbackStyleSchema,
    culturalContext: z.boolean(),
    progressiveComplexity: z.boolean(),
  })
  .strict();

// Settings Context State Schema
export const settingsContextStateSchema = z
  .object({
    globalSettings: globalSettingsSchema,
    conversationSettings: z.record(z.string(), conversationSettingsSchema), // conversationId -> ConversationSettings
    isLoaded: z.boolean(),
  })
  .strict();

// Partial update schemas for type safety
export const globalSettingsUpdateSchema = globalSettingsSchema.partial();
export const conversationSettingsUpdateSchema =
  conversationSettingsSchema.partial();

// Settings validation for localStorage
export const storedGlobalSettingsSchema = globalSettingsSchema;
export const storedConversationSettingsSchema = z.record(
  z.string(),
  conversationSettingsSchema
);

// Export type helpers
export type Theme = z.infer<typeof themeSchema>;
export type FeedbackStyle = z.infer<typeof feedbackStyleSchema>;
export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type ConversationSettings = z.infer<typeof conversationSettingsSchema>;
export type SettingsContextState = z.infer<typeof settingsContextStateSchema>;
export type GlobalSettingsUpdate = z.infer<typeof globalSettingsUpdateSchema>;
export type ConversationSettingsUpdate = z.infer<
  typeof conversationSettingsUpdateSchema
>;
export type StoredGlobalSettings = z.infer<typeof storedGlobalSettingsSchema>;
export type StoredConversationSettings = z.infer<
  typeof storedConversationSettingsSchema
>;

// Legacy aliases for backward compatibility during migration
export type ChatSettings = ConversationSettings;
export type ChatSettingsUpdate = ConversationSettingsUpdate;
export type StoredChatSettings = StoredConversationSettings;
