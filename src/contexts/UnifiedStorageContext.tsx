import type { ReactNode } from 'react';

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from 'react';

import type { LocalConversation, LocalMessage } from '@/schemas/messages';

import {
  type ConversationSettings,
  conversationSettingsSchema,
  type ConversationSettingsUpdate,
  type GlobalSettings,
  globalSettingsSchema,
  type GlobalSettingsUpdate,
} from '@/schemas/settings';
import { localAppDataSchema, LocalStorageKeys } from '@/schemas/storage';

// Re-export types for components
export type {
  ConversationSettings,
  ConversationSettingsUpdate,
  GlobalSettings,
  GlobalSettingsUpdate,
  LocalConversation,
  LocalMessage,
};

/**
 *
 */
interface UnifiedStorageContextType {
  // Message methods
  addMessage: (
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ) => LocalMessage;
  // Data state
  conversations: LocalConversation[];
  conversationSettings: Record<string, ConversationSettings>;
  createConversation: (data: Partial<LocalConversation>) => LocalConversation;

  createConversationSettings: (conversationId: string) => ConversationSettings;
  // Data management
  deleteAllChats: () => void;
  deleteConversation: (id: string) => void;
  deleteMessage: (messageId: string) => void;

  exportData: () => string;
  getConversation: (id: string) => LocalConversation | null;
  getConversationSettings: (conversationId: string) => ConversationSettings;
  getMessages: (conversationId: string) => LocalMessage[];
  globalSettings: GlobalSettings;
  importData: (jsonData: string) => boolean;
  isLoaded: boolean;

  // Conversation methods
  refreshConversations: () => void;
  saveConversation: (conversation: LocalConversation) => void;
  updateConversation: (id: string, updates: Partial<LocalConversation>) => void;
  updateConversationSettings: (
    conversationId: string,
    newSettings: ConversationSettingsUpdate
  ) => void;

  updateConversationTitle: (id: string, title: string) => void;
  // Settings methods
  updateGlobalSettings: (newSettings: GlobalSettingsUpdate) => void;
  updateMessage: (messageId: string, updates: Partial<LocalMessage>) => void;
}

const UnifiedStorageContext = createContext<
  undefined | UnifiedStorageContextType
>(undefined);

export const getDefaultGlobalSettings = (): GlobalSettings => {
  return {
    apiKey: '',
    chatMateBackground: 'young professional, loves local culture',
    chatMatePersonality:
      'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
    culturalContext: true,
    editorMateExpertise: '10+ years teaching experience',
    editorMatePersonality:
      'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
    enableReasoning: true,
    feedbackStyle: 'encouraging',
    model: 'google/gemini-2.5-flash',
    progressiveComplexity: true,
    reasoningExpanded: true,
    streaming: true,
    targetLanguage: 'Swedish',
    theme: 'system',
  };
};

