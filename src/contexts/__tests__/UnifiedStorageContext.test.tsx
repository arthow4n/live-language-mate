import { render } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { expectToNotBeUndefined } from '@/__tests__/typedExpectHelpers';
import { LocalStorageKeys } from '@/schemas/storage';

import {
  UnifiedStorageProvider,
  useUnifiedStorage,
} from '../UnifiedStorageContext';

// Test component to access the context
const TestComponent = ({
  onRender,
}: {
  onRender: (context: ReturnType<typeof useUnifiedStorage>) => void;
}): null => {
  const context = useUnifiedStorage();
  onRender(context);
  return null;
};

describe('UnifiedStorageContext - Settings Inheritance', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  describe('getConversationSettings', () => {
    test('should return default settings when no conversation settings exist', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should match default global settings
      expect(settings.targetLanguage).toBe('Swedish');
      expect(settings.model).toBe('google/gemini-2.5-flash');
      expect(settings.culturalContext).toBe(true);
      expect(settings.enableReasoning).toBe(true);
      expect(settings.feedbackLanguage).toBe('English');
      expect(settings.feedbackStyle).toBe('encouraging');
      expect(settings.languageLevel).toBe('intermediate');
    });

    test('should include feedbackLanguage in default global settings', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);

      // Test that global settings include feedbackLanguage
      expect(capturedContext.globalSettings.feedbackLanguage).toBe('English');

      // Test that default conversation settings inherit feedbackLanguage
      const conversationSettings =
        capturedContext.getConversationSettings('new-conversation');
      expect(conversationSettings.feedbackLanguage).toBe('English');
    });

    test('should include languageLevel in default global settings', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);

      // Test that global settings include languageLevel
      expect(capturedContext.globalSettings.languageLevel).toBe('intermediate');

      // Test that default conversation settings inherit languageLevel
      const conversationSettings =
        capturedContext.getConversationSettings('new-conversation');
      expect(conversationSettings.languageLevel).toBe('intermediate');
    });

    test('should merge stored settings with global defaults for missing properties', () => {
      // Set up localStorage with partial conversation settings
      const partialStoredData = {
        conversations: [],
        conversationSettings: {
          'test-conversation': {
            apiKey: '',
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
            model: 'custom-model',
            progressiveComplexity: true,
            reasoningExpanded: true,
            streaming: true,
            targetLanguage: 'French',
            theme: 'system',
          },
        },
        globalSettings: {
          apiKey: '',
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
        },
      };

      localStorage.setItem(
        LocalStorageKeys.APP_DATA,
        JSON.stringify(partialStoredData)
      );

      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should use stored values where available
      expect(settings.model).toBe('custom-model');
      expect(settings.targetLanguage).toBe('French');
      // Should fall back to defaults for missing properties
      expect(settings.culturalContext).toBe(true);
      expect(settings.feedbackStyle).toBe('encouraging');
    });

    test('should always inherit reasoning settings from global regardless of stored values', () => {
      const storedData = {
        conversations: [],
        conversationSettings: {
          'test-conversation': {
            apiKey: '',
            chatMateBackground: 'young professional, loves local culture',
            chatMatePersonality:
              'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
            culturalContext: true,
            editorMateExpertise: '10+ years teaching experience',
            editorMatePersonality:
              'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
            enableReasoning: true, // Conversation tries to override
            feedbackLanguage: 'French',
            feedbackStyle: 'encouraging',
            languageLevel: 'beginner',
            model: 'google/gemini-2.5-flash',
            progressiveComplexity: true,
            reasoningExpanded: true, // Conversation tries to override
            streaming: true,
            targetLanguage: 'Swedish',
            theme: 'system',
          },
        },
        globalSettings: {
          apiKey: '',
          chatMateBackground: 'young professional, loves local culture',
          chatMatePersonality:
            'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
          culturalContext: true,
          editorMateExpertise: '10+ years teaching experience',
          editorMatePersonality:
            'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
          enableReasoning: false, // Global is false
          feedbackLanguage: 'English',
          feedbackStyle: 'encouraging',
          languageLevel: 'intermediate',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: false, // Global is false
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      };

      localStorage.setItem(
        LocalStorageKeys.APP_DATA,
        JSON.stringify(storedData)
      );

      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should always use global reasoning settings
      expect(settings.enableReasoning).toBe(false);
      expect(settings.reasoningExpanded).toBe(false);
    });

    test('should handle missing properties in stored settings (schema evolution)', () => {
      // Simulate old data structure missing new properties
      const oldStoredData = {
        conversations: [],
        conversationSettings: {
          'test-conversation': {
            apiKey: '',
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
            languageLevel: 'advanced',
            model: 'old-model',
            progressiveComplexity: true,
            reasoningExpanded: true,
            streaming: true,
            targetLanguage: 'Swedish',
            theme: 'system',
          },
        },
        globalSettings: {
          apiKey: '',
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
        },
      };

      localStorage.setItem(
        LocalStorageKeys.APP_DATA,
        JSON.stringify(oldStoredData)
      );

      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should gracefully handle missing properties with defaults
      expect(settings.model).toBe('old-model');
      expect(settings.targetLanguage).toBe('Swedish'); // From defaults
      expect(settings.culturalContext).toBe(true); // From defaults
    });

    test('should preserve all user customizations when they exist', () => {
      const customStoredData = {
        conversations: [],
        conversationSettings: {
          'test-conversation': {
            apiKey: 'custom-key',
            chatMateBackground: 'custom background',
            chatMatePersonality: 'custom personality',
            culturalContext: false,
            editorMateExpertise: 'custom expertise',
            editorMatePersonality: 'custom teacher',
            enableReasoning: false,
            feedbackLanguage: 'Spanish',
            feedbackStyle: 'detailed',
            languageLevel: 'beginner',
            model: 'custom-model',
            progressiveComplexity: false,
            reasoningExpanded: false,
            streaming: false,
            targetLanguage: 'French',
            theme: 'dark',
          },
        },
        globalSettings: {
          apiKey: '',
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
        },
      };

      localStorage.setItem(
        LocalStorageKeys.APP_DATA,
        JSON.stringify(customStoredData)
      );

      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should preserve all customizations (except reasoning which inherits from global)
      expect(settings.apiKey).toBe('custom-key');
      expect(settings.chatMateBackground).toBe('custom background');
      expect(settings.model).toBe('custom-model');
      expect(settings.targetLanguage).toBe('French');
      expect(settings.culturalContext).toBe(false);
      expect(settings.feedbackLanguage).toBe('Spanish');
      expect(settings.feedbackStyle).toBe('detailed');
      expect(settings.theme).toBe('dark');
      // Reasoning should still inherit from global
      expect(settings.enableReasoning).toBe(true);
      expect(settings.reasoningExpanded).toBe(true);
    });

    test('should store complete settings when updated (current behavior)', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      const { rerender } = render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      // Update a single property
      expectToNotBeUndefined(capturedContext);
      capturedContext.updateConversationSettings('test-conversation', {
        model: 'new-model',
      });

      // Re-render to get the updated context
      rerender(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should have the updated property
      expect(settings.model).toBe('new-model');
      // Should preserve all other default properties
      expect(settings.targetLanguage).toBe('Swedish');
      expect(settings.culturalContext).toBe(true);
      expect(settings.feedbackStyle).toBe('encouraging');
    });
  });

  describe('createConversationSettings', () => {
    test('should create new conversation settings from current global settings', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      const { rerender } = render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      // Modify global settings first
      expectToNotBeUndefined(capturedContext);
      capturedContext.updateGlobalSettings({
        model: 'global-model',
        targetLanguage: 'German',
      });

      // Re-render to get the updated context
      rerender(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      // Create conversation settings
      expectToNotBeUndefined(capturedContext);
      const createdSettings =
        capturedContext.createConversationSettings('new-conversation');

      // Should inherit from current global settings
      expect(createdSettings.model).toBe('global-model');
      expect(createdSettings.targetLanguage).toBe('German');
      expect(createdSettings.culturalContext).toBe(true); // Default
    });
  });

  describe('updateConversationSettings', () => {
    test('should only update specified properties', () => {
      let capturedContext: ReturnType<typeof useUnifiedStorage> | undefined;

      const { rerender } = render(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      // Create initial settings
      expectToNotBeUndefined(capturedContext);
      capturedContext.createConversationSettings('test-conversation');

      // Update only specific properties
      capturedContext.updateConversationSettings('test-conversation', {
        model: 'updated-model',
        targetLanguage: 'Spanish',
      });

      // Re-render to get the updated context
      rerender(
        <UnifiedStorageProvider>
          <TestComponent
            onRender={(context) => {
              capturedContext = context;
            }}
          />
        </UnifiedStorageProvider>
      );

      expectToNotBeUndefined(capturedContext);
      const settings =
        capturedContext.getConversationSettings('test-conversation');

      // Should have updated properties
      expect(settings.model).toBe('updated-model');
      expect(settings.targetLanguage).toBe('Spanish');
      // Should preserve other properties
      expect(settings.culturalContext).toBe(true);
      expect(settings.feedbackStyle).toBe('encouraging');
      expect(settings.streaming).toBe(true);
    });
  });
});
