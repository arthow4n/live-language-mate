import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';
import { z } from 'zod/v4';

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

describe('Chat Flow Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    server.resetHandlers();
  });

  // Mock handlers for the three AI message types in the chat flow
  const setupChatFlowMocks = (): void => {
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const rawBody = await request.json();
        const requestBodySchema = z.looseObject({
          chatMateBackground: z.string().optional(),
          chatMatePrompt: z.string().optional(),
          editorMatePrompt: z.string().optional(),
          messageType: z.string().optional(),
        });
        const body = requestBodySchema.parse(rawBody);

        // Validate required fields like the default handler
        const hasRequiredFields = [
          'chatMatePrompt',
          'editorMatePrompt',
          'chatMateBackground',
        ].every((field) => field in body && body[field]);

        if (!hasRequiredFields) {
          return HttpResponse.json(
            { error: 'Missing required fields like chatMatePrompt' },
            { status: 400 }
          );
        }

        if (body.messageType) {
          const messageType = body.messageType;

          switch (messageType) {
            case 'chat-mate-response':
              return HttpResponse.json({
                reasoning: undefined,
                response:
                  'Hej! Jag mår bra, tack så mycket! Hur mår du då? Vad gör du idag?',
              });

            case 'editor-mate-chatmate-comment':
              return HttpResponse.json({
                reasoning: undefined,
                response:
                  'Chat Mate responded naturally! Key phrases: "Jag mår bra" = "I\'m doing well", "tack så mycket" = "thank you so much", "Hur mår du då?" = "How are you then?", "Vad gör du idag?" = "What are you doing today?". Here\'s how you could respond: "Jag mår också bra, tack! Idag arbetar jag lite."',
              });

            case 'editor-mate-user-comment':
              return HttpResponse.json({
                reasoning: undefined,
                response:
                  '👍 Great start! You said "Hello, how are you?" which is perfect. In Swedish, this would be "Hej, hur mår du?"',
              });

            default:
              return HttpResponse.json({
                reasoning: undefined,
                response: 'Default mock AI response',
              });
          }
        }

        return HttpResponse.json({
          reasoning: undefined,
          response: 'Default mock AI response',
        });
      })
    );
  };

  test('basic test setup works', () => {
    setupChatFlowMocks();

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

    // Should render the chat interface
    expect(screen.getByTestId('message-input')).toBeInTheDocument();
    expect(screen.getByTestId('send-button')).toBeInTheDocument();
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
  });

  test('debug - can type in input', async () => {
    const user = userEvent.setup();

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

    const messageInput = screen.getByTestId('message-input');
    await user.type(messageInput, 'test');

    expect(messageInput).toHaveValue('test');
  });

  test('complete chat flow - user sends message and receives all AI responses in sequence', async () => {
    const user = userEvent.setup();

    // Use proper chat flow mocks for the 3 AI response types
    setupChatFlowMocks();

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
          conversationId="test-conversation-123"
          onConversationCreated={mockOnConversationCreated}
          onConversationUpdate={mockOnConversationUpdate}
          onTextSelect={mockOnTextSelect}
          targetLanguage="Swedish"
        />
      </TestWrapper>
    );

    // User types and sends a message
    const messageInput = screen.getByTestId('message-input');
    const sendButton = screen.getByTestId('send-button');

    // Initial state - button should be disabled with empty input
    expect(sendButton).toBeDisabled();

    await user.type(messageInput, 'Hello, how are you?');

    // After typing, button should be enabled
    await waitFor(() => {
      expect(sendButton).not.toBeDisabled();
    });

    await user.click(sendButton);

    // 1. User message should appear immediately
    await waitFor(() => {
      expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    });

    // 2. Editor Mate comment on user message should appear
    await waitFor(
      () => {
        expect(screen.getByText(/👍 Great start!/)).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 3. Chat Mate response should appear
    await waitFor(
      () => {
        expect(
          screen.getByText(/Hej! Jag mår bra, tack så mycket!/)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // 4. Editor Mate comment on Chat Mate response should appear
    await waitFor(
      () => {
        expect(
          screen.getByText(/Chat Mate responded naturally!/)
        ).toBeInTheDocument();
      },
      { timeout: 5000 }
    );

    // Verify all 4 messages are in the conversation (1 user + 3 AI responses)
    // Count messages by counting the message type badges
    const userLabels = screen.getAllByText('User');
    const editorMateLabels = screen.getAllByText('Editor Mate');
    const chatMateLabels = screen.getAllByText('Chat Mate');

    expect(userLabels).toHaveLength(1);
    expect(editorMateLabels).toHaveLength(2);
    expect(chatMateLabels).toHaveLength(1);

    // Total should be 4 messages
    const totalMessages =
      userLabels.length + editorMateLabels.length + chatMateLabels.length;
    expect(totalMessages).toBe(4);
  });

  test('chat flow handles AI response failures gracefully', async () => {
    const user = userEvent.setup();

    // Mock API to return errors for AI responses
    server.use(
      http.post('http://*/ai-chat', () => {
        return HttpResponse.json(
          { error: 'AI service temporarily unavailable' },
          { status: 503 }
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
          conversationId="test-conversation-error"
          onConversationCreated={mockOnConversationCreated}
          onConversationUpdate={mockOnConversationUpdate}
          onTextSelect={mockOnTextSelect}
          targetLanguage="Swedish"
        />
      </TestWrapper>
    );

    // Type a message
    const messageInput = screen.getByTestId('message-input');
    await user.type(messageInput, 'Test error handling');

    // Send the message
    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    // Should show error toast message
    await waitFor(() => {
      expect(screen.getByText('Error')).toBeInTheDocument();
    });

    await waitFor(() => {
      expect(
        screen.getByText('AI service temporarily unavailable')
      ).toBeInTheDocument();
    });
  });
});