export const UnifiedStorageProvider = ({
  children,
}: {
  children: ReactNode;
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(
    getDefaultGlobalSettings()
  );
  const [conversationSettings, setConversationSettings] = useState<
    Record<string, ConversationSettings>
  >({});

  // Load all data from localStorage on mount
  useEffect(() => {
    const loadData = () => {
      try {
        const stored = localStorage.getItem(LocalStorageKeys.APP_DATA);
        if (stored) {
          const parsed = JSON.parse(stored) as unknown;

          // Convert date strings back to Date objects
          /**
           *
           */
          interface ParsedStorageData {
            conversations?: {
              ai_mode: string;
              chat_mate_prompt?: string;
              created_at: string;
              editor_mate_prompt?: string;
              id: string;
              language: string;
              messages?: {
                content: string;
                id: string;
                isStreaming?: boolean;
                metadata?: object;
                parentMessageId?: string;
                reasoning?: string;
                timestamp: string;
                type: string;
              }[];
              title: string;
              updated_at: string;
            }[];
            conversationSettings?: Record<string, object>;
            globalSettings?: object;
          }

          const parsedData = parsed as ParsedStorageData;
          const dataWithDates = {
            conversations:
              parsedData.conversations?.map((conv) => ({
                ...conv,
                created_at: new Date(conv.created_at),
                messages:
                  conv.messages?.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                  })) ?? [],
                updated_at: new Date(conv.updated_at),
              })) ?? [],
            conversationSettings: parsedData.conversationSettings ?? {},
            globalSettings:
              parsedData.globalSettings ?? getDefaultGlobalSettings(),
          };

          // Validate with Zod schema
          const validatedData = localAppDataSchema.parse(dataWithDates);

          setConversations(validatedData.conversations);
          setGlobalSettings(validatedData.globalSettings);
          setConversationSettings(validatedData.conversationSettings);

          console.log('✅ Loaded unified data from localStorage:', {
            conversations: validatedData.conversations.length,
            conversationSettings: Object.keys(
              validatedData.conversationSettings
            ).length,
            globalSettings: {
              model: validatedData.globalSettings.model,
              targetLanguage: validatedData.globalSettings.targetLanguage,
            },
          });
        }
      } catch (error) {
        console.error(
          'Error loading data from localStorage - using defaults:',
          error
        );
        // Clear invalid data and use defaults
        localStorage.removeItem(LocalStorageKeys.APP_DATA);
      } finally {
        setIsLoaded(true);
      }
    };

    loadData();
  }, []);

  const saveData = useCallback(() => {
    try {
      const data = {
        conversations,
        conversationSettings,
        globalSettings,
      };

      // Validate before saving
      const validatedData = localAppDataSchema.parse(data);
      localStorage.setItem(
        LocalStorageKeys.APP_DATA,
        JSON.stringify(validatedData)
      );
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      throw error;
    }
  }, [conversations, globalSettings, conversationSettings]);

  const updateGlobalSettings = (newSettings: GlobalSettingsUpdate) => {
    setGlobalSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };
      try {
        const validatedSettings = globalSettingsSchema.parse(updatedSettings);
        console.log('✨ Updated global settings:', validatedSettings);
        return validatedSettings;
      } catch (error) {
        console.error('Failed to validate global settings:', error);
        return prev;
      }
    });
  };

  const getDefaultConversationSettings = (): ConversationSettings => ({
    apiKey: globalSettings.apiKey,
    chatMateBackground: globalSettings.chatMateBackground,
    chatMatePersonality: globalSettings.chatMatePersonality,
    culturalContext: globalSettings.culturalContext,
    editorMateExpertise: globalSettings.editorMateExpertise,
    editorMatePersonality: globalSettings.editorMatePersonality,
    enableReasoning: globalSettings.enableReasoning,
    feedbackStyle: globalSettings.feedbackStyle,
    // Inherit from global settings
    model: globalSettings.model,
    progressiveComplexity: globalSettings.progressiveComplexity,
    reasoningExpanded: globalSettings.reasoningExpanded,
    streaming: globalSettings.streaming,
    targetLanguage: globalSettings.targetLanguage,
    theme: globalSettings.theme,
  });

  const updateConversationSettings = (
    conversationId: string,
    newSettings: ConversationSettingsUpdate
  ) => {
    setConversationSettings((prev) => {
      const currentSettings =
        prev[conversationId] ?? getDefaultConversationSettings();
      const updatedSettings = { ...currentSettings, ...newSettings };

      try {
        const validatedSettings =
          conversationSettingsSchema.parse(updatedSettings);
        console.log(
          `✨ Updated conversation settings for ${conversationId}:`,
          validatedSettings
        );
        return {
          ...prev,
          [conversationId]: validatedSettings,
        };
      } catch (error) {
        console.error('Failed to validate conversation settings:', error);
        return prev;
      }
    });
  };

  const getConversationSettings = (
    conversationId: string
  ): ConversationSettings => {
    const stored = conversationSettings[conversationId];
    const defaultSettings = getDefaultConversationSettings();

    // Property-level merging: use stored values where available, fallback to defaults for missing properties
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- stored may be undefined from localStorage
    const settings = stored
      ? { ...defaultSettings, ...stored }
      : defaultSettings;

    // Always use global reasoning settings
    return {
      ...settings,
      enableReasoning: globalSettings.enableReasoning,
      reasoningExpanded: globalSettings.reasoningExpanded,
    };
  };

  const createConversationSettings = (
    conversationId: string
  ): ConversationSettings => {
    const defaultSettings = getDefaultConversationSettings();
    updateConversationSettings(conversationId, defaultSettings);
    return defaultSettings;
  };

  const refreshConversations = () => {
    // Data is already in sync, just trigger re-render if needed
  };

  const getConversation = (id: string): LocalConversation | null => {
    return conversations.find((conv) => conv.id === id) ?? null;
  };

  const saveConversation = (conversation: LocalConversation) => {
    setConversations((prev) => {
      const index = prev.findIndex((conv) => conv.id === conversation.id);
      let updated: LocalConversation[];

      if (index >= 0) {
        updated = [...prev];
        updated[index] = { ...conversation, updated_at: new Date() };
      } else {
        updated = [...prev, conversation];
      }

      return updated;
    });
  };

  const createConversation = (
    data: Partial<LocalConversation>
  ): LocalConversation => {
    const newConversation: LocalConversation = {
      ai_mode: data.ai_mode ?? 'dual',
      chat_mate_prompt: data.chat_mate_prompt,
      created_at: new Date(),
      editor_mate_prompt: data.editor_mate_prompt,
      id: `conv_${Date.now().toString()}_${Math.random().toString(36).substring(2)}`,
      language: data.language ?? globalSettings.targetLanguage,
      messages: [],
      title: data.title ?? 'New Chat',
      updated_at: new Date(),
    };

    saveConversation(newConversation);
    return newConversation;
  };

  const updateConversation = (
    id: string,
    updates: Partial<LocalConversation>
  ) => {
    setConversations((prev) => {
      const index = prev.findIndex((conv) => conv.id === id);
      if (index >= 0) {
        const updated = [...prev];
        updated[index] = {
          ...updated[index],
          ...updates,
          updated_at: new Date(),
        };
        return updated;
      }
      return prev;
    });
  };

  const deleteConversation = (id: string) => {
    setConversations((prev) => prev.filter((conv) => conv.id !== id));
    setConversationSettings((prev) => {
      // eslint-disable-next-line @typescript-eslint/no-unused-vars -- destructuring pattern requires unused variable to extract from object
      const { [id]: _removed, ...rest } = prev;
      return rest;
    });
  };

  const updateConversationTitle = (id: string, title: string) => {
    updateConversation(id, { title });
  };

  const addMessage = (
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ): LocalMessage => {
    const newMessage: LocalMessage = {
      id: `msg_${Date.now().toString()}_${Math.random().toString(36).substring(2)}`,
      timestamp: new Date(),
      ...message,
    };

    setConversations((prev) => {
      const updated = prev.map((conv) => {
        if (conv.id === conversationId) {
          return {
            ...conv,
            messages: [...conv.messages, newMessage],
            updated_at: new Date(),
          };
        }
        return conv;
      });
      return updated;
    });

    return newMessage;
  };

  const getMessages = (conversationId: string): LocalMessage[] => {
    const conversation = getConversation(conversationId);
    return conversation?.messages ?? [];
  };

  const updateMessage = (messageId: string, updates: Partial<LocalMessage>) => {
    setConversations((prev) => {
      return prev.map((conv) => {
        const messageIndex = conv.messages.findIndex(
          (msg) => msg.id === messageId
        );
        if (messageIndex >= 0) {
          const updatedMessages = [...conv.messages];
          updatedMessages[messageIndex] = {
            ...updatedMessages[messageIndex],
            ...updates,
          };
          return {
            ...conv,
            messages: updatedMessages,
            updated_at: new Date(),
          };
        }
        return conv;
      });
    });
  };

  const deleteMessage = (messageId: string) => {
    setConversations((prev) => {
      return prev.map((conv) => {
        const messageIndex = conv.messages.findIndex(
          (msg) => msg.id === messageId
        );
        if (messageIndex >= 0) {
          const updatedMessages = [...conv.messages];
          updatedMessages.splice(messageIndex, 1);
          return {
            ...conv,
            messages: updatedMessages,
            updated_at: new Date(),
          };
        }
        return conv;
      });
    });
  };

  const deleteAllChats = () => {
    setConversations([]);
    setConversationSettings({});
  };

  const exportData = (): string => {
    return JSON.stringify(
      {
        conversations,
        conversationSettings,
        globalSettings,
      },
      null,
      2
    );
  };

  const importData = (jsonData: string): boolean => {
    try {
      const data = JSON.parse(jsonData) as unknown;
      const validatedData = localAppDataSchema.parse(data);

      setConversations(validatedData.conversations);
      setGlobalSettings(validatedData.globalSettings);
      setConversationSettings(validatedData.conversationSettings);

      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  };

  // Auto-save when data changes
  useEffect(() => {
    if (isLoaded) {
      saveData();
    }
  }, [isLoaded, saveData]);

  const value = {
    addMessage,
    conversations,
    conversationSettings,
    createConversation,
    createConversationSettings,
    deleteAllChats,
    deleteConversation,
    deleteMessage,
    exportData,
    getConversation,
    getConversationSettings,
    getMessages,
    globalSettings,
    importData,
    isLoaded,
    refreshConversations,
    saveConversation,
    updateConversation,
    updateConversationSettings,
    updateConversationTitle,
    updateGlobalSettings,
    updateMessage,
  };

  return (
    <UnifiedStorageContext.Provider value={value}>
      {children}
    </UnifiedStorageContext.Provider>
  );
};

export const useUnifiedStorage = () => {
  const context = useContext(UnifiedStorageContext);
  if (context === undefined) {
    throw new Error(
      'useUnifiedStorage must be used within a UnifiedStorageProvider'
    );
  }
  return context;
};

// Legacy aliases for backward compatibility
export const useSettings = useUnifiedStorage;
export const useLocalStorage = useUnifiedStorage;
