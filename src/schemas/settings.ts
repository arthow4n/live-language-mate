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

// Global Settings Schema - STRICT, no defaults
export const globalSettingsSchema = z
  .object({
    model: z.string().min(1),
    apiKey: z.string(),
    targetLanguage: z.string().min(1),
    streaming: z.boolean(),
    theme: themeSchema,
    enableReasoning: z.boolean(),
    reasoningExpanded: z.boolean(),
  })
  .strict();

// Chat Settings Schema - STRICT, no defaults
export const chatSettingsSchema = z
  .object({
    // AI Personalities
    chatMatePersonality: z.string().min(1),
    editorMatePersonality: z.string().min(1),

    // General settings that can be overridden per chat
    model: z.string().min(1),
    apiKey: z.string(),
    targetLanguage: z.string().min(1),
    streaming: z.boolean(),
    enableReasoning: z.boolean(),
    reasoningExpanded: z.boolean(),

    // Advanced settings
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
    chatSettings: z.record(z.string(), chatSettingsSchema), // conversationId -> ChatSettings
    isLoaded: z.boolean(),
  })
  .strict();

// Partial update schemas for type safety
export const globalSettingsUpdateSchema = globalSettingsSchema.partial();
export const chatSettingsUpdateSchema = chatSettingsSchema.partial();

// Settings validation for localStorage
export const storedGlobalSettingsSchema = globalSettingsSchema;
export const storedChatSettingsSchema = z.record(
  z.string(),
  chatSettingsSchema
);

// Export type helpers
export type Theme = z.infer<typeof themeSchema>;
export type FeedbackStyle = z.infer<typeof feedbackStyleSchema>;
export type GlobalSettings = z.infer<typeof globalSettingsSchema>;
export type ChatSettings = z.infer<typeof chatSettingsSchema>;
export type SettingsContextState = z.infer<typeof settingsContextStateSchema>;
export type GlobalSettingsUpdate = z.infer<typeof globalSettingsUpdateSchema>;
export type ChatSettingsUpdate = z.infer<typeof chatSettingsUpdateSchema>;
export type StoredGlobalSettings = z.infer<typeof storedGlobalSettingsSchema>;
export type StoredChatSettings = z.infer<typeof storedChatSettingsSchema>;
