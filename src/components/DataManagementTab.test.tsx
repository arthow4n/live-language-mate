import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import DataManagementTab from './DataManagementTab';

const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>
    <Toaster />
    {children}
  </UnifiedStorageProvider>
);

describe('DataManagementTab Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('displays export and import sections', () => {
    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    // Should display the main data management tab
    expect(screen.getByTestId('data-management-tab')).toBeInTheDocument();

    // Should display export section
    const exportSection = screen.getByTestId('export-section');
    expect(exportSection).toBeInTheDocument();
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(
      screen.getByText(
        /Download all your conversations, settings, and preferences/
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('export-button')).toBeInTheDocument();
    expect(screen.getByText('Export All Data')).toBeInTheDocument();

    // Should display import section
    const importSection = screen.getByTestId('import-section');
    expect(importSection).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Import Data' })
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        /Import conversations and settings from a previously exported/
      )
    ).toBeInTheDocument();
    expect(screen.getByTestId('import-file-input')).toBeInTheDocument();
    expect(screen.getByTestId('import-button')).toBeInTheDocument();

    // Should display danger zone section
    const dangerZone = screen.getByTestId('danger-zone');
    expect(dangerZone).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
    expect(
      screen.getByText(/Permanently delete all conversations and settings/)
    ).toBeInTheDocument();
    expect(screen.getByTestId('delete-chats-button')).toBeInTheDocument();
    expect(screen.getByTestId('delete-data-button')).toBeInTheDocument();
    expect(screen.getByText('Delete All Chats')).toBeInTheDocument();
    expect(screen.getByText('Delete All Data')).toBeInTheDocument();
  });
  test('export functionality creates download', async () => {
    const user = userEvent.setup();

    // Set up some test data in localStorage
    localStorage.setItem(
      'language-mate-data',
      JSON.stringify({
        conversations: [{ id: '1', messages: [], title: 'Test Chat' }],
      })
    );

    // Mock only the essential browser APIs that fail in test environment
    // We need to mock these globally before component loads
    const mockCreateObjectURL = vi.fn().mockReturnValue('blob:mock-url');
    const mockRevokeObjectURL = vi.fn();
    global.URL.createObjectURL = mockCreateObjectURL;
    global.URL.revokeObjectURL = mockRevokeObjectURL;

    render(
      <TestWrapper>
        <DataManagementTab />
      </TestWrapper>
    );

    // Click the export button
    const exportButton = screen.getByTestId('export-button');
    await user.click(exportButton);

    // Verify that the export was successful based on the toast message
    expect(screen.getByText('Data exported')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Your data has been successfully exported as a JSON file.'
      )
    ).toBeInTheDocument();

    // Verify that createObjectURL was called (indicates blob creation)
    expect(mockCreateObjectURL).toHaveBeenCalledTimes(1);
  });
  test.todo('import file selection and processing');
  test.todo('import validation with invalid JSON');
  test.todo('delete all chats confirmation dialog');
  test.todo('delete all chats confirmation and execution');
  test.todo('delete all chats cancellation');
  test.todo('delete all data confirmation dialog');
  test.todo('delete all data execution clears all localStorage');
  test.todo('file input accepts only JSON files');
  test.todo('import button remains disabled without file selection');
  test.skip('legacy format import handling', () => {
    // This feature is meant to be removed, don't implement this.
  });
});
