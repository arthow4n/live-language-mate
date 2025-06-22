import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { Message } from '@/schemas/messages';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

import EnhancedChatMessage from './EnhancedChatMessage';

describe('EnhancedChatMessage Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('displays message content and metadata correctly', () => {
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Hello, this is a test message!',
      id: 'test-message-1',
      metadata: {
        endTime: 1640995200000,
        generationTime: 1500,
        model: 'google/gemini-2.5-flash',
        startTime: 1640995198500,
      },
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Should display message content
    expect(
      screen.getByText('Hello, this is a test message!')
    ).toBeInTheDocument();

    // Should display message type badge
    expect(screen.getByText('Chat Mate')).toBeInTheDocument();

    // Should display timestamp (looking for time format)
    expect(screen.getByText(/\d{1,2}:\d{2}/)).toBeInTheDocument();

    // Should display model metadata
    expect(screen.getByText('google/gemini-2.5-flash')).toBeInTheDocument();

    // Should display generation time
    expect(screen.getByText('1.5s')).toBeInTheDocument();
  });

  test('message actions dropdown functionality', async () => {
    const user = userEvent.setup();
    const mockOnEditMessage = vi.fn();
    const mockOnRegenerateMessage = vi.fn();
    const mockOnForkFrom = vi.fn();
    const mockOnDeleteMessage = vi.fn();
    const mockOnDeleteAllBelow = vi.fn();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Test message content',
      id: 'test-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onDeleteAllBelow={mockOnDeleteAllBelow}
          onDeleteMessage={mockOnDeleteMessage}
          onEditMessage={mockOnEditMessage}
          onForkFrom={mockOnForkFrom}
          onRegenerateMessage={mockOnRegenerateMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Click the dropdown trigger button
    const actionsTrigger = screen.getByTestId('message-actions-trigger');
    await user.click(actionsTrigger);

    // Verify all expected menu items are present
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();
    expect(screen.getByText('Regenerate')).toBeInTheDocument();
    expect(screen.getByText('Fork from here')).toBeInTheDocument();
    expect(screen.getByText('Delete message')).toBeInTheDocument();
    expect(screen.getByText('Delete all below')).toBeInTheDocument();

    // Test Fork action - close menu with Escape, then reopen
    await user.keyboard('{Escape}');
    await user.click(actionsTrigger);
    await user.click(screen.getByText('Fork from here'));
    expect(mockOnForkFrom).toHaveBeenCalledWith('test-message-1');

    // Test Delete message action
    await user.click(actionsTrigger);
    await user.click(screen.getByText('Delete message'));
    expect(mockOnDeleteMessage).toHaveBeenCalledWith('test-message-1');

    // Test Delete all below action
    await user.click(actionsTrigger);
    await user.click(screen.getByText('Delete all below'));
    expect(mockOnDeleteAllBelow).toHaveBeenCalledWith('test-message-1');
  });
  test('edit mode save and cancel functionality', async () => {
    const user = userEvent.setup();
    const mockOnEditMessage = vi.fn();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Original message content',
      id: 'test-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onEditMessage={mockOnEditMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Click the dropdown trigger and select Edit
    const actionsTrigger = screen.getByTestId('message-actions-trigger');
    await user.click(actionsTrigger);
    await user.click(screen.getByText('Edit'));

    // Should be in edit mode now - verify edit UI elements
    const textarea = screen.getByRole('textbox');
    const saveButton = screen.getByTestId('edit-save-button');
    const cancelButton = screen.getByTestId('edit-cancel-button');

    expect(textarea).toBeInTheDocument();
    expect(saveButton).toBeInTheDocument();
    expect(cancelButton).toBeInTheDocument();
    expect(textarea).toHaveValue('Original message content');

    // Edit the content
    await user.clear(textarea);
    await user.type(textarea, 'Edited message content');
    expect(textarea).toHaveValue('Edited message content');

    // Test save functionality
    await user.click(saveButton);
    expect(mockOnEditMessage).toHaveBeenCalledWith(
      'test-message-1',
      'Edited message content'
    );

    // Should exit edit mode after save
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    // Note: The component still shows original content because it expects parent to update the message prop
    expect(screen.getByText('Original message content')).toBeInTheDocument();
  });
  test('edit mode cancel restores original content', async () => {
    const user = userEvent.setup();
    const mockOnEditMessage = vi.fn();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Original message content',
      id: 'test-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onEditMessage={mockOnEditMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Click the dropdown trigger and select Edit
    const actionsTriggers = screen.getAllByTestId('message-actions-trigger');
    const actionsTrigger = actionsTriggers[actionsTriggers.length - 1]; // Use the last one (most recent render)
    await user.click(actionsTrigger);
    await user.click(screen.getByText('Edit'));

    // Should be in edit mode now
    const textarea = screen.getByRole('textbox');
    const cancelButton = screen.getByTestId('edit-cancel-button');

    expect(textarea).toHaveValue('Original message content');

    // Edit the content
    await user.clear(textarea);
    await user.type(textarea, 'Modified content that should be discarded');
    expect(textarea).toHaveValue('Modified content that should be discarded');

    // Test cancel functionality
    await user.click(cancelButton);

    // Should exit edit mode and not call onEditMessage
    expect(screen.queryByRole('textbox')).not.toBeInTheDocument();
    expect(mockOnEditMessage).not.toHaveBeenCalled();
    expect(screen.getByText('Original message content')).toBeInTheDocument();

    // Verify that entering edit mode again shows original content
    const newActionsTriggers = screen.getAllByTestId('message-actions-trigger');
    const newActionsTrigger = newActionsTriggers[newActionsTriggers.length - 1];
    await user.click(newActionsTrigger);
    await user.click(screen.getByText('Edit'));
    const newTextarea = screen.getByRole('textbox');
    expect(newTextarea).toHaveValue('Original message content');
  });
  test('regenerate action only available for non-user messages', async () => {
    const user = userEvent.setup();
    const mockOnRegenerateMessage = vi.fn();
    const mockOnTextSelect = vi.fn();

    // Test with user message - should NOT show regenerate option
    const userMessage: Message = {
      content: 'User message content',
      id: 'user-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'user',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={userMessage}
          onRegenerateMessage={mockOnRegenerateMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Click the dropdown trigger
    const actionsTrigger = screen.getByTestId('message-actions-trigger');
    await user.click(actionsTrigger);

    // Should NOT have regenerate option for user messages
    expect(screen.queryByText('Regenerate')).not.toBeInTheDocument();

    // Should have other options
    expect(screen.getByText('Copy')).toBeInTheDocument();
    expect(screen.getByText('Edit')).toBeInTheDocument();

    // Close dropdown with Escape
    await user.keyboard('{Escape}');

    // Test with chat-mate message - should show regenerate option
    const chatMateMessage: Message = {
      content: 'Chat mate message content',
      id: 'chat-mate-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={chatMateMessage}
          onRegenerateMessage={mockOnRegenerateMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Click the dropdown trigger for the new message
    const actionsTriggers = screen.getAllByTestId('message-actions-trigger');
    const newActionsTrigger = actionsTriggers[actionsTriggers.length - 1];
    await user.click(newActionsTrigger);

    // Should have regenerate option for non-user messages
    expect(screen.getByText('Regenerate')).toBeInTheDocument();

    // Test clicking regenerate
    await user.click(screen.getByText('Regenerate'));
    expect(mockOnRegenerateMessage).toHaveBeenCalledWith('chat-mate-message-1');
  });
  test('text selection triggers onTextSelect callback', async () => {
    const user = userEvent.setup();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'This is a test message with selectable text content.',
      id: 'test-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Find the message content element
    const messageContent = screen.getByText(
      'This is a test message with selectable text content.'
    );
    expect(messageContent).toBeInTheDocument();

    // Create a mock selection
    const mockSelection = {
      toString: vi.fn().mockReturnValue('selectable text'),
    };

    // Mock window.getSelection to return our mock selection
    const originalGetSelection = window.getSelection;
    window.getSelection = vi.fn().mockReturnValue(mockSelection);

    // Simulate mouseup event on the message content to trigger text selection
    await user.pointer({ keys: '[MouseLeft>]', target: messageContent });

    // Trigger the mouseup event manually since pointer doesn't trigger it in all cases
    messageContent.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));

    // Should call onTextSelect with the selected text
    expect(mockOnTextSelect).toHaveBeenCalledWith('selectable text');

    // Test that empty selection doesn't trigger callback
    mockOnTextSelect.mockClear();
    mockSelection.toString.mockReturnValue('');

    messageContent.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(mockOnTextSelect).not.toHaveBeenCalled();

    // Test that whitespace-only selection doesn't trigger callback
    mockOnTextSelect.mockClear();
    mockSelection.toString.mockReturnValue('   ');

    messageContent.dispatchEvent(new MouseEvent('mouseup', { bubbles: true }));
    expect(mockOnTextSelect).not.toHaveBeenCalled();

    // Restore original getSelection
    window.getSelection = originalGetSelection;
  });
  test('fork and delete actions trigger correct callbacks', async () => {
    const user = userEvent.setup();
    const mockOnForkFrom = vi.fn();
    const mockOnDeleteMessage = vi.fn();
    const mockOnDeleteAllBelow = vi.fn();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Test message content',
      id: 'test-message-1',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onDeleteAllBelow={mockOnDeleteAllBelow}
          onDeleteMessage={mockOnDeleteMessage}
          onForkFrom={mockOnForkFrom}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Test Fork action
    const actionsTrigger = screen.getByTestId('message-actions-trigger');
    await user.click(actionsTrigger);

    // Verify Fork option is present and click it
    const forkOption = screen.getByText('Fork from here');
    expect(forkOption).toBeInTheDocument();
    await user.click(forkOption);
    expect(mockOnForkFrom).toHaveBeenCalledWith('test-message-1');
    expect(mockOnForkFrom).toHaveBeenCalledTimes(1);

    // Test Delete message action
    await user.click(actionsTrigger);
    const deleteMessageOption = screen.getByText('Delete message');
    expect(deleteMessageOption).toBeInTheDocument();
    await user.click(deleteMessageOption);
    expect(mockOnDeleteMessage).toHaveBeenCalledWith('test-message-1');
    expect(mockOnDeleteMessage).toHaveBeenCalledTimes(1);

    // Test Delete all below action
    await user.click(actionsTrigger);
    const deleteAllBelowOption = screen.getByText('Delete all below');
    expect(deleteAllBelowOption).toBeInTheDocument();
    await user.click(deleteAllBelowOption);
    expect(mockOnDeleteAllBelow).toHaveBeenCalledWith('test-message-1');
    expect(mockOnDeleteAllBelow).toHaveBeenCalledTimes(1);
  });
  test('reasoning section toggle functionality', async () => {
    const user = userEvent.setup();
    const mockOnTextSelect = vi.fn();

    const testMessage: Message = {
      content: 'Test message content',
      id: 'test-message-1',
      reasoning: 'This is the AI reasoning content that should be toggleable.',
      timestamp: new Date('2022-01-01T00:00:00Z'),
      type: 'chat-mate',
    };

    render(
      <TestWrapper>
        <EnhancedChatMessage
          message={testMessage}
          onTextSelect={mockOnTextSelect}
        />
      </TestWrapper>
    );

    // Should display the reasoning toggle button
    const reasoningToggle = screen.getByTestId('reasoning-toggle');
    expect(reasoningToggle).toBeInTheDocument();
    expect(screen.getByText('AI Reasoning')).toBeInTheDocument();

    // The reasoning content should be visible by default (globalSettings.reasoningExpanded defaults to true)
    expect(
      screen.getByText(
        'This is the AI reasoning content that should be toggleable.'
      )
    ).toBeInTheDocument();

    // Click to collapse the reasoning section
    await user.click(reasoningToggle);

    // The reasoning content should be hidden after collapse
    expect(
      screen.queryByText(
        'This is the AI reasoning content that should be toggleable.'
      )
    ).not.toBeInTheDocument();

    // Click to expand the reasoning section again
    await user.click(reasoningToggle);

    // The reasoning content should be visible again
    expect(
      screen.getByText(
        'This is the AI reasoning content that should be toggleable.'
      )
    ).toBeInTheDocument();
  });
  test.todo('streaming indicator displays when message is streaming');
});
