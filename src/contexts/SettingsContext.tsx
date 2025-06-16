
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface GlobalSettings {
  model: string;
  apiKey: string;
  targetLanguage: string;
  streaming: boolean;
  theme: 'light' | 'dark' | 'system';
  enableReasoning: boolean;
  reasoningExpanded: boolean;
}

interface ChatSettings {
  // AI Personalities
  chatMatePersonality: string;
  editorMatePersonality: string;

  // General settings that can be overridden per chat
  model: string;
  apiKey: string;
  targetLanguage: string;
  streaming: boolean;
  enableReasoning: boolean;
  reasoningExpanded: boolean;

  // Advanced settings
  chatMateBackground: string;
  editorMateExpertise: string;
  feedbackStyle: 'encouraging' | 'gentle' | 'direct' | 'detailed';
  culturalContext: boolean;
  progressiveComplexity: boolean;
}

interface SettingsContextType {
  globalSettings: GlobalSettings;
  chatSettings: Record<string, ChatSettings>;
  isLoaded: boolean;
  updateGlobalSettings: (newSettings: Partial<GlobalSettings>) => void;
  updateChatSettings: (conversationId: string, newSettings: Partial<ChatSettings>) => void;
  getChatSettings: (conversationId: string) => ChatSettings;
  getGlobalSettings: () => GlobalSettings;
  createChatSettings: (conversationId: string) => ChatSettings;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const getDefaultGlobalSettings = (): GlobalSettings => {
  return {
    model: 'google/gemini-2.5-flash-preview-05-20:thinking',
    apiKey: '',
    targetLanguage: 'Swedish',
    streaming: true,
    theme: 'system',
    enableReasoning: true,
    reasoningExpanded: true,
  }
}

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [globalSettings, setGlobalSettings] = useState<GlobalSettings>(getDefaultGlobalSettings());
  const [chatSettings, setChatSettings] = useState<Record<string, ChatSettings>>({});

  // Load settings once on mount
  useEffect(() => {
    const loadAllSettings = () => {
      try {
        // Load global settings
        const savedGlobalSettings = localStorage.getItem('language-mate-global-settings');
        if (savedGlobalSettings) {
          const parsed = JSON.parse(savedGlobalSettings);
          console.log('📱 Loaded global settings from localStorage:', {
            model: parsed.model,
            apiKey: parsed.apiKey ? 'Set' : 'Not set',
            targetLanguage: parsed.targetLanguage,
            theme: parsed.theme
          });
          setGlobalSettings(prev => ({ ...prev, ...parsed }));
        }

        // Load chat settings
        const savedChatSettings = localStorage.getItem('language-mate-chat-settings');
        if (savedChatSettings) {
          const parsed = JSON.parse(savedChatSettings);
          console.log('💬 Loaded chat settings from localStorage:', Object.keys(parsed).length, 'conversations');
          setChatSettings(parsed);
        }
      } catch (error) {
        console.error('Error loading settings:', error);
      } finally {
        setIsLoaded(true);
      }
    };

    loadAllSettings();
  }, []);

  const updateGlobalSettings = (newSettings: Partial<GlobalSettings>) => {
    setGlobalSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      localStorage.setItem('language-mate-global-settings', JSON.stringify(updatedSettings));
      console.log('✨ Updated global settings:', updatedSettings);
      return updatedSettings;
    });
  };

  const updateChatSettings = (conversationId: string, newSettings: Partial<ChatSettings>) => {
    setChatSettings(prev => {
      const updatedSettings = {
        ...prev,
        [conversationId]: { ...prev[conversationId], ...newSettings }
      };
      localStorage.setItem('language-mate-chat-settings', JSON.stringify(updatedSettings));
      console.log(`✨ Updated chat settings for conversation ${conversationId}:`, updatedSettings[conversationId]);
      return updatedSettings;
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
    chatMatePersonality: 'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
    editorMatePersonality: 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',

    // Advanced settings
    chatMateBackground: 'young professional, loves local culture',
    editorMateExpertise: '10+ years teaching experience',
    feedbackStyle: 'encouraging',
    culturalContext: true,
    progressiveComplexity: true,
  });

  const getChatSettings = (conversationId: string): ChatSettings => {
    const baseSettings = chatSettings[conversationId] || getDefaultChatSettings();
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
    createChatSettings
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
