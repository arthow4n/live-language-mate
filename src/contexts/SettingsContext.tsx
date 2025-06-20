import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  globalSettingsSchema,
  chatSettingsSchema,
  storedGlobalSettingsSchema,
  storedChatSettingsSchema,
  type GlobalSettings,
  type ChatSettings,
  type GlobalSettingsUpdate,
  type ChatSettingsUpdate,
} from '@/schemas/settings';
import { LocalStorageKeys } from '@/schemas/storage';

interface SettingsContextType {
  globalSettings: GlobalSettings;
  chatSettings: Record<string, ChatSettings>;
  isLoaded: boolean;
  updateGlobalSettings: (newSettings: GlobalSettingsUpdate) => void;
  updateChatSettings: (
    conversationId: string,
    newSettings: ChatSettingsUpdate
  ) => void;
  getChatSettings: (conversationId: string) => ChatSettings;
  getGlobalSettings: () => GlobalSettings;
  createChatSettings: (conversationId: string) => ChatSettings;
}

const SettingsContext = createContext<SettingsContextType | undefined>(
  undefined
);

export const getDefaultGlobalSettings = (): GlobalSettings => {
  return {
    model: 'google/gemini-2.5-flash',
    apiKey: '',
    targetLanguage: 'Swedish',
    streaming: true,
    theme: 'system',
    enableReasoning: true,
    reasoningExpanded: true,
  };
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(
    getDefaultGlobalSettings()
  );
  const [chatSettings, setChatSettings] = useState<
    Record<string, ChatSettings>
  >({});

  // Load settings once on mount
  useEffect(() => {
    const loadAllSettings = () => {
      try {
        // Load global settings with Zod validation
        const savedGlobalSettings = localStorage.getItem(
          LocalStorageKeys.GLOBAL_SETTINGS
        );
        if (savedGlobalSettings) {
          try {
            const parsed = JSON.parse(savedGlobalSettings);
            const validatedGlobalSettings =
              storedGlobalSettingsSchema.parse(parsed);
            console.log('📱 Loaded global settings from localStorage:', {
              model: validatedGlobalSettings.model,
              apiKey: validatedGlobalSettings.apiKey ? 'Set' : 'Not set',
              targetLanguage: validatedGlobalSettings.targetLanguage,
              theme: validatedGlobalSettings.theme,
            });
            setGlobalSettings((prev) => ({
              ...prev,
              ...validatedGlobalSettings,
            }));
          } catch (validationError) {
            console.error(
              'Invalid global settings in localStorage - clearing:',
              validationError
            );
            localStorage.removeItem(LocalStorageKeys.GLOBAL_SETTINGS);
          }
        }

        // Load chat settings with Zod validation
        const savedChatSettings = localStorage.getItem(
          LocalStorageKeys.CHAT_SETTINGS
        );
        if (savedChatSettings) {
          try {
            const parsed = JSON.parse(savedChatSettings);
            const validatedChatSettings =
              storedChatSettingsSchema.parse(parsed);
            console.log(
              '💬 Loaded chat settings from localStorage:',
              Object.keys(validatedChatSettings).length,
              'conversations'
            );
            setChatSettings(validatedChatSettings);
          } catch (validationError) {
            console.error(
              'Invalid chat settings in localStorage - clearing:',
              validationError
            );
            localStorage.removeItem(LocalStorageKeys.CHAT_SETTINGS);
          }
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadAllSettings();
  }, []);

  const updateGlobalSettings = (newSettings: GlobalSettingsUpdate) => {
    setGlobalSettings((prev) => {
      const updatedSettings = { ...prev, ...newSettings };
      try {
        // Validate before saving - strict validation
        const validatedSettings =
          storedGlobalSettingsSchema.parse(updatedSettings);
        localStorage.setItem(
          LocalStorageKeys.GLOBAL_SETTINGS,
          JSON.stringify(validatedSettings)
        );
        console.log('✨ Updated global settings:', validatedSettings);
        return validatedSettings;
      } catch (error) {
        console.error('Failed to validate global settings:', error);
        return prev; // Keep previous settings if validation fails
      }
    });
  };

  const updateChatSettings = (
    conversationId: string,
    newSettings: ChatSettingsUpdate
  ) => {
    setChatSettings((prev) => {
      const currentChatSettings =
        prev[conversationId] || getDefaultChatSettings();
      const updatedChatSettings = { ...currentChatSettings, ...newSettings };

      try {
        // Validate individual chat settings
        const validatedChatSettings =
          chatSettingsSchema.parse(updatedChatSettings);
        const updatedAllSettings = {
          ...prev,
          [conversationId]: validatedChatSettings,
        };

        // Validate entire chat settings object before saving
        const validatedAllSettings =
          storedChatSettingsSchema.parse(updatedAllSettings);
        localStorage.setItem(
          LocalStorageKeys.CHAT_SETTINGS,
          JSON.stringify(validatedAllSettings)
        );
        console.log(
          `✨ Updated chat settings for conversation ${conversationId}:`,
          validatedChatSettings
        );
        return validatedAllSettings;
      } catch (error) {
        console.error('Failed to validate chat settings:', error);
        return prev; // Keep previous settings if validation fails
      }
    });
  };

  const getDefaultChatSettings = (): ChatSettings => ({
    // Copy global settings as defaults
    model: globalSettings.model,
    apiKey: globalSettings.apiKey,
    targetLanguage: globalSettings.targetLanguage,
    streaming: globalSettings.streaming,
    enableReasoning: globalSettings.enableReasoning,
    reasoningExpanded: globalSettings.reasoningExpanded,

    // AI personalities
    chatMatePersonality:
      'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
    editorMatePersonality:
      'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',

    // Advanced settings
    chatMateBackground: 'young professional, loves local culture',
    editorMateExpertise: '10+ years teaching experience',
    feedbackStyle: 'encouraging',
    culturalContext: true,
    progressiveComplexity: true,
  });

  const getChatSettings = (conversationId: string): ChatSettings => {
    const baseSettings =
      chatSettings[conversationId] || getDefaultChatSettings();
    // For reasoning, always take the value from global settings, as it's a global toggle.
    // This ensures that toggling it in settings applies to all chats immediately.
    return {
      ...baseSettings,
      enableReasoning: globalSettings.enableReasoning,
      reasoningExpanded: globalSettings.reasoningExpanded,
    };
  };

  const createChatSettings = (conversationId: string): ChatSettings => {
    const defaultSettings = getDefaultChatSettings();
    updateChatSettings(conversationId, defaultSettings);
    return defaultSettings;
  };

  const getGlobalSettings = (): GlobalSettings => {
    return globalSettings;
  };

  const value = {
    globalSettings,
    chatSettings,
    isLoaded,
    updateGlobalSettings,
    updateChatSettings,
    getChatSettings,
    getGlobalSettings,
    createChatSettings,
  };

  return (
    <SettingsContext.Provider value={value}>
      {children}
    </SettingsContext.Provider>
  );
};

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (context === undefined) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};
