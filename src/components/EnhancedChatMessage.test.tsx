import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { describe, expect, test, vi } from 'vitest';

import type { Message } from '@/schemas/messages';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import EnhancedChatMessage from './EnhancedChatMessage';

/**
 *
 */
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

const createMockMessage = (overrides: Partial<Message> = {}): Message => ({
  content: 'This is a test message with some **bold** text.',
  id: 'test-message-id',
  timestamp: new Date('2024-01-01T12:00:00Z'),
  type: 'chat-mate',
  ...overrides,
});

describe('EnhancedChatMessage Integration Tests', () => {
  test('displays message content and metadata correctly', () => {
    const message = createMockMessage({
      content: 'Hello, how are you?',
      metadata: {
        generationTime: 1500,
        model: 'google/gemini-2.5-flash',
      },
      type: 'user',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage message={message} onTextSelect={vi.fn()} />
      </TestWrapper>
    );

    expect(screen.getByText('User')).toBeInTheDocument();
    expect(screen.getByText('Hello, how are you?')).toBeInTheDocument();
    expect(screen.getByText('google/gemini-2.5-flash')).toBeInTheDocument();
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  test('message actions dropdown functionality', async () => {
    const user = userEvent.setup();
    const onEdit = vi.fn();
    const onDelete = vi.fn();
    const onRegenerate = vi.fn();
    const onFork = vi.fn();
    const onCopy = vi.fn();

    // Mock clipboard API
    Object.defineProperty(navigator, 'clipboard', {
      configurable: true,
      value: {
        writeText: onCopy,
      },
      writable: true,
    });

    const message = createMockMessage({
      content: 'AI response message',
      type: 'chat-mate',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={message}
          onDeleteMessage={onDelete}
          onEditMessage={onEdit}
          onForkFrom={onFork}
          onRegenerateMessage={onRegenerate}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    // Open dropdown menu
    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);

    // Test Copy action
    const copyButton = screen.getByRole('menuitem', { name: /copy/i });
    await user.click(copyButton);
    expect(onCopy).toHaveBeenCalledWith('AI response message');

    // Open dropdown again for other actions
    await user.click(moreButton);

    // Test Edit action
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    // Should show edit mode with textarea and buttons
    const textarea = screen.getByRole('textbox');
    expect(textarea).toHaveValue('AI response message');
    expect(screen.getByRole('button', { name: /save/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
  });

  test('edit mode save and cancel functionality', async () => {
    const user = userEvent.setup();
    const onEditMessage = vi.fn();

    const message = createMockMessage({
      content: 'Original message content',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={message}
          onEditMessage={onEditMessage}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    // Open dropdown and click edit
    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    // Edit content
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Modified message content');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    expect(onEditMessage).toHaveBeenCalledWith(
      'test-message-id',
      'Modified message content'
    );
  });

  test('edit mode cancel restores original content', async () => {
    const user = userEvent.setup();
    const onEditMessage = vi.fn();

    const message = createMockMessage({
      content: 'Original message content',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={message}
          onEditMessage={onEditMessage}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    // Enter edit mode
    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);
    const editButton = screen.getByRole('menuitem', { name: /edit/i });
    await user.click(editButton);

    // Modify content
    const textarea = screen.getByRole('textbox');
    await user.clear(textarea);
    await user.type(textarea, 'Modified content');

    // Cancel changes
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should show original content again
    expect(screen.getByText('Original message content')).toBeInTheDocument();
    expect(onEditMessage).not.toHaveBeenCalled();
  });

  test('regenerate action only available for non-user messages', async () => {
    const user = userEvent.setup();
    const onRegenerate = vi.fn();

    // Test with user message - should not show regenerate
    const userMessage = createMockMessage({
      content: 'User message',
      type: 'user',
    });

    const { rerender } = render(
      <TestWrapper>
        <EnhancedChatMessage
          message={userMessage}
          onRegenerateMessage={onRegenerate}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);

    expect(
      screen.queryByRole('menuitem', { name: /regenerate/i })
    ).not.toBeInTheDocument();

    // Test with AI message - should show regenerate
    const aiMessage = createMockMessage({
      content: 'AI message',
      type: 'chat-mate',
    });

    rerender(
      <TestWrapper>
        <EnhancedChatMessage
          message={aiMessage}
          onRegenerateMessage={onRegenerate}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    await user.click(moreButton);
    const regenerateButton = screen.getByRole('menuitem', {
      name: /regenerate/i,
    });
    await user.click(regenerateButton);

    expect(onRegenerate).toHaveBeenCalledWith('test-message-id');
  });

  test('text selection triggers onTextSelect callback', async () => {
    const user = userEvent.setup();
    const onTextSelect = vi.fn();

    const message = createMockMessage({
      content: 'This is selectable text content.',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage message={message} onTextSelect={onTextSelect} />
      </TestWrapper>
    );

    // Mock text selection
    const messageContent = screen.getByText('This is selectable text content.');

    // Mock window.getSelection
    const mockSelection = {
      toString: () => 'selectable text',
    };
    vi.spyOn(window, 'getSelection').mockReturnValue(mockSelection);

    // Trigger text selection event
    await user.pointer([
      { target: messageContent },
      { keys: '[MouseLeft>]' },
      { target: messageContent },
      { keys: '[/MouseLeft]' },
    ]);

    // The onMouseUp handler should trigger
    expect(onTextSelect).toHaveBeenCalledWith('selectable text');
  });

  test('fork and delete actions trigger correct callbacks', async () => {
    const user = userEvent.setup();
    const onFork = vi.fn();
    const onDelete = vi.fn();
    const onDeleteAllBelow = vi.fn();

    const message = createMockMessage();

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={message}
          onDeleteAllBelow={onDeleteAllBelow}
          onDeleteMessage={onDelete}
          onForkFrom={onFork}
          onTextSelect={vi.fn()}
        />
      </TestWrapper>
    );

    const moreButton = screen.getByRole('button', { name: /more/i });
    await user.click(moreButton);

    // Test Fork action
    const forkButton = screen.getByRole('menuitem', {
      name: /fork from here/i,
    });
    await user.click(forkButton);
    expect(onFork).toHaveBeenCalledWith('test-message-id');

    // Open menu again for delete actions
    await user.click(moreButton);

    // Test Delete message action
    const deleteButton = screen.getByRole('menuitem', {
      name: /delete message/i,
    });
    await user.click(deleteButton);
    expect(onDelete).toHaveBeenCalledWith('test-message-id');

    // Open menu again for delete all below
    await user.click(moreButton);

    // Test Delete all below action
    const deleteAllButton = screen.getByRole('menuitem', {
      name: /delete all below/i,
    });
    await user.click(deleteAllButton);
    expect(onDeleteAllBelow).toHaveBeenCalledWith('test-message-id');
  });

  test('reasoning section toggle functionality', async () => {
    const user = userEvent.setup();

    const message = createMockMessage({
      content: 'AI response with reasoning',
      reasoning: 'This is the AI reasoning process...',
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage message={message} onTextSelect={vi.fn()} />
      </TestWrapper>
    );

    // Should show reasoning toggle button
    const reasoningToggle = screen.getByRole('button', {
      name: /ai reasoning/i,
    });
    expect(reasoningToggle).toBeInTheDocument();

    // Click to expand reasoning (assuming it starts collapsed)
    await user.click(reasoningToggle);

    // Should show reasoning content
    await waitFor(() => {
      expect(
        screen.getByText('This is the AI reasoning process...')
      ).toBeInTheDocument();
    });

    // Click again to collapse
    await user.click(reasoningToggle);

    // Reasoning content should be hidden
    await waitFor(() => {
      expect(
        screen.queryByText('This is the AI reasoning process...')
      ).not.toBeInTheDocument();
    });
  });

  test('streaming indicator displays when message is streaming', () => {
    const message = createMockMessage({
      content: 'Streaming message...',
      isStreaming: true,
    });

    render(
      <TestWrapper>
        <EnhancedChatMessage message={message} onTextSelect={vi.fn()} />
      </TestWrapper>
    );

    // Should show streaming indicator (animated cursor)
    const messageContainer = screen.getByText(
      'Streaming message...'
    ).parentElement;
    expect(messageContainer).toBeInTheDocument();

    // The streaming indicator is implemented as a span with animate-pulse class
    const streamingIndicator =
      messageContainer?.querySelector('.animate-pulse');
    expect(streamingIndicator).toBeInTheDocument();
  });
});
