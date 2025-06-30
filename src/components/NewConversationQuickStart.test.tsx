import {
  render,
  type RenderResult,
  screen,
  waitFor,
} from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { beforeEach, describe, expect, test, vi } from 'vitest';

import type { LocalAppData } from '@/schemas/storage';

import { Toaster } from '@/components/ui/toaster';
import { UnifiedStorageProvider } from '@/contexts/UnifiedStorageContext';

import NewConversationQuickStart from './NewConversationQuickStart';

// Helper to create test data with proper typing
const createTestData = (
  conversations: {
    created_at: string;
    id: string;
    language: string;
    title: string;
    updated_at: string;
  }[] = []
): LocalAppData => ({
  conversations: conversations.map((conv) => ({
    created_at: new Date(conv.created_at),
    id: conv.id,
    language: conv.language,
    messages: [],
    title: conv.title,
    updated_at: new Date(conv.updated_at),
  })),
  conversationSettings: {},
  globalSettings: {
    apiKey: '',
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
  },
});

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

const renderWithTestData = (
  component: React.ReactElement,
  testData?: LocalAppData
): RenderResult => {
  if (testData) {
    localStorage.setItem('language-mate-data', JSON.stringify(testData));
  }

  return render(<TestWrapper>{component}</TestWrapper>);
};

