import type { MessageType, PromptTemplate } from '../promptTypes';

import { chatMatePromptDefaults, chatMateTemplates } from './chatMateTemplates';
import {
  editorMatePromptDefaults,
  editorMateTemplates,
} from './editorMateTemplates';
import { systemPrompts } from './systemPrompts';

export const promptTemplates = {
  ...chatMateTemplates,
  ...editorMateTemplates,
} satisfies Record<MessageType, PromptTemplate>;

export const promptDefaults = {
  ...chatMatePromptDefaults,
  ...editorMatePromptDefaults,
};

export { chatMateTemplates, editorMateTemplates, systemPrompts };
