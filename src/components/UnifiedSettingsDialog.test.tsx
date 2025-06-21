import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { ConversationSettings, GlobalSettings } from '@/schemas/settings';

import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import UnifiedSettingsDialog from './UnifiedSettingsDialog';

interface TestWrapperProps {
  children: React.ReactNode;
}

const TestWrapper = ({ children }: TestWrapperProps) => (
  <UnifiedStorageProvider>{children}</UnifiedStorageProvider>
);

const createMockGlobalSettings = (
  overrides: Partial<GlobalSettings> = {}
): GlobalSettings => ({
  apiKey: '',
  chatMateBackground: 'Local guide',
  chatMatePersonality: 'Friendly and helpful',
  culturalContext: false,
  editorMateExpertise: 'Language teacher',
  editorMatePersonality: 'Patient and detailed',
  enableReasoning: false,
  feedbackStyle: 'encouraging',
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: false,
  reasoningExpanded: false,
  streaming: false,
  targetLanguage: 'Swedish',
  theme: 'system',
  ...overrides,
});

const createMockConversationSettings = (
  overrides: Partial<ConversationSettings> = {}
): ConversationSettings => ({
  apiKey: '',
  chatMateBackground: 'Local guide',
  chatMatePersonality: 'Friendly and helpful',
  culturalContext: false,
  editorMateExpertise: 'Language teacher',
  editorMatePersonality: 'Patient and detailed',
  enableReasoning: false,
  feedbackStyle: 'encouraging',
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: false,
  reasoningExpanded: false,
  streaming: false,
  targetLanguage: 'Swedish',
  theme: 'system',
  ...overrides,
});

// Mock ModelSelector component
vi.mock('./ModelSelector', () => ({
  default: ({
    onValueChange,
    value,
  }: {
    onValueChange: (value: string) => void;
    value: string;
  }) => (
    <select
      data-testid="model-selector"
      onChange={(e) => {
        onValueChange(e.target.value);
      }}
      value={value}
    >
      <option value="google/gemini-2.5-flash">Gemini 2.5 Flash</option>
      <option value="anthropic/claude-3-5-sonnet">Claude 3.5 Sonnet</option>
    </select>
  ),
}));

// Mock DataManagementTab and UISettingsTab
vi.mock('./DataManagementTab', () => ({
  default: () => <div data-testid="data-management-tab">Data Management</div>,
}));

vi.mock('./UISettingsTab', () => ({
  default: ({
    onSettingChange,
  }: {
    onSettingChange: (key: string, value: string) => void;
  }) => (
    <div data-testid="ui-settings-tab">
      <select
        data-testid="theme-selector"
        onChange={(e) => {
          onSettingChange('theme', e.target.value);
        }}
      >
        <option value="system">System</option>
        <option value="light">Light</option>
        <option value="dark">Dark</option>
      </select>
    </div>
  ),
}));

