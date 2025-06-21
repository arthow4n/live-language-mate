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
    apiKey: z.string(),
    chatMateBackground: z.string().min(1),
    // AI Personalities (per conversation)
    chatMatePersonality: z.string().min(1),
    culturalContext: z.boolean(),
    editorMateExpertise: z.string().min(1),
    editorMatePersonality: z.string().min(1),

    enableReasoning: z.boolean(),

    feedbackStyle: feedbackStyleSchema,
    // Core API settings
    model: z.string().min(1),
    progressiveComplexity: z.boolean(),
    reasoningExpanded: z.boolean(),
    streaming: z.boolean(),
    targetLanguage: z.string().min(1),
    // UI settings (only stored globally)
    theme: themeSchema,
  })
  .strict();

// Global Settings Schema - UI and default settings
export const globalSettingsSchema = z
  .object({
    apiKey: z.string(),
    chatMateBackground: z.string().min(1),
    chatMatePersonality: z.string().min(1),
    culturalContext: z.boolean(),
    editorMateExpertise: z.string().min(1),
    editorMatePersonality: z.string().min(1),
    enableReasoning: z.boolean(),
    feedbackStyle: feedbackStyleSchema,
    model: z.string().min(1),
    progressiveComplexity: z.boolean(),
    reasoningExpanded: z.boolean(),
    streaming: z.boolean(),
    targetLanguage: z.string().min(1),
    theme: themeSchema,
  })
  .strict();

// Settings Context State Schema
export const settingsContextStateSchema = z
  .object({
    conversationSettings: z.record(z.string(), conversationSettingsSchema), // conversationId -> ConversationSettings
    globalSettings: globalSettingsSchema,
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

// Legacy aliases for backward compatibility during migration
export type ChatSettings = ConversationSettings;
export type ChatSettingsUpdate = ConversationSettingsUpdate;
export type ConversationSettings = z.infer<typeof conversationSettingsSchema>;
export type ConversationSettingsUpdate = z.infer<
  typeof conversationSettingsUpdateSchema
>;
export type FeedbackStyle = z.infer<typeof feedbackStyleSchema>;
export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type GlobalSettingsUpdate = z.infer<typeof globalSettingsUpdateSchema>;
export type SettingsContextState = z.infer<typeof settingsContextStateSchema>;
export type StoredChatSettings = StoredConversationSettings;

export type StoredConversationSettings = z.infer<
  typeof storedConversationSettingsSchema
>;
export type StoredGlobalSettings = z.infer<typeof storedGlobalSettingsSchema>;
// Export type helpers
export type Theme = z.infer<typeof themeSchema>;
