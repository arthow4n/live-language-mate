import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, test } from 'vitest';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import DataManagementTab from './DataManagementTab';

const TestWrapper = ({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
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
  test.todo('export functionality creates download');
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