describe('UnifiedSettingsDialog Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  test('displays global settings dialog with all tabs', async () => {
    const mockSettings = createMockGlobalSettings();
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByText('Settings')).toBeInTheDocument();
    });

    // Should display all four tabs for global mode
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /ai personalities/i })
    ).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /ui/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /data/i })).toBeInTheDocument();

    // General tab should be active by default
    expect(screen.getByLabelText(/target language/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/openrouter api key/i)).toBeInTheDocument();
    expect(screen.getByTestId('model-selector')).toBeInTheDocument();
  });

  test('displays chat settings dialog with limited tabs', async () => {
    const mockSettings = createMockConversationSettings();
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          conversationTitle="Test Conversation"
          initialSettings={mockSettings}
          mode="chat"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByText('Chat Settings - Test Conversation')
      ).toBeInTheDocument();
    });

    // Should only display general and personalities tabs for chat mode
    expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    expect(
      screen.getByRole('tab', { name: /ai personalities/i })
    ).toBeInTheDocument();
    expect(screen.queryByRole('tab', { name: /ui/i })).not.toBeInTheDocument();
    expect(
      screen.queryByRole('tab', { name: /data/i })
    ).not.toBeInTheDocument();
  });

  test('tab navigation switches content correctly', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockGlobalSettings();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByRole('tab', { name: /general/i })).toBeInTheDocument();
    });

    // Start on General tab - should see basic settings
    expect(screen.getByLabelText(/target language/i)).toBeInTheDocument();

    // Switch to AI Personalities tab
    const personalitiesTab = screen.getByRole('tab', {
      name: /ai personalities/i,
    });
    await user.click(personalitiesTab);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/chat mate personality/i)
      ).toBeInTheDocument();
      expect(
        screen.getByLabelText(/editor mate personality/i)
      ).toBeInTheDocument();
    });

    // Switch to UI tab (global mode only)
    const uiTab = screen.getByRole('tab', { name: /ui/i });
    await user.click(uiTab);

    await waitFor(() => {
      expect(screen.getByTestId('ui-settings-tab')).toBeInTheDocument();
    });

    // Switch to Data tab (global mode only)
    const dataTab = screen.getByRole('tab', { name: /data/i });
    await user.click(dataTab);

    await waitFor(() => {
      expect(screen.getByTestId('data-management-tab')).toBeInTheDocument();
    });
  });

  test('form controls update settings state', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockGlobalSettings({
      enableReasoning: false,
      streaming: false,
      targetLanguage: 'Swedish',
    });
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/target language/i)).toBeInTheDocument();
    });

    // Change target language
    const languageSelect = screen.getByRole('combobox');
    await user.click(languageSelect);

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /french/i })
      ).toBeInTheDocument();
    });

    const frenchOption = screen.getByRole('option', { name: /french/i });
    await user.click(frenchOption);

    // Update API key
    const apiKeyInput = screen.getByLabelText(/openrouter api key/i);
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'sk-or-test-key');

    // Toggle streaming
    const streamingSwitch = screen.getByLabelText(
      /enable streaming responses/i
    );
    await user.click(streamingSwitch);

    // Toggle reasoning
    const reasoningSwitch = screen.getByLabelText(/enable reasoning tokens/i);
    await user.click(reasoningSwitch);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify onSave was called with updated settings
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'sk-or-test-key',
        enableReasoning: true,
        streaming: true,
        targetLanguage: 'French',
      })
    );
  });

  test('conversation-specific settings for chat mode', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockConversationSettings({
      culturalContext: false,
      feedbackStyle: 'encouraging',
      progressiveComplexity: false,
    });
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          conversationTitle="Test Chat"
          initialSettings={mockSettings}
          mode="chat"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/feedback style/i)).toBeInTheDocument();
    });

    // Update Chat Mate background
    const chatMateInput = screen.getByLabelText(/chat mate background/i);
    await user.type(chatMateInput, 'Young professional from Stockholm');

    // Update Editor Mate expertise
    const editorMateInput = screen.getByLabelText(/editor mate expertise/i);
    await user.type(editorMateInput, '15 years teaching Swedish');

    // Change feedback style
    const feedbackSelect = screen.getByDisplayValue('Encouraging');
    await user.click(feedbackSelect);

    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: /direct/i })
      ).toBeInTheDocument();
    });

    const directOption = screen.getByRole('option', { name: /direct/i });
    await user.click(directOption);

    // Toggle cultural context
    const culturalSwitch = screen.getByLabelText(/include cultural context/i);
    await user.click(culturalSwitch);

    // Toggle progressive complexity
    const complexitySwitch = screen.getByLabelText(/progressive complexity/i);
    await user.click(complexitySwitch);

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    // Verify onSave was called with updated conversation settings
    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chatMateBackground: 'Young professional from Stockholm',
        culturalContext: true,
        editorMateExpertise: '15 years teaching Swedish',
        feedbackStyle: 'direct',
        progressiveComplexity: true,
      })
    );
  });

  test('AI personalities tab functionality', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockConversationSettings();
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="chat"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    // Switch to AI Personalities tab
    const personalitiesTab = screen.getByRole('tab', {
      name: /ai personalities/i,
    });
    await user.click(personalitiesTab);

    await waitFor(() => {
      expect(
        screen.getByLabelText(/chat mate personality/i)
      ).toBeInTheDocument();
    });

    // Update Chat Mate personality
    const chatMateTextarea = screen.getByLabelText(/chat mate personality/i);
    await user.type(
      chatMateTextarea,
      'Friendly and enthusiastic, loves to share Swedish culture and idioms.'
    );

    // Update Editor Mate personality
    const editorMateTextarea = screen.getByLabelText(
      /editor mate personality/i
    );
    await user.type(
      editorMateTextarea,
      'Patient and methodical, provides clear explanations with examples.'
    );

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chatMatePersonality:
          'Friendly and enthusiastic, loves to share Swedish culture and idioms.',
        editorMatePersonality:
          'Patient and methodical, provides clear explanations with examples.',
      })
    );
  });

  test('model selector integration', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockGlobalSettings({
      model: 'google/gemini-2.5-flash',
    });
    const onSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByTestId('model-selector')).toBeInTheDocument();
    });

    // Change model selection
    const modelSelector = screen.getByTestId('model-selector');
    await user.selectOptions(modelSelector, 'anthropic/claude-3-5-sonnet');

    // Save changes
    const saveButton = screen.getByRole('button', { name: /save changes/i });
    await user.click(saveButton);

    expect(onSave).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-3-5-sonnet',
      })
    );
  });

  test('cancel button closes dialog without saving', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockGlobalSettings();
    const onSave = vi.fn();
    const onOpenChange = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={onOpenChange}
          onSave={onSave}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: /cancel/i })
      ).toBeInTheDocument();
    });

    // Make some changes
    const apiKeyInput = screen.getByLabelText(/openrouter api key/i);
    await user.type(apiKeyInput, 'sk-or-test-key');

    // Click cancel
    const cancelButton = screen.getByRole('button', { name: /cancel/i });
    await user.click(cancelButton);

    // Should close dialog without saving
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onSave).not.toHaveBeenCalled();
  });

  test('settings reset when dialog reopens', async () => {
    const mockSettings = createMockGlobalSettings({
      apiKey: 'original-key',
    });

    const { rerender } = render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={false}
        />
      </TestWrapper>
    );

    // Open dialog and make changes
    rerender(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/openrouter api key/i)).toBeInTheDocument();
    });

    const apiKeyInput = screen.getByLabelText(/openrouter api key/i);
    expect(apiKeyInput).toBeInstanceOf(HTMLInputElement);
    if (apiKeyInput instanceof HTMLInputElement) {
      expect(apiKeyInput.value).toBe('original-key');
    }

    // Close and reopen dialog
    rerender(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={false}
        />
      </TestWrapper>
    );

    rerender(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(screen.getByLabelText(/openrouter api key/i)).toBeInTheDocument();
    });

    // Settings should be reset to initial values
    const resetApiKeyInput = screen.getByLabelText(/openrouter api key/i);
    expect(resetApiKeyInput).toBeInstanceOf(HTMLInputElement);
    if (resetApiKeyInput instanceof HTMLInputElement) {
      expect(resetApiKeyInput.value).toBe('original-key');
    }
  });

  test('reasoning expanded toggle dependency', async () => {
    const user = userEvent.setup();
    const mockSettings = createMockGlobalSettings({
      enableReasoning: false,
      reasoningExpanded: false,
    });

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockSettings}
          mode="global"
          onOpenChange={vi.fn()}
          onSave={vi.fn()}
          open={true}
        />
      </TestWrapper>
    );

    await waitFor(() => {
      expect(
        screen.getByLabelText(/enable reasoning tokens/i)
      ).toBeInTheDocument();
    });

    // Both switches should be available
    const reasoningSwitch = screen.getByLabelText(/enable reasoning tokens/i);
    const expandedSwitch = screen.getByLabelText(
      /reasoning expanded by default/i
    );

    expect(reasoningSwitch).toBeInTheDocument();
    expect(expandedSwitch).toBeInTheDocument();

    // Enable reasoning first
    await user.click(reasoningSwitch);

    // Then enable expanded
    await user.click(expandedSwitch);

    // Both should be toggleable independently
    expect(reasoningSwitch).toBeChecked();
    expect(expandedSwitch).toBeChecked();
  });
});
