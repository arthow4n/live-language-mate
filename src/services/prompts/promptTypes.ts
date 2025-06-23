import type { ApiMessageType } from '@/schemas/api';

/**
 *
 */
export interface BuiltPrompt {
  systemPrompt: string;
  templateId: string;
  timestamp: Date;
  variables: PromptVariables;
}

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
 *
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
  feedbackStyle: 'detailed' | 'direct' | 'encouraging' | 'gentle';
  progressiveComplexity: boolean;
  targetLanguage: string;
}
