import { render, screen } from '@testing-library/react';
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
          messageType: z.string().optional(),
        });
        const body = requestBodySchema.parse(rawBody);

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
});
