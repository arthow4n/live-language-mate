
interface OpenRouterModel {
  id: string;
  name: string;
  description?: string;
  pricing?: {
    prompt: string;
    completion: string;
  };
  context_length?: number;
  architecture?: {
    modality: string;
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length: number;
    max_completion_tokens?: number;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export const fetchOpenRouterModels = async (): Promise<OpenRouterModel[]> => {
  try {
    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();
    
    // Filter to only show chat completion models and sort by name
    return data.data
      .filter(model => 
        model.architecture?.modality === 'text' && 
        model.id.includes('/') // OpenRouter models have provider/model format
      )
      .sort((a, b) => a.name.localeCompare(b.name));
  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    // Return fallback models if API fails
    return [
      { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
    ];
  }
};

export type { OpenRouterModel };
