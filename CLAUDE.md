# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- Focused single/multiple file commands
  - `npm run test:frontend -- [--test-name-pattern=""] file [...files]` - Type check and run frontend test only on the specified test files, or tests related to a non-test file. The command is a faster wrapper of `vitest run`.
  - `npm run test:backend -- file [...files]` - Run backend test only on the specified test files.
- For all `npm run` commands, if you would add any args, be sure to add `--` like `npm run x -- [...args]`. Inspect `package.json` to ensure you can really add args to the command.
- `npm run typecheck` can be used for quickly performing a type check.

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

- You should follow the existing code style, if you are about to implement something new or write a new test, search for existing files to understand the current style and convention.
- You should actively look for reusing shared function/component/hook etc, and search for another potentially extractable/sharable code to move to shared code.
- Avoid over-engineering. Keep thinking and reviewing whether if your solution is over-engineered, step back, look around and see if you can simplify your solution and its related code paths and only make the absolutely necessary changes.
- For asynchronous logic flow, no matter in test, code or UI, make sure to implement them in a way where the cause and effect can be logically followed, for example by using async-await, event handler, or callback. Avoid using timeout/polling to handle asynchronous logic flow, if timeout/polling is really the only way to implement the logic, make sure to comment why timeout/polling is used instead of the other better approaches.
- Don't leave unnecessary comment, unmaintained comment can become stale and adds confusion. You should only leave comment for explaining the motivation behind the code, not to repeat what the code is doing.
- Make sure your code can be logically followed, there should not be implicit flow.
- Make sure the cause and effect in the code flow is deterministic, you should not cause race condition.

## TypeScript coding style and conventions

- Prefer named import/export over default import/export.
- Early return, early throw.
- In frontend Vitest test files, import explicitly the test helpers e.g. `import { beforeEach, describe, expect, test, vi } from 'vitest';`.
- Use Zod to validate and cast type as early as possible, this includes but not limit to handling the following scenarios: `any`, `unknown`, `DefaultBodyType`.
- Always assign unknown type to `const x: unknown = JSON.parse()`, `cosnt x: unknown = await request.json()`, `cosnt x: unknown = await response.json()`, then validate with Zod.
- Zod schemas are shared between frontend and backend.
- Zod schemas are in `src/schemas/`, you should find in there first to see if there's a schema you can reuse. You should not create Zod schemas outside of `src/schemas/`.
- Never use `any`, `as` type assertion or `!` non-null assertion operator, you should instead use type narrowing, for example in test you can use `expectToBe`, `expectToBeInstanceOf`, `expectToNotBeNull`, `expectToNotBeUndefined`, and outside of test `instanceof` or do a proper object validation with Zod. See `src/__tests__/typedExpectHelpers.ts` for all expect alternatives when you run into lint error.
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
- `JSON.stringify(x)` if x is not typed -> `const x: X = {}; JSON.stringify(x)` or `JSON.stringify({} satisfies X)`
- `fireEvent` -> `userEvent`
- `vi.mock` -> never mock imported code, we write integration test and should not mock any decendant imports.

## Planning and task management

- You are meant to work on your own unattended once the user has approved your initial work plan, you should plan ahead for working on your own.
- When planning, the plan is always for yourself to be able to follow the plan and work on the task immediately after the plan is approved by the user.
- When planning, automatically break down the task into smaller tasks and utilise the TodoRead & TodoWrite tools.
- When planning, plan ahead to see if you need to update any tests.
- When planning, think and review the plan yourself to see if you are over-engineering, you should focus on only making the absolutely relevant and needed chagnes. You need to review your own plan at least review 2 times.
- Do not spawn subagents unless the user asked you to do so.
- Don't skip anything in your todo.
- You should keep working until your todo is empty.
- You should review your plan by double checking with the actual code flow and CLAUDE.md before you present it to the user and before you start working.
- Before you start working, make sure to step back and break down the plan into smaller todo items.
- You should express your plan's code flow in a sequence diagram.

## Debugging

