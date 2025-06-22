import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { SidebarProvider } from '@/components/ui/sidebar';
import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import ChatSidebar from './ChatSidebar';

const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>
    <SidebarProvider>
      <Toaster />
      {children}
    </SidebarProvider>
  </UnifiedStorageProvider>
);

const mockProps = {
  currentConversationId: null,
  onChatSettingsOpen: vi.fn(),
  onConversationSelect: vi.fn(),
  onMainSettingsOpen: vi.fn(),
  onNewConversation: vi.fn(),
};

describe('ChatSidebar Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear any existing toasts between tests
    document.body.innerHTML = '';
    // Reset all mocks
    mockProps.onChatSettingsOpen.mockReset();
    mockProps.onConversationSelect.mockReset();
    mockProps.onMainSettingsOpen.mockReset();
    mockProps.onNewConversation.mockReset();

    // Mock ResizeObserver for ScrollArea component
    global.ResizeObserver = class ResizeObserver {
      disconnect(): void {
        // Empty implementation for testing
      }
      observe(): void {
        // Empty implementation for testing
      }
      unobserve(): void {
        // Empty implementation for testing
      }
    };
  });

  test('displays empty state when no conversations exist', () => {
    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Should display empty state
    expect(screen.getByTestId('empty-state')).toBeInTheDocument();
    expect(
      screen.getByText('No conversations yet. Start a new chat!')
    ).toBeInTheDocument();

    // Should display new chat button
    expect(screen.getByTestId('new-chat-button')).toBeInTheDocument();
    expect(screen.getByText('New Chat')).toBeInTheDocument();

    // Should display main settings button
    expect(screen.getByTestId('main-settings-button')).toBeInTheDocument();
    expect(screen.getByText('Main Settings')).toBeInTheDocument();
  });
  test('new chat button triggers callback', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Click the new chat button
    const newChatButton = screen.getByTestId('new-chat-button');
    await user.click(newChatButton);

    // Should call the callback
    expect(mockProps.onNewConversation).toHaveBeenCalledTimes(1);
  });
  test('main settings button triggers callback', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Click the main settings button
    const mainSettingsButton = screen.getByTestId('main-settings-button');
    await user.click(mainSettingsButton);

    // Should call the callback
    expect(mockProps.onMainSettingsOpen).toHaveBeenCalledTimes(1);
  });
  test('conversation selection workflow', async () => {
    const user = userEvent.setup();

    // Set up test conversations
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [
          {
            ai_mode: 'dual',
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'conv-1',
            language: 'Swedish',
            messages: [],
            title: 'Test Conversation 1',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
          {
            ai_mode: 'dual',
            created_at: '2023-01-02T00:00:00.000Z',
            id: 'conv-2',
            language: 'Swedish',
            messages: [],
            title: 'Test Conversation 2',
            updated_at: '2023-01-02T00:00:00.000Z',
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
          feedbackStyle: 'encouraging',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Should display conversations
    expect(screen.getByTestId('conversation-item-conv-1')).toBeInTheDocument();
    expect(screen.getByTestId('conversation-item-conv-2')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 1')).toBeInTheDocument();
    expect(screen.getByText('Test Conversation 2')).toBeInTheDocument();

    // Click on first conversation
    const conversationButton = screen.getByTestId('conversation-button-conv-1');
    await user.click(conversationButton);

    // Should call onConversationSelect with the conversation ID
    expect(mockProps.onConversationSelect).toHaveBeenCalledWith('conv-1');
  });
  test('conversation highlighting for current selection', () => {
    // Set up test conversations
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [
          {
            ai_mode: 'dual',
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'conv-1',
            language: 'Swedish',
            messages: [],
            title: 'Test Conversation 1',
            updated_at: '2023-01-01T00:00:00.000Z',
          },
          {
            ai_mode: 'dual',
            created_at: '2023-01-02T00:00:00.000Z',
            id: 'conv-2',
            language: 'Swedish',
            messages: [],
            title: 'Test Conversation 2',
            updated_at: '2023-01-02T00:00:00.000Z',
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
          feedbackStyle: 'encouraging',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    // Render with conv-1 as current conversation
    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} currentConversationId="conv-1" />
      </TestWrapper>
    );

    // Get conversation items
    const conv1Item = screen.getByTestId('conversation-item-conv-1');
    const conv2Item = screen.getByTestId('conversation-item-conv-2');

    // Check that conv-1 has highlighting classes
    expect(conv1Item).toHaveClass('bg-primary/90');
    expect(conv1Item).toHaveClass('text-primary-foreground');
    expect(conv1Item).toHaveClass('shadow-sm');
    expect(conv1Item).toHaveClass('border-l-4');
    expect(conv1Item).toHaveClass('font-medium');

    // Check that conv-2 does not have highlighting classes
    expect(conv2Item).not.toHaveClass('bg-primary/90');
    expect(conv2Item).not.toHaveClass('text-primary-foreground');
    expect(conv2Item).not.toHaveClass('shadow-sm');
    expect(conv2Item).not.toHaveClass('border-l-4');
    expect(conv2Item).not.toHaveClass('font-medium');

    // Check that conv-2 has the default hover styling instead
    expect(conv2Item).toHaveClass('hover:bg-accent/50');
  });
  test('conversation dropdown menu actions', async () => {
    const user = userEvent.setup();

    // Set up test conversations
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [
          {
            ai_mode: 'dual',
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'conv-1',
            language: 'Swedish',
            messages: [],
            title: 'Test Conversation 1',
            updated_at: '2023-01-01T00:00:00.000Z',
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
          feedbackStyle: 'encouraging',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Click the dropdown menu button
    const menuButton = screen.getByTestId('conversation-menu-conv-1');
    await user.click(menuButton);

    // Verify dropdown menu items are visible
    expect(screen.getByTestId('chat-settings-conv-1')).toBeInTheDocument();
    expect(screen.getByTestId('rename-conv-1')).toBeInTheDocument();
    expect(screen.getByTestId('fork-conv-1')).toBeInTheDocument();
    expect(screen.getByTestId('delete-conv-1')).toBeInTheDocument();

    // Verify menu item text content
    expect(screen.getByText('Chat Settings')).toBeInTheDocument();
    expect(screen.getByText('Rename')).toBeInTheDocument();
    expect(screen.getByText('Fork Chat')).toBeInTheDocument();
    expect(screen.getByText('Delete')).toBeInTheDocument();

    // Test chat settings action
    const chatSettingsItem = screen.getByTestId('chat-settings-conv-1');
    await user.click(chatSettingsItem);
    expect(mockProps.onChatSettingsOpen).toHaveBeenCalledTimes(1);
  });
  test('rename conversation dialog workflow', async () => {
    const user = userEvent.setup();

    // Set up test conversations
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [
          {
            ai_mode: 'dual',
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'conv-1',
            language: 'Swedish',
            messages: [],
            title: 'Original Title',
            updated_at: '2023-01-01T00:00:00.000Z',
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
          feedbackStyle: 'encouraging',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Open dropdown menu
    const menuButton = screen.getByTestId('conversation-menu-conv-1');
    await user.click(menuButton);

    // Click rename menu item
    const renameItem = screen.getByTestId('rename-conv-1');
    await user.click(renameItem);

    // Verify rename dialog opens by checking for dialog content
    expect(screen.getByText('Rename Conversation')).toBeInTheDocument();
    expect(screen.getByTestId('rename-input')).toBeInTheDocument();
    expect(screen.getByTestId('rename-cancel-button')).toBeInTheDocument();
    expect(screen.getByTestId('rename-save-button')).toBeInTheDocument();

    // Verify input has the original title
    const renameInput = screen.getByTestId('rename-input');
    expect(renameInput).toHaveValue('Original Title');

    // Change the title
    await user.clear(renameInput);
    await user.type(renameInput, 'New Title');

    // Save the changes
    const saveButton = screen.getByTestId('rename-save-button');
    await user.click(saveButton);

    // Verify dialog closes and title is updated
    expect(screen.queryByText('Rename Conversation')).not.toBeInTheDocument();
    expect(screen.getByText('New Title')).toBeInTheDocument();
    expect(screen.queryByText('Original Title')).not.toBeInTheDocument();

    // Verify success toast
    expect(screen.getByText('Conversation renamed')).toBeInTheDocument();
  });
  test('rename dialog enter key saves changes', async () => {
    const user = userEvent.setup();

    // Set up test conversations
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [
          {
            ai_mode: 'dual',
            created_at: '2023-01-01T00:00:00.000Z',
            id: 'conv-1',
            language: 'Swedish',
            messages: [],
            title: 'Original Title',
            updated_at: '2023-01-01T00:00:00.000Z',
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
          feedbackStyle: 'encouraging',
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar {...mockProps} />
      </TestWrapper>
    );

    // Open dropdown menu and click rename
    const menuButton = screen.getByTestId('conversation-menu-conv-1');
    await user.click(menuButton);
    const renameItem = screen.getByTestId('rename-conv-1');
    await user.click(renameItem);

    // Verify dialog opens
    expect(screen.getByText('Rename Conversation')).toBeInTheDocument();

    // Clear input and type new title
    const renameInput = screen.getByTestId('rename-input');
    await user.clear(renameInput);
    await user.type(renameInput, 'Enter Key Title');

    // Press Enter to save
    await user.keyboard('{Enter}');

    // Verify dialog closes and title is updated
    expect(screen.queryByText('Rename Conversation')).not.toBeInTheDocument();
    expect(screen.getByText('Enter Key Title')).toBeInTheDocument();
    expect(screen.queryByText('Original Title')).not.toBeInTheDocument();

    // Verify success toast
    expect(screen.getByText('Conversation renamed')).toBeInTheDocument();
  });
  test.todo('rename dialog cancel button discards changes');
  test.todo('fork conversation creates duplicate');
  test.todo('delete conversation removes from list');
  test.todo('conversations sorted by updated_at timestamp');
});
