import '@testing-library/jest-dom';
import { beforeAll, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
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
    writable: true,
    value: (query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: () => {
        /* Mock implementation */
      },
      removeListener: () => {
        /* Mock implementation */
      },
      addEventListener: () => {
        /* Mock implementation */
      },
      removeEventListener: () => {
        /* Mock implementation */
      },
      dispatchEvent: () => {
        /* Mock implementation */
      },
    }),
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
