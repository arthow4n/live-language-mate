/**
 * Available language options for target language and feedback language selection.
 * This list is used across multiple components including settings dialogs and quick start.
 */
export const LANGUAGE_OPTIONS = Object.freeze([
  'Burmese',
  'Cantonese',
  'Chinese (Simplified)',
  'Chinese (Traditional)',
  'Danish',
  'Dutch',
  'English',
  'French',
  'German',
  'Hakka',
  'Hindi',
  'Hokkien',
  'Italian',
  'Japanese',
  'Korean',
  'Norwegian',
  'Portuguese',
  'Russian',
  'Sinhala',
  'Spanish',
  'Swedish',
  'Thai',
  'Ukrainian',
  'Vietnamese',
] as const);

/**
 *
 */
export type Language = (typeof LANGUAGE_OPTIONS)[number];
