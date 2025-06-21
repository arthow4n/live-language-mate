import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import EnhancedChatInterface from './EnhancedChatInterface';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { createMockAiResponse } from '../__tests__/factories';
import { aiChatRequestSchema } from '@/schemas/api';
import type { AiChatRequest } from '@/schemas/api';
import { server } from '../__tests__/setup';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

describe('EnhancedChatInterface Integration Tests', () => {
  test('sending message creates valid API request', async () => {
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
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
        />
      </TestWrapper>
    );

    // Real user interaction
    const input = screen.getByRole('textbox');
    await user.type(input, 'Hello, how do I say goodbye in Swedish?');

    // Find the send button (should be the last button on the page)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    // Wait for API call and verify request structure
    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Additional specific assertions if needed beyond Zod validation
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('message');
    expect(capturedRequest).toHaveProperty('targetLanguage', 'Swedish');
  });

  test.skip('handles API errors gracefully', async () => {
    // TODO: Test toast notifications require Toaster component in test setup
    // This test is skipped until we properly mock the toast system
  });
});
