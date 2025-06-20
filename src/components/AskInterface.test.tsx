import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AskInterface from './AskInterface';
import { LocalStorageProvider } from '@/contexts/LocalStorageContext';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { createMockAiResponse } from '../__tests__/factories';
import { aiChatRequestSchema } from '@/schemas/api';
import type { AiChatRequest } from '@/schemas/api';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <SettingsProvider>
    <LocalStorageProvider>{children}</LocalStorageProvider>
  </SettingsProvider>
);

// Create test-specific server
const server = setupServer();

// Test setup and cleanup
beforeAll(() => {
  server.listen();
});
afterEach(() => {
  server.resetHandlers();
});
afterAll(() => {
  server.close();
});

describe('AskInterface Integration Tests', () => {
  test.skip('editor mate request includes all required fields', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({ response: 'Editor response' });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture the request
    server.use(
      http.post('http://localhost:8000/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body as AiChatRequest;

        // Use Zod to validate the entire request structure
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <AskInterface selectedText="Hej på dig" targetLanguage="Swedish" />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'What does this mean?');
    await user.keyboard('{Enter}');

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Additional specific checks beyond Zod validation
    if (capturedRequest) {
      expect(capturedRequest.messageType).toBe('editor-mate-response');
      expect(capturedRequest.message).toContain('What does this mean?');
    }
  });
});
