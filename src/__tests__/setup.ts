import '@testing-library/jest-dom/vitest';
// Polyfill DataTransferItemList, DataTransfer
import '@atlaskit/pragmatic-drag-and-drop/unit-testing/drag-event-polyfill';
// Polyfill DOMRect
import '@atlaskit/pragmatic-drag-and-drop/unit-testing/dom-rect-polyfill';
// eslint-disable-next-line testing-library/no-manual-cleanup -- here it's test setup.
import { cleanup } from '@testing-library/react';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';
import { z } from 'zod/v4';
import { $ZodError } from 'zod/v4/core';

import { apiHandlers } from './mocks/handlers';

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
  cleanup();
});

afterAll(() => {
  // Clean up after all tests
  server.close();
});

// eslint-disable-next-line @typescript-eslint/no-unsafe-member-access -- LLM context saving hack
$ZodError.prototype.toJSON = function (): Error | undefined {
  if (!(this instanceof $ZodError)) {
    throw new Error();
  }

  return {
    message: z.prettifyError(this),
    name: this.name,
    stack: this.stack,
  };
};
