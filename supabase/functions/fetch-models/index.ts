
import "https://deno.land/x/xhr@0.1.0/mod.ts";
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

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

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const openrouterApiKey = Deno.env.get('OPENAI_API_KEY');
    if (!openrouterApiKey) {
      throw new Error('OpenRouter API key not configured');
    }

    console.log('Fetching models from OpenRouter API');

    const response = await fetch('https://openrouter.ai/api/v1/models', {
      headers: {
        'Authorization': `Bearer ${openrouterApiKey}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      console.error('OpenRouter API error:', response.status, await response.text());
      throw new Error(`Failed to fetch models: ${response.status}`);
    }

    const data: OpenRouterModelsResponse = await response.json();
    
    // Filter to only show chat completion models and sort by name
    const filteredModels = data.data
      .filter(model => 
        model.architecture?.modality === 'text' && 
        model.id.includes('/') // OpenRouter models have provider/model format
      )
      .sort((a, b) => a.name.localeCompare(b.name));

    console.log(`Successfully fetched ${filteredModels.length} models from OpenRouter`);

    return new Response(JSON.stringify({ 
      models: filteredModels 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    console.error('Error fetching OpenRouter models:', error);
    
    // Return fallback models if API fails
    const fallbackModels = [
      { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
      { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
      { id: 'openai/gpt-4o', name: 'GPT-4o' },
      { id: 'openai/gpt-4o-mini', name: 'GPT-4o Mini' },
      { id: 'meta-llama/llama-3.1-8b-instruct', name: 'Llama 3.1 8B Instruct' },
    ];
    
    return new Response(JSON.stringify({ 
      models: fallbackModels,
      fallback: true 
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
