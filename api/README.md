# Language Mate API Server

A standalone Deno HTTP API server that provides AI chat completions and model listings for the Language Mate application.

## Quick Start

1. **Install Deno** (if not already installed):
   ```bash
   curl -fsSL https://deno.land/x/install/install.sh | sh
   ```

2. **Set up environment variables**:
   ```bash
   cp .env.example .env
   # Edit .env and add your OpenRouter API key
   ```

3. **Run the server**:
   ```bash
   # Development mode (auto-reload on changes)
   deno task dev
   
   # Production mode
   deno task start
   ```

The server will start on port 8000 by default.

## API Endpoints

### POST /ai-chat

Handles AI chat completions for the Language Mate application.

**Request Body:**
```typescript
{
  message: string;
  messageType: 'chat-mate-response' | 'editor-mate-response' | 'editor-mate-user-comment' | 'editor-mate-chatmate-comment';
  conversationHistory?: Array<{role: string, content: string}>;
  systemPrompt?: string;
  targetLanguage?: string;
  model?: string;
  apiKey?: string;
  streaming?: boolean;
  enableReasoning?: boolean;
  // ... other optional parameters
}
```

**Response:**
- Streaming: Server-Sent Events with `data:` prefix
- Non-streaming: JSON with `response` and optional `reasoning` fields

### GET /models

Fetches available AI models from OpenRouter.

**Response:**
```typescript
{
  models: Array<{
    id: string;
    name: string;
    description?: string;
    // ... other model metadata
  }>;
  fallback?: boolean; // true if using fallback models due to API error
}
```

## Environment Variables

- `OPENAI_API_KEY` - Your OpenRouter API key (required)
- `PORT` - Server port (default: 8000)

## Project Structure

```
api/
├── main.ts              # Main server entry point
├── handlers/            # Request handlers
│   ├── ai-chat.ts      # AI chat completions
│   └── models.ts       # Model listings
├── deno.json           # Deno configuration
├── .env.example        # Environment template
└── README.md           # This file
```

## Deployment

This API can be deployed to any platform that supports Deno:

### Deno Deploy

1. Push your code to GitHub
2. Connect your repository to [Deno Deploy](https://deno.com/deploy)
3. Set environment variables in the dashboard
4. Deploy!

### Docker

```dockerfile
FROM denoland/deno:1.38.0

WORKDIR /app
COPY . .

EXPOSE 8000
CMD ["deno", "run", "--allow-net", "--allow-env", "main.ts"]
```

### Manual Deployment

On any server with Deno installed:

```bash
# Clone the repository
git clone <your-repo-url>
cd your-repo/api

# Set environment variables
export OPENAI_API_KEY="your-api-key"
export PORT=8000

# Run the server
deno run --allow-net --allow-env main.ts
```

## Development

The API uses:
- **Deno** - Modern JavaScript/TypeScript runtime
- **OpenRouter** - AI model access
- **Server-Sent Events** - Real-time streaming responses
- **CORS** - Cross-origin resource sharing for frontend integration

Make sure to test your changes by running the frontend application and verifying that all AI features work correctly.