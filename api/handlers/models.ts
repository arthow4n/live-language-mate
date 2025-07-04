import 'https://deno.land/x/xhr@0.1.0/mod.ts';

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
    input_modalities?: string[];
    output_modalities?: string[];
    tokenizer: string;
    instruct_type?: string;
  };
  top_provider?: {
    context_length?: number;
    max_completion_tokens?: number;
    is_moderated?: boolean;
  };
}

interface OpenRouterModelsResponse {
  data: OpenRouterModel[];
}

export async function modelsHandler(): Promise<Response> {
  try {
    const openrouterApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        Authorization: `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      // deno-lint-ignore no-console -- error log
      console.error(
        'OpenRouter API error:',
        response.status,
        await response.text()
      );
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();

    // Filter to only show text-based chat completion models and sort by name
    const filteredModels = data.data
      .filter(
        (model) =>
          // Check if it supports text input and output
          model.architecture?.input_modalities?.includes('text') &&
          model.architecture?.output_modalities?.includes('text') &&
          // OpenRouter models have provider/model format
          model.id.includes('/')
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    return new Response(
      JSON.stringify({
        models: filteredModels,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    // deno-lint-ignore no-console -- error log
    console.error('Error fetching OpenRouter models:', error);

    // Return fallback models if API fails
    const fallbackModels = [
      { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
    ];

    return new Response(
      JSON.stringify({
        models: fallbackModels,
        fallback: true,
      }),
      {
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
