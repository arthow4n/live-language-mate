import { describe, test, expect, beforeAll, afterEach, afterAll } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { setupServer } from 'msw/node';
import EnhancedChatInterface from './EnhancedChatInterface';
import { SettingsProvider } from '@/contexts/SettingsContext';
import { LocalStorageProvider } from '@/contexts/LocalStorageContext';
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
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe('EnhancedChatInterface Integration Tests', () => {
  test.skip('sending message creates valid API request', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Chat Mate response',
    });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture and validate the request
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
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
        <EnhancedChatInterface
          conversationId="test-id"
          targetLanguage="Swedish"
          onConversationUpdate={() => {}}
          onConversationCreated={() => {}}
          onTextSelect={() => {}}
        />
      </TestWrapper>
    );

    // Real user interaction
    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello, how do I say goodbye in Swedish?');
    await user.click(screen.getByRole('button'));

    // Wait for API call and verify request structure
    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Additional specific assertions if needed beyond Zod validation
    if (capturedRequest) {
      expect(capturedRequest.message).toContain('goodbye');
      expect(capturedRequest.targetLanguage).toBe('Swedish');
    }
  });

  test.skip('handles API errors gracefully', async () => {
    const user = userEvent.setup();

    // Set up MSW handler to return error
    server.use(
      http.post('http://*/ai-chat', () => {
        return HttpResponse.json(
          { error: 'Rate limit exceeded' },
          { status: 429 }
        );
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-id"
          targetLanguage="Swedish"
          onConversationUpdate={() => {}}
          onConversationCreated={() => {}}
          onTextSelect={() => {}}
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test message');
    await user.click(screen.getByRole('button'));

    // Should show error state in UI
    await waitFor(() => {
      expect(screen.getByText(/error/i)).toBeInTheDocument();
    });
  });
});
