import { describe, expect, test } from 'vitest';

import {
  type ConversationSettings,
  conversationSettingsSchema,
  type GlobalSettings,
  globalSettingsSchema,
  type LanguageLevel,
} from './settings';

const createValidGlobalSettings = (): GlobalSettings => ({
  apiKey: 'test-api-key',
  chatMateBackground: 'young professional, loves local culture',
  chatMatePersonality:
    'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
  culturalContext: true,
  editorMateExpertise: '10+ years teaching experience',
  editorMatePersonality:
    'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
  enableReasoning: true,
  feedbackLanguage: 'English',
  feedbackStyle: 'encouraging',
  languageLevel: 'intermediate',
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system',
});

const createValidConversationSettings = (): ConversationSettings => ({
  apiKey: 'test-api-key',
  chatMateBackground: 'young professional, loves local culture',
  chatMatePersonality:
    'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
  culturalContext: true,
  editorMateExpertise: '10+ years teaching experience',
  editorMatePersonality:
    'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
  enableReasoning: true,
  feedbackLanguage: 'Spanish',
  feedbackStyle: 'encouraging',
  languageLevel: 'advanced',
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system',
});

describe('Settings Schema Tests', () => {
  describe('GlobalSettings Schema', () => {
    test('should validate valid global settings with feedbackLanguage', () => {
      const validSettings = createValidGlobalSettings();
      expect(() => globalSettingsSchema.parse(validSettings)).not.toThrow();
    });

    test('should require feedbackLanguage field', () => {
      const validSettings = createValidGlobalSettings();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to remove feedbackLanguage
      const { feedbackLanguage, ...settingsWithoutFeedbackLanguage } =
        validSettings;

      expect(() =>
        globalSettingsSchema.parse(settingsWithoutFeedbackLanguage)
      ).toThrow(/feedbackLanguage/);
    });

    test('should reject empty feedbackLanguage', () => {
      const settingsWithEmptyFeedbackLanguage = {
        ...createValidGlobalSettings(),
        feedbackLanguage: '',
      };

      expect(() =>
        globalSettingsSchema.parse(settingsWithEmptyFeedbackLanguage)
      ).toThrow();
    });

    test('should accept different feedback languages', () => {
      const languages = [
        'English',
        'Spanish',
        'French',
        'German',
        'Portuguese',
      ];

      languages.forEach((language) => {
        const settings = {
          ...createValidGlobalSettings(),
          feedbackLanguage: language,
        };

        expect(() => globalSettingsSchema.parse(settings)).not.toThrow();
      });
    });
  });

  describe('ConversationSettings Schema', () => {
    test('should validate valid conversation settings with feedbackLanguage', () => {
      const validSettings = createValidConversationSettings();
      expect(() =>
        conversationSettingsSchema.parse(validSettings)
      ).not.toThrow();
    });

    test('should require feedbackLanguage field', () => {
      const validSettings = createValidConversationSettings();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to remove feedbackLanguage
      const { feedbackLanguage, ...settingsWithoutFeedbackLanguage } =
        validSettings;

      expect(() =>
        conversationSettingsSchema.parse(settingsWithoutFeedbackLanguage)
      ).toThrow(/feedbackLanguage/);
    });

    test('should reject empty feedbackLanguage', () => {
      const settingsWithEmptyFeedbackLanguage = {
        ...createValidConversationSettings(),
        feedbackLanguage: '',
      };

      expect(() =>
        conversationSettingsSchema.parse(settingsWithEmptyFeedbackLanguage)
      ).toThrow();
    });

    test('should allow feedbackLanguage different from targetLanguage', () => {
      const settings = {
        ...createValidConversationSettings(),
        feedbackLanguage: 'Spanish',
        targetLanguage: 'Swedish',
      };

      expect(() => conversationSettingsSchema.parse(settings)).not.toThrow();
    });
  });

  describe('FeedbackLanguage Validation', () => {
    test('should accept common language names', () => {
      const commonLanguages = [
        'English',
        'Spanish',
        'French',
        'German',
        'Portuguese',
        'Italian',
        'Dutch',
        'Swedish',
        'Norwegian',
        'Danish',
      ];

      commonLanguages.forEach((language) => {
        const globalSettings = {
          ...createValidGlobalSettings(),
          feedbackLanguage: language,
        };
        const conversationSettings = {
          ...createValidConversationSettings(),
          feedbackLanguage: language,
        };

        expect(() => globalSettingsSchema.parse(globalSettings)).not.toThrow();
        expect(() =>
          conversationSettingsSchema.parse(conversationSettings)
        ).not.toThrow();
      });
    });
  });

  describe('LanguageLevel Validation', () => {
    test('should validate valid language levels for global settings', () => {
      const validLevels: LanguageLevel[] = [
        'beginner',
        'intermediate',
        'advanced',
      ];

      validLevels.forEach((level) => {
        const settings = {
          ...createValidGlobalSettings(),
          languageLevel: level,
        };

        expect(() => globalSettingsSchema.parse(settings)).not.toThrow();
      });
    });

    test('should validate valid language levels for conversation settings', () => {
      const validLevels: LanguageLevel[] = [
        'beginner',
        'intermediate',
        'advanced',
      ];

      validLevels.forEach((level) => {
        const settings = {
          ...createValidConversationSettings(),
          languageLevel: level,
        };

        expect(() => conversationSettingsSchema.parse(settings)).not.toThrow();
      });
    });

    test('should reject invalid language levels for global settings', () => {
      const invalidLevels = ['expert', 'novice', 'fluent', 'basic'];

      invalidLevels.forEach((level) => {
        const settings = {
          ...createValidGlobalSettings(),
          languageLevel: level,
        };

        expect(() => globalSettingsSchema.parse(settings)).toThrow();
      });
    });

    test('should reject invalid language levels for conversation settings', () => {
      const invalidLevels = ['expert', 'novice', 'fluent', 'basic'];

      invalidLevels.forEach((level) => {
        const settings = {
          ...createValidConversationSettings(),
          languageLevel: level,
        };

        expect(() => conversationSettingsSchema.parse(settings)).toThrow();
      });
    });

    test('should require languageLevel field for global settings', () => {
      const validSettings = createValidGlobalSettings();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to remove languageLevel
      const { languageLevel, ...settingsWithoutLanguageLevel } = validSettings;

      expect(() =>
        globalSettingsSchema.parse(settingsWithoutLanguageLevel)
      ).toThrow(/languageLevel/);
    });

    test('should require languageLevel field for conversation settings', () => {
      const validSettings = createValidConversationSettings();
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- Destructuring to remove languageLevel
      const { languageLevel, ...settingsWithoutLanguageLevel } = validSettings;

      expect(() =>
        conversationSettingsSchema.parse(settingsWithoutLanguageLevel)
      ).toThrow(/languageLevel/);
    });
  });
});
