import type {
  PromptTemplate,
  PromptVariables,
  BuiltPrompt,
  PromptBuildRequest,
  MessageType,
} from './promptTypes';
import { promptTemplates, promptDefaults } from './templates';

function createCustomTemplate(customTemplate: string): PromptTemplate {
  return {
    id: 'custom',
    name: 'Custom Template',
    template: customTemplate,
    variables: extractVariables(customTemplate),
  };
}

function extractVariables(template: string): string[] {
  const matches = template.match(/\{([^}]+)\}/g) ?? [];
  return matches.map((match) => match.slice(1, -1));
}

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

function buildTemplateVariables(
  variables: PromptVariables
): Record<string, string> {
  return {
    targetLanguage: variables.targetLanguage,
    chatMatePersonality: variables.chatMatePersonality ?? 'Chat Mate',
    chatMatePrompt: promptDefaults.chatMatePrompt,
    chatMateBackground:
      variables.chatMateBackground ??
      'A friendly local who enjoys helping people learn the language and culture.',
    editorMatePersonality:
      variables.editorMatePersonality ?? promptDefaults.editorMatePersonality,
    editorMateExpertise:
      variables.editorMateExpertise ?? promptDefaults.editorMateExpertise,
    feedbackStyleDescription:
      promptDefaults.feedbackStyleDescriptions[variables.feedbackStyle] ||
      'helpful and constructive',
    feedbackStyleTone:
      promptDefaults.feedbackStyleTones[variables.feedbackStyle] ||
      'supportive and clear',
    culturalContextInstructions: variables.culturalContext
      ? getCulturalContextInstructions()
      : '',
    progressiveComplexityInstructions: variables.progressiveComplexity
      ? getProgressiveComplexityInstructions(variables.currentComplexityLevel)
      : '',
  };
}

function getCulturalContextInstructions(): string {
  return promptDefaults.culturalContextInstructions.enabled || '';
}

function getProgressiveComplexityInstructions(currentLevel?: string): string {
  const baseInstructions =
    promptDefaults.progressiveComplexityInstructions.enabled || '';
  if (currentLevel) {
    return `${baseInstructions}\n\nCurrent complexity level: ${currentLevel}`;
  }
  return baseInstructions;
}

export function buildPrompt(request: PromptBuildRequest): BuiltPrompt {
  const template = request.customTemplate
    ? createCustomTemplate(request.customTemplate)
    : promptTemplates[request.messageType];

  const systemPrompt = processTemplate(template, request.variables);

  return {
    systemPrompt,
    templateId: template.id,
    variables: request.variables,
    timestamp: new Date(),
  };
}

export function getAvailableTemplates(): Record<MessageType, PromptTemplate> {
  return promptTemplates;
}
