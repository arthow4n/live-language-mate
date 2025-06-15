
export interface LocalMessage {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

export interface LocalConversation {
  id: string;
  title: string;
  language: string;
  ai_mode: string;
  chat_mate_prompt?: string;
  editor_mate_prompt?: string;
  created_at: Date;
  updated_at: Date;
  messages: LocalMessage[];
}

export interface LocalAppData {
  conversations: LocalConversation[];
  settings: {
    model: string;
    apiKey: string;
    targetLanguage: string;
    streaming: boolean;
    chatMatePersonality: string;
    editorMatePersonality: string;
    chatMateBackground: string;
    editorMateExpertise: string;
    feedbackStyle: 'encouraging' | 'gentle' | 'direct' | 'detailed';
    culturalContext: boolean;
    progressiveComplexity: boolean;
  };
}

class LocalStorageService {
  private readonly STORAGE_KEY = 'language-mate-data';

  private getDefaultData(): LocalAppData {
    return {
      conversations: [],
      settings: {
        model: 'anthropic/claude-3-5-sonnet',
        apiKey: '',
        targetLanguage: 'swedish',
        streaming: true,
        chatMatePersonality: 'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
        editorMatePersonality: 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
        chatMateBackground: 'young professional, loves local culture',
        editorMateExpertise: '10+ years teaching experience',
        feedbackStyle: 'encouraging',
        culturalContext: true,
        progressiveComplexity: true,
      }
    };
  }

  getData(): LocalAppData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored);
        // Convert date strings back to Date objects
        parsed.conversations = parsed.conversations.map((conv: any) => ({
          ...conv,
          created_at: new Date(conv.created_at),
          updated_at: new Date(conv.updated_at),
          messages: conv.messages.map((msg: any) => ({
            ...msg,
            timestamp: new Date(msg.timestamp)
          }))
        }));
        return { ...this.getDefaultData(), ...parsed };
      }
    } catch (error) {
      console.error('Error loading data from localStorage:', error);
    }
    return this.getDefaultData();
  }

  saveData(data: LocalAppData): void {
    try {
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(data));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
    }
  }

  getConversations(): LocalConversation[] {
    return this.getData().conversations;
  }

  getConversation(id: string): LocalConversation | null {
    const conversations = this.getConversations();
    return conversations.find(conv => conv.id === id) || null;
  }

  saveConversation(conversation: LocalConversation): void {
    const data = this.getData();
    const index = data.conversations.findIndex(conv => conv.id === conversation.id);
    
    if (index >= 0) {
      data.conversations[index] = { ...conversation, updated_at: new Date() };
    } else {
      data.conversations.push(conversation);
    }
    
    this.saveData(data);
  }

  deleteConversation(id: string): void {
    const data = this.getData();
    data.conversations = data.conversations.filter(conv => conv.id !== id);
    this.saveData(data);
  }

  addMessage(conversationId: string, message: LocalMessage): void {
    const data = this.getData();
    const conversation = data.conversations.find(conv => conv.id === conversationId);
    
    if (conversation) {
      conversation.messages.push(message);
      conversation.updated_at = new Date();
      this.saveData(data);
    }
  }

  updateConversationTitle(id: string, title: string): void {
    const data = this.getData();
    const conversation = data.conversations.find(conv => conv.id === id);
    
    if (conversation) {
      conversation.title = title;
      conversation.updated_at = new Date();
      this.saveData(data);
    }
  }

  getSettings() {
    return this.getData().settings;
  }

  updateSettings(newSettings: Partial<LocalAppData['settings']>): void {
    const data = this.getData();
    data.settings = { ...data.settings, ...newSettings };
    this.saveData(data);
  }

  deleteAllData(): void {
    localStorage.removeItem(this.STORAGE_KEY);
  }

  exportData(): string {
    return JSON.stringify(this.getData(), null, 2);
  }

  importData(jsonData: string): boolean {
    try {
      const data = JSON.parse(jsonData);
      // Validate the structure
      if (!data.conversations || !data.settings) {
        throw new Error('Invalid data structure');
      }
      this.saveData(data);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();
