import { describe, expect, test } from 'vitest';

import {
  createInvalidChatRequest,
  createRealChatRequest,
} from '../__tests__/factories';
import { aiChatRequestSchema, messageTypeSchema } from './api';

describe('API Schema Integration Tests', () => {
  test('real chat request passes schema validation', () => {
    const realRequest = createRealChatRequest();
    expect(() => aiChatRequestSchema.parse(realRequest)).not.toThrow();
  });

  test('invalid request fails schema validation with expected errors', () => {
    const invalidRequest = createInvalidChatRequest();
    expect(() => aiChatRequestSchema.parse(invalidRequest)).toThrow(/Required/);
  });

  test('messageType enum validates correctly', () => {
    expect(() => messageTypeSchema.parse('chat-mate-response')).not.toThrow();
    expect(() => messageTypeSchema.parse('title-generation')).not.toThrow();
    expect(() => messageTypeSchema.parse('invalid-type')).toThrow(
      /Invalid enum value/
    );
  });

  test('all required fields are enforced', () => {
    const requiredFields = [
      'chatMatePrompt',
      'editorMatePrompt',
      'chatMateBackground',
      'editorMateExpertise',
      'feedbackStyle',
      'culturalContext',
      'progressiveComplexity',
    ];

    requiredFields.forEach((field) => {
      const requestWithoutField = createRealChatRequest();
      const { [field]: _, ...requestWithoutFieldDeleted } = requestWithoutField;
      void _;

      expect(() =>
        aiChatRequestSchema.parse(requestWithoutFieldDeleted)
      ).toThrow(/Required/);
    });
  });
});
