import { chatMateTemplates, chatMatePromptDefaults } from './chatMateTemplates';
import { editorMateTemplates, editorMatePromptDefaults } from './editorMateTemplates';
import { PromptTemplate, MessageType } from '../promptTypes';

export const promptTemplates: Record<MessageType, PromptTemplate> = {
  ...chatMateTemplates,
  ...editorMateTemplates
} as Record<MessageType, PromptTemplate>;

export const promptDefaults = {
  ...chatMatePromptDefaults,
  ...editorMatePromptDefaults
};

export { chatMateTemplates, editorMateTemplates };