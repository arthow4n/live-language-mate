import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import UnifiedSettingsDialog from './UnifiedSettingsDialog';

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

const mockGlobalSettings = {
  apiKey: 'test-api-key',
  chatMateBackground: 'young professional',
  chatMatePersonality: 'friendly',
  culturalContext: true,
  editorMateExpertise: '10+ years',
  editorMatePersonality: 'patient teacher',
  enableReasoning: true,
  feedbackStyle: 'encouraging' as const,
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system' as const,
};

const mockConversationSettings = {
  apiKey: 'test-api-key',
  chatMateBackground: 'young professional',
  chatMatePersonality: 'friendly',
  culturalContext: true,
  editorMateExpertise: '10+ years',
  editorMatePersonality: 'patient teacher',
  enableReasoning: true,
  feedbackStyle: 'encouraging' as const,
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system' as const,
};

describe('UnifiedSettingsDialog Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    // Clear any existing toasts and other DOM elements between tests
    document.body.innerHTML = '';

    // Mock ResizeObserver for UI components that might use it
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

  test('displays global settings dialog with all tabs', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockGlobalSettings}
          mode="global"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          open={true}
        />
      </TestWrapper>
    );

    // Should display main dialog
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText('Settings')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Configure your global application settings and AI model preferences.'
      )
    ).toBeInTheDocument();

    // Should display all four tabs for global mode
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'AI Personalities' })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'UI' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Data' })).toBeInTheDocument();

    // Should display action buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // General tab should be active by default and show its content
    expect(screen.getByText('Target Language')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter API Key')).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Enable streaming responses')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Enable reasoning tokens')
    ).toBeInTheDocument();
    expect(
      screen.getByLabelText('Reasoning expanded by default')
    ).toBeInTheDocument();
  });
  test('displays chat settings dialog with limited tabs', () => {
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          conversationTitle="Test Conversation"
          initialSettings={mockConversationSettings}
          mode="chat"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          open={true}
        />
      </TestWrapper>
    );

    // Should display main dialog with chat-specific title
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(
      screen.getByText('Chat Settings - Test Conversation')
    ).toBeInTheDocument();
    expect(
      screen.getByText(
        'Customize the AI personalities and behaviors for this specific conversation.'
      )
    ).toBeInTheDocument();

    // Should display only two tabs for chat mode (General and AI Personalities)
    expect(screen.getByRole('tab', { name: 'General' })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: 'AI Personalities' })
    ).toBeInTheDocument();

    // Should NOT display UI and Data tabs (global-only)
    expect(screen.queryByRole('tab', { name: 'UI' })).not.toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: 'Data' })).not.toBeInTheDocument();

    // Should display action buttons
    expect(screen.getByText('Cancel')).toBeInTheDocument();
    expect(screen.getByText('Save Changes')).toBeInTheDocument();

    // General tab should be active by default and show its content
    expect(screen.getByText('Target Language')).toBeInTheDocument();
    expect(screen.getByText('OpenRouter API Key')).toBeInTheDocument();
    expect(screen.getByText('AI Model')).toBeInTheDocument();
  });
  test('tab navigation switches content correctly', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockGlobalSettings}
          mode="global"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          open={true}
        />
      </TestWrapper>
    );

    // General tab should be active by default
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'true'
    );
    expect(screen.getByText('Target Language')).toBeInTheDocument();

    // Click on AI Personalities tab
    const personalitiesTab = screen.getByRole('tab', {
      name: 'AI Personalities',
    });
    await user.click(personalitiesTab);

    // AI Personalities tab should now be active
    expect(personalitiesTab).toHaveAttribute('aria-selected', 'true');
    expect(screen.getByRole('tab', { name: 'General' })).toHaveAttribute(
      'aria-selected',
      'false'
    );

    // Content should switch to personalities tab
    expect(screen.getByText('Chat Mate Personality')).toBeInTheDocument();
    expect(screen.getByText('Editor Mate Personality')).toBeInTheDocument();

    // Click on UI tab
    const uiTab = screen.getByRole('tab', { name: 'UI' });
    await user.click(uiTab);

    // UI tab should now be active
    expect(uiTab).toHaveAttribute('aria-selected', 'true');
    expect(personalitiesTab).toHaveAttribute('aria-selected', 'false');

    // Content should switch to UI tab (theme settings)
    expect(screen.getByText('Theme')).toBeInTheDocument();

    // Click on Data tab
    const dataTab = screen.getByRole('tab', { name: 'Data' });
    await user.click(dataTab);

    // Data tab should now be active
    expect(dataTab).toHaveAttribute('aria-selected', 'true');
    expect(uiTab).toHaveAttribute('aria-selected', 'false');

    // Content should switch to Data tab (data management)
    expect(screen.getByText('Export Data')).toBeInTheDocument();
    expect(
      screen.getByRole('heading', { name: 'Import Data' })
    ).toBeInTheDocument();
    expect(screen.getByText('Danger Zone')).toBeInTheDocument();
  });
  test.todo('form controls update settings state');
  test.todo('conversation-specific settings for chat mode');
  test.todo('AI personalities tab functionality');
  test.todo('model selector integration');
  test.todo('cancel button closes dialog without saving');
  test.todo('settings reset when dialog reopens');
  test.todo('reasoning expanded toggle dependency');
});
