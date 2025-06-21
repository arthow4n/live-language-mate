import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from '@/schemas/api';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import { createMockAiResponse } from '../__tests__/factories';
import { server } from '../__tests__/setup';
import EnhancedChatInterface from './EnhancedChatInterface';

/**
 *
 */
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

describe('Settings Impact on Chat Behavior Tests', () => {
  test('model setting affects API request', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Chat Mate response with custom model',
    });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture the request
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body;
        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-model-id"
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

    // Send a message to trigger API request
    const input = screen.getByRole('textbox');
    await user.type(input, 'Test message');

    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    // Wait for API call
    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Verify model setting is included in request
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('model');
    expect(capturedRequest).toHaveProperty('targetLanguage', 'Swedish');
  });

  test('streaming setting affects API request format', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Streaming response',
    });

    let capturedRequest: AiChatRequest | null = null;

    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body;
        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-streaming-id"
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
          targetLanguage="Spanish"
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Test streaming');

    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Verify streaming setting is included
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('streaming');
    expect(capturedRequest).toHaveProperty('targetLanguage', 'Spanish');
  });

  test('cultural context setting impacts prompt building', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Response with cultural context',
    });

    let capturedRequest: AiChatRequest | null = null;

    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body;
        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-cultural-id"
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
          targetLanguage="French"
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Tell me about French culture');

    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Verify cultural context setting is included
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('culturalContext');
    expect(capturedRequest).toHaveProperty('targetLanguage', 'French');
  });

  test('feedback style setting affects editor mate responses', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Editor feedback with custom style',
    });

    let capturedEditorRequest: AiChatRequest | null = null;

    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        const requestData = body;

        // Capture editor-mate requests specifically
        if (requestData.messageType.includes('editor-mate')) {
          capturedEditorRequest = requestData;
        }

        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-feedback-id"
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
          targetLanguage="German"
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Ich bin ein Student');

    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    // Wait for editor mate response
    await waitFor(() => {
      expect(capturedEditorRequest).not.toBeNull();
    });

    // Verify feedback style setting is included
    expect(capturedEditorRequest).toBeTruthy();
    expect(capturedEditorRequest).toHaveProperty('feedbackStyle');
    expect(capturedEditorRequest).toHaveProperty('targetLanguage', 'German');
  });

  test('reasoning setting affects API request structure', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'Response with reasoning',
    });

    let capturedRequest: AiChatRequest | null = null;

    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body;
        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <EnhancedChatInterface
          conversationId="test-reasoning-id"
          onConversationCreated={() => {
            /* empty test callback */
          }}
          onConversationUpdate={() => {
            /* empty test callback */
          }}
          onTextSelect={() => {
            /* empty test callback */
          }}
          targetLanguage="Italian"
        />
      </TestWrapper>
    );

    const input = screen.getByRole('textbox');
    await user.type(input, 'Ciao, come stai?');

    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Verify reasoning setting is included
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty('enableReasoning');
    expect(capturedRequest).toHaveProperty('targetLanguage', 'Italian');
  });
});
