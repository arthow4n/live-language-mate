# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Focused single/multiple file commands
  - `npm run test:frontend -- [--test-name-pattern=""] file [...files]` - Type check and run frontend test only on the specified test files, or tests related to a non-test file. The command is a faster wrapper of `vitest run`.
  - `npm run test:backend -- file [...files]` - Run backend test only on the specified test files.
- For all `npm run` commands, if you would add any args, be sure to add `--` like `npm run x -- [...args]`. Inspect `package.json` to ensure you can really add args to the command.

## Architecture Overview

This is a React TypeScript language learning application called "Live Language Mate" built with Vite, using a standalone Deno API server for backend services. The app helps expats learn languages through conversational AI as mentioned in README.md.

### Core Architecture

#### Frontend Stack

- React 18 with TypeScript
- Vite for build tooling
- Vitest for test
- MSW for mocking backend API in frontend test
- Tailwind CSS + shadcn/ui components
- Zustand-like context for state management
- React Router for navigation
- Zod 4, therefore the imports should be `from "zod/v4"`, you may fetch `https://zod.dev/v4/changelog` if you are unsure how to write.

```ts
// Bad: Zod 3
import { z } from 'zod';
z.object({ name: z.string() }).strict();
z.object({ name: z.string() }).passthrough();

// Good: Zod 4
import { z } from 'zod/v4';
z.strictObject({ name: z.string() });
z.looseObject({ name: z.string() });
```

#### Backend

- Standalone Deno HTTP API server (`api/main.ts`)
- OpenRouter API integration for AI models

### Key Components Structure

#### Main App Components

- `LanguageMateApp.tsx` - Root component managing layout and state
- `EnhancedChatInterface.tsx` - Main chat interface
- `EditorMatePanel.tsx` - Editor Mate panel for language help
- `ChatSidebar.tsx` - Conversation management sidebar
- `UnifiedSettingsDialog.tsx` - Settings management

#### State Management

- `SettingsContext.tsx` - Global and per-chat settings
- `LocalStorageContext.tsx` - Chat data persistence
- There are 2 types of settings: global (global only settings + template for new chat-specific settings) and chat-specific settings. When a new chat is created, it'll create a new chat-specific setting object based on the template. The chat-specific settings is disconnected from the global one.

#### AI Characters System

The app implements a dual-AI system:

- **Chat Mate**: Native speaker for natural conversation in target language
- **Editor Mate**: Language teacher providing corrections and explanations

### AI Integration

#### Standalone API `/ai-chat`

- Handles three message types: `chat-mate-response`, `editor-mate-user-comment`, `editor-mate-chatmate-comment`
- Uses OpenRouter API with configurable models (default: `google/gemini-2.5-flash`)
- Supports streaming responses and reasoning mode
- Dynamic system prompts based on message type and user settings

#### Model Configuration

- Models configurable via settings (supports OpenRouter format)
- API keys can be user-provided or environment-based
- Reasoning mode support for compatible models

### Data Flow

1. User sends message in main chat
2. Triggers AI responses:
   - Editor Mate comments on user's message
   - Chat Mate responds as native speaker
   - Editor Mate comments on Chat Mate's message
3. All responses stored in local storage
4. Text selection opens Editor Mate panel for focused help

### UI Patterns

#### Responsive Design

- Desktop: Split-panel layout (chat + editor mate sidebar)
- Mobile: Single panel with drawer for editor mate

#### Settings Architecture

- Global settings (model, API key, theme, target language)
- Per-chat settings (AI personalities, feedback style, cultural context)
- Settings automatically inherit from global to chat-specific

### Important Files

- `src/contexts/UnifiedStorageContext.tsx` - Chat history, settings management and defaults.
- `src/components/LanguageMateApp.tsx` - Main app layout and state
- `api/handlers/ai-chat.ts` - AI integration logic
- `api/handlers/models.ts` - OpenRouter models fetching
- `src/services/apiClient.ts` - Frontend API client

### Development Notes

- Default target language: Swedish
- Default model: `google/gemini-2.5-flash`
- Uses shadcn/ui component library extensively
- Responsive design with mobile-first approach
- Settings stored in localStorage with versioning

### API Configuration

#### Environment Variables

API Server (`api/.env`):

- `OPENAI_API_KEY` - OpenRouter API key for AI models
- `PORT` - Server port (default: 8000)

Frontend (`.env`):