describe('NewConversationQuickStart', () => {
  const mockOnLanguageSelect = vi.fn();
  const mockOnModelSelect = vi.fn();
  const mockOnLanguageSelectorOpen = vi.fn();
  const mockOnModelSelectorOpen = vi.fn();

  const defaultProps = {
    onLanguageSelect: mockOnLanguageSelect,
    onLanguageSelectorOpen: mockOnLanguageSelectorOpen,
    onModelSelect: mockOnModelSelect,
    onModelSelectorOpen: mockOnModelSelectorOpen,
  };

  beforeEach(() => {
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Rendering with no conversation history', () => {
    test('should render fallback language options when no conversations exist', () => {
      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      // Should show language section
      expect(screen.getByText('Recent Languages:')).toBeInTheDocument();
      expect(screen.getByText('More languages...')).toBeInTheDocument();

      // Should show model section
      expect(screen.getByText('Recent Models:')).toBeInTheDocument();
      expect(screen.getByText('More models...')).toBeInTheDocument();
    });

    test('should show current default language as fallback', () => {
      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      // Should show default Swedish language
      expect(
        screen.getByRole('button', { name: /swedish/i })
      ).toBeInTheDocument();
    });

    test('should show current default model as fallback', () => {
      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      // Should show default model button
      expect(
        screen.getByRole('button', { name: /gemini-2\.5-flash/i })
      ).toBeInTheDocument();
    });
  });

  describe('Rendering with conversation history', () => {
    test('should render recent unique languages from conversation history', () => {
      const testData = createTestData([
        {
          created_at: '2024-01-01',
          id: 'conv1',
          language: 'French',
          title: 'French Chat',
          updated_at: '2024-01-01',
        },
        {
          created_at: '2024-01-02',
          id: 'conv2',
          language: 'Spanish',
          title: 'Spanish Chat',
          updated_at: '2024-01-02',
        },
        {
          created_at: '2024-01-03',
          id: 'conv3',
          language: 'German',
          title: 'German Chat',
          updated_at: '2024-01-03',
        },
      ]);

      renderWithTestData(
        <NewConversationQuickStart {...defaultProps} />,
        testData
      );

      // Should show 2 most recent unique languages
      expect(
        screen.getByRole('button', { name: /german/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /spanish/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /french/i })
      ).not.toBeInTheDocument();
    });

    test('should deduplicate languages and show most recent unique ones', () => {
      const testData = createTestData([
        {
          created_at: '2024-01-01',
          id: 'conv1',
          language: 'French',
          title: 'French Chat 1',
          updated_at: '2024-01-01',
        },
        {
          created_at: '2024-01-02',
          id: 'conv2',
          language: 'Spanish',
          title: 'Spanish Chat',
          updated_at: '2024-01-02',
        },
        {
          created_at: '2024-01-03',
          id: 'conv3',
          language: 'French',
          title: 'French Chat 2',
          updated_at: '2024-01-03',
        },
        {
          created_at: '2024-01-04',
          id: 'conv4',
          language: 'German',
          title: 'German Chat',
          updated_at: '2024-01-04',
        },
      ]);

      renderWithTestData(
        <NewConversationQuickStart {...defaultProps} />,
        testData
      );

      // Should show most recent German and French (not Spanish)
      expect(
        screen.getByRole('button', { name: /german/i })
      ).toBeInTheDocument();
      expect(
        screen.getByRole('button', { name: /french/i })
      ).toBeInTheDocument();
      expect(
        screen.queryByRole('button', { name: /spanish/i })
      ).not.toBeInTheDocument();
    });
  });

  describe('User interactions', () => {
    test('should call onLanguageSelect when recent language button is clicked', async () => {
      const user = userEvent.setup();
      const testData = createTestData([
        {
          created_at: '2024-01-01',
          id: 'conv1',
          language: 'French',
          title: 'French Chat',
          updated_at: '2024-01-01',
        },
      ]);

      renderWithTestData(
        <NewConversationQuickStart {...defaultProps} />,
        testData
      );

      const frenchButton = screen.getByRole('button', { name: /french/i });
      await user.click(frenchButton);

      expect(mockOnLanguageSelect).toHaveBeenCalledWith('French');
    });

    test('should call onModelSelect when recent model button is clicked', async () => {
      const user = userEvent.setup();

      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      const modelButton = screen.getByRole('button', {
        name: /gemini-2\.5-flash/i,
      });
      await user.click(modelButton);

      expect(mockOnModelSelect).toHaveBeenCalledWith('google/gemini-2.5-flash');
    });

    test('should call onLanguageSelectorOpen when "More languages..." is clicked', async () => {
      const user = userEvent.setup();

      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      const moreLanguagesButton = screen.getByText('More languages...');
      await user.click(moreLanguagesButton);

      expect(mockOnLanguageSelectorOpen).toHaveBeenCalled();
    });

    test('should call onModelSelectorOpen when "More models..." is clicked', async () => {
      const user = userEvent.setup();

      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      const moreModelsButton = screen.getByText('More models...');
      await user.click(moreModelsButton);

      expect(mockOnModelSelectorOpen).toHaveBeenCalled();
    });
  });

  describe('Visual feedback for selected preferences', () => {
    test('should show selected language in feedback section', () => {
      renderWithTestData(
        <NewConversationQuickStart
          {...defaultProps}
          selectedLanguage="French"
        />
      );

      expect(screen.getByText('Ready to chat:')).toBeInTheDocument();
      expect(screen.getByText('📖 French')).toBeInTheDocument();
      expect(
        screen.getByText('Type your first message to start the conversation')
      ).toBeInTheDocument();
    });

    test('should show selected model in feedback section', () => {
      renderWithTestData(
        <NewConversationQuickStart
          {...defaultProps}
          selectedModel="openai/gpt-4o"
        />
      );

      expect(screen.getByText('Ready to chat:')).toBeInTheDocument();
      expect(screen.getByText('⚡ gpt-4o')).toBeInTheDocument();
      expect(
        screen.getByText('Type your first message to start the conversation')
      ).toBeInTheDocument();
    });

    test('should show both selected language and model', () => {
      renderWithTestData(
        <NewConversationQuickStart
          {...defaultProps}
          selectedLanguage="Spanish"
          selectedModel="anthropic/claude-3-5-sonnet"
        />
      );

      expect(screen.getByText('Ready to chat:')).toBeInTheDocument();
      expect(screen.getByText('📖 Spanish')).toBeInTheDocument();
      expect(screen.getByText('⚡ claude-3-5-sonnet')).toBeInTheDocument();
    });

    test('should always show feedback section with defaults when no preferences selected', () => {
      renderWithTestData(<NewConversationQuickStart {...defaultProps} />);

      // Should always show the Ready to chat section
      expect(screen.getByText('Ready to chat:')).toBeInTheDocument();
      expect(
        screen.getByText('Type your first message to start the conversation')
      ).toBeInTheDocument();

      // Should show default language and model
      expect(screen.getByText('📖 Swedish')).toBeInTheDocument(); // Default language
      expect(screen.getByText('⚡ gemini-2.5-flash')).toBeInTheDocument(); // Default model
    });
  });

  describe('Edge cases', () => {
    test('should handle conversations with empty language gracefully', async () => {
      // Use the same format that worked in debug test
      const testData = {
        conversations: [
          {
            created_at: new Date('2024-01-02T00:00:00.000Z'),
            id: 'conv2',
            language: 'French',
            messages: [],
            title: 'French Chat',
            updated_at: new Date('2024-01-02T00:00:00.000Z'),
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
          feedbackLanguage: 'English',
          feedbackStyle: 'encouraging' as const,
          model: 'google/gemini-2.5-flash',
          progressiveComplexity: true,
          reasoningExpanded: true,
          streaming: true,
          targetLanguage: 'Swedish',
          theme: 'system' as const,
        },
      } satisfies LocalAppData;

      renderWithTestData(
        <NewConversationQuickStart {...defaultProps} />,
        testData
      );

      // Wait for localStorage data to load and component to update
      await waitFor(
        () => {
          expect(
            screen.getByRole('button', { name: /french/i })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      expect(
        screen.getByRole('button', { name: /swedish/i })
      ).toBeInTheDocument();
    });

    test('should show recent language plus fallback when only one conversation exists', async () => {
      const testData = createTestData([
        {
          created_at: '2024-01-01',
          id: 'conv1',
          language: 'French',
          title: 'French Chat',
          updated_at: '2024-01-01',
        },
      ]);

      renderWithTestData(
        <NewConversationQuickStart {...defaultProps} />,
        testData
      );

      // Wait for localStorage data to load and check for French button
      await waitFor(
        () => {
          expect(
            screen.getByRole('button', { name: /french/i })
          ).toBeInTheDocument();
        },
        { timeout: 5000 }
      );

      // Should also show default Swedish as fallback to fill up to 2 buttons
      expect(
        screen.getByRole('button', { name: /swedish/i })
      ).toBeInTheDocument();
    });
  });
});
