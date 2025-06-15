
export interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  thinking?: string; // Add thinking tokens content
  timestamp: Date;
  isStreaming?: boolean;
  parentMessageId?: string;
  metadata?: {
    model?: string;
    generationTime?: number;
    startTime?: number;
    endTime?: number;
  };
}
