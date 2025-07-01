import type { ApiMessageType } from '@/schemas/api';

/**
 *
 */
export interface BuiltPrompt {
  systemPrompt: string;
  templateKey: string;
  timestamp: Date;
  variables: PromptVariables;
}

/**
 * Utility type that extracts variable names from template strings at compile time
 */
export type ExtractVariables<T extends string> =
  T extends `${string}{${infer Var}}${infer Rest}`
    ? ExtractVariables<Rest> | Var
    : never;

/**
 * Message types that can be used with the prompt system
 * (excludes 'title-generation' which doesn't use templates)
 */
export type MessageType = Exclude<ApiMessageType, 'title-generation'>;

/**
 *
 */
export interface PromptBuildRequest {
  customTemplate?: string;
  messageType: MessageType;
  variables: PromptVariables;
}

/**
 * Legacy interface - to be removed after migration
 * @deprecated Use TypeSafePromptTemplate instead
 */
export interface PromptTemplate {
  description?: string;
  id: string;
  name: string;
  template: string;
  variables: string[];
}

/**
 *
 */
export interface PromptVariables {
  chatMateBackground?: string;
  chatMatePersonality?: string;
  culturalContext: boolean;
  currentComplexityLevel?: string;
  editorMateExpertise?: string;
  editorMatePersonality?: string;
  feedbackLanguage?: string;
  feedbackStyle: 'detailed' | 'direct' | 'encouraging' | 'gentle';
  languageLevel?: 'advanced' | 'beginner' | 'intermediate';
  progressiveComplexity: boolean;
  targetLanguage: string;
}

/**
 * Simplified template type - just the template string
 */
export type SimpleTemplate = string;

/**
 * Type that creates a record with exactly the required keys from a template
 */
export type TemplateVariables<T extends string> = Record<
  ExtractVariables<T>,
  string
>;

/**
 * Type-safe prompt template that validates variables match template usage
 */
export interface TypeSafePromptTemplate<T extends string> {
  template: T;
  variables: string[];
}

/**
 * Helper function to create type-safe templates with automatic variable extraction
 * @param template
 */
export function createPromptTemplate<T extends string>(
  template: T
): TypeSafePromptTemplate<T> {
  const variables = extractVariablesFromTemplate(template);
  return { template, variables };
}

/**
 * Runtime function to extract variables from template strings
 * @param template
 */
function extractVariablesFromTemplate(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) ?? [];
  return [...new Set(matches.map((match) => match.slice(1, -1)))];
}
