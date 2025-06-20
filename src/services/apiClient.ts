// Configuration for the standalone API
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000';

interface ApiResponse<T = unknown> {
  data?: T;
  error?: string;
}

interface AiChatRequest {
  message: string;
  messageType: string;
  conversationHistory?: Array<{ role: string; content: string }>;
  systemPrompt?: string;
  chatMatePrompt?: string;
  editorMatePrompt?: string;
  targetLanguage?: string;
  model?: string;
  apiKey?: string;
  chatMateBackground?: string;
  editorMateExpertise?: string;
  feedbackStyle?: string;
  culturalContext?: boolean;
  progressiveComplexity?: boolean;
  streaming?: boolean;
  currentDateTime?: string;
  userTimezone?: string;
  enableReasoning?: boolean;
}

interface AiChatResponse {
  response?: string;
  reasoning?: string;
}

interface ModelsResponse {
  models: Array<{
    id: string;
    name: string;
    description?: string;
    pricing?: {
      prompt: string;
      completion: string;
    };
    context_length?: number;
  }>;
  fallback?: boolean;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = API_BASE_URL) {
    this.baseUrl = baseUrl;
  }

  async aiChat(request: AiChatRequest, options?: { signal?: AbortSignal }): Promise<Response> {
    const response = await fetch(`${this.baseUrl}/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(request),
      signal: options?.signal,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `API request failed: ${response.status}`);
    }

    return response;
  }

  async getModels(): Promise<ApiResponse<ModelsResponse>> {
    try {
      const response = await fetch(`${this.baseUrl}/models`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `API request failed: ${response.status}`);
      }

      const data = await response.json();
      return { data };
    } catch (error) {
      console.error('Failed to fetch models from API:', error);
      return { error: error.message };
    }
  }
}

// Export singleton instance
export const apiClient = new ApiClient();
export type { AiChatRequest, AiChatResponse, ModelsResponse };