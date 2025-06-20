import { describe, test, expect } from 'vitest';
import { aiChatRequestSchema, messageTypeSchema } from './api';
import {
  createRealChatRequest,
  createInvalidChatRequest,
} from '../__tests__/factories';

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
      delete (requestWithoutField as any)[field];

      expect(() => aiChatRequestSchema.parse(requestWithoutField)).toThrow(
        /Required/
      );
    });
  });
});
