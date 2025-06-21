import {
  createContext,
  useContext,
  useState,
  useEffect,
  ReactNode,
} from 'react';
import {
  localStorageService,
  LocalConversation,
  LocalMessage,
  LocalAppData,
} from '@/services/localStorageService';

interface LocalStorageContextType {
  conversations: LocalConversation[];
  settings: LocalAppData['settings'];
  isLoaded: boolean;
  refreshConversations: () => void;
  getConversation: (id: string) => LocalConversation | null;
  saveConversation: (conversation: LocalConversation) => void;
  createConversation: (data: Partial<LocalConversation>) => LocalConversation;
  updateConversation: (id: string, updates: Partial<LocalConversation>) => void;
  deleteConversation: (id: string) => void;
  addMessage: (
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ) => LocalMessage;
  getMessages: (conversationId: string) => LocalMessage[];
  updateMessage: (messageId: string, updates: Partial<LocalMessage>) => void;
  deleteMessage: (messageId: string) => void;
  updateConversationTitle: (id: string, title: string) => void;
  updateSettings: (newSettings: Partial<LocalAppData['settings']>) => void;
  deleteAllChats: () => void;
  exportData: () => string;
  importData: (jsonData: string) => boolean;
}

const LocalStorageContext = createContext<LocalStorageContextType | undefined>(
  undefined
);

export const LocalStorageProvider = ({ children }: { children: ReactNode }) => {
  const [conversations, setConversations] = useState<LocalConversation[]>([]);
  const [settings, setSettings] = useState<LocalAppData['settings']>(
    localStorageService.getSettings()
  );
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

  const createConversation = (
    data: Partial<LocalConversation>
  ): LocalConversation => {
    const newConversation: LocalConversation = {
      id: `conv_${Date.now()}_${Math.random().toString(36).substring(2)}`,
      title: data.title || 'New Chat',
      language: data.language || 'Swedish',
      ai_mode: data.ai_mode || 'dual',
      chat_mate_prompt: data.chat_mate_prompt,
      editor_mate_prompt: data.editor_mate_prompt,
      created_at: new Date(),
      updated_at: new Date(),
      messages: [],
    };

    localStorageService.saveConversation(newConversation);
    refreshConversations();
    return newConversation;
  };

  const updateConversation = (
    id: string,
    updates: Partial<LocalConversation>
  ) => {
    const conversation = localStorageService.getConversation(id);
    if (conversation) {
      const updated = { ...conversation, ...updates, updated_at: new Date() };
      localStorageService.saveConversation(updated);
      refreshConversations();
    }
  };

  const deleteConversation = (id: string) => {
    localStorageService.deleteConversation(id);
    refreshConversations();
  };

  const addMessage = (
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ): LocalMessage => {
    const savedMessage = localStorageService.addMessage(
      conversationId,
      message
    );
    refreshConversations();
    return savedMessage;
  };

  const getMessages = (conversationId: string): LocalMessage[] => {
    const conversation = localStorageService.getConversation(conversationId);
    return conversation?.messages || [];
  };

  const updateMessage = (messageId: string, updates: Partial<LocalMessage>) => {
    localStorageService.updateMessage(messageId, updates);
    refreshConversations();
  };

  const deleteMessage = (messageId: string) => {
    localStorageService.deleteMessage(messageId);
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
    createConversation,
    updateConversation,
    deleteConversation,
    addMessage,
    getMessages,
    updateMessage,
    deleteMessage,
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
    throw new Error(
      'useLocalStorage must be used within a LocalStorageProvider'
    );
  }
  return context;
};
