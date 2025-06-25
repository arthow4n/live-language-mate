import { z } from 'zod/v4';

import { localConversationSchema } from './messages';
import { conversationSettingsSchema, globalSettingsSchema } from './settings';

// Unified app data structure for localStorage - STRICT
export const localAppDataSchema = z
  .object({
    conversations: z.array(localConversationSchema),
    conversationSettings: z.record(z.string(), conversationSettingsSchema),
    globalSettings: globalSettingsSchema,
  })
  .strict();

// Panel sizes for UI state persistence - array of [left, right] percentages
export const panelSizesSchema = z.array(z.number().min(0).max(100)).length(2);

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
/**
 *
 */
export type LocalAppData = z.infer<typeof localAppDataSchema>;
/**
 *
 */
export type LocalStorageKeyType = keyof typeof localStorageSchemas;
/**
 *
 */
export type PanelSizes = z.infer<typeof panelSizesSchema>;

// Backwards compatibility schemas for localStorage parsing
export const legacyAppDataBasicSchema = z
  .object({
    conversations: z.array(z.unknown()).optional(),
    conversationSettings: z.record(z.string(), z.unknown()).optional(),
    globalSettings: z.unknown().optional(),
  })
  .strict();

export const legacyConversationWithStringDatesSchema = z.looseObject({
  created_at: z.string(),
  messages: z
    .array(
      z.looseObject({
        timestamp: z.string(),
      })
    )
    .optional(),
  updated_at: z.string(),
});

export const legacyMessageWithStringDateSchema = z.looseObject({
  timestamp: z.string(),
});

// Import/export validation schemas
export const importDataSchema = z.looseObject({
  chatSettings: z.record(z.string(), z.looseObject({})).optional(),
  conversations: z.array(z.unknown()).optional(),
  globalSettings: z.looseObject({}).optional(),
  settings: z.unknown().optional(),
  version: z.string().optional(),
});

export const exportDataSchema = z.strictObject({
  chatSettings: z.record(z.string(), conversationSettingsSchema),
  conversations: z.array(z.unknown()),
  exportDate: z.string(),
  globalSettings: globalSettingsSchema,
  version: z.string(),
});

export const legacyExportDataSchema = z
  .object({
    conversations: z.array(z.unknown()),
    settings: z.unknown(),
  })
  .strict();

export const legacySettingsRecordSchema = z.record(z.string(), z.unknown());

// Export type helpers
/**
 *
 */
export type ExportData = z.infer<typeof exportDataSchema>;
/**
 *
 */
export type ImportData = z.infer<typeof importDataSchema>;
/**
 *
 */
export type LegacyAppDataBasic = z.infer<typeof legacyAppDataBasicSchema>;
/**
 *
 */
export type LegacyConversationWithStringDates = z.infer<
  typeof legacyConversationWithStringDatesSchema
>;
/**
 *
 */
export type LegacyExportData = z.infer<typeof legacyExportDataSchema>;
/**
 *
 */
export type LegacyMessageWithStringDate = z.infer<
  typeof legacyMessageWithStringDateSchema
>;
/**
 *
 */
export type LegacySettingsRecord = z.infer<typeof legacySettingsRecordSchema>;
