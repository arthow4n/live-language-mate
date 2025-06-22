import '@testing-library/jest-dom/vitest';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { z, ZodError } from 'zod';
import { errorMap, fromError } from 'zod-validation-error';

import { apiHandlers } from './mocks/handlers';

// TODO: Replace with zod v4 https://zod.dev/error-formatting?id=zprettifyerror
z.setErrorMap(errorMap);

// Setup MSW server with our API handlers
const server = setupServer(...apiHandlers);

// Export server for use in tests
export { server };

beforeAll(() => {
  // Start MSW server before all tests
  server.listen({ onUnhandledRequest: 'warn' });

  // Mock window.matchMedia for components that use responsive design
  Object.defineProperty(window, 'matchMedia', {
    value: (query: string) => ({
      addEventListener: (): void => {
        /* Mock implementation */
      },
      addListener: (): void => {
        /* Mock implementation */
      },
      dispatchEvent: (): boolean => {
        /* Mock implementation */
        return true;
      },
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: (): void => {
        /* Mock implementation */
      },
      removeListener: (): void => {
        /* Mock implementation */
      },
    }),
    writable: true,
  });

  // Mock scrollIntoView for components that use auto-scrolling
  Element.prototype.scrollIntoView = (): void => {
    /* Mock implementation */
  };
});

afterEach(() => {
  // Reset handlers after each test
  server.resetHandlers();
});

afterAll(() => {
  // Clean up after all tests
  server.close();
});

// @ts-expect-error -- hack to reduce LLM context usage.
ZodError.prototype.toJSON = function (): {
  message: string;
  name: string;
  stack: string | undefined;
} {
  return {
    message: fromError(this).toString(),
    name: this.name,
    stack: this.stack,
  };
};
