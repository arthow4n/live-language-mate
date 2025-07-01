import { describe, expect, test } from 'vitest';

import { createPromptTemplate } from './promptTypes';

describe('Type-Safe Prompt Templates', () => {
  describe('createPromptTemplate', () => {
    test('should extract variables from template string correctly', () => {
      const template =
        `Hello {name}, welcome to {targetLanguage} learning!` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual(['name', 'targetLanguage']);
    });

    test('should handle templates with no variables', () => {
      const template = `This is a template with no variables` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual([]);
    });

    test('should handle templates with duplicate variables', () => {
      const template =
        `Hello {name}, {name} is learning {targetLanguage} in {targetLanguage}` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual(['name', 'targetLanguage']);
    });

    test('should handle templates with complex variable names', () => {
      const template =
        `{chatMatePersonality} speaks {targetLanguage}. {culturalContextInstructions}` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual([
        'chatMatePersonality',
        'targetLanguage',
        'culturalContextInstructions',
      ]);
    });

    test('should extract languageLevel variable correctly', () => {
      const template =
        `Adjust explanations for {languageLevel} learners using {targetLanguage}` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual(['languageLevel', 'targetLanguage']);
    });

    test('should handle templates with variables in different contexts', () => {
      const template = `Start {intro}

Middle section with {variable1} and {variable2}.

End with {conclusion}.` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual([
        'intro',
        'variable1',
        'variable2',
        'conclusion',
      ]);
    });

    test('should handle malformed variable syntax', () => {
      const template =
        `Valid {variable} but invalid {incomplete and {empty} and {another}` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual([
        'variable',
        'incomplete and {empty',
        'another',
      ]);
    });

    test('should handle multiline templates', () => {
      const template = `Line 1 with {var1}
Line 2 with {var2}
Line 3 with {var1} again` as const;
      const result = createPromptTemplate(template);

      expect(result.template).toBe(template);
      expect(result.variables).toEqual(['var1', 'var2']);
    });
  });
});
