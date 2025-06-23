/**
 * System prompts for non-character specific functionality
 * These are utility prompts used for system operations like title generation
 * and jailbreak prevention
 */

/**
 * Template for generating chat titles based on conversation history
 */
export const titleGenerationTemplate = {
  description: 'Generates short, concise chat titles from conversation context',
  id: 'title-generation',
  name: 'Chat Title Generation',
  systemPrompt:
    'You are a helpful assistant that generates short, concise chat titles.',
  userMessageTemplate:
    'Based on this conversation in {targetLanguage}, generate a very short (2-4 words) chat title that summarizes the topic. Only return the title, nothing else: {contextMessages}',
  variables: ['targetLanguage', 'contextMessages'],
} as const;

/**
 * Jailbreak prevention prompt to reduce strange AI behaviors
 */
export const jailbreakPreventionPrompt = {
  content: 'In your response, you should not repeat the conversation history.',
  description:
    'Prevents AI from repeating conversation history and other unwanted behaviors',
  id: 'jailbreak-prevention',
  name: 'Jailbreak Prevention',
} as const;

/**
 * All system prompts for non-character functionality
 */
export const systemPrompts = {
  jailbreakPrevention: jailbreakPreventionPrompt,
  titleGeneration: titleGenerationTemplate,
} as const;
