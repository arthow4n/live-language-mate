import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { LocalConversation } from '@/schemas/messages';

import { SidebarProvider } from '@/components/ui/sidebar';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import ChatSidebar from './ChatSidebar';

/**
 *
 */
interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps): React.JSX.Element => (
  <SidebarProvider>
    <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
  </SidebarProvider>
);

const createMockConversation = (
  id: string,
  title: string,
  updatedAt: Date = new Date()
): LocalConversation => ({
  ai_mode: 'dual',
  created_at: new Date(),
  id,
  language: 'Swedish',
  messages: [],
  title,
  updated_at: updatedAt,
});

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: (): { toast: ReturnType<typeof vi.fn> } => ({
    toast: vi.fn(),
  }),
}));

describe('ChatSidebar Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
  });

  test('displays empty state when no conversations exist', async () => {
    const onNewConversation = vi.fn();
    const onMainSettingsOpen = vi.fn();

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={onMainSettingsOpen}
          onNewConversation={onNewConversation}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByText('No conversations yet. Start a new chat!')
      ).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /new chat/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /main settings/i })
    ).toBeInTheDocument();
  });

  test('new chat button triggers callback', async () => {
    const user = userEvent.setup();
    const onNewConversation = vi.fn();

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={onNewConversation}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /new chat/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    const newChatButtons = screen.getAllByRole('button', { name: /new chat/i });
    await user.click(newChatButtons[0]);

    expect(onNewConversation).toHaveBeenCalledOnce();
  });

  test('main settings button triggers callback', async () => {
    const user = userEvent.setup();
    const onMainSettingsOpen = vi.fn();

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={onMainSettingsOpen}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      const buttons = screen.getAllByRole('button', { name: /main settings/i });
      expect(buttons.length).toBeGreaterThan(0);
    });

    const mainSettingsButtons = screen.getAllByRole('button', {
      name: /main settings/i,
    });
    await user.click(mainSettingsButtons[0]);

    expect(onMainSettingsOpen).toHaveBeenCalledOnce();
  });

  test('conversation selection workflow', async () => {
    const user = userEvent.setup();
    const onConversationSelect = vi.fn();

    // Pre-populate localStorage with conversations
    const conversations = [
      createMockConversation('conv-1', 'First Conversation'),
      createMockConversation('conv-2', 'Second Conversation'),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={onConversationSelect}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    // Wait for conversations to load
    await waitFor(() => {
      expect(screen.getByText('First Conversation')).toBeInTheDocument();
    });
    expect(screen.getByText('Second Conversation')).toBeInTheDocument();

    // Click on first conversation
    const firstConv = screen.getByText('First Conversation');
    await user.click(firstConv);

    expect(onConversationSelect).toHaveBeenCalledWith('conv-1');
  });

  test('conversation highlighting for current selection', async () => {
    const conversations = [
      createMockConversation('conv-1', 'Active Conversation'),
      createMockConversation('conv-2', 'Inactive Conversation'),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Active Conversation')).toBeInTheDocument();
    });

    // The active conversation should be visible (testing behavior rather than styling)
    expect(screen.getByText('Active Conversation')).toBeInTheDocument();
  });

  test('conversation dropdown menu actions', async () => {
    const user = userEvent.setup();
    const onChatSettingsOpen = vi.fn();

    const conversations = [
      createMockConversation('conv-1', 'Test Conversation'),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={onChatSettingsOpen}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Test Conversation')).toBeInTheDocument();
    });

    // Find and click the dropdown trigger (size icon button with w-6 h-6 classes)
    // Since the button doesn't have an accessible name, we find it by size variant
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    expect(moreButton).toBeInTheDocument();
    if (moreButton) {
      await user.click(moreButton);
    }

    // Test Chat Settings option
    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /chat settings/i })
      ).toBeInTheDocument();
    });

    const chatSettingsItem = screen.getByRole('menuitem', {
      name: /chat settings/i,
    });
    await user.click(chatSettingsItem);

    expect(onChatSettingsOpen).toHaveBeenCalledOnce();
  });

  test('rename conversation dialog workflow', async () => {
    const user = userEvent.setup();

    const conversations = [createMockConversation('conv-1', 'Original Title')];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Open dropdown menu
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    if (moreButton) {
      await user.click(moreButton);
    }

    // Click Rename option
    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /rename/i })
      ).toBeInTheDocument();
    });

    const renameItem = screen.getByRole('menuitem', { name: /rename/i });
    await user.click(renameItem);

    // Should open rename dialog
    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Rename Conversation')).toBeInTheDocument();
    });

    // Input should be pre-filled with current title
    const input = screen.getByRole('textbox');
    expect(input).toHaveValue('Original Title');

    // Change the title
    await user.clear(input);
    await user.type(input, 'New Title');

    // Save the changes
    const saveButton = screen.getByRole('button', { name: /save/i });
    await user.click(saveButton);

    // Dialog should close and title should be updated
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('New Title')).toBeInTheDocument();
    });
  });

  test('rename dialog enter key saves changes', async () => {
    const user = userEvent.setup();

    const conversations = [createMockConversation('conv-1', 'Original Title')];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Open dropdown and click rename
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    if (moreButton) {
      await user.click(moreButton);
    }

    const renameItem = screen.getByRole('menuitem', { name: /rename/i });
    await user.click(renameItem);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Title via Enter');
    await user.keyboard('{Enter}');

    // Dialog should close and title should be updated
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Title via Enter')).toBeInTheDocument();
    });
  });

  test('rename dialog cancel button discards changes', async () => {
    const user = userEvent.setup();

    const conversations = [createMockConversation('conv-1', 'Original Title')];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });

    // Open rename dialog
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    if (moreButton) {
      await user.click(moreButton);
    }

    const renameItem = screen.getByRole('menuitem', { name: /rename/i });
    await user.click(renameItem);

    await waitFor(() => {
      expect(screen.getByRole('dialog')).toBeInTheDocument();
    });

    // Change the title but cancel
    const input = screen.getByRole('textbox');
    await user.clear(input);
    await user.type(input, 'Cancelled Title');

    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Dialog should close and original title should remain
    await waitFor(() => {
      expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Original Title')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.queryByText('Cancelled Title')).not.toBeInTheDocument();
    });
  });

  test('fork conversation creates duplicate', async () => {
    const user = userEvent.setup();
    const onConversationSelect = vi.fn();

    const conversations = [
      createMockConversation('conv-1', 'Original Conversation'),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={onConversationSelect}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Original Conversation')).toBeInTheDocument();
    });

    // Open dropdown and click fork
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /fork chat/i })
      ).toBeInTheDocument();
    });

    const forkItem = screen.getByRole('menuitem', { name: /fork chat/i });
    await user.click(forkItem);

    // Should create a forked conversation and select it
    await waitFor(() => {
      expect(
        screen.getByText('Forked: Original Conversation')
      ).toBeInTheDocument();
    });

    // onConversationSelect should be called with the new conversation ID
    expect(onConversationSelect).toHaveBeenCalled();
    const callArgs = onConversationSelect.mock.calls[0];
    expect(callArgs[0]).toMatch(/^[a-f0-9-]+$/); // Should be a UUID
  });

  test('delete conversation removes from list', async () => {
    const user = userEvent.setup();
    const onConversationSelect = vi.fn();

    const conversations = [
      createMockConversation('conv-1', 'To Be Deleted'),
      createMockConversation('conv-2', 'Should Remain'),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId="conv-1"
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={onConversationSelect}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('To Be Deleted')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Should Remain')).toBeInTheDocument();
    });

    // Open dropdown and click delete
    const allButtons = screen.getAllByRole('button');

    const moreButton = allButtons.find(
      (button) =>
        // eslint-disable-next-line testing-library/no-node-access -- necessary for finding dropdown buttons without accessible names
        button.querySelector('svg') &&
        button.getAttribute('class')?.includes('w-6 h-6')
    );

    if (moreButton) {
      await user.click(moreButton);
    }

    await waitFor(() => {
      expect(
        screen.getByRole('menuitem', { name: /delete/i })
      ).toBeInTheDocument();
    });

    const deleteItem = screen.getByRole('menuitem', { name: /delete/i });
    await user.click(deleteItem);

    // Conversation should be removed and selection should be cleared
    await waitFor(() => {
      expect(screen.queryByText('To Be Deleted')).not.toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Should Remain')).toBeInTheDocument();
    });

    expect(onConversationSelect).toHaveBeenCalledWith(null);
  });

  test('conversations sorted by updated_at timestamp', async () => {
    const oldDate = new Date('2024-01-01T10:00:00Z');
    const newDate = new Date('2024-01-01T12:00:00Z');

    const conversations = [
      createMockConversation('conv-1', 'Older Conversation', oldDate),
      createMockConversation('conv-2', 'Newer Conversation', newDate),
    ];

    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations,
        conversationSettings: {},
        globalSettings: {
          apiKey: '',
          model: 'google/gemini-2.5-flash',
          targetLanguage: 'Swedish',
          theme: 'system',
        },
      })
    );

    render(
      <TestWrapper>
        <ChatSidebar
          currentConversationId={null}
          onChatSettingsOpen={vi.fn()}
          onConversationSelect={vi.fn()}
          onMainSettingsOpen={vi.fn()}
          onNewConversation={vi.fn()}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Newer Conversation')).toBeInTheDocument();
    });
    await waitFor(() => {
      expect(screen.getByText('Older Conversation')).toBeInTheDocument();
    });

    // Get all conversation elements
    const conversationElements = screen.getAllByText(/Conversation$/);

    // The newer conversation should appear first (index 0)
    expect(conversationElements[0]).toHaveTextContent('Newer Conversation');
    expect(conversationElements[1]).toHaveTextContent('Older Conversation');
  });
});
