import type { MessageType, PromptTemplate } from '../promptTypes';

import { chatMatePromptDefaults, chatMateTemplates } from './chatMateTemplates';
import {
  editorMatePromptDefaults,
  editorMateTemplates,
} from './editorMateTemplates';

export const promptTemplates = {
  ...chatMateTemplates,
  ...editorMateTemplates,
} satisfies Record<MessageType, PromptTemplate>;

export const promptDefaults = {
  ...chatMatePromptDefaults,
  ...editorMatePromptDefaults,
};

export { chatMateTemplates, editorMateTemplates };
