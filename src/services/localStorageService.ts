import { getDefaultGlobalSettings } from '@/contexts/SettingsContext';
import {
  localAppDataSchema,
  LocalStorageKeys,
  type LocalAppData,
} from '@/schemas/storage';
import { type LocalConversation, type LocalMessage } from '@/schemas/messages';

// Re-export types for backward compatibility
export type { LocalMessage, LocalConversation, LocalAppData };

class LocalStorageService {
  private readonly STORAGE_KEY = LocalStorageKeys.APP_DATA;

  private getDefaultData(): LocalAppData {
    const { model, apiKey, targetLanguage, streaming } =
      getDefaultGlobalSettings();
    return {
      conversations: [],
      settings: {
        model,
        apiKey,
        targetLanguage,
        streaming,
        chatMatePersonality:
          'You are a friendly local who loves to chat about daily life, culture, and local experiences.',
        editorMatePersonality:
          'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.',
        chatMateBackground: 'young professional, loves local culture',
        editorMateExpertise: '10+ years teaching experience',
        feedbackStyle: 'encouraging',
        culturalContext: true,
        progressiveComplexity: true,
        enableReasoning: true,
        reasoningExpanded: false,
      },
    };
  }

  getData(): LocalAppData {
    try {
      const stored = localStorage.getItem(this.STORAGE_KEY);
      if (stored) {
        const parsed = JSON.parse(stored) as unknown;

        // Convert date strings back to Date objects before validation
        // Type for raw parsed data from localStorage (with string dates)
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
          settings?: object;
        }

        const parsedData = parsed as ParsedStorageData;
        const dataWithDates = {
          ...parsedData,
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
        };

        // Validate with Zod schema - strict validation
        const validatedData = localAppDataSchema.parse(dataWithDates);
        return validatedData;
      }
    } catch (error) {
      console.error(
        'Error loading data from localStorage - clearing invalid data:',
        error
      );
      // Clear invalid data and start fresh
      localStorage.removeItem(this.STORAGE_KEY);
    }
    return this.getDefaultData();
  }

  saveData(data: LocalAppData): void {
    try {
      // Validate data before saving - strict validation
      const validatedData = localAppDataSchema.parse(data);
      localStorage.setItem(this.STORAGE_KEY, JSON.stringify(validatedData));
    } catch (error) {
      console.error('Error saving data to localStorage:', error);
      throw error; // Re-throw to let caller handle validation errors
    }
  }

  getConversations(): LocalConversation[] {
    return this.getData().conversations;
  }

  getConversation(id: string): LocalConversation | null {
    const conversations = this.getConversations();
    return conversations.find((conv) => conv.id === id) ?? null;
  }

  saveConversation(conversation: LocalConversation): void {
    const data = this.getData();
    const index = data.conversations.findIndex(
      (conv) => conv.id === conversation.id
    );

    if (index >= 0) {
      data.conversations[index] = { ...conversation, updated_at: new Date() };
    } else {
      data.conversations.push(conversation);
    }

    this.saveData(data);
  }

  deleteConversation(id: string): void {
    const data = this.getData();
    data.conversations = data.conversations.filter((conv) => conv.id !== id);
    this.saveData(data);
  }

  addMessage(
    conversationId: string,
    message: Omit<LocalMessage, 'id' | 'timestamp'>
  ): LocalMessage {
    const data = this.getData();
    const conversation = data.conversations.find(
      (conv) => conv.id === conversationId
    );

    if (conversation) {
      const newMessage: LocalMessage = {
        id: `msg_${Date.now().toString()}_${Math.random().toString(36).substring(2)}`,
        timestamp: new Date(),
        ...message,
      };
      conversation.messages.push(newMessage);
      conversation.updated_at = new Date();
      this.saveData(data);
      return newMessage;
    }

    throw new Error('Conversation not found');
  }

  updateMessage(messageId: string, updates: Partial<LocalMessage>): void {
    const data = this.getData();

    for (const conversation of data.conversations) {
      const messageIndex = conversation.messages.findIndex(
        (msg) => msg.id === messageId
      );
      if (messageIndex >= 0) {
        conversation.messages[messageIndex] = {
          ...conversation.messages[messageIndex],
          ...updates,
        };
        conversation.updated_at = new Date();
        this.saveData(data);
        return;
      }
    }
  }

  deleteMessage(id: string): void {
    const data = this.getData();

    for (const conversation of data.conversations) {
      const messageIndex = conversation.messages.findIndex(
        (msg) => msg.id === id
      );
      if (messageIndex >= 0) {
        conversation.messages.splice(messageIndex, 1);
        conversation.updated_at = new Date();
        this.saveData(data);
        return;
      }
    }
  }

  getMessages(conversationId: string): LocalMessage[] {
    const conversation = this.getConversation(conversationId);
    return conversation ? conversation.messages : [];
  }

  updateConversationTitle(id: string, title: string): void {
    const data = this.getData();
    const conversation = data.conversations.find((conv) => conv.id === id);

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
      const data = JSON.parse(jsonData) as {
        conversations?: unknown;
        settings?: unknown;
      };
      // Validate the structure
      if (!data.conversations || !data.settings) {
        throw new Error('Invalid data structure');
      }
      this.saveData(data as LocalAppData);
      return true;
    } catch (error) {
      console.error('Error importing data:', error);
      return false;
    }
  }
}

export const localStorageService = new LocalStorageService();
