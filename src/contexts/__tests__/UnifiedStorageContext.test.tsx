/// <reference types="vitest/globals" />
import { renderHook, act } from '@testing-library/react';
import { ReactNode } from 'react';
import {
  UnifiedStorageProvider,
  useUnifiedStorage,
  getDefaultGlobalSettings,
} from '../UnifiedStorageContext';
import { type ConversationSettings } from '@/schemas/settings';

// Mock localStorage
const mockLocalStorage = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: (key: string) => store[key] || null,
    setItem: (key: string, value: string) => {
      store[key] = value;
    },
    removeItem: (key: string) => {
      // eslint-disable-next-line @typescript-eslint/no-dynamic-delete -- mock localStorage requires dynamic deletion for removeItem
      delete store[key];
    },
    clear: () => {
      store = {};
    },
    key: (index: number) => Object.keys(store)[index] || null,
    get length() {
      return Object.keys(store).length;
    },
  } as const;
})();

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
});

// Helper to create wrapper
const createWrapper = () => {
  return ({ children }: { children: ReactNode }) => (
    <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
  );
};

describe('UnifiedStorageContext - Settings Inheritance', () => {
  beforeEach(() => {
    mockLocalStorage.clear();
  });

  describe('getConversationSettings', () => {
    it('should return default settings when no conversation settings exist', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      const settings = result.current.getConversationSettings('test-conv-123');
      const expectedDefaults = getDefaultGlobalSettings();

      expect(settings).toEqual(expectedDefaults);
    });

    it('should merge stored settings with global defaults for missing properties', () => {
      // Setup: Create conversation settings missing some properties
      const storedSettings: Partial<ConversationSettings> = {
        targetLanguage: 'French',
        chatMatePersonality: 'Custom chat mate personality',
        // Missing: editorMatePersonality, feedbackStyle, etc.
      };

      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Store partial settings
      act(() => {
        result.current.updateConversationSettings('test-conv', storedSettings);
      });

      const retrievedSettings =
        result.current.getConversationSettings('test-conv');
      const globalDefaults = getDefaultGlobalSettings();

      // Should have the stored custom values
      expect(retrievedSettings.targetLanguage).toBe('French');
      expect(retrievedSettings.chatMatePersonality).toBe(
        'Custom chat mate personality'
      );

      // Should have the missing properties filled from global defaults
      expect(retrievedSettings.editorMatePersonality).toBe(
        globalDefaults.editorMatePersonality
      );
      expect(retrievedSettings.feedbackStyle).toBe(
        globalDefaults.feedbackStyle
      );
      expect(retrievedSettings.culturalContext).toBe(
        globalDefaults.culturalContext
      );
    });

    it('should always inherit reasoning settings from global regardless of stored values', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Update global reasoning settings
      act(() => {
        result.current.updateGlobalSettings({
          enableReasoning: false,
          reasoningExpanded: false,
        });
      });

      // Create conversation settings with different reasoning values
      act(() => {
        result.current.updateConversationSettings('test-conv', {
          enableReasoning: true,
          reasoningExpanded: true,
        });
      });

      const settings = result.current.getConversationSettings('test-conv');

      // Should always inherit from global, not use stored values
      expect(settings.enableReasoning).toBe(false);
      expect(settings.reasoningExpanded).toBe(false);
    });

    it('should handle missing properties in stored settings (schema evolution)', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Simulate partial stored settings by directly manipulating internal state
      act(() => {
        // Manually set incomplete settings to simulate old stored data
        result.current.updateConversationSettings('old-conv', {
          targetLanguage: 'German',
          chatMatePersonality: 'Old personality',
        });
      });

      const settings = result.current.getConversationSettings('old-conv');
      const globalDefaults = getDefaultGlobalSettings();

      // Should have the custom values
      expect(settings.targetLanguage).toBe('German');
      expect(settings.chatMatePersonality).toBe('Old personality');

      // Should have defaults for other properties (this proves merging works)
      expect(settings.editorMatePersonality).toBe(
        globalDefaults.editorMatePersonality
      );
      expect(settings.feedbackStyle).toBe(globalDefaults.feedbackStyle);
    });

    it('should preserve all user customizations when they exist', () => {
      const customSettings: ConversationSettings = {
        model: 'custom-model',
        apiKey: 'custom-key',
        targetLanguage: 'Japanese',
        streaming: false,
        enableReasoning: true, // Will be overridden
        reasoningExpanded: false, // Will be overridden
        theme: 'dark' as const,
        chatMatePersonality: 'Custom chat personality',
        editorMatePersonality: 'Custom editor personality',
        chatMateBackground: 'Custom background',
        editorMateExpertise: 'Custom expertise',
        feedbackStyle: 'direct' as const,
        culturalContext: false,
        progressiveComplexity: false,
      };

      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      act(() => {
        result.current.updateGlobalSettings({
          enableReasoning: false,
          reasoningExpanded: true,
        });
      });

      act(() => {
        result.current.updateConversationSettings(
          'custom-conv',
          customSettings
        );
      });

      const retrievedSettings =
        result.current.getConversationSettings('custom-conv');

      // All custom values should be preserved
      expect(retrievedSettings.model).toBe('custom-model');
      expect(retrievedSettings.targetLanguage).toBe('Japanese');
      expect(retrievedSettings.chatMatePersonality).toBe(
        'Custom chat personality'
      );
      expect(retrievedSettings.feedbackStyle).toBe('direct');

      // Except always-inherited ones
      expect(retrievedSettings.enableReasoning).toBe(false); // From global
      expect(retrievedSettings.reasoningExpanded).toBe(true); // From global
    });

    it('should store complete settings when updated (current behavior)', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Update global settings first
      act(() => {
        result.current.updateGlobalSettings({
          chatMatePersonality: 'Initial global personality',
          feedbackStyle: 'encouraging',
        });
      });

      // Create conversation settings
      act(() => {
        result.current.updateConversationSettings('test-conv', {
          targetLanguage: 'Spanish',
        });
      });

      // Update global settings after conversation settings exist
      act(() => {
        result.current.updateGlobalSettings({
          chatMatePersonality: 'Updated global personality',
          feedbackStyle: 'detailed',
        });
      });

      const settings = result.current.getConversationSettings('test-conv');

      // Custom value should be preserved
      expect(settings.targetLanguage).toBe('Spanish');

      // These properties were stored when conversation settings were created,
      // so they won't automatically update with global changes
      expect(settings.chatMatePersonality).toBe('Initial global personality');
      expect(settings.feedbackStyle).toBe('encouraging');
    });
  });

  describe('createConversationSettings', () => {
    it('should create new conversation settings from current global settings', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Update global settings first
      act(() => {
        result.current.updateGlobalSettings({
          targetLanguage: 'Italian',
          feedbackStyle: 'gentle',
        });
      });

      const newSettings = result.current.createConversationSettings('new-conv');

      expect(newSettings.targetLanguage).toBe('Italian');
      expect(newSettings.feedbackStyle).toBe('gentle');
    });
  });

  describe('updateConversationSettings', () => {
    it('should only update specified properties', () => {
      const { result } = renderHook(() => useUnifiedStorage(), {
        wrapper: createWrapper(),
      });

      // Create initial settings
      act(() => {
        result.current.createConversationSettings('test-conv');
      });

      // Update only specific properties
      act(() => {
        result.current.updateConversationSettings('test-conv', {
          targetLanguage: 'Portuguese',
          feedbackStyle: 'direct',
        });
      });

      const settings = result.current.getConversationSettings('test-conv');
      const globalDefaults = getDefaultGlobalSettings();

      // Updated properties
      expect(settings.targetLanguage).toBe('Portuguese');
      expect(settings.feedbackStyle).toBe('direct');

      // Non-updated properties should still inherit from global
      expect(settings.chatMatePersonality).toBe(
        globalDefaults.chatMatePersonality
      );
    });
  });
});
