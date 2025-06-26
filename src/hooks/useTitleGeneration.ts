import { useCallback, useEffect, useState } from 'react';

import type { Message } from '@/schemas/messages';
import type { LocalConversation } from '@/schemas/messages';

import { logError } from '@/lib/utils';
import { generateChatTitle } from '@/utils/chatTitleGenerator';

/**
 * Configuration for the title generation hook
 */
interface UseTitleGenerationOptions {
  /**
   * Current conversation ID
   */
  conversationId: null | string;

  /**
   * Model to use for title generation
   */
  effectiveModel: string;

  /**
   * Function to get conversation from storage
   */
  getConversation: (id: string) => LocalConversation | null;

  /**
   * Current messages in the conversation
   */
  messages: Message[];

  /**
   * Callback when conversation is updated
   */
  onConversationUpdate: () => void;

  /**
   * Target language for title generation
   */
  targetLanguage: string;

  /**
   * Function to update conversation in storage
   */
  updateConversation: (id: string, data: Partial<LocalConversation>) => void;
}

/**
 * Hook for managing automatic conversation title generation.
 *
 * This hook handles the logic for determining when to generate titles for conversations
 * and actually generating them. It tracks which conversations have already had titles
 * generated to avoid duplicates and manages the timing of title generation.
 * @param options - Configuration object with dependencies
 */
export function useTitleGeneration(options: UseTitleGenerationOptions): void {
  const {
    conversationId,
    effectiveModel,
    getConversation,
    messages,
    onConversationUpdate,
    targetLanguage,
    updateConversation,
  } = options;

  const [titleGenerationProcessed, setTitleGenerationProcessed] = useState(
    new Set<string>()
  );

  const shouldGenerateTitle = useCallback(
    (messagesList: Message[], convId: null | string): boolean => {
      if (!convId || titleGenerationProcessed.has(convId)) return false;

      // Count messages by type
      const userMessages = messagesList.filter((m) => m.type === 'user').length;
      const chatMateMessages = messagesList.filter(
        (m) => m.type === 'chat-mate'
      ).length;
      const editorMateMessages = messagesList.filter(
        (m) => m.type === 'editor-mate'
      ).length;

      // Generate title after first complete round: 1 user, 1 chat-mate, 2 editor-mate (one for user, one for chat-mate)
      return (
        userMessages >= 1 && chatMateMessages >= 1 && editorMateMessages >= 2
      );
    },
    [titleGenerationProcessed]
  );

  const generateAndUpdateTitle = useCallback(
    async (messagesList: Message[], convId: string): Promise<void> => {
      if (!convId || titleGenerationProcessed.has(convId)) return;

      try {
        // Mark this conversation as being processed to prevent duplicates
        setTitleGenerationProcessed((prev) => new Set(prev).add(convId));

        // Convert messages to the format expected by title generator
        const conversationHistory = messagesList.map((msg) => ({
          content: msg.content,
          message_type: msg.type,
        }));

        const newTitle = await generateChatTitle({
          conversationHistory,
          model: effectiveModel,
          targetLanguage,
        });

        if (newTitle && newTitle !== 'Chat') {
          const conversation = getConversation(convId);
          if (conversation) {
            updateConversation(convId, {
              ...conversation,
              title: newTitle,
              updated_at: new Date(),
            });
            // Force sidebar refresh after title update
            setTimeout(() => {
              onConversationUpdate();
            }, 200);
          }
        }
      } catch (error) {
        logError('❌ Error in title generation process:', error);
        // Remove from processed set on error so it can be retried
        setTitleGenerationProcessed((prev) => {
          const newSet = new Set(prev);
          newSet.delete(convId);
          return newSet;
        });
      }
    },
    [
      titleGenerationProcessed,
      effectiveModel,
      targetLanguage,
      getConversation,
      updateConversation,
      onConversationUpdate,
    ]
  );

  // Check for title generation when messages change - with better race condition handling
  useEffect(() => {
    if (conversationId && shouldGenerateTitle(messages, conversationId)) {
      // Use a small delay to ensure all messages are saved before generating title
      const timeoutId = setTimeout(() => {
        void generateAndUpdateTitle(messages, conversationId);
      }, 500);

      return (): void => {
        clearTimeout(timeoutId);
      };
    }
  }, [messages, conversationId, shouldGenerateTitle, generateAndUpdateTitle]);

  // Reset title generation tracking when conversation changes
  useEffect(() => {
    if (conversationId) {
      setTitleGenerationProcessed((prev) => {
        // Keep the current conversation in the set if it's already there
        const newSet = new Set<string>();
        if (prev.has(conversationId)) {
          newSet.add(conversationId);
        }
        return newSet;
      });
    }
  }, [conversationId]);
}
