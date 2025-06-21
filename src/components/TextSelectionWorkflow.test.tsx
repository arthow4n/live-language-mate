import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import AskInterface from './AskInterface';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { createMockAiResponse } from '../__tests__/factories';
import { server } from '../__tests__/setup';
import type { AiChatRequest } from '@/schemas/api';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

describe('Text Selection Workflow Integration Tests', () => {
  test('AskInterface initializes with selected text and processes user question', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({
      response: 'This text means "Hello there" in English.',
    });

    let capturedEditorRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture Editor Mate requests
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        const requestData = body as AiChatRequest;

        // Capture editor-mate-response requests
        if (requestData.messageType === 'editor-mate-response') {
          capturedEditorRequest = requestData;
        }

        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <AskInterface
          selectedText="Hej på dig"
          targetLanguage="Swedish"
          selectionSource="main-chat"
        />
      </TestWrapper>
    );

    // Verify the selected text appears in the input
    await waitFor(() => {
      expect(screen.getByDisplayValue('Hej på dig')).toBeInTheDocument();
    });

    // Verify the welcome message appears for selected text
    await waitFor(() => {
      expect(
        screen.getByText(/I can help you understand "Hej på dig"/)
      ).toBeInTheDocument();
    });

    // Ask a question about the selected text
    const askInput = screen.getByPlaceholderText(
      'Ask Editor Mate about Swedish...'
    );
    await user.type(askInput, 'What does this mean?');

    // Click the send button
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    // Wait for Editor Mate API call
    await waitFor(() => {
      expect(capturedEditorRequest).not.toBeNull();
    });

    // Verify the Editor Mate request includes the context
    expect(capturedEditorRequest).toBeTruthy();
    expect(capturedEditorRequest).toHaveProperty(
      'messageType',
      'editor-mate-response'
    );
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- capturedEditorRequest is verified to be non-null above
    expect(capturedEditorRequest!.message).toContain('What does this mean?');
    // eslint-disable-next-line @typescript-eslint/no-non-null-assertion -- capturedEditorRequest is verified to be non-null above
    expect(capturedEditorRequest!.message).toContain('Hej på dig');
  });

  test('AskInterface handles empty selection gracefully', async () => {
    render(
      <TestWrapper>
        <AskInterface selectedText="" targetLanguage="Swedish" />
      </TestWrapper>
    );

    // Should show the empty state message
    await waitFor(() => {
      expect(
        screen.getByText(/Enter text above or select text from the chat/)
      ).toBeInTheDocument();
    });

    // Should allow direct input of text to analyze
    const selectedTextInput = screen.getByPlaceholderText(
      'Enter or paste text you want to ask about...'
    );
    expect(selectedTextInput).toBeInTheDocument();
  });
});
