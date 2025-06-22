import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { beforeEach, describe, expect, test } from 'vitest';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import { server } from '../__tests__/setup';
import AskInterface from './AskInterface';

// Test wrapper with provider
const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

describe('Text Selection Workflow Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    // Reset MSW handlers to default
    server.resetHandlers();
  });

  test('AskInterface initializes with selected text and processes user question', async () => {
    const user = userEvent.setup();
    const selectedText = 'Jag är glad';
    const mockQuestion = 'What does this mean?';

    // Override API handler for this test to return non-streaming response
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        // Check if it's requesting streaming
        if (
          body &&
          typeof body === 'object' &&
          'streaming' in body &&
          body.streaming
        ) {
          // Return streaming response for streaming requests
          const encoder = new TextEncoder();
          const stream = new ReadableStream({
            start(controller): void {
              controller.enqueue(
                encoder.encode(
                  'data: {"type":"content","content":"This means I am happy"}\n\n'
                )
              );
              controller.enqueue(encoder.encode('data: {"type":"done"}\n\n'));
              controller.close();
            },
          });
          return new Response(stream, {
            headers: { 'Content-Type': 'text/event-stream' },
          });
        } else {
          // Return non-streaming response
          return HttpResponse.json({
            reasoning: undefined,
            response: 'This means I am happy in English.',
          });
        }
      })
    );

    render(
      <TestWrapper>
        <AskInterface
          data-testid="ask-interface"
          selectedText={selectedText}
          selectionSource="main-chat"
          targetLanguage="Swedish"
        />
      </TestWrapper>
    );

    // Should initialize with selected text
    expect(screen.getByDisplayValue(selectedText)).toBeInTheDocument();

    // Should show welcome message about the selected text
    expect(
      screen.getByText(/I can help you understand "Jag är glad"/)
    ).toBeInTheDocument();

    // Type a question
    const questionInput = screen.getByPlaceholderText(
      'Ask Editor Mate about Swedish...'
    );
    await user.clear(questionInput);
    await user.type(questionInput, mockQuestion);

    // Submit the question (the last button should be the send button, since it's disabled when empty)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1];
    await user.click(sendButton);

    // Should show the user's question
    expect(screen.getByText(mockQuestion)).toBeInTheDocument();

    // Should eventually show the AI response
    await expect(
      screen.findByText(/This means I am happy/)
    ).resolves.toBeInTheDocument();
  });

  test('AskInterface handles empty selection gracefully', () => {
    const selectedText = '';

    // Should not throw any errors when rendering with empty selection
    expect(() => {
      render(
        <TestWrapper>
          <AskInterface
            data-testid="ask-interface-empty"
            selectedText={selectedText}
            selectionSource="ask-interface"
            targetLanguage="Swedish"
          />
        </TestWrapper>
      );
    }).not.toThrow();

    // Should render the question input
    const questionInputs = screen.getAllByPlaceholderText(
      'Ask Editor Mate about Swedish...'
    );
    expect(questionInputs.length).toBeGreaterThan(0);

    // Should render the text input for selection
    const editableTextInputs = screen.getAllByPlaceholderText(
      'Enter or paste text you want to ask about...'
    );
    expect(editableTextInputs.length).toBeGreaterThan(0);
    // The last one should be empty (from our new component)
    expect(editableTextInputs[editableTextInputs.length - 1]).toHaveValue('');
  });
});
