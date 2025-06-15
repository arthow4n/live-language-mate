
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { localStorageService, LocalConversation, LocalMessage, LocalAppData } from '@/services/localStorageService';

interface LocalStorageContextType {
  conversations: LocalConversation[];
  settings: LocalAppData['settings'];
  isLoaded: boolean;
  refreshConversations: () => void;
  getConversation: (id: string) => LocalConversation | null;
  saveConversation: (conversation: LocalConversation) => void;
  deleteConversation: (id: string) => void;
  addMessage: (conversationId: string, message: LocalMessage) => void;
  updateConversationTitle: (id: string, title: string) => void;
  updateSettings: (newSettings: Partial<LocalAppData['settings']>) => void;
  deleteAllChats: () => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
}

const LocalStorageContext = createContext<LocalStorageContextType | undefined>(undefined);

export const LocalStorageProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [settings, setSettings] = useState<LocalAppData['settings']>(localStorageService.getSettings());
  const [isLoaded, setIsLoaded] = useState(false);

  const refreshConversations = () => {
    const data = localStorageService.getData();
    setConversations(data.conversations);
    setSettings(data.settings);
  };

  useEffect(() => {
    refreshConversations();
    setIsLoaded(true);
  }, []);

  const getConversation = (id: string): LocalConversation | null => {
    return localStorageService.getConversation(id);
  };

  const saveConversation = (conversation: LocalConversation) => {
    localStorageService.saveConversation(conversation);
    refreshConversations();
  };

  const deleteConversation = (id: string) => {
    localStorageService.deleteConversation(id);
    refreshConversations();
  };

  const addMessage = (conversationId: string, message: LocalMessage) => {
    localStorageService.addMessage(conversationId, message);
    refreshConversations();
  };

  const updateConversationTitle = (id: string, title: string) => {
    localStorageService.updateConversationTitle(id, title);
    refreshConversations();
  };

  const updateSettings = (newSettings: Partial<LocalAppData['settings']>) => {
    localStorageService.updateSettings(newSettings);
    refreshConversations();
  };

  const deleteAllChats = () => {
    const data = localStorageService.getData();
    data.conversations = [];
    localStorageService.saveData(data);
    refreshConversations();
  };

  const exportData = (): string => {
    return localStorageService.exportData();
  };

  const importData = (jsonData: string): boolean => {
    const success = localStorageService.importData(jsonData);
    if (success) {
      refreshConversations();
    }
    return success;
  };

  const value = {
    conversations,
    settings,
    isLoaded,
    refreshConversations,
    getConversation,
    saveConversation,
    deleteConversation,
    addMessage,
    updateConversationTitle,
    updateSettings,
    deleteAllChats,
    exportData,
    importData,
  };

  return (
    <LocalStorageContext.Provider value={value}>
      {children}
    </LocalStorageContext.Provider>
  );
};

export const useLocalStorage = () => {
  const context = useContext(LocalStorageContext);
  if (context === undefined) {
    throw new Error('useLocalStorage must be used within a LocalStorageProvider');
  }
  return context;
};
