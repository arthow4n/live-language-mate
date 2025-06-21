import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from '@/schemas/api';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { aiChatRequestSchema } from '@/schemas/api';

import { createMockAiResponse } from '../__tests__/factories';
import { server } from '../__tests__/setup';
import EnhancedChatInterface from './EnhancedChatInterface';

/**
 *
 */
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps): React.JSX.Element => (
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

        // Use Zod to validate the entire request structure
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        if (validationResult.success) {
          capturedRequest = validationResult.data;
        }

        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-id"
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
          targetLanguage="Swedish"
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
