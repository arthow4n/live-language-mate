import type {
  AiChatRequest,
  AiChatNonStreamResponse,
  ChatMessage,
} from '@/schemas/api';

// OpenRouter API payload interface (what gets sent to OpenRouter)
export interface OpenRouterPayload {
  model: string;
  messages: ChatMessage[];
  stream: boolean;
  temperature: number;
  max_tokens: number;
  reasoning?: {
    max_tokens: number;
  };
}

export const createRealChatRequest = (
  overrides: Partial<AiChatRequest> = {}
): AiChatRequest =>
  ({
    message: 'Hello, how do I say this in Swedish?',
    messageType: 'chat-mate-response',
    conversationHistory: [],
    systemPrompt: 'You are a helpful Swedish language tutor.',
    chatMatePrompt:
      'A friendly native Swedish speaker who enjoys helping people learn.',
    editorMatePrompt:
      'A patient Swedish teacher who provides helpful corrections.',
    targetLanguage: 'Swedish',
    model: 'google/gemini-2.5-flash',
    chatMateBackground:
      'A friendly local who enjoys helping people learn the language and culture.',
    editorMateExpertise: '10+ years teaching Swedish as a second language',
    feedbackStyle: 'encouraging',
    culturalContext: true,
    progressiveComplexity: true,
    streaming: false,
    currentDateTime: new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    }),
    userTimezone: 'America/New_York',
    enableReasoning: false,
    ...overrides,
  }) satisfies AiChatRequest;

export const createInvalidChatRequest = () =>
  ({
    message: 'Hello',
    // Missing all required fields to trigger Zod validation errors
  }) satisfies Partial<AiChatRequest>;

// Helper for creating mock API responses
export const createMockAiResponse = (
  overrides: Partial<AiChatNonStreamResponse> = {}
): AiChatNonStreamResponse =>
  ({
    response: 'Mock AI response',
    reasoning: null,
    ...overrides,
  }) satisfies AiChatNonStreamResponse;

// Helper for creating expected OpenRouter payload structure
export const createExpectedOpenRouterPayload = (
  overrides: Partial<OpenRouterPayload> = {}
): OpenRouterPayload =>
  ({
    model: 'google/gemini-2.5-flash',
    messages: [],
    stream: false,
    temperature: 0.7,
    max_tokens: 2048,
    ...overrides,
  }) satisfies OpenRouterPayload;
