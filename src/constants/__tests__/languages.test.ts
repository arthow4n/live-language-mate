import { describe, expect, test } from 'vitest';

import { LANGUAGE_OPTIONS } from '../languages';

describe('Language Constants', () => {
  test('should export LANGUAGE_OPTIONS array', () => {
    expect(LANGUAGE_OPTIONS).toBeDefined();
    expect(Array.isArray(LANGUAGE_OPTIONS)).toBe(true);
    expect(LANGUAGE_OPTIONS.length).toBeGreaterThan(0);
  });

  test('should include common languages', () => {
    const commonLanguages = [
      'English',
      'Spanish',
      'French',
      'German',
      'Swedish',
    ];

    commonLanguages.forEach((language) => {
      expect(LANGUAGE_OPTIONS).toContain(language);
    });
  });

  test('should be accessible from multiple components', () => {
    // This test ensures the constant can be imported and used
    expect(LANGUAGE_OPTIONS).toContain('English');
    expect(LANGUAGE_OPTIONS).toContain('Swedish');
  });

  test('should be a readonly array to prevent mutations', () => {
    // Test that the array is properly exported as const
    expect(Object.isFrozen(LANGUAGE_OPTIONS)).toBe(true);
  });
});
