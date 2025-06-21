import { z } from 'zod';
import { localConversationSchema } from './messages';
import { globalSettingsSchema, conversationSettingsSchema } from './settings';

// Unified app data structure for localStorage - STRICT
export const localAppDataSchema = z
  .object({
    conversations: z.array(localConversationSchema),
    globalSettings: globalSettingsSchema,
    conversationSettings: z.record(z.string(), conversationSettingsSchema),
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
  PANEL_SIZES: 'languageMate_panelSizes',
} as const;

// Validation schemas for each localStorage key
export const localStorageSchemas = {
  [LocalStorageKeys.APP_DATA]: localAppDataSchema,
  [LocalStorageKeys.PANEL_SIZES]: panelSizesSchema,
} as const;

// Export type helpers
export type LocalAppData = z.infer<typeof localAppDataSchema>;
export type PanelSizes = z.infer<typeof panelSizesSchema>;
export type LocalStorageKeyType = keyof typeof localStorageSchemas;
