import type {
  BuiltPrompt,
  PromptBuildRequest,
  PromptTemplate,
  PromptVariables,
} from './promptTypes';

import { promptDefaults, promptTemplates } from './templates';

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
    templateId: template.id,
    timestamp: new Date(),
    variables: request.variables,
  };
}

/**
 *
 */
export function getAvailableTemplates() {
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
function createCustomTemplate(customTemplate: string): PromptTemplate {
  return {
    id: 'custom',
    name: 'Custom Template',
    template: customTemplate,
    variables: extractVariables(customTemplate),
  };
}

/**
 *
 * @param template
 */
function extractVariables(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) ?? [];
  return matches.map((match) => match.slice(1, -1));
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
  template: PromptTemplate,
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
