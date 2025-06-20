import { z } from 'zod';
import { localConversationSchema } from './messages';
import { globalSettingsSchema, chatSettingsSchema } from './settings';
import { feedbackStyleSchema } from './settings';

// App data settings schema (legacy structure from localStorage service)
export const appDataSettingsSchema = z
  .object({
    model: z.string().min(1),
    apiKey: z.string(),
    targetLanguage: z.string().min(1),
    streaming: z.boolean(),
    chatMatePersonality: z.string().min(1),
    editorMatePersonality: z.string().min(1),
    chatMateBackground: z.string().min(1),
    editorMateExpertise: z.string().min(1),
    feedbackStyle: feedbackStyleSchema,
    culturalContext: z.boolean(),
    progressiveComplexity: z.boolean(),
    enableReasoning: z.boolean(),
    reasoningExpanded: z.boolean(),
  })
  .strict();

// Complete app data structure for localStorage - STRICT
export const localAppDataSchema = z
  .object({
    conversations: z.array(localConversationSchema),
    settings: appDataSettingsSchema,
  })
  .strict();

// Global settings localStorage schema
export const storedGlobalSettingsSchema = globalSettingsSchema;

// Chat settings localStorage schema (record of conversation ID to settings)
export const storedChatSettingsSchema = z.record(
  z.string(),
  chatSettingsSchema
);

// Settings context state for localStorage persistence
export const settingsContextStorageSchema = z
  .object({
    globalSettings: globalSettingsSchema,
    chatSettings: storedChatSettingsSchema,
  })
  .strict();

// Panel sizes for UI state persistence
export const panelSizesSchema = z
  .object({
    left: z.number().min(0).max(100),
    right: z.number().min(0).max(100),
  })
  .strict();

// localStorage keys enum for type safety
export const LocalStorageKeys = {
  APP_DATA: 'language-mate-data',
  GLOBAL_SETTINGS: 'language-mate-global-settings',
  CHAT_SETTINGS: 'language-mate-chat-settings',
  PANEL_SIZES: 'languageMate_panelSizes',
} as const;

// Validation schemas for each localStorage key
export const localStorageSchemas = {
  [LocalStorageKeys.APP_DATA]: localAppDataSchema,
  [LocalStorageKeys.GLOBAL_SETTINGS]: storedGlobalSettingsSchema,
  [LocalStorageKeys.CHAT_SETTINGS]: storedChatSettingsSchema,
  [LocalStorageKeys.PANEL_SIZES]: panelSizesSchema,
} as const;

// Export type helpers
export type AppDataSettings = z.infer<typeof appDataSettingsSchema>;
export type LocalAppData = z.infer<typeof localAppDataSchema>;
export type StoredGlobalSettings = z.infer<typeof storedGlobalSettingsSchema>;
export type StoredChatSettings = z.infer<typeof storedChatSettingsSchema>;
export type SettingsContextStorage = z.infer<
  typeof settingsContextStorageSchema
>;
export type PanelSizes = z.infer<typeof panelSizesSchema>;
export type LocalStorageKeyType = keyof typeof localStorageSchemas;
