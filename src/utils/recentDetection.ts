import type { LocalConversation } from '@/contexts/UnifiedStorageContext';
import type { ConversationSettings } from '@/schemas/settings';

/**
 * Extract the 2 most recent unique languages from conversation history
 * @param conversations - Array of conversations sorted by most recent first
 * @returns Array of up to 2 unique language strings
 */
export const extractRecentLanguages = (
  conversations: LocalConversation[]
): string[] => {
  if (conversations.length === 0) {
    return [];
  }

  // Sort conversations by updated_at in descending order (most recent first)
  const sortedConversations = [...conversations].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  const uniqueLanguages: string[] = [];

  for (const conversation of sortedConversations) {
    // Skip empty or invalid languages
    if (!conversation.language || conversation.language.trim() === '') {
      continue;
    }

    // Only add if not already in the list (deduplicate)
    if (!uniqueLanguages.includes(conversation.language)) {
      uniqueLanguages.push(conversation.language);
    }

    // Stop when we have 2 unique languages
    if (uniqueLanguages.length >= 2) {
      break;
    }
  }

  return uniqueLanguages;
};

/**
 * Extract the 2 most recent unique models from conversation history
 * @param options
 * @param options.conversations - Array of conversations sorted by most recent first
 * @param options.conversationSettings - Settings for each conversation by ID
 * @param options.globalSettings - Global settings to use as fallback for model
 * @returns Array of up to 2 unique model strings
 */
export const extractRecentModels = (options: {
  conversations: LocalConversation[];
  conversationSettings: Record<string, ConversationSettings>;
  globalSettings?: ConversationSettings;
}): string[] => {
  const { conversations, conversationSettings, globalSettings } = options;
  if (conversations.length === 0) {
    return [];
  }

  // Sort conversations by updated_at in descending order (most recent first)
  const sortedConversations = [...conversations].sort((a, b) => {
    return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime();
  });

  // Build list of all models first to find duplicates
  const conversationModels: {
    conversation: LocalConversation;
    model: string;
  }[] = [];

  for (const conversation of sortedConversations) {
    // Get conversation-specific settings or fall back to global
    const settings = conversationSettings[conversation.id];
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- conversationSettings may not have settings for every conversation ID
    let model = settings?.model;

    // If no conversation-specific model, use global default
    if (!model && globalSettings) {
      model = globalSettings.model;
    }

    // Skip empty or invalid models
    if (!model || model.trim() === '') {
      continue;
    }

    conversationModels.push({ conversation, model });
  }

  // Find unique models by taking first occurrence of each unique model
  const seenModels = new Set<string>();
  const uniqueModels: string[] = [];

  for (const { model } of conversationModels) {
    if (!seenModels.has(model)) {
      seenModels.add(model);
      uniqueModels.push(model);

      // Stop when we have 2 unique models
      if (uniqueModels.length >= 2) {
        break;
      }
    }
  }

  return uniqueModels;
};
