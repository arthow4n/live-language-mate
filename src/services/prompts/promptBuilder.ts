import type {
  BuiltPrompt,
  PromptBuildRequest,
  PromptVariables,
} from './promptTypes';

import { createPromptTemplate } from './promptTypes';
import {
  chatMatePromptDefaults,
  chatMateTemplates,
} from './templates/chatMateTemplates';
import {
  editorMatePromptDefaults,
  editorMateTemplates,
} from './templates/editorMateTemplates';

const promptTemplates = {
  ...chatMateTemplates,
  ...editorMateTemplates,
};

const promptDefaults = {
  ...chatMatePromptDefaults,
  ...editorMatePromptDefaults,
};

/**
 *
 * @param request
 */
export function buildPrompt(request: PromptBuildRequest): BuiltPrompt {
  const template = request.customTemplate
    ? createCustomTemplate(request.customTemplate)
    : promptTemplates[request.messageType];

  const systemPrompt = processTemplate(template, request.variables);

  return {
    systemPrompt,
    templateKey: request.messageType,
    timestamp: new Date(),
    variables: request.variables,
  };
}

/**
 *
 */
export function getAvailableTemplates(): typeof promptTemplates {
  return promptTemplates;
}

/**
 *
 * @param variables
 */
function buildTemplateVariables(
  variables: PromptVariables
): Record<string, string> {
  return {
    chatMateBackground:
      variables.chatMateBackground ??
      'A friendly local who enjoys helping people learn the language and culture.',
    chatMatePersonality: variables.chatMatePersonality ?? 'Chat Mate',
    chatMatePrompt: promptDefaults.chatMatePrompt,
    culturalContextInstructions: variables.culturalContext
      ? getCulturalContextInstructions()
      : '',
    editorMateExpertise:
      variables.editorMateExpertise ?? promptDefaults.editorMateExpertise,
    editorMatePersonality:
      variables.editorMatePersonality ?? promptDefaults.editorMatePersonality,
    FEEDBACK_LANGUAGE: variables.feedbackLanguage ?? 'English',
    feedbackStyleDescription:
      promptDefaults.feedbackStyleDescriptions[variables.feedbackStyle] ||
      'helpful and constructive',
    feedbackStyleTone:
      promptDefaults.feedbackStyleTones[variables.feedbackStyle] ||
      'supportive and clear',
    progressiveComplexityInstructions: variables.progressiveComplexity
      ? getProgressiveComplexityInstructions(variables.currentComplexityLevel)
      : '',
    targetLanguage: variables.targetLanguage,
  };
}

/**
 *
 * @param customTemplate
 */
function createCustomTemplate(
  customTemplate: string
): ReturnType<typeof createPromptTemplate> {
  return createPromptTemplate(customTemplate);
}

/**
 *
 */
function getCulturalContextInstructions(): string {
  return promptDefaults.culturalContextInstructions.enabled || '';
}

/**
 *
 * @param currentLevel
 */
function getProgressiveComplexityInstructions(currentLevel?: string): string {
  const baseInstructions =
    promptDefaults.progressiveComplexityInstructions.enabled || '';
  if (currentLevel) {
    return `${baseInstructions}\n\nCurrent complexity level: ${currentLevel}`;
  }
  return baseInstructions;
}

/**
 *
 * @param template
 * @param variables
 */
function processTemplate(
  template: ReturnType<typeof createPromptTemplate>,
  variables: PromptVariables
): string {
  let result = template.template;

  const templateVars = buildTemplateVariables(variables);

  Object.entries(templateVars).forEach(([key, value]) => {
    const regex = new RegExp(`\\{${key}\\}`, 'g');
    result = result.replace(regex, value);
  });

  result = result.replace(/\{[^}]+\}/g, '');
  result = result.replace(/\n\s*\n/g, '\n\n').trim();

  return result;
}
