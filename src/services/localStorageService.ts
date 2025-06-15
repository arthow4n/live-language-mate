
export interface LocalMessage {
  id: string;
  conversation_id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  thinking?: string; // Add thinking property
  timestamp: Date;
}

export interface LocalConversation {
  id: string;
  title: string;
  language: string;
  created_at: Date;
  updated_at: Date;
  chat_mate_prompt?: string;
  editor_mate_prompt?: string;
}

export interface LocalSettings {
  model: string;
  apiKey: string;
  targetLanguage: string;
}

class LocalStorageService {
  private CONVERSATIONS_KEY = 'expat-language-mate-conversations';
  private MESSAGES_KEY = 'expat-language-mate-messages';
  private SETTINGS_KEY = 'expat-language-mate-settings';

  // Conversation methods
  getConversations(): LocalConversation[] {
    try {
      const data = localStorage.getItem(this.CONVERSATIONS_KEY);
      if (!data) return [];
      
      const conversations = JSON.parse(data);
      return conversations.map((conv: any) => ({
        ...conv,
        created_at: new Date(conv.created_at),
        updated_at: new Date(conv.updated_at)
      }));
    } catch (error) {
      console.error('Error loading conversations:', error);
      return [];
    }
  }

  getConversation(id: string): LocalConversation | null {
    const conversations = this.getConversations();
    return conversations.find(conv => conv.id === id) || null;
  }

  saveConversation(conversation: LocalConversation): void {
    try {
      const conversations = this.getConversations();
      const existingIndex = conversations.findIndex(conv => conv.id === conversation.id);
      
      if (existingIndex >= 0) {
        conversations[existingIndex] = conversation;
      } else {
        conversations.push(conversation);
      }
      
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(conversations));
    } catch (error) {
      console.error('Error saving conversation:', error);
      throw error;
    }
  }

  deleteConversation(id: string): void {
    try {
      const conversations = this.getConversations();
      const filtered = conversations.filter(conv => conv.id !== id);
      localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(filtered));
      
      // Also delete all messages for this conversation
      const messages = this.getMessages();
      const filteredMessages = messages.filter(msg => msg.conversation_id !== id);
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filteredMessages));
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
  }

  // Message methods
  getMessages(): LocalMessage[] {
    try {
      const data = localStorage.getItem(this.MESSAGES_KEY);
      if (!data) return [];
      
      const messages = JSON.parse(data);
      return messages.map((msg: any) => ({
        ...msg,
        timestamp: new Date(msg.timestamp)
      }));
    } catch (error) {
      console.error('Error loading messages:', error);
      return [];
    }
  }

  getConversationMessages(conversationId: string): LocalMessage[] {
    const messages = this.getMessages();
    return messages
      .filter(msg => msg.conversation_id === conversationId)
      .sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  saveMessage(message: LocalMessage): void {
    try {
      const messages = this.getMessages();
      const existingIndex = messages.findIndex(msg => msg.id === message.id);
      
      if (existingIndex >= 0) {
        messages[existingIndex] = message;
      } else {
        messages.push(message);
      }
      
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
    } catch (error) {
      console.error('Error saving message:', error);
      throw error;
    }
  }

  updateMessage(id: string, updates: Partial<LocalMessage>): void {
    try {
      const messages = this.getMessages();
      const messageIndex = messages.findIndex(msg => msg.id === id);
      
      if (messageIndex >= 0) {
        messages[messageIndex] = { ...messages[messageIndex], ...updates };
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(messages));
      }
    } catch (error) {
      console.error('Error updating message:', error);
      throw error;
    }
  }

  deleteMessage(id: string): void {
    try {
      const messages = this.getMessages();
      const filtered = messages.filter(msg => msg.id !== id);
      localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error deleting message:', error);
      throw error;
    }
  }

  // Settings methods
  getSettings(): LocalSettings {
    try {
      const data = localStorage.getItem(this.SETTINGS_KEY);
      if (!data) {
        return {
          model: 'gpt-4o-mini',
          apiKey: '',
          targetLanguage: 'Swedish'
        };
      }
      return JSON.parse(data);
    } catch (error) {
      console.error('Error loading settings:', error);
      return {
        model: 'gpt-4o-mini',
        apiKey: '',
        targetLanguage: 'Swedish'
      };
    }
  }

  saveSettings(settings: LocalSettings): void {
    try {
      localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(settings));
    } catch (error) {
      console.error('Error saving settings:', error);
      throw error;
    }
  }

  // Utility methods
  clearAllData(): void {
    try {
      localStorage.removeItem(this.CONVERSATIONS_KEY);
      localStorage.removeItem(this.MESSAGES_KEY);
      localStorage.removeItem(this.SETTINGS_KEY);
    } catch (error) {
      console.error('Error clearing data:', error);
      throw error;
    }
  }

  exportData(): string {
    try {
      const conversations = this.getConversations();
      const messages = this.getMessages();
      const settings = this.getSettings();
      
      return JSON.stringify({
        conversations,
        messages,
        settings,
        exportDate: new Date().toISOString()
      }, null, 2);
    } catch (error) {
      console.error('Error exporting data:', error);
      throw error;
    }
  }

  importData(jsonData: string): void {
    try {
      const data = JSON.parse(jsonData);
      
      if (data.conversations) {
        localStorage.setItem(this.CONVERSATIONS_KEY, JSON.stringify(data.conversations));
      }
      
      if (data.messages) {
        localStorage.setItem(this.MESSAGES_KEY, JSON.stringify(data.messages));
      }
      
      if (data.settings) {
        localStorage.setItem(this.SETTINGS_KEY, JSON.stringify(data.settings));
      }
    } catch (error) {
      console.error('Error importing data:', error);
      throw error;
    }
  }
}

export const localStorageService = new LocalStorageService();