- `VITE_API_BASE_URL` - API server URL (default: http://localhost:8000)

#### API Endpoints

- `POST /ai-chat` - AI chat completions
- `GET /models` - Available OpenRouter models

## Engineering mindset

- Follow the existing code style, if you are about to implement something new or write a new test, search for existing files to understand the current style and convention.
- Avoid over-engineering. Keep thinking and reviewing whether if your solution is over-engineered, step back, look around and see if you can simplify your solution and its related code paths and only make the absolutely necessary changes.
- Use TDD/BDD as much as possible.
- For asynchronous logic flow, no matter in test, code or UI, make sure to implement them in a way where the cause and effect can be logically followed, for example by using async-await, event handler, or callback. Avoid using timeout/polling to handle asynchronous logic flow, if timeout/polling is really the only way to implement the logic, make sure to comment why timeout/polling is used instead of the other better approaches.

## TypeScript coding style and conventions

- Prefer named import/export over default import/export.
- Early return, early throw.
- In frontend Vitest test files, import explicitly the test helpers e.g. `import { describe, it, expect, beforeEach } from 'vitest';`.
- Use Zod to validate and cast type as early as possible, this includes but not limit to handling the following scenarios: `JSON.parse()`, `response.json()`, `any`, `unknown`, `DefaultBodyType`.
- Never use `any`, `as` type assertion or `!` non-null assertion operator, you should instead use type narrowing, for example in test you can use `expectToBeInstanceOf`, `expectToNotBeNull`, `expectToNotBeUndefined`, and outside of test `instanceof` or do a proper object validation with Zod.
- If you would declare an untyped object, instead you should either type it with e.g. `const x: X = {}` or `{} satisfies X`.
- Avoid optional function parameter, optional property, and default values. If you are about to add one or you see any of such usages, try to look around the related code paths and see if you can refactor to remove it. Default values should only be used when it's absolutely necessary.
- Throw if a logic not really optional:

```ts
// Bad: Is Y optional?
if (x instaceof X) { x.Y(); }

// Bad: Is Y optional?
x?.Y();

// Good: Type narrowing and early throw
if (!x instanceof X) { throw new Error(); }
x.Y();

// Best: Zod type narrowing and early throw, prefer .parse over .safeParse when possible.
zodSchema.parse(x);
x.Y();

// Compromise: Explain why Y is optional if Y is really optional.
x?.Y(); // Y is optional because ...
```

### In fronted, instead of X use Y

- `as` operator -> use Zod
- `console.error` -> `logError`
- `JSX.Element` -> `React.JSX.Element`
- `toBeTruthy`, `.not.toBeNull`, `toBeDefined`, `toBeInstanceOf` or `if (instanceof)` -> use the type narrowing expect helpers in `src/__tests__/typedExpectHelpers.ts`
- `getAllBy*()[*]` -> `getByTestId` or `getByText`
- `() => {}` empty mock -> `vi.fn()`
- `fireEvent` -> `userEvent`
- `vi.mock` -> never mock imported code, we write integration test and should not mock any decendant imports.

## Planning and task management

- You are meant to work on your own unattended once the user has approved your initial work plan, you should plan ahead for working on your own.
- When planning, the plan is always for yourself to be able to follow the plan and work on the task immediately after the plan is approved by the user.
- When planning, automatically break down the task into smaller tasks and utilise the TodoRead & TodoWrite tools.
- When planning, plan ahead to see if you need to update any tests.
- When planning, think and review the plan yourself to see if you are over-engineering, you should focus on only making the absolutely relevant and needed chagnes. You need to review your own plan at least review 2 times.
- You should keep working until your todo is empty.
- Do not spawn subagents unless the user asked you to do so.

## Git

- Unless otherwise specified by the user, when making progress in your task, be proactive to make small git commits with descriptive messages, and then git push.
- When you make commit, there's a pre-commit hook which will lint and test staged files.
- YOU SHOULD NEVER RUN `git commit --no-verify`. The pre-commit hook is for you, you should address the issue you caused. If you repeatly get errors from the pre-commit hook and can't solve it on your own, ask the user for help.
- Before you `git commit`, make sure you've git added the files you just edited, otherwise the pre-commit linter might rollback your edits.
- When `git commit`, wrap commit message with single quote instead of double quote, prefix you commit message title with `(Claude Code) ` and add a footer in commit message saying `Co-Authored-By: Claude <noreply@anthropic.com>`.
- Never amend commit, change git history or force push.

## Tool

- Plan ahead your tool calls and batch them as much as possible.
- Prioritise to use tools allowed in `.claude/settings.local.json` to be non-interactive and work as autonomously as possible.
- If there's a tool instead of command, use the tool, for example, use your own Read/Search tool.
- You should not run dev server or build commands like `npm run dev`, `npm run build`, `npm run build:dev`, `npm run preview`.

## Test

- When writing test, write integration test.
- Write integration test to cover business logic, if something can be clicked, input or be interacted in any other ways by the user, it should be covered by a test.
- When writing test, focus on testing the component/function's integrated behaviour, for example, if the import tree looks like A -> B -> C, you should not mock any of A/B/C, instead you should focus on testing if interacting with A as a whole gives you the expected result; in B's test you should not mock B/C and instead test interacting with B; and so on.
- You should only change a test file if you are fixing lint/type errors, or you made a change that requires update that test file.
- If you are only editing test, you should not change the existing code logic that in the test. If refactoring would make writing test easier, explain to the user and wait for feedback.
- Before you write or change any test code, make sure you get a full picture first by reading through the related code paths and understanding how the code and data flows.

## Lint

- If you would eslint disable anything, think again and see if there's a better approach to fix it, if you still need to eslint disable, make sure you add -- comment after it to explain why you chose to disable.

## Config

- You should not update any config files. If you believe you need to, explain to the user and wait for feedback.

## Bash command

- Don't `grep` the lint result or test result or count errors, if you need to run a focused check, just use the focused commands.
- If you need to `rg` or `grep`, add more context lines.

### Instead of command X, use Y

- `rg`, `grep` -> use Search tool
- `find` -> `git ls-files` or your own List tool
- `rm` -> try `git rm` first, if fail then try `git clean`
- `head`/`tail`/`cat` -> read the file with tool instead
- `npx tsc` -> `npm run typecheck`
- Don't chain or pipe commands, chained and piped commands will be denied.
