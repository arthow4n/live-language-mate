# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development

- `npm run check` - Run linter and type check both frontend and backend.
- `npm test:frontend` - Run frontend test (Vitest), this will also type check the frontend files.
- `npm test:backend` - Run backend test (Deno), this will also type check the backend files.

### API Server (backend)

- `cd api && deno task start` - Run API server in production mode
- `cd api && deno task dev` - Run API server in development mode with auto-reload

## Architecture Overview

This is a React TypeScript language learning application called "Live Language Mate" built with Vite, using a standalone Deno API server for backend services. The app helps expats learn languages through conversational AI.

### Core Architecture

**Frontend Stack:**

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- Zustand-like context for state management
- React Router for navigation

**Backend:**

- Standalone Deno HTTP API server (`api/main.ts`)
- OpenRouter API integration for AI models
- Local storage for chat persistence

### Key Components Structure

**Main App Components:**

- `LanguageMateApp.tsx` - Root component managing layout and state
- `EnhancedChatInterface.tsx` - Main chat interface
- `AskInterface.tsx` - Editor Mate panel for language help
- `ChatSidebar.tsx` - Conversation management sidebar
- `UnifiedSettingsDialog.tsx` - Settings management

**State Management:**

- `SettingsContext.tsx` - Global and per-chat settings
- `LocalStorageContext.tsx` - Chat data persistence
- Settings are split between global (cross-chat) and chat-specific

**AI Characters System:**
The app implements a dual-AI system:

- **Chat Mate**: Native speaker for natural conversation in target language
- **Editor Mate**: Language teacher providing corrections and explanations

### AI Integration

**Standalone API: `/ai-chat`**

- Handles three message types: `chat-mate-response`, `editor-mate-user-comment`, `editor-mate-chatmate-comment`
- Uses OpenRouter API with configurable models (default: `google/gemini-2.5-flash`)
- Supports streaming responses and reasoning mode
- Dynamic system prompts based on message type and user settings

**Model Configuration:**

- Models configurable via settings (supports OpenRouter format)
- API keys can be user-provided or environment-based
- Reasoning mode support for compatible models

### Data Flow

1. User sends message in main chat
2. Triggers parallel AI responses:
   - Chat Mate responds as native speaker
   - Editor Mate comments on user's message
   - Editor Mate provides example response to Chat Mate
3. All responses stored in local storage
4. Text selection opens Editor Mate panel for focused help

### UI Patterns

**Responsive Design:**

- Desktop: Split-panel layout (chat + editor mate sidebar)
- Mobile: Single panel with drawer for editor mate

**Settings Architecture:**

- Global settings (model, API key, theme, target language)
- Per-chat settings (AI personalities, feedback style, cultural context)
- Settings automatically inherit from global to chat-specific

### Important Files

- `src/contexts/SettingsContext.tsx` - Settings management and defaults
- `src/components/LanguageMateApp.tsx` - Main app layout and state
- `api/handlers/ai-chat.ts` - AI integration logic
- `api/handlers/models.ts` - OpenRouter models fetching
- `src/services/apiClient.ts` - Frontend API client
- `src/services/localStorageService.ts` - Chat persistence

### Development Notes

- Default target language: Swedish
- Default model: `google/gemini-2.5-flash`
- Uses shadcn/ui component library extensively
- Responsive design with mobile-first approach
- Settings stored in localStorage with versioning

### API Configuration

**Environment Variables:**

API Server (`api/.env`):

- `OPENAI_API_KEY` - OpenRouter API key for AI models
- `PORT` - Server port (default: 8000)

Frontend (`.env`):

- `VITE_API_BASE_URL` - API server URL (default: http://localhost:8000)

**API Endpoints:**

- `POST /ai-chat` - AI chat completions
- `GET /models` - Available OpenRouter models

**Deployment:**
The API server can be deployed to any platform supporting Deno:

- Deno Deploy
- Docker containers
- VPS with Deno runtime

## TypeScript coding style and conventions

- Prefer named import/export over default import/export.
- Early return, early throw.
- Do not use `any`, `as` type assertion or `!` non-null assertion operator unless it's really the only way to solve the problem. Usually you can instead do `instanceof` type narrowing, use/make a util function to conver the type, or do a proper validation with Zod.
- Only use `?.` when the logic is really optional, if the object before `?.` should not be null, do a proper null check beforehand and throw if the object null.
- If you would declare an untyped object, instead you should either type it with e.g. `const x: X = {}` or `{} satisfies X`.
- Avoid default values, optional Zod property, `null` or `undefined` in the type, if you are about to add one or you see any of such usages, try to look around the related code paths and see if you can refactor to remove it.
- In test file when writing assertions, use expect toBeTruthy instead of using if statement to do null check.
- Use Zod to validate and cast type whenever possible and feasible.

## Claude Code operations

- After you finish all the edits in the task, make sure to `npm run check` then fix the lint and type errors.
- If you make a git commit, prefix you commit message with `(Claude Code) ` and add a line at the end of commit message saying `Co-Authored-By: Claude <noreply@anthropic.com>"`.
- After each task completed, you should automatically and frequently make small git commits with descriptive messages, and then git push, if the git push fails, you should try to rebase and fix the issue, if the fix was not succesful, ask the user to help.
- You should not run dev server or build commands like `npm run dev`, `npm run build`, `npm run build:dev`, `npm run preview`.
- Instead of running individual lint and typecheck commands, you should use `npm run check` to perform type check and linting, `npm run check` performs lint and type check on all files.
- Instead of using your own Search tool, prefer using ast-grep (`sg --lang tsx` (or set `--lang` appropriately )) first, then fall back to your own search tool or `rg`/`grep`.
- If there's a tool instead of command, use the tool, for example, use your own Read tool instead of running commands to read file.
- If you must run a command, prefer read-only command, for example use `git ls-files` instead of running `find` command.
- You should not update any config files unless that's the only way or the best way to fix things, if you must update a config file, pause and ask the user for feedback.
- When planning changes, plan ahead to see if you need to update tests at the same time.
- You should only change a test file if you are fixing lint/type errors, or you made a change that requires update that test file.
- You can use eslint commands directly with `npx eslint`, this is useful for linting only a few files.
- If you would eslint disable anything, think again and see if there's a better approach to fix it, if you still need to eslint disable, make sure you add -- comment after it to explain why you chose to disable.
