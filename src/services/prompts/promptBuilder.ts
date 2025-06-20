import { 
  PromptTemplate, 
  PromptVariables, 
  BuiltPrompt, 
  PromptBuildRequest,
  MessageType 
} from './promptTypes';
import { promptTemplates, promptDefaults } from './templates';

export class PromptBuilder {
  private static instance: PromptBuilder;

  static getInstance(): PromptBuilder {
    if (!PromptBuilder.instance) {
      PromptBuilder.instance = new PromptBuilder();
    }
    return PromptBuilder.instance;
  }

  buildPrompt(request: PromptBuildRequest): BuiltPrompt {
    const template = request.customTemplate 
      ? this.createCustomTemplate(request.customTemplate)
      : promptTemplates[request.messageType];

    if (!template) {
      throw new Error(`No template found for message type: ${request.messageType}`);
    }

    const systemPrompt = this.processTemplate(template, request.variables);

    return {
      systemPrompt,
      templateId: template.id,
      variables: request.variables,
      timestamp: new Date()
    };
  }

  private createCustomTemplate(customTemplate: string): PromptTemplate {
    return {
      id: 'custom',
      name: 'Custom Template',
      template: customTemplate,
      variables: this.extractVariables(customTemplate)
    };
  }

  private extractVariables(template: string): string[] {
    const matches = template.match(/\{([^}]+)\}/g) || [];
    return matches.map(match => match.slice(1, -1));
  }

  private processTemplate(template: PromptTemplate, variables: PromptVariables): string {
    let result = template.template;

    // Replace all template variables
    const templateVars = this.buildTemplateVariables(variables);
    
    Object.entries(templateVars).forEach(([key, value]) => {
      const regex = new RegExp(`\\{${key}\\}`, 'g');
      result = result.replace(regex, value);
    });

    // Clean up any remaining unreplaced variables
    result = result.replace(/\{[^}]+\}/g, '');
    
    // Clean up extra whitespace
    result = result.replace(/\n\s*\n/g, '\n\n').trim();

    return result;
  }

  private buildTemplateVariables(variables: PromptVariables): Record<string, string> {
    return {
      targetLanguage: variables.targetLanguage,
      chatMatePersonality: variables.chatMatePersonality || 'Chat Mate',
      chatMatePrompt: promptDefaults.chatMatePrompt,
      chatMateBackground: variables.chatMateBackground || 'A friendly local who enjoys helping people learn the language and culture.',
      editorMatePersonality: variables.editorMatePersonality || promptDefaults.editorMatePersonality,
      editorMateExpertise: variables.editorMateExpertise || promptDefaults.editorMateExpertise,
      feedbackStyleDescription: promptDefaults.feedbackStyleDescriptions?.[variables.feedbackStyle] || 'helpful and constructive',
      feedbackStyleTone: promptDefaults.feedbackStyleTones?.[variables.feedbackStyle] || 'supportive and clear',
      culturalContextInstructions: variables.culturalContext 
        ? this.getCulturalContextInstructions()
        : '',
      progressiveComplexityInstructions: variables.progressiveComplexity
        ? this.getProgressiveComplexityInstructions(variables.currentComplexityLevel)
        : ''
    };
  }

  private getCulturalContextInstructions(): string {
    return promptDefaults.culturalContextInstructions?.enabled || '';
  }

  private getProgressiveComplexityInstructions(currentLevel?: string): string {
    const baseInstructions = promptDefaults.progressiveComplexityInstructions?.enabled || '';
    if (currentLevel) {
      return `${baseInstructions}\n\nCurrent complexity level: ${currentLevel}`;
    }
    return baseInstructions;
  }

  // Utility methods for debugging and development
  getAvailableTemplates(): Record<MessageType, PromptTemplate> {
    return promptTemplates;
  }

  getTemplate(messageType: MessageType): PromptTemplate | undefined {
    return promptTemplates[messageType];
  }

  previewPrompt(request: PromptBuildRequest): string {
    return this.buildPrompt(request).systemPrompt;
  }
}

// Export singleton instance
export const promptBuilder = PromptBuilder.getInstance();

// Export convenience functions
export function buildPrompt(request: PromptBuildRequest): BuiltPrompt {
  return promptBuilder.buildPrompt(request);
}

export function previewPrompt(request: PromptBuildRequest): string {
  return promptBuilder.previewPrompt(request);
}

export function getAvailableTemplates(): Record<MessageType, PromptTemplate> {
  return promptBuilder.getAvailableTemplates();
}