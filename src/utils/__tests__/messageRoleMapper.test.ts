import { describe, expect, test } from 'vitest';

import type { UiMessageType } from '@/schemas/messages';

import {
  convertMessagesToApiFormat,
  mapMessageTypeToRole,
} from '../messageRoleMapper';

describe('messageRoleMapper', () => {
  describe('mapMessageTypeToRole', () => {
    test('should map user message type to user role', () => {
      const result = mapMessageTypeToRole('user');
      expect(result).toBe('user');
    });

    test('should map chat-mate message type to assistant role', () => {
      const result = mapMessageTypeToRole('chat-mate');
      expect(result).toBe('assistant');
    });

    test('should map editor-mate message type to assistant role', () => {
      const result = mapMessageTypeToRole('editor-mate');
      expect(result).toBe('assistant');
    });
  });

  describe('convertMessagesToApiFormat', () => {
    test('should convert array of UI messages to API format with correct roles', () => {
      const uiMessages: { content: string; type: UiMessageType }[] = [
        { content: 'Hello', type: 'user' },
        { content: 'Hej!', type: 'chat-mate' },
        { content: 'This is correct Swedish', type: 'editor-mate' },
      ];

      const result = convertMessagesToApiFormat(uiMessages);

      expect(result).toEqual([
        { content: '[user]: Hello', role: 'user' },
        { content: '[chat-mate]: Hej!', role: 'assistant' },
        {
          content: '[editor-mate]: This is correct Swedish',
          role: 'assistant',
        },
      ]);
    });

    test('should handle empty array', () => {
      const result = convertMessagesToApiFormat([]);
      expect(result).toEqual([]);
    });

    test('should preserve content with special characters', () => {
      const uiMessages: { content: string; type: UiMessageType }[] = [
        { content: 'How do you say "hello" in Swedish?', type: 'user' },
      ];

      const result = convertMessagesToApiFormat(uiMessages);

      expect(result).toEqual([
        {
          content: '[user]: How do you say "hello" in Swedish?',
          role: 'user',
        },
      ]);
    });

    test('should handle mixed message types correctly', () => {
      const uiMessages: { content: string; type: UiMessageType }[] = [
        { content: 'First user message', type: 'user' },
        { content: 'Editor mate response', type: 'editor-mate' },
        { content: 'Chat mate response', type: 'chat-mate' },
        { content: 'Second user message', type: 'user' },
      ];

      const result = convertMessagesToApiFormat(uiMessages);

      expect(result).toEqual([
        { content: '[user]: First user message', role: 'user' },
        { content: '[editor-mate]: Editor mate response', role: 'assistant' },
        { content: '[chat-mate]: Chat mate response', role: 'assistant' },
        { content: '[user]: Second user message', role: 'user' },
      ]);
    });
  });
});