- Always create a sequence diagram to explain in which exact sequence can a bug happen.
- If you belive something might be caused by a race condition or a timing issue, you should default to step back and read through all the related code paths from beginning to end, and then make a comprehensive argument and a concrete sequence diagram to explain why it's really a race condition or timing issue. This is to make sure you don't just blindly guess and fix the wrong problem.

## Development process

- You should do TDD:
  1. Review the code paths that will be tested from beginning to end, then think how to write the correct test case.
  2. Write a test case that is failing, which will be fixed after correct implementation.
  3. Start implementation.
  4. Fix until test passes.
  5. Commit and push after each task is done.
- If test is failng more than 3 times in a row, step back and read again the code path from beginning to end, think how to address the issue systematically before you rerun the test again.
- Question yourself are your soution and test addressing what the user asked for.

## Git

- When making progress in your task, be proactive to make small git commit with descriptive messages, and then git push.
- When `git commit`, wrap commit message with single quote instead of double quote, prefix you commit message title with `(Claude Code) ` and add a footer in commit message saying `Co-Authored-By: Claude <noreply@anthropic.com>`.
- When you make commit, there's a pre-commit hook which will lint and test staged files.
- IMPORTANT: YOU SHOULD NEVER RUN `git commit --no-verify`. The pre-commit hook is for you, you should address the issue you caused. If you repeatly get errors from the pre-commit hook and can't solve it on your own, ask the user for help.
- IMPORTANT: All the lint, type, test errors from pre-commit hook are caused by you and related to your task, you must fix them.
- IMPORTANT: Never amend commit, change git history or force push.

## Test

- When writing test, write integration test.
- Write integration test to cover business logic, if something can be clicked, input or be interacted in any other ways by the user, it should be covered by a test.
- When writing new test, make sure the test is genuinely new and not testing what another test has already covered. You should look for other existing test cases to understand if the test you are about to write is already covered by another test.
- Focus on testing the component/function's integrated behaviour, for example, if the import tree looks like A -> B -> C, you should not mock any of A/B/C, instead you should focus on testing if interacting with A as a whole gives you the expected result; in B's test you should not mock B/C and instead test interacting with B; and so on.
- You should only change a test file if you are fixing lint/type errors, or you made a change that requires update that test file.
- If you are only editing test, you should not change the existing code logic that in the test. If refactoring would make writing test easier, explain to the user and wait for feedback. You may add testid yourself if needed.
- If an action will make an API request, you should test whether the API will get the correctly formed request.
- Before you write or change any test code, make sure you step back and get a full picture first, by reading through the related code paths from beginning to end, and understanding how the code and data flows.
- Instead of fixing many test cases in one go, focus on fixing 1 test at a time, each test case should have its own todo item.
- `DragEvent`, `DataTransferItemList`, `DataTransfer`, `DOMRect` are polyfilled and can be used in test:

```ts
const event = new DragEvent('dragenter', {
  cancelable: true,
  bubbles: true,
});
event.dataTransfer?.items.add('hello world', 'text/plain');
```

## Lint

- If you would eslint disable anything, think again and see if there's a better approach to fix it, if you still need to eslint disable, make sure you add -- comment after it to explain why you chose to disable.

## Config

- You should not update any config files. If you believe you need to, explain to the user and wait for feedback.

## Tool

- USE YOUR OWN Search TOOL.
- Batch your tool calls, use many tools at once.
- Use tools allowed in `.claude/settings.local.json` to be non-interactive and work as autonomously as possible.
- Never run dev server or build commands like `npm run dev`, `npm run build`, `npm run build:dev`, `npm run preview`.

## Bash command

- Don't `grep` the lint result or test result or count errors, if you need to run a focused check, just use the focused commands.
- Use your own search tool instead of `rg` or `grep`, add more context lines.

### Instead of command X, use Y

- `rg`, `grep` -> use Search tool
- `find` -> `git ls-files` or your own List tool
- `rm` -> try `git rm` first, if fail then try `git clean`
- `head`/`tail`/`cat` -> read the file with tool instead
- `npx tsc` -> `npm run typecheck`
- Don't chain or pipe commands, chained and piped commands will be denied.
