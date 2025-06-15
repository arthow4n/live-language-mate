
import React, { createContext, useContext, useState, useEffect } from 'react';
import { localStorageService, LocalConversation, LocalMessage, LocalSettings } from '@/services/localStorageService';

interface LocalStorageContextType {
  // Settings
  settings: LocalSettings;
  updateSettings: (newSettings: Partial<LocalSettings>) => void;
  
  // Conversations
  conversations: LocalConversation[];
  getConversation: (id: string) => LocalConversation | null;
  createConversation: (data: { title: string; language: string; chat_mate_prompt?: string; editor_mate_prompt?: string }) => LocalConversation;
  updateConversation: (id: string, updates: Partial<LocalConversation>) => void;
  deleteConversation: (id: string) => void;
  
  // Messages
  getMessages: (conversationId: string) => LocalMessage[];
  addMessage: (conversationId: string, data: { content: string; type: 'user' | 'chat-mate' | 'editor-mate'; thinking?: string }) => LocalMessage;
  updateMessage: (id: string, updates: Partial<LocalMessage>) => void;
  deleteMessage: (id: string) => void;
  
  // Utility
  clearAllData: () => void;
  exportData: () => string;
  importData: (jsonData: string) => void;
  refreshConversations: () => void;
}

const LocalStorageContext = createContext<LocalStorageContextType | null>(null);

export const useLocalStorage = () => {
  const context = useContext(LocalStorageContext);
  if (!context) {
    throw new Error('useLocalStorage must be used within a LocalStorageProvider');
  }
  return context;
};

export const LocalStorageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [settings, setSettings] = useState<LocalSettings>(() => localStorageService.getSettings());
  const [conversations, setConversations] = useState<LocalConversation[]>(() => localStorageService.getConversations());

  const updateSettings = (newSettings: Partial<LocalSettings>) => {
    const updatedSettings = { ...settings, ...newSettings };
    setSettings(updatedSettings);
    localStorageService.saveSettings(updatedSettings);
  };

  const refreshConversations = () => {
    setConversations(localStorageService.getConversations());
  };

  const getConversation = (id: string): LocalConversation | null => {
    return localStorageService.getConversation(id);
  };

  const createConversation = (data: { title: string; language: string; chat_mate_prompt?: string; editor_mate_prompt?: string }): LocalConversation => {
    const conversation: LocalConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      title: data.title,
      language: data.language,
      created_at: new Date(),
      updated_at: new Date(),
      chat_mate_prompt: data.chat_mate_prompt,
      editor_mate_prompt: data.editor_mate_prompt,
    };
    
    localStorageService.saveConversation(conversation);
    setConversations(prev => [conversation, ...prev]);
    return conversation;
  };

  const updateConversation = (id: string, updates: Partial<LocalConversation>) => {
    const existingConversation = getConversation(id);
    if (!existingConversation) return;
    
    const updatedConversation = {
      ...existingConversation,
      ...updates,
      updated_at: new Date(),
    };
    
    localStorageService.saveConversation(updatedConversation);
    setConversations(prev => prev.map(conv => conv.id === id ? updatedConversation : conv));
  };

  const deleteConversation = (id: string) => {
    localStorageService.deleteConversation(id);
    setConversations(prev => prev.filter(conv => conv.id !== id));
  };

  const getMessages = (conversationId: string): LocalMessage[] => {
    return localStorageService.getConversationMessages(conversationId);
  };

  const addMessage = (conversationId: string, data: { content: string; type: 'user' | 'chat-mate' | 'editor-mate'; thinking?: string }): LocalMessage => {
    const message: LocalMessage = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      conversation_id: conversationId,
      type: data.type,
      content: data.content,
      thinking: data.thinking,
      timestamp: new Date(),
    };
    
    localStorageService.saveMessage(message);
    
    // Update conversation's updated_at timestamp
    updateConversation(conversationId, { updated_at: new Date() });
    
    return message;
  };

  const updateMessage = (id: string, updates: Partial<LocalMessage>) => {
    localStorageService.updateMessage(id, updates);
  };

  const deleteMessage = (id: string) => {
    localStorageService.deleteMessage(id);
  };

  const clearAllData = () => {
    localStorageService.clearAllData();
    setSettings(localStorageService.getSettings());
    setConversations([]);
  };

  const exportData = (): string => {
    return localStorageService.exportData();
  };

  const importData = (jsonData: string) => {
    localStorageService.importData(jsonData);
    setSettings(localStorageService.getSettings());
    setConversations(localStorageService.getConversations());
  };

  return (
    <LocalStorageContext.Provider value={{
      settings,
      updateSettings,
      conversations,
      getConversation,
      createConversation,
      updateConversation,
      deleteConversation,
      getMessages,
      addMessage,
      updateMessage,
      deleteMessage,
      clearAllData,
      exportData,
      importData,
      refreshConversations,
    }}>
      {children}
    </LocalStorageContext.Provider>
  );
};
