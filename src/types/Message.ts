
export interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  parentMessageId?: string;
  reasoning?: string;
  metadata?: {
    model?: string;
    generationTime?: number; // in milliseconds
    startTime?: number;
    endTime?: number;
  };
}
