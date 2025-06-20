export interface PromptTemplate {
  id: string;
  name: string;
  template: string;
  variables: string[];
  description?: string;
}

export interface PromptVariables {
  targetLanguage: string;
  chatMatePersonality?: string;
  chatMateBackground?: string;
  editorMatePersonality?: string;
  editorMateExpertise?: string;
  feedbackStyle: 'encouraging' | 'gentle' | 'direct' | 'detailed';
  culturalContext: boolean;
  progressiveComplexity: boolean;
  currentComplexityLevel?: string;
}

export interface BuiltPrompt {
  systemPrompt: string;
  templateId: string;
  variables: PromptVariables;
  timestamp: Date;
}

export type MessageType =
  | 'chat-mate-response'
  | 'editor-mate-response'
  | 'editor-mate-user-comment'
  | 'editor-mate-chatmate-comment';

export interface PromptBuildRequest {
  messageType: MessageType;
  variables: PromptVariables;
  customTemplate?: string;
}
