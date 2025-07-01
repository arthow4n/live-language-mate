import { describe, expect, test } from 'vitest';

import type { PromptBuildRequest } from './promptTypes';

import { buildPrompt, getAvailableTemplates } from './promptBuilder';

describe('Prompt Builder', () => {
  describe('buildPrompt', () => {
    test('should build prompt with chat-mate-response template', () => {
      const request: PromptBuildRequest = {
        messageType: 'chat-mate-response',
        variables: {
          culturalContext: true,
          feedbackStyle: 'encouraging',
          progressiveComplexity: false,
          targetLanguage: 'Swedish',
        },
      };

      const result = buildPrompt(request);

      expect(result.systemPrompt).toContain('Swedish');
      expect(result.systemPrompt).toContain('Chat Mate');
      expect(result.systemPrompt).toContain('Cultural Awareness');
      expect(result.templateKey).toBe('chat-mate-response');
      expect(result.variables).toEqual(request.variables);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    test('should build prompt with editor-mate-user-comment template', () => {
      const request: PromptBuildRequest = {
        messageType: 'editor-mate-user-comment',
        variables: {
          culturalContext: false,
          feedbackStyle: 'detailed',
          progressiveComplexity: true,
          targetLanguage: 'French',
        },
      };

      const result = buildPrompt(request);

      expect(result.systemPrompt).toContain('French');
      expect(result.systemPrompt).toContain('Editor Mate');
      expect(result.systemPrompt).toContain('thorough and comprehensive');
      expect(result.templateKey).toBe('editor-mate-user-comment');
      expect(result.variables).toEqual(request.variables);
    });

    test('should include FEEDBACK_LANGUAGE variable in editor mate prompts', () => {
      const request: PromptBuildRequest = {
        messageType: 'editor-mate-user-comment',
        variables: {
          culturalContext: false,
          feedbackLanguage: 'Spanish',
          feedbackStyle: 'encouraging',
          progressiveComplexity: false,
          targetLanguage: 'Swedish',
        },
      };

      const result = buildPrompt(request);

      // The prompt should contain feedback language instructions
      expect(result.systemPrompt).toContain('Spanish');
      expect(result.systemPrompt).toContain(
        'Provide all feedback and explanations in Spanish'
      );
      expect(result.templateKey).toBe('editor-mate-user-comment');
      expect(result.variables).toEqual(request.variables);
    });

    test('should include languageLevel variable in editor mate prompts', () => {
      const request: PromptBuildRequest = {
        messageType: 'editor-mate-user-comment',
        variables: {
          culturalContext: false,
          feedbackStyle: 'encouraging',
          languageLevel: 'beginner',
          progressiveComplexity: false,
          targetLanguage: 'Swedish',
        },
      };

      const result = buildPrompt(request);

      // The prompt should contain language level adjustments
      expect(result.systemPrompt).toContain('beginner');
      expect(result.templateKey).toBe('editor-mate-user-comment');
      expect(result.variables).toEqual(request.variables);
    });

    test('should build prompt with custom template', () => {
      const customTemplate =
        'Custom template with {targetLanguage} and {customVar}';
      const request: PromptBuildRequest = {
        customTemplate,
        messageType: 'chat-mate-response',
        variables: {
          culturalContext: false,
          feedbackStyle: 'direct',
          progressiveComplexity: false,
          targetLanguage: 'German',
        },
      };

      const result = buildPrompt(request);

      expect(result.systemPrompt).toContain('German');
      expect(result.systemPrompt).toContain('Custom template');
      expect(result.templateKey).toBe('chat-mate-response');
      expect(result.variables).toEqual(request.variables);
    });

    test('should handle missing optional variables gracefully', () => {
      const request: PromptBuildRequest = {
        messageType: 'chat-mate-response',
        variables: {
          culturalContext: false,
          feedbackStyle: 'gentle',
          progressiveComplexity: false,
          targetLanguage: 'Spanish',
        },
      };

      const result = buildPrompt(request);

      expect(result.systemPrompt).toContain('Spanish');
      expect(result.systemPrompt).not.toContain('{');
      expect(result.systemPrompt).not.toContain('}');
    });

    test('should clean up unused variables from template', () => {
      const customTemplate = 'Template with {targetLanguage} and {unusedVar}';
      const request: PromptBuildRequest = {
        customTemplate,
        messageType: 'chat-mate-response',
        variables: {
          culturalContext: false,
          feedbackStyle: 'encouraging',
          progressiveComplexity: false,
          targetLanguage: 'Italian',
        },
      };

      const result = buildPrompt(request);

      expect(result.systemPrompt).toContain('Italian');
      expect(result.systemPrompt).not.toContain('{unusedVar}');
      expect(result.systemPrompt).not.toContain('{');
      expect(result.systemPrompt).not.toContain('}');
    });
  });

  describe('getAvailableTemplates', () => {
    test('should return all available templates', () => {
      const templates = getAvailableTemplates();

      expect(templates).toHaveProperty('chat-mate-response');
      expect(templates).toHaveProperty('editor-mate-user-comment');
      expect(templates).toHaveProperty('editor-mate-chatmate-comment');
      expect(templates).toHaveProperty('editor-mate-response');

      expect(templates['chat-mate-response']).toHaveProperty('template');
      expect(templates['chat-mate-response']).toHaveProperty('variables');
      expect(Array.isArray(templates['chat-mate-response'].variables)).toBe(
        true
      );
    });

    test('should return templates with extracted variables', () => {
      const templates = getAvailableTemplates();
      const chatMateTemplate = templates['chat-mate-response'];

      expect(chatMateTemplate.variables).toContain('targetLanguage');
      expect(chatMateTemplate.variables).toContain('chatMatePersonality');
      expect(chatMateTemplate.variables).toContain('chatMatePrompt');
      expect(chatMateTemplate.variables).toContain('chatMateBackground');
    });
  });
});
