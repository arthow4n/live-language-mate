import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import { server } from '../__tests__/setup';
import EnhancedChatInterface from './EnhancedChatInterface';

const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>
    <Toaster />
    {children}
  </UnifiedStorageProvider>
);

describe('EnhancedChatInterface Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    server.resetHandlers();
  });

  test('handles API errors gracefully', async () => {
    const user = userEvent.setup();

    // Mock API to return error
    server.use(
      http.post('http://*/ai-chat', () => {
        return HttpResponse.json(
          { error: 'API service unavailable' },
          { status: 500 }
        );
      })
    );

    const mockOnConversationCreated = (): void => {
      // Mock function for test
    };
    const mockOnConversationUpdate = (): void => {
      // Mock function for test
    };
    const mockOnTextSelect = (): void => {
      // Mock function for test
    };

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId={null}
          onConversationCreated={mockOnConversationCreated}
          onConversationUpdate={mockOnConversationUpdate}
          onTextSelect={mockOnTextSelect}
          targetLanguage="Swedish"
        />
      </TestWrapper>
    );

    // Type a message
    const messageInput = screen.getByTestId('message-input');
    await user.type(messageInput, 'Hello there!');

    // Send the message
    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    // Should show error toast message
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(screen.getByText('API service unavailable')).toBeInTheDocument();
    });
  });
});
