import '@testing-library/jest-dom/vitest';
import { setupServer } from 'msw/node';
import { afterAll, afterEach, beforeAll } from 'vitest';

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
      addEventListener: () => {
        /* Mock implementation */
      },
      addListener: () => {
        /* Mock implementation */
      },
      dispatchEvent: () => {
        /* Mock implementation */
      },
      matches: false,
      media: query,
      onchange: null,
      removeEventListener: () => {
        /* Mock implementation */
      },
      removeListener: () => {
        /* Mock implementation */
      },
    }),
    writable: true,
  });

  // Mock scrollIntoView for components that use auto-scrolling
  Element.prototype.scrollIntoView = () => {
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
