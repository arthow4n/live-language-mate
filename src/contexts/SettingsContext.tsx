
import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface SettingsData {
  chatMatePersonality: string;
  editorMatePersonality: string;
  targetLanguage: string;
  streamingEnabled: boolean;
  provider: string;
  model: string;
  apiKey: string;
}

interface SettingsContextType {
  mainSettings: SettingsData;
  updateMainSettings: (settings: SettingsData) => void;
  getChatSettings: (conversationId: string) => SettingsData;
  updateChatSettings: (conversationId: string, settings: SettingsData) => void;
}

const defaultSettings: SettingsData = {
  chatMatePersonality: "You are a friendly Swedish local who loves helping newcomers feel welcome. You're enthusiastic about Swedish culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into Swedish society.",
  editorMatePersonality: "You are an experienced Swedish language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.",
  targetLanguage: 'swedish',
  streamingEnabled: true,
  provider: 'openrouter',
  model: 'anthropic/claude-3-5-sonnet',
  apiKey: ''
};

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
};

interface SettingsProviderProps {
  children: ReactNode;
}

export const SettingsProvider = ({ children }: SettingsProviderProps) => {
  const [mainSettings, setMainSettings] = useState<SettingsData>(defaultSettings);
  const [chatSettings, setChatSettings] = useState<Record<string, SettingsData>>({});

  // Load settings from localStorage on mount
  useEffect(() => {
    const savedMainSettings = localStorage.getItem('languageMate_mainSettings');
    if (savedMainSettings) {
      try {
        setMainSettings(JSON.parse(savedMainSettings));
      } catch (error) {
        console.error('Failed to parse main settings from localStorage:', error);
      }
    }

    const savedChatSettings = localStorage.getItem('languageMate_chatSettings');
    if (savedChatSettings) {
      try {
        setChatSettings(JSON.parse(savedChatSettings));
      } catch (error) {
        console.error('Failed to parse chat settings from localStorage:', error);
      }
    }
  }, []);

  const updateMainSettings = (settings: SettingsData) => {
    setMainSettings(settings);
    localStorage.setItem('languageMate_mainSettings', JSON.stringify(settings));
  };

  const getChatSettings = (conversationId: string): SettingsData => {
    return chatSettings[conversationId] || mainSettings;
  };

  const updateChatSettings = (conversationId: string, settings: SettingsData) => {
    const newChatSettings = {
      ...chatSettings,
      [conversationId]: settings
    };
    setChatSettings(newChatSettings);
    localStorage.setItem('languageMate_chatSettings', JSON.stringify(newChatSettings));
  };

  return (
    <SettingsContext.Provider value={{
      mainSettings,
      updateMainSettings,
      getChatSettings,
      updateChatSettings
    }}>
      {children}
    </SettingsContext.Provider>
  );
};
