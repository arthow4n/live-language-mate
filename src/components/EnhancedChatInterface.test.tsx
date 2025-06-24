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

  test('shows NewConversationQuickStart component when no conversation is selected', () => {
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

    // Should show the quick start component for new conversations
    expect(screen.getByText('Start a new conversation')).toBeInTheDocument();
    expect(
      screen.getByText('Choose a language and model to get started quickly')
    ).toBeInTheDocument();
    expect(screen.getByText('Recent Languages:')).toBeInTheDocument();
    expect(screen.getByText('Recent Models:')).toBeInTheDocument();
  });

  test('uses selected language immediately in AI calls when creating new conversation', async () => {
    const user = userEvent.setup();
    let capturedTargetLanguage = '';

    // Set up test data with French conversation history so French button is available
    const testData = {
      conversations: [
        {
          created_at: new Date('2024-01-01T00:00:00.000Z'),
          id: 'conv1',
          language: 'French',
          messages: [],
          title: 'French Chat',
          updated_at: new Date('2024-01-01T00:00:00.000Z'),
        },
      ],
      conversationSettings: {},
      globalSettings: {
        apiKey: '',
        chatMateBackground: 'young professional',
        chatMatePersonality: 'friendly',
        culturalContext: true,
        editorMateExpertise: '10+ years',
        editorMatePersonality: 'patient teacher',
        enableReasoning: true,
        feedbackStyle: 'encouraging' as const,
        model: 'google/gemini-2.5-flash',
        progressiveComplexity: true,
        reasoningExpanded: true,
        streaming: true,
        targetLanguage: 'Swedish',
        theme: 'system' as const,
      },
    };

    localStorage.setItem('language-mate-data', JSON.stringify(testData));

    // Mock API to capture the targetLanguage parameter
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        if (
          body &&
          typeof body === 'object' &&
          'targetLanguage' in body &&
          typeof body.targetLanguage === 'string'
        ) {
          capturedTargetLanguage = body.targetLanguage;
        }
        return HttpResponse.json({
          reasoning: null,
          response: 'Bonjour! Comment allez-vous?',
        });
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

    // Wait for component to load and show French button
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /french/i })
      ).toBeInTheDocument();
    });

    // Select French language via QuickStart
    const frenchButton = screen.getByRole('button', { name: /french/i });
    await user.click(frenchButton);

    // Wait for toast to appear confirming selection
    await waitFor(() => {
      expect(screen.getByText('Language Selected')).toBeInTheDocument();
    });

    // Type and send a message
    const messageInput = screen.getByTestId('message-input');
    await user.type(messageInput, 'Hello!');

    const sendButton = screen.getByTestId('send-button');
    await user.click(sendButton);

    // Verify the AI call used "French" (the selected language), not the stale prop "Swedish"
    await waitFor(
      () => {
        expect(capturedTargetLanguage).toBe('French');
      },
      { timeout: 5000 }
    );
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
