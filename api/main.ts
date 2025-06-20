import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { aiChatHandler } from './handlers/ai-chat.ts';
import { modelsHandler } from './handlers/models.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
};

interface Route {
  path: string;
  method: string;
  handler: (req: Request) => Promise<Response>;
}

const routes: Route[] = [
  { path: '/ai-chat', method: 'POST', handler: aiChatHandler },
  { path: '/models', method: 'GET', handler: modelsHandler },
];

function matchRoute(url: URL, method: string): Route | null {
  return routes.find(route => 
    route.path === url.pathname && route.method === method
  ) || null;
}

async function requestHandler(req: Request): Promise<Response> {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const url = new URL(req.url);
  const route = matchRoute(url, req.method);

  if (!route) {
    return new Response(
      JSON.stringify({ error: 'Not found' }),
      { 
        status: 404, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }

  try {
    const response = await route.handler(req);
    
    // Add CORS headers to all responses
    const headers = new Headers(response.headers);
    Object.entries(corsHeaders).forEach(([key, value]) => {
      headers.set(key, value);
    });

    return new Response(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('Request handler error:', error);
    return new Response(
      JSON.stringify({ 
        error: error.message || 'Internal server error' 
      }),
      { 
        status: 500, 
        headers: { ...corsHeaders, 'Content-Type': 'application/json' } 
      }
    );
  }
}

const port = parseInt(Deno.env.get('PORT') || '8000');

console.log(`🚀 Language Mate API server starting on port ${port}`);
console.log('Available endpoints:');
console.log('  POST /ai-chat - AI chat completions');
console.log('  GET /models - Available AI models');

await serve(requestHandler, { port });