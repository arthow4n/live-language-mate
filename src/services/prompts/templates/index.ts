import type { MessageType, PromptTemplate } from '../promptTypes';

import { chatMatePromptDefaults, chatMateTemplates } from './chatMateTemplates';
import {
  editorMatePromptDefaults,
  editorMateTemplates,
} from './editorMateTemplates';

export const promptTemplates: Record<MessageType, PromptTemplate> = {
  ...chatMateTemplates,
  ...editorMateTemplates,
} as Record<MessageType, PromptTemplate>;

export const promptDefaults = {
  ...chatMatePromptDefaults,
  ...editorMatePromptDefaults,
};

export { chatMateTemplates, editorMateTemplates };
