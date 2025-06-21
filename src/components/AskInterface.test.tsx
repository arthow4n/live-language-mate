import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { http, HttpResponse } from 'msw';
import { describe, expect, test } from 'vitest';

import type { AiChatRequest } from '@/schemas/api';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { aiChatRequestSchema } from '@/schemas/api';

import { createMockAiResponse } from '../__tests__/factories';
import { server } from '../__tests__/setup';
import AskInterface from './AskInterface';

/**
 *
 */
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

describe('AskInterface Integration Tests', () => {
  test('editor mate request includes all required fields', async () => {
    const user = userEvent.setup();
    const mockResponse = createMockAiResponse({ response: 'Editor response' });

    let capturedRequest: AiChatRequest | null = null;

    // Set up MSW handler to capture the request
    server.use(
      http.post('http://*/ai-chat', async ({ request }) => {
        const body = await request.json();
        capturedRequest = body;

        // Use Zod to validate the entire request structure
        const validationResult = aiChatRequestSchema.safeParse(body);
        expect(validationResult.success).toBe(true);

        return HttpResponse.json(mockResponse);
      })
    );

    render(
      <TestWrapper>
        <AskInterface selectedText="Hej på dig" targetLanguage="Swedish" />
      </TestWrapper>
    );

    const questionInput = screen.getByPlaceholderText(
      'Ask Editor Mate about Swedish...'
    );
    await user.type(questionInput, 'What does this mean?');

    // Get all buttons and find the send button (should be the last one)
    const buttons = screen.getAllByRole('button');
    const sendButton = buttons[buttons.length - 1]; // Send button is the last button
    await user.click(sendButton);

    await waitFor(() => {
      expect(capturedRequest).not.toBeNull();
    });

    // Additional specific checks beyond Zod validation
    expect(capturedRequest).toBeTruthy();
    expect(capturedRequest).toHaveProperty(
      'messageType',
      'editor-mate-response'
    );
    expect(capturedRequest).toHaveProperty('message');
    expect(
      capturedRequest &&
        typeof capturedRequest === 'object' &&
        'message' in capturedRequest
        ? capturedRequest.message
        : ''
    ).toContain('What does this mean?');
  });
});
