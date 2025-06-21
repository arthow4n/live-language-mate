import type {
  AiChatNonStreamResponse,
  AiChatRequest,
  ChatMessage,
} from '@/schemas/api';

// OpenRouter API payload interface (what gets sent to OpenRouter)
export interface OpenRouterPayload {
  max_tokens: number;
  messages: ChatMessage[];
  model: string;
  reasoning?: {
    max_tokens: number;
  };
  stream: boolean;
  temperature: number;
}

export const createRealChatRequest = (
  overrides: Partial<AiChatRequest> = {}
): AiChatRequest =>
  ({
    chatMateBackground:
      'A friendly local who enjoys helping people learn the language and culture.',
    chatMatePrompt:
      'A friendly native Swedish speaker who enjoys helping people learn.',
    conversationHistory: [],
    culturalContext: true,
    currentDateTime: new Date().toLocaleString('en-US', {
      day: 'numeric',
      hour: '2-digit',
      hour12: true,
      minute: '2-digit',
      month: 'long',
      second: '2-digit',
      weekday: 'long',
      year: 'numeric',
    }),
    editorMateExpertise: '10+ years teaching Swedish as a second language',
    editorMatePrompt:
      'A patient Swedish teacher who provides helpful corrections.',
    enableReasoning: false,
    feedbackStyle: 'encouraging',
    message: 'Hello, how do I say this in Swedish?',
    messageType: 'chat-mate-response',
    model: 'google/gemini-2.5-flash',
    progressiveComplexity: true,
    streaming: false,
    systemPrompt: 'You are a helpful Swedish language tutor.',
    targetLanguage: 'Swedish',
    userTimezone: 'America/New_York',
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
    reasoning: undefined,
    response: 'Mock AI response',
    ...overrides,
  }) satisfies AiChatNonStreamResponse;

// Helper for creating expected OpenRouter payload structure
export const createExpectedOpenRouterPayload = (
  overrides: Partial<OpenRouterPayload> = {}
): OpenRouterPayload =>
  ({
    max_tokens: 2048,
    messages: [],
    model: 'google/gemini-2.5-flash',
    stream: false,
    temperature: 0.7,
    ...overrides,
  }) satisfies OpenRouterPayload;
