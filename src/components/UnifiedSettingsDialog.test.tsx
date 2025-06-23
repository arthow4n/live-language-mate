import { render, screen, waitFor } from '@testing-library/react';
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

    // Mock PointerEvent for Radix Select components
    /**
     *
     */
    class MockPointerEvent extends Event {
      button: number;
      ctrlKey: boolean;
      pointerType: string;

      constructor(type: string, props: PointerEventInit) {
        super(type, props);
        this.button = props.button ?? 0;
        this.ctrlKey = props.ctrlKey ?? false;
        this.pointerType = props.pointerType ?? 'mouse';
      }
    }
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access -- Needed as hack to mock PointerEvent for Radix Select testing
    (global as any).PointerEvent = MockPointerEvent;
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
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
  test('form controls update settings state', async () => {
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

    // Test target language selection with PointerEvent mocks
    const allComboboxes = screen.getAllByRole('combobox');
    const targetLanguageSelect = allComboboxes.find((el) =>
      el.textContent?.includes('Swedish')
    );
    if (!targetLanguageSelect)
      throw new Error('Target language select not found');
    await user.click(targetLanguageSelect);

    // Select a different language
    const spanishOption = screen.getByRole('option', { name: 'Spanish' });
    await user.click(spanishOption);

    // Test API key input
    const apiKeyInput = screen.getByDisplayValue('test-api-key');
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'new-api-key');

    // Test streaming toggle
    const streamingSwitch = screen.getByLabelText('Enable streaming responses');
    expect(streamingSwitch).toBeChecked();
    await user.click(streamingSwitch);

    // Test reasoning toggle
    const reasoningSwitch = screen.getByLabelText('Enable reasoning tokens');
    expect(reasoningSwitch).toBeChecked();
    await user.click(reasoningSwitch);

    // Test reasoning expanded toggle
    const reasoningExpandedSwitch = screen.getByLabelText(
      'Reasoning expanded by default'
    );
    expect(reasoningExpandedSwitch).toBeChecked();
    await user.click(reasoningExpandedSwitch);

    // Click Save Changes to trigger the save callback
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify the save callback was called with updated settings
    expect(mockOnSave).toHaveBeenCalledTimes(1);

    // Check that the settings were updated
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        apiKey: 'new-api-key',
        enableReasoning: false,
        reasoningExpanded: false,
        streaming: false,
        targetLanguage: 'Spanish',
      })
    );

    // Dialog should close after saving
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
  test('conversation-specific settings for chat mode', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    render(
      <TestWrapper>
        <UnifiedSettingsDialog
          conversationTitle="Test Chat"
          initialSettings={mockConversationSettings}
          mode="chat"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          open={true}
        />
      </TestWrapper>
    );

    // Should display chat-specific title and description
    expect(screen.getByText('Chat Settings - Test Chat')).toBeInTheDocument();
    expect(
      screen.getByText(
        'Customize the AI personalities and behaviors for this specific conversation.'
      )
    ).toBeInTheDocument();

    // Should show Advanced Settings section with conversation-specific controls
    expect(screen.getByText('Advanced Settings')).toBeInTheDocument();

    // Chat-specific fields should be present and editable
    expect(screen.getByLabelText('Chat Mate Background')).toBeInTheDocument();
    expect(screen.getByLabelText('Editor Mate Expertise')).toBeInTheDocument();
    expect(screen.getByText('Feedback Style')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Include cultural context')
    ).toBeInTheDocument();
    expect(screen.getByLabelText('Progressive complexity')).toBeInTheDocument();

    // Test Chat Mate Background input
    const chatMateBackgroundInput = screen.getByLabelText(
      'Chat Mate Background'
    );
    await user.clear(chatMateBackgroundInput);
    await user.type(chatMateBackgroundInput, 'experienced traveler');

    // Test Editor Mate Expertise input
    const editorMateExpertiseInput = screen.getByLabelText(
      'Editor Mate Expertise'
    );
    await user.clear(editorMateExpertiseInput);
    await user.type(editorMateExpertiseInput, '15+ years linguistics');

    // Test cultural context toggle
    const culturalContextSwitch = screen.getByLabelText(
      'Include cultural context'
    );
    expect(culturalContextSwitch).toBeChecked();
    await user.click(culturalContextSwitch);

    // Test progressive complexity toggle
    const progressiveComplexitySwitch = screen.getByLabelText(
      'Progressive complexity'
    );
    expect(progressiveComplexitySwitch).toBeChecked();
    await user.click(progressiveComplexitySwitch);

    // Test feedback style select with PointerEvent mocks
    const allComboboxes = screen.getAllByRole('combobox');
    const feedbackStyleSelect = allComboboxes.find((el) =>
      el.textContent?.includes('Encouraging')
    );
    if (!feedbackStyleSelect)
      throw new Error('Feedback style select not found');
    await user.click(feedbackStyleSelect);

    // Select a different feedback style
    const gentleOption = screen.getByRole('option', { name: 'Gentle' });
    await user.click(gentleOption);

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify the save callback was called with updated conversation-specific settings
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chatMateBackground: 'experienced traveler',
        culturalContext: false,
        editorMateExpertise: '15+ years linguistics',
        feedbackStyle: 'gentle',
        progressiveComplexity: false,
      })
    );

    // Dialog should close after saving
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
  test('AI personalities tab functionality', async () => {
    const user = userEvent.setup();
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

    // Click on AI Personalities tab
    const personalitiesTab = screen.getByRole('tab', {
      name: 'AI Personalities',
    });
    await user.click(personalitiesTab);

    // Verify tab is active
    expect(personalitiesTab).toHaveAttribute('aria-selected', 'true');

    // Verify AI Personalities tab content is displayed
    expect(screen.getByLabelText('Chat Mate Personality')).toBeInTheDocument();
    expect(
      screen.getByLabelText('Editor Mate Personality')
    ).toBeInTheDocument();

    // Test Chat Mate Personality textarea (should have initial value in chat mode)
    const chatMatePersonalityTextarea = screen.getByLabelText(
      'Chat Mate Personality'
    );
    expect(chatMatePersonalityTextarea).toHaveValue('friendly');
    await user.clear(chatMatePersonalityTextarea);
    await user.type(
      chatMatePersonalityTextarea,
      'enthusiastic and encouraging, loves sharing cultural insights'
    );

    // Test Editor Mate Personality textarea (should have initial value in chat mode)
    const editorMatePersonalityTextarea = screen.getByLabelText(
      'Editor Mate Personality'
    );
    expect(editorMatePersonalityTextarea).toHaveValue('patient teacher');
    await user.clear(editorMatePersonalityTextarea);
    await user.type(
      editorMatePersonalityTextarea,
      'constructive and supportive, provides detailed explanations with examples'
    );

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify the save callback was called with updated personality settings
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        chatMatePersonality:
          'enthusiastic and encouraging, loves sharing cultural insights',
        editorMatePersonality:
          'constructive and supportive, provides detailed explanations with examples',
      })
    );

    // Dialog should close after saving
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
  test('model selector integration', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    // Mock the apiClient.getModels() function
    const mockApiClient = await import('@/services/apiClient');
    vi.spyOn(mockApiClient.apiClient, 'getModels').mockResolvedValue({
      models: [
        { id: 'anthropic/claude-3-5-sonnet', name: 'Claude 3.5 Sonnet' },
        { id: 'anthropic/claude-3-5-haiku', name: 'Claude 3.5 Haiku' },
        { id: 'openai/gpt-4o', name: 'GPT-4o' },
        { id: 'google/gemini-2.5-flash', name: 'Gemini 2.5 Flash' },
      ],
    });

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

    // Should display AI Model label
    expect(screen.getByText('AI Model')).toBeInTheDocument();

    // Find the model selector combobox (should be the one that's not the language selector)
    const allComboboxes = screen.getAllByRole('combobox');
    const modelSelectorButton = allComboboxes.find(
      (combobox) =>
        !combobox.textContent?.includes('Swedish') &&
        combobox.textContent?.trim() !== ''
    );
    if (!modelSelectorButton)
      throw new Error('Model selector button not found');

    // Click to open the model selector dropdown
    await user.click(modelSelectorButton);

    // Wait for models to load in the dropdown
    await expect(
      screen.findByText('Claude 3.5 Sonnet')
    ).resolves.toBeInTheDocument();

    // Select Claude 3.5 Sonnet
    const claudeOption = screen.getByText('Claude 3.5 Sonnet');
    await user.click(claudeOption);

    // Verify the model selector now shows the selected model
    await waitFor(() => {
      expect(modelSelectorButton).toHaveTextContent('Claude 3.5 Sonnet');
    });

    // Save changes
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify the save callback was called with updated model
    expect(mockOnSave).toHaveBeenCalledTimes(1);
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        model: 'anthropic/claude-3-5-sonnet',
      })
    );

    // Dialog should close after saving
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
  });
  test('cancel button closes dialog without saving', async () => {
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

    // Verify dialog is open
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Make some changes to settings (change target language)
    const languageSelectors = screen.getAllByRole('combobox');
    const languageSelector = languageSelectors.find((combobox) =>
      combobox.textContent?.includes('Swedish')
    );
    if (!languageSelector) throw new Error('Language selector not found');

    await user.click(languageSelector);
    const englishOption = screen.getByText('English');
    await user.click(englishOption);

    // Click cancel button instead of save
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Verify the dialog closes without saving
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    expect(mockOnSave).not.toHaveBeenCalled();
  });
  test('settings reset when dialog reopens', async () => {
    const user = userEvent.setup();
    const mockOnOpenChange = vi.fn();
    const mockOnSave = vi.fn();

    const { rerender } = render(
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

    // Make some changes to settings (change target language)
    const languageSelectors = screen.getAllByRole('combobox');
    const languageSelector = languageSelectors.find((combobox) =>
      combobox.textContent?.includes('Swedish')
    );
    if (!languageSelector) throw new Error('Language selector not found');

    await user.click(languageSelector);
    const englishOption = screen.getByText('English');
    await user.click(englishOption);

    // Verify the change was applied in the UI
    expect(languageSelector).toHaveTextContent('English');

    // Cancel to close dialog without saving
    const cancelButton = screen.getByText('Cancel');
    await user.click(cancelButton);

    // Verify dialog closed
    expect(mockOnOpenChange).toHaveBeenCalledWith(false);

    // Simulate closing and reopening the dialog by unmounting and remounting
    mockOnOpenChange.mockClear();

    // First, rerender with open=false to close the dialog
    rerender(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={mockGlobalSettings}
          mode="global"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSave}
          open={false}
        />
      </TestWrapper>
    );

    // Then reopen the dialog
    rerender(
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

    // Verify settings have reset to original values (Swedish, not English)
    // Wait for the component to render properly
    await waitFor(() => {
      expect(screen.getByText('Target Language')).toBeInTheDocument();
    });

    const reopenedLanguageSelectors = screen.getAllByRole('combobox');
    // Find the target language selector (should have default value Swedish)
    const reopenedLanguageSelector = reopenedLanguageSelectors.find(
      (combobox) => combobox.textContent?.includes('Swedish')
    );

    if (!reopenedLanguageSelector) {
      throw new Error(
        'Language selector not found - comboboxes: ' +
          reopenedLanguageSelectors.map((cb) => cb.textContent).join(', ')
      );
    }

    expect(reopenedLanguageSelector).toHaveTextContent('Swedish');
  });
  test.todo('reasoning expanded toggle dependency');
});
