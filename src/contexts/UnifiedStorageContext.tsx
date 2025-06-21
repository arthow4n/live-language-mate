import {
  createContext,
  useContext,
  useState,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import {
  globalSettingsSchema,
  conversationSettingsSchema,
  type GlobalSettings,
  type ConversationSettings,
  type GlobalSettingsUpdate,
  type ConversationSettingsUpdate,
} from '@/schemas/settings';
import { localAppDataSchema, LocalStorageKeys } from '@/schemas/storage';
import { type LocalConversation, type LocalMessage } from '@/schemas/messages';

// Re-export types for components
export type {
  GlobalSettings,
  ConversationSettings,
  GlobalSettingsUpdate,
  ConversationSettingsUpdate,
  LocalConversation,
  LocalMessage,
};

interface UnifiedStorageContextType {
  // Data state
  conversations: LocalConversation[];
  globalSettings: GlobalSettings;
  conversationSettings: Record<string, ConversationSettings>;
  isLoaded: boolean;

  // Settings methods
  updateGlobalSettings: (newSettings: GlobalSettingsUpdate) => void;
  updateConversationSettings: (
    conversationId: string,
    newSettings: ConversationSettingsUpdate
  ) => void;
  getConversationSettings: (conversationId: string) => ConversationSettings;
  createConversationSettings: (conversationId: string) => ConversationSettings;

  // Conversation methods
  refreshConversations: () => void;
  getConversation: (id: string) => LocalConversation | null;
  saveConversation: (conversation: LocalConversation) => void;
  createConversation: (data: Partial<LocalConversation>) => LocalConversation;
  updateConversation: (id: string, updates: Partial<LocalConversation>) => void;
  deleteConversation: (id: string) => void;
  updateConversationTitle: (id: string, title: string) => void;

  // Message methods
  addMessage: (
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ) => LocalMessage;
  getMessages: (conversationId: string) => LocalMessage[];
  updateMessage: (messageId: string, updates: Partial<LocalMessage>) => void;
  deleteMessage: (messageId: string) => void;

  // Data management
  deleteAllChats: () => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
}

const UnifiedStorageContext = createContext<
  UnifiedStorageContextType | undefined
>(undefined);

export const getDefaultGlobalSettings = (): GlobalSettings => {
  return {
    model: 'google/gemini-2.5-flash',
    apiKey: '',
    targetLanguage: 'Swedish',
    streaming: true,
    theme: 'system',
    enableReasoning: true,
    reasoningExpanded: true,
    chatMatePersonality:
      'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
    editorMatePersonality:
      'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
    chatMateBackground: 'young professional, loves local culture',
    editorMateExpertise: '10+ years teaching experience',
    feedbackStyle: 'encouraging',
    culturalContext: true,
    progressiveComplexity: true,
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
          interface ParsedStorageData {
            conversations?: {
              id: string;
              title: string;
              language: string;
              ai_mode: string;
              chat_mate_prompt?: string;
              editor_mate_prompt?: string;
              created_at: string;
              updated_at: string;
              messages?: {
                id: string;
                type: string;
                content: string;
                timestamp: string;
                isStreaming?: boolean;
                parentMessageId?: string;
                reasoning?: string;
                metadata?: object;
              }[];
            }[];
            globalSettings?: object;
            conversationSettings?: Record<string, object>;
          }

          const parsedData = parsed as ParsedStorageData;
          const dataWithDates = {
            conversations:
              parsedData.conversations?.map((conv) => ({
                ...conv,
                created_at: new Date(conv.created_at),
                updated_at: new Date(conv.updated_at),
                messages:
                  conv.messages?.map((msg) => ({
                    ...msg,
                    timestamp: new Date(msg.timestamp),
                  })) ?? [],
              })) ?? [],
            globalSettings:
              parsedData.globalSettings ?? getDefaultGlobalSettings(),
            conversationSettings: parsedData.conversationSettings ?? {},
          };

          // Validate with Zod schema
          const validatedData = localAppDataSchema.parse(dataWithDates);

          setConversations(validatedData.conversations);
          setGlobalSettings(validatedData.globalSettings);
          setConversationSettings(validatedData.conversationSettings);

          console.log('✅ Loaded unified data from localStorage:', {
            conversations: validatedData.conversations.length,
            globalSettings: {
              model: validatedData.globalSettings.model,
              targetLanguage: validatedData.globalSettings.targetLanguage,
            },
            conversationSettings: Object.keys(
              validatedData.conversationSettings
            ).length,
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
        globalSettings,
        conversationSettings,
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
    // Inherit from global settings
    model: globalSettings.model,
    apiKey: globalSettings.apiKey,
    targetLanguage: globalSettings.targetLanguage,
    streaming: globalSettings.streaming,
    enableReasoning: globalSettings.enableReasoning,
    reasoningExpanded: globalSettings.reasoningExpanded,
    theme: globalSettings.theme,
    chatMatePersonality: globalSettings.chatMatePersonality,
    editorMatePersonality: globalSettings.editorMatePersonality,
    chatMateBackground: globalSettings.chatMateBackground,
    editorMateExpertise: globalSettings.editorMateExpertise,
    feedbackStyle: globalSettings.feedbackStyle,
    culturalContext: globalSettings.culturalContext,
    progressiveComplexity: globalSettings.progressiveComplexity,
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
    // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
    const settings = stored ?? defaultSettings;

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
      id: `conv_${Date.now().toString()}_${Math.random().toString(36).substring(2)}`,
      title: data.title ?? 'New Chat',
      language: data.language ?? globalSettings.targetLanguage,
      ai_mode: data.ai_mode ?? 'dual',
      chat_mate_prompt: data.chat_mate_prompt,
      editor_mate_prompt: data.editor_mate_prompt,
      created_at: new Date(),
      updated_at: new Date(),
      messages: [],
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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
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
        globalSettings,
        conversationSettings,
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
    conversations,
    globalSettings,
    conversationSettings,
    isLoaded,
    updateGlobalSettings,
    updateConversationSettings,
    getConversationSettings,
    createConversationSettings,
    refreshConversations,
    getConversation,
    saveConversation,
    createConversation,
    updateConversation,
    deleteConversation,
    updateConversationTitle,
    addMessage,
    getMessages,
    updateMessage,
    deleteMessage,
    deleteAllChats,
    exportData,
    importData,
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
