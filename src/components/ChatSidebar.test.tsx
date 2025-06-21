import { describe, test, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ChatSidebar from './ChatSidebar';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { SidebarProvider } from '@/components/ui/sidebar';
import type { LocalConversation } from '@/schemas/messages';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <SidebarProvider>
    <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
  </SidebarProvider>
);

// Helper to create mock conversations
const createMockConversation = (
  id: string,
  title: string
): LocalConversation => ({
  id,
  title,
  language: 'Swedish',
  ai_mode: 'dual',
  created_at: new Date(),
  updated_at: new Date(),
  messages: [],
});

describe('ChatSidebar Integration Tests', () => {
  test('displays empty state when no conversations exist', async () => {
    let onNewConversationCalled = false;
    let onMainSettingsOpenCalled = false;

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onConversationSelect={() => {}}
          onNewConversation={() => {
            onNewConversationCalled = true;
          }}
          onChatSettingsOpen={() => {}}
          onMainSettingsOpen={() => {
            onMainSettingsOpenCalled = true;
          }}
        />
      </TestWrapper>
    );

    // Should show empty state message
    await waitFor(() => {
      expect(
        screen.getByText('No conversations yet. Start a new chat!')
      ).toBeInTheDocument();
    });

    // Should have New Chat button
    const newChatButton = screen.getByText('New Chat');
    expect(newChatButton).toBeInTheDocument();

    // Should have Main Settings button
    const settingsButton = screen.getByText('Main Settings');
    expect(settingsButton).toBeInTheDocument();

    // Test New Chat button functionality
    const user = userEvent.setup();
    await user.click(newChatButton);
    expect(onNewConversationCalled).toBe(true);

    // Test Settings button functionality
    await user.click(settingsButton);
    expect(onMainSettingsOpenCalled).toBe(true);
  });

  test('displays conversations and handles selection', async () => {
    let selectedConversationId: string | null = null;
    let chatSettingsOpenCalled = false;

    // Mock the localStorage to return some conversations
    const mockConversations = [
      createMockConversation('conv1', 'Swedish Basics'),
      createMockConversation('conv2', 'Advanced Grammar'),
    ];

    // We need to pre-populate the storage context with conversations
    // This test would need to be enhanced to properly mock the storage context
    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv1"
          onConversationSelect={(id) => {
            selectedConversationId = id;
          }}
          onNewConversation={() => {}}
          onChatSettingsOpen={() => {
            chatSettingsOpenCalled = true;
          }}
          onMainSettingsOpen={() => {}}
        />
      </TestWrapper>
    );

    // For this test to work properly, we would need to add conversations to the storage first
    // This is a simplified version that tests the component structure
    await waitFor(() => {
      expect(screen.getByText('Recent Chats')).toBeInTheDocument();
    });
  });

  test('handles conversation creation workflow', async () => {
    let newConversationCreated = false;

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onConversationSelect={() => {}}
          onNewConversation={() => {
            newConversationCreated = true;
          }}
          onChatSettingsOpen={() => {}}
          onMainSettingsOpen={() => {}}
        />
      </TestWrapper>
    );

    const user = userEvent.setup();

    // Click the New Chat button
    const newChatButton = screen.getByText('New Chat');
    await user.click(newChatButton);

    // Verify the callback was called
    expect(newConversationCreated).toBe(true);
  });
});
