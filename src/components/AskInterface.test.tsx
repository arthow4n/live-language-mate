import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import AskInterface from './AskInterface';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { createMockAiResponse } from '../__tests__/factories';
import { aiChatRequestSchema } from '@/schemas/api';
import type { AiChatRequest } from '@/schemas/api';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
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
  test('editor mate request includes all required fields', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({ response: 'Editor response' });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture the request
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        console.log('MSW Handler: API call intercepted');
        const body = await request.json();
        capturedRequest = body as AiChatRequest;
        console.log('MSW Handler: Request captured', capturedRequest);

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

    const questionInput = screen.getByPlaceholderText(
      'Ask Editor Mate about Swedish...'
    );
    await user.type(questionInput, 'What does this mean?');

    // Get all buttons and find the send button (should be the last one)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // Send button is the last button
    await user.click(sendButton);

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Additional specific checks beyond Zod validation
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty(
      'messageType',
      'editor-mate-response'
    );
    expect(capturedRequest).toHaveProperty('message');
    expect((capturedRequest as unknown as AiChatRequest).message).toContain(
      'What does this mean?'
    );
  });
});
