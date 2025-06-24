import { beforeEach, describe, expect, test } from 'vitest';

import type { LocalConversation } from '@/contexts/UnifiedStorageContext';
import type { ConversationSettings } from '@/schemas/settings';

import { extractRecentLanguages, extractRecentModels } from './recentDetection';

// Helper function to create test conversations
const createTestConversation = (
  id: string,
  language: string,
  updatedAt: Date
): LocalConversation => ({
  created_at: new Date('2024-01-01'),
  id,
  language,
  messages: [],
  title: `${language} Chat`,
  updated_at: updatedAt,
});

// Helper function to create conversation settings
const createConversationSettings = (model: string): ConversationSettings => ({
  apiKey: '',
  chatMateBackground: 'young professional',
  chatMatePersonality: 'friendly',
  culturalContext: true,
  editorMateExpertise: '10+ years',
  editorMatePersonality: 'patient teacher',
  enableReasoning: true,
  feedbackStyle: 'encouraging',
  model,
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system',
});

describe('Recent Detection Utilities', () => {
  beforeEach(() => {
    // Clear any potential side effects
  });

  describe('extractRecentLanguages', () => {
    test('should return empty array when no conversations exist', () => {
      const result = extractRecentLanguages([]);
      expect(result).toEqual([]);
    });

    test('should return single language when only one conversation exists', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-02')),
      ];

      const result = extractRecentLanguages(conversations);
      expect(result).toEqual(['Swedish']);
    });

    test('should return 2 most recent unique languages', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
        createTestConversation('conv3', 'Spanish', new Date('2024-01-03')),
        createTestConversation('conv4', 'German', new Date('2024-01-04')),
      ];

      const result = extractRecentLanguages(conversations);
      expect(result).toEqual(['German', 'Spanish']); // Most recent first
    });

    test('should deduplicate languages and return most recent unique ones', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
        createTestConversation('conv3', 'Swedish', new Date('2024-01-03')), // Duplicate
        createTestConversation('conv4', 'Spanish', new Date('2024-01-04')),
      ];

      const result = extractRecentLanguages(conversations);
      expect(result).toEqual(['Spanish', 'Swedish']); // Most recent unique
    });

    test('should handle conversations with missing language gracefully', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        {
          ...createTestConversation('conv2', '', new Date('2024-01-02')),
          language: '',
        },
        createTestConversation('conv3', 'French', new Date('2024-01-03')),
      ];

      const result = extractRecentLanguages(conversations);
      expect(result).toEqual(['French', 'Swedish']); // Should skip empty language
    });

    test('should limit results to maximum 2 languages', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
      ];

      const result = extractRecentLanguages(conversations);
      expect(result.length).toBeLessThanOrEqual(2);
    });
  });

  describe('extractRecentModels', () => {
    test('should return empty array when no conversations exist', () => {
      const result = extractRecentModels([], {});
      expect(result).toEqual([]);
    });

    test('should return single model when only one conversation exists', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-02')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('google/gemini-2.5-flash'),
      };

      const result = extractRecentModels(conversations, conversationSettings);
      expect(result).toEqual(['google/gemini-2.5-flash']);
    });

    test('should return 2 most recent unique models', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
        createTestConversation('conv3', 'Spanish', new Date('2024-01-03')),
        createTestConversation('conv4', 'German', new Date('2024-01-04')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('google/gemini-2.5-flash'),
        conv2: createConversationSettings('openai/gpt-4o'),
        conv3: createConversationSettings('anthropic/claude-3-5-sonnet'),
        conv4: createConversationSettings('openai/gpt-4o-mini'),
      };

      const result = extractRecentModels(conversations, conversationSettings);
      expect(result).toEqual([
        'openai/gpt-4o-mini',
        'anthropic/claude-3-5-sonnet',
      ]);
    });

    test('should deduplicate models and return most recent unique ones', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
        createTestConversation('conv3', 'Spanish', new Date('2024-01-03')),
        createTestConversation('conv4', 'German', new Date('2024-01-04')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('google/gemini-2.5-flash'),
        conv2: createConversationSettings('openai/gpt-4o'),
        conv3: createConversationSettings('google/gemini-2.5-flash'), // Duplicate
        conv4: createConversationSettings('anthropic/claude-3-5-sonnet'),
      };

      const result = extractRecentModels(conversations, conversationSettings);
      expect(result).toEqual([
        'anthropic/claude-3-5-sonnet',
        'google/gemini-2.5-flash',
      ]);
    });

    test('should use global default when conversation has no specific model setting', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('openai/gpt-4o'),
        // conv2 has no settings - should use global default
      };
      const globalSettings = createConversationSettings(
        'google/gemini-2.5-flash'
      );

      const result = extractRecentModels(
        conversations,
        conversationSettings,
        globalSettings
      );
      expect(result).toEqual(['google/gemini-2.5-flash', 'openai/gpt-4o']);
    });

    test('should limit results to maximum 2 models', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('google/gemini-2.5-flash'),
      };

      const result = extractRecentModels(conversations, conversationSettings);
      expect(result.length).toBeLessThanOrEqual(2);
    });

    test('should handle empty model strings gracefully', () => {
      const conversations = [
        createTestConversation('conv1', 'Swedish', new Date('2024-01-01')),
        createTestConversation('conv2', 'French', new Date('2024-01-02')),
      ];
      const conversationSettings = {
        conv1: createConversationSettings('openai/gpt-4o'),
        conv2: { ...createConversationSettings(''), model: '' }, // Empty model
      };

      const result = extractRecentModels(conversations, conversationSettings);
      expect(result).toEqual(['openai/gpt-4o']); // Should skip empty model
    });
  });
});
