export interface BuiltPrompt {
  systemPrompt: string;
  templateId: string;
  timestamp: Date;
  variables: PromptVariables;
}

export type MessageType =
  | 'chat-mate-response'
  | 'editor-mate-chatmate-comment'
  | 'editor-mate-response'
  | 'editor-mate-user-comment';

export interface PromptBuildRequest {
  customTemplate?: string;
  messageType: MessageType;
  variables: PromptVariables;
}

export interface PromptTemplate {
  description?: string;
  id: string;
  name: string;
  template: string;
  variables: string[];
}

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
