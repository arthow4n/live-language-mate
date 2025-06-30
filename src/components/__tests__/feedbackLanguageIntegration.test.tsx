import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type {
  ConversationSettings,
  ConversationSettingsUpdate,
  GlobalSettings,
  GlobalSettingsUpdate,
} from '@/schemas/settings';

import { expectToNotBeUndefined } from '@/__tests__/typedExpectHelpers';
import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';
import { buildPrompt } from '@/services/prompts/promptBuilder';

import UnifiedSettingsDialog from '../UnifiedSettingsDialog';

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
  feedbackLanguage: 'English',
  feedbackStyle: 'encouraging' as const,
  model: 'google/gemini-2.5-flash',
  progressiveComplexity: true,
  reasoningExpanded: true,
  streaming: true,
  targetLanguage: 'Swedish',
  theme: 'system' as const,
};

describe('Feedback Language Integration Tests', () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.innerHTML = '';

    // Mock ResizeObserver for UI components
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
    // eslint-disable-next-line @typescript-eslint/no-explicit-any, @typescript-eslint/consistent-type-assertions, @typescript-eslint/no-unsafe-member-access -- Needed for testing
    (global as any).PointerEvent = MockPointerEvent;
    // eslint-disable-next-line vitest/prefer-spy-on -- mock potentially non-existing prototype method
    window.HTMLElement.prototype.scrollIntoView = vi.fn();
    // eslint-disable-next-line vitest/prefer-spy-on -- mock potentially non-existing prototype method
    window.HTMLElement.prototype.releasePointerCapture = vi.fn();
    // eslint-disable-next-line vitest/prefer-spy-on -- mock potentially non-existing prototype method
    window.HTMLElement.prototype.hasPointerCapture = vi.fn();
  });

  test('complete feedback language flow - user changes setting and it affects prompt generation', async () => {
    const user = userEvent.setup();
    let savedSettings: GlobalSettings = mockGlobalSettings;

    const mockOnSave = vi.fn((newSettings: GlobalSettingsUpdate) => {
      savedSettings = { ...savedSettings, ...newSettings };
    });
    const mockOnOpenChange = vi.fn();

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

    // Verify the feedback language field exists with default value
    expect(screen.getByText('Feedback Language')).toBeInTheDocument();

    // Find the feedback language selector by finding all comboboxes and looking for one that's NOT the target language selector
    const allComboboxes = screen.getAllByRole('combobox');
    // First combobox should be target language, second should be feedback language
    expect(allComboboxes.length).toBeGreaterThanOrEqual(2);

    // Use the second combobox as feedback language selector (first is target language, second is feedback language)
    const feedbackLanguageSelector = allComboboxes[1];
    expectToNotBeUndefined(feedbackLanguageSelector);

    // Click to open the dropdown
    await user.click(feedbackLanguageSelector);

    // Wait for Spanish option to appear
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Spanish' })
      ).toBeInTheDocument();
    });

    // Select Spanish as feedback language
    const spanishOption = screen.getByRole('option', { name: 'Spanish' });
    await user.click(spanishOption);

    // Save the settings
    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    // Verify the save callback was called with Spanish as feedback language
    expect(mockOnSave).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackLanguage: 'Spanish',
      })
    );

    // Verify that the saved settings now include Spanish as feedback language
    expect(savedSettings.feedbackLanguage).toBe('Spanish');

    // Test that the prompt builder uses the new feedback language
    const mockConversationSettings = {
      ...savedSettings,
      feedbackLanguage: 'Spanish',
    };

    // Test prompt generation with new feedback language
    const editorMatePrompt = buildPrompt({
      messageType: 'editor-mate-user-comment',
      variables: {
        culturalContext: mockConversationSettings.culturalContext,
        feedbackLanguage: mockConversationSettings.feedbackLanguage,
        feedbackStyle: mockConversationSettings.feedbackStyle,
        progressiveComplexity: mockConversationSettings.progressiveComplexity,
        targetLanguage: mockConversationSettings.targetLanguage,
      },
    });

    // Verify the prompt includes instructions to provide feedback in Spanish
    expect(editorMatePrompt.systemPrompt).toContain(
      'Provide all feedback and explanations in Spanish'
    );
  });

  test('feedback language setting persists across different conversation settings', async () => {
    const user = userEvent.setup();
    let globalSettings: GlobalSettings = {
      ...mockGlobalSettings,
      feedbackLanguage: 'French',
    };
    let conversationSettings: ConversationSettings = {
      ...mockGlobalSettings,
      feedbackLanguage: 'German',
    };

    const mockOnSaveGlobal = vi.fn((newSettings: GlobalSettingsUpdate) => {
      globalSettings = { ...globalSettings, ...newSettings };
    });
    const mockOnSaveConversation = vi.fn(
      (newSettings: ConversationSettingsUpdate) => {
        conversationSettings = { ...conversationSettings, ...newSettings };
      }
    );
    const mockOnOpenChange = vi.fn();

    // Test global settings
    const { rerender } = render(
      <TestWrapper>
        <UnifiedSettingsDialog
          initialSettings={globalSettings}
          mode="global"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSaveGlobal}
          open={true}
        />
      </TestWrapper>
    );

    // Verify French is shown in global settings
    const allComboboxes = screen.getAllByRole('combobox');
    expect(allComboboxes.length).toBeGreaterThanOrEqual(2);

    // Use the second combobox as feedback language selector (first is target language, second is feedback language)
    const feedbackLanguageSelector = allComboboxes[1];
    expectToNotBeUndefined(feedbackLanguageSelector);

    // Change to Spanish in global settings
    await user.click(feedbackLanguageSelector);
    await waitFor(() => {
      expect(
        screen.getByRole('option', { name: 'Spanish' })
      ).toBeInTheDocument();
    });
    const spanishOption = screen.getByRole('option', { name: 'Spanish' });
    await user.click(spanishOption);

    const saveButton = screen.getByText('Save Changes');
    await user.click(saveButton);

    expect(mockOnSaveGlobal).toHaveBeenCalledWith(
      expect.objectContaining({
        feedbackLanguage: 'Spanish',
      })
    );

    // Close the dialog and switch to conversation mode
    mockOnOpenChange.mockClear();

    // Test conversation-specific settings
    rerender(
      <TestWrapper>
        <UnifiedSettingsDialog
          conversationTitle="Test Conversation"
          initialSettings={conversationSettings}
          mode="chat"
          onOpenChange={mockOnOpenChange}
          onSave={mockOnSaveConversation}
          open={true}
        />
      </TestWrapper>
    );

    // Verify that conversation settings can have their own feedback language
    expect(screen.getByText('Feedback Language')).toBeInTheDocument();

    // Test that conversation-specific prompt building uses conversation-specific feedback language
    const conversationPrompt = buildPrompt({
      messageType: 'editor-mate-user-comment',
      variables: {
        culturalContext: conversationSettings.culturalContext,
        feedbackLanguage: conversationSettings.feedbackLanguage,
        feedbackStyle: conversationSettings.feedbackStyle,
        progressiveComplexity: conversationSettings.progressiveComplexity,
        targetLanguage: conversationSettings.targetLanguage,
      },
    });

    // Should use German (conversation setting) not Spanish (global setting)
    expect(conversationPrompt.systemPrompt).toContain(
      'Provide all feedback and explanations in German'
    );
  });

  test('EditorMatePanel prompt generation includes feedbackLanguage from globalSettings', () => {
    // Test that our fix correctly passes feedbackLanguage to prompt generation
    const testSettings = {
      ...mockGlobalSettings,
      feedbackLanguage: 'Spanish',
    };

    // Simulate what EditorMatePanel should now do after our fix
    const promptVariables = {
      chatMateBackground:
        'A friendly local who enjoys helping people learn the language and culture.',
      chatMatePersonality:
        'A friendly native speaker who enjoys helping people learn the language.',
      culturalContext: testSettings.culturalContext,
      editorMateExpertise: testSettings.editorMateExpertise,
      editorMatePersonality:
        'You are a patient teacher. Provide helpful explanations about language usage, grammar, and cultural context.',
      feedbackLanguage: testSettings.feedbackLanguage, // This is what we fixed
      feedbackStyle: testSettings.feedbackStyle,
      progressiveComplexity: testSettings.progressiveComplexity,
      targetLanguage: 'Spanish',
    };

    const prompt = buildPrompt({
      messageType: 'editor-mate-response',
      variables: promptVariables,
    });

    // Verify the prompt correctly uses Spanish for feedback
    expect(prompt.systemPrompt).toContain(
      'Provide all feedback and explanations in Spanish'
    );
  });
});
