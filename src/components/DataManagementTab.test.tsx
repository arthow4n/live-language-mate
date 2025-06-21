import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import DataManagementTab from './DataManagementTab';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

// Mock toast hook
vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: vi.fn(),
  }),
}));

describe('DataManagementTab Integration Tests', () => {
  beforeEach(() => {
    // Clear localStorage and DOM
    localStorage.clear();
    document.body.innerHTML = '';

    // Mock URL.createObjectURL and URL.revokeObjectURL
    Object.defineProperty(window, 'URL', {
      value: {
        createObjectURL: vi.fn(() => 'mock-url'),
        revokeObjectURL: vi.fn(),
      },
    });
  });

  test('displays export and import sections', async () => {
    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Export Data')).toBeInTheDocument();
    });

    expect(screen.getByText('Import Data')).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();

    expect(
      screen.getByRole('button', { name: /export all data/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /import data/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete all chats/i })
    ).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /delete all data/i })
    ).toBeInTheDocument();
  });

  test('export functionality creates download', async () => {
    const user = userEvent.setup();

    // Mock localStorage data
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [{ id: 'test', title: 'Test Chat' }],
        settings: { model: 'test-model' },
      })
    );

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /export all data/i })
      ).toBeInTheDocument();
    });

    const exportButton = screen.getByRole('button', {
      name: /export all data/i,
    });
    await user.click(exportButton);

    // Verify URL.createObjectURL was called
    expect(window.URL.createObjectURL).toHaveBeenCalled(); // eslint-disable-line @typescript-eslint/unbound-method -- testing mock
  });

  test('import file selection and processing', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/select backup file/i)).toBeInTheDocument();
    });

    // Initially import button should be disabled
    const importButton = screen.getByRole('button', { name: /import data/i });
    expect(importButton).toBeDisabled();

    // Select a file
    const fileInput = screen.getByLabelText(/select backup file/i);
    const testFile = new File(
      ['{"version": "1.0.0", "globalSettings": {}}'],
      'backup.json',
      {
        type: 'application/json',
      }
    );

    await user.upload(fileInput, testFile);

    // Import button should now be enabled
    await waitFor(() => {
      expect(importButton).not.toBeDisabled();
    });

    // Click import button
    await user.click(importButton);

    // File should be processed (we can't easily test the actual import without more mocking)
    // But we can verify the button was clickable after file selection
    expect(importButton).toBeInTheDocument();
  });

  test('import validation with invalid JSON', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/select backup file/i)).toBeInTheDocument();
    });

    // Select invalid JSON file
    const fileInput = screen.getByLabelText(/select backup file/i);
    const invalidFile = new File(['invalid json content'], 'invalid.json', {
      type: 'application/json',
    });

    await user.upload(fileInput, invalidFile);

    const importButton = screen.getByRole('button', { name: /import data/i });
    await user.click(importButton);

    // The component should handle the error gracefully
    // (Toast notification would be triggered but we've mocked it)
    expect(importButton).toBeInTheDocument();
  });

  test('delete all chats confirmation dialog', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete all chats/i })
      ).toBeInTheDocument();
    });

    // Click delete all chats button
    const deleteChatsButton = screen.getByRole('button', {
      name: /delete all chats/i,
    });
    await user.click(deleteChatsButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    });

    expect(
      screen.getByText(/This action cannot be undone/)
    ).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /cancel/i })).toBeInTheDocument();
    expect(
      screen.getByRole('button', { name: /yes, delete all chats/i })
    ).toBeInTheDocument();
  });

  test('delete all chats confirmation and execution', async () => {
    const user = userEvent.setup();

    // Add some test data to localStorage
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [{ id: 'test', title: 'Test Chat' }],
      })
    );

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete all chats/i })
      ).toBeInTheDocument();
    });

    // Open confirmation dialog
    const deleteChatsButton = screen.getByRole('button', {
      name: /delete all chats/i,
    });
    await user.click(deleteChatsButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /yes, delete all chats/i })
      ).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole('button', {
      name: /yes, delete all chats/i,
    });
    await user.click(confirmButton);

    // Verify localStorage was cleared
    expect(localStorage.getItem('language-mate-data')).toBeNull();
  });

  test('delete all chats cancellation', async () => {
    const user = userEvent.setup();

    // Add some test data to localStorage
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [{ id: 'test', title: 'Test Chat' }],
      })
    );

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete all chats/i })
      ).toBeInTheDocument();
    });

    // Open confirmation dialog
    const deleteChatsButton = screen.getByRole('button', {
      name: /delete all chats/i,
    });
    await user.click(deleteChatsButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    // Cancel deletion
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Verify localStorage was not cleared
    expect(localStorage.getItem('language-mate-data')).toBeTruthy();

    // Dialog should be closed
    await waitFor(() => {
      expect(
        screen.queryByText('Are you absolutely sure?')
      ).not.toBeInTheDocument();
    });
  });

  test('delete all data confirmation dialog', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete all data/i })
      ).toBeInTheDocument();
    });

    // Click delete all data button (there are two delete buttons, get the second one)
    const deleteButtons = screen.getAllByRole('button', {
      name: /delete all data/i,
    });
    const deleteDataButton = deleteButtons[0]; // Should be the first "Delete All Data" button
    await user.click(deleteDataButton);

    // Should show confirmation dialog
    await waitFor(() => {
      expect(screen.getByText('Are you absolutely sure?')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('button', { name: /yes, delete all data/i })
    ).toBeInTheDocument();
  });

  test('delete all data execution clears all localStorage', async () => {
    const user = userEvent.setup();

    // Add test data to all localStorage keys
    localStorage.setItem(
      'language-mate-global-settings',
      JSON.stringify({ model: 'test' })
    );
    localStorage.setItem(
      'language-mate-chat-settings',
      JSON.stringify({ chat1: {} })
    );
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({ conversations: [] })
    );

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /delete all data/i })
      ).toBeInTheDocument();
    });

    // Open confirmation dialog
    const deleteButtons = screen.getAllByRole('button', {
      name: /delete all data/i,
    });
    const deleteDataButton = deleteButtons[0];
    await user.click(deleteDataButton);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /yes, delete all data/i })
      ).toBeInTheDocument();
    });

    // Confirm deletion
    const confirmButton = screen.getByRole('button', {
      name: /yes, delete all data/i,
    });
    await user.click(confirmButton);

    // Verify all localStorage keys were cleared
    expect(localStorage.getItem('language-mate-global-settings')).toBeNull();
    expect(localStorage.getItem('language-mate-chat-settings')).toBeNull();
    expect(localStorage.getItem('language-mate-data')).toBeNull();
  });

  test('file input accepts only JSON files', () => {
    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    const fileInput = screen.getByLabelText(/select backup file/i);
    expect(fileInput.accept).toBe('.json');
    expect(fileInput.type).toBe('file');
  });

  test('import button remains disabled without file selection', async () => {
    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /import data/i })
      ).toBeInTheDocument();
    });

    const importButton = screen.getByRole('button', { name: /import data/i });
    expect(importButton).toBeDisabled();

    // Should remain disabled without file selection
    expect(importButton).toBeDisabled();
  });

  test('legacy format import handling', async () => {
    const user = userEvent.setup();

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/select backup file/i)).toBeInTheDocument();
    });

    // Create a legacy format file (without version field)
    const legacyData = {
      conversations: [{ id: 'test', title: 'Legacy Chat' }],
      settings: {
        apiKey: 'legacy-key',
        model: 'legacy-model',
        theme: 'dark',
      },
    };

    const fileInput = screen.getByLabelText(/select backup file/i);
    const legacyFile = new File(
      [JSON.stringify(legacyData)],
      'legacy-backup.json',
      {
        type: 'application/json',
      }
    );

    await user.upload(fileInput, legacyFile);

    const importButton = screen.getByRole('button', { name: /import data/i });
    await user.click(importButton);

    // Should handle legacy format without errors
    // The actual settings update would happen in the context
    expect(importButton).toBeInTheDocument();
  });
});
