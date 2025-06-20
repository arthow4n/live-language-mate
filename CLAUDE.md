# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

### Building and Development

- `npm run dev` - Start development server with Vite
- `npm run build` - Production build
- `npm run build:dev` - Development build
- `npm run preview` - Preview production build
- `npm run lint` - Run ESLint for code quality
- `npm run lint:fix` - Run ESLint and automatically fix issues
- `npm run prettier` - Format all files with Prettier
- `npm run format` - Alias for prettier command

### Supabase Edge Functions

- `supabase functions serve` - Run edge functions locally
- `supabase functions deploy` - Deploy functions to Supabase

## Architecture Overview

This is a React TypeScript language learning application called "Live Language Mate" built with Vite, using Supabase for backend services. The app helps expats learn languages through conversational AI.

### Core Architecture

**Frontend Stack:**

- React 18 with TypeScript
- Vite for build tooling
- Tailwind CSS + shadcn/ui components
- Zustand-like context for state management
- React Router for navigation

**Backend:**

- Supabase Edge Functions (Deno TypeScript)
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

**Supabase Function: `ai-chat`**

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
- `supabase/functions/ai-chat/index.ts` - AI integration logic
- `src/services/localStorageService.ts` - Chat persistence

### Development Notes

- Default target language: Swedish
- Default model: `google/gemini-2.5-flash`
- Uses shadcn/ui component library extensively
- Responsive design with mobile-first approach
- Settings stored in localStorage with versioning

## Git operations

- After each task completed, you should automatically and frequently make small commits with descriptive messages.
