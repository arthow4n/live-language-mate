import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface MainSettings {
  model: string;
  apiKey: string;
  targetLanguage: string;
}

interface ChatSettings {
  chatMatePersonality: string;
  editorMatePersonality: string;
  chatMateBackground: string;
  editorMateExpertise: string;
  feedbackStyle: string;
  culturalContext: boolean;
  progressiveComplexity: boolean;
}

interface SettingsContextType {
  mainSettings: MainSettings;
  chatSettings: Record<string, ChatSettings>;
  isLoaded: boolean;
  updateMainSettings: (newSettings: Partial<MainSettings>) => void;
  updateChatSettings: (conversationId: string, newSettings: Partial<ChatSettings>) => void;
  getChatSettings: (conversationId: string) => ChatSettings;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [mainSettings, setMainSettings] = useState<MainSettings>({
    model: 'anthropic/claude-3-5-sonnet',
    apiKey: '',
    targetLanguage: 'swedish'
  });
  const [chatSettings, setChatSettings] = useState<Record<string, ChatSettings>>({});

  // Load settings once on mount
  useEffect(() => {
    const loadAllSettings = () => {
      try {
        // Load main settings
        const savedMainSettings = localStorage.getItem('language-mate-main-settings');
        if (savedMainSettings) {
          const parsed = JSON.parse(savedMainSettings);
          console.log('📱 Loaded main settings from localStorage:', {
            model: parsed.model,
            apiKey: parsed.apiKey ? 'Set' : 'Not set',
            targetLanguage: parsed.targetLanguage
          });
          setMainSettings(parsed);
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

  const updateMainSettings = (newSettings: Partial<MainSettings>) => {
    setMainSettings(prev => {
      const updatedSettings = { ...prev, ...newSettings };
      localStorage.setItem('language-mate-main-settings', JSON.stringify(updatedSettings));
      console.log('✨ Updated main settings:', updatedSettings);
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

  const getChatSettings = (conversationId: string): ChatSettings => {
    return chatSettings[conversationId] || {
      chatMatePersonality: 'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
      editorMatePersonality: 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
      chatMateBackground: 'young professional, loves local culture',
      editorMateExpertise: '10+ years teaching experience',
      feedbackStyle: 'encouraging',
      culturalContext: true,
      progressiveComplexity: true,
    };
  };

  const value = {
    mainSettings,
    chatSettings,
    isLoaded,
    updateMainSettings,
    updateChatSettings,
    getChatSettings
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
