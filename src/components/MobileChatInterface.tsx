
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Send, Loader2, MessageSquare, GraduationCap } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import EnhancedChatMessage from './EnhancedChatMessage';
import { Message } from '@/types/Message';

interface MobileChatInterfaceProps {
  conversationId: string | null;
  targetLanguage: string;
  onConversationUpdate: () => void;
  onConversationCreated: (id: string) => void;
  onTextSelect: (text: string) => void;
}

const MobileChatInterface = ({
  conversationId,
  targetLanguage,
  onConversationUpdate,
  onConversationCreated,
  onTextSelect
}: MobileChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    // Mock message handling for now
    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    // Simulate AI response
    setTimeout(() => {
      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: 'chat-mate',
        content: 'This is a sample response from Chat Mate.',
        timestamp: new Date(),
      };
      setMessages(prev => [...prev, aiResponse]);
      setIsLoading(false);
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Fixed Top Bar */}
      <div className="flex-shrink-0 p-4 border-b bg-background">
        <div className="flex items-center space-x-2">
          <MessageSquare className="w-5 h-5 text-chat-mate" />
          <h2 className="text-lg font-semibold">Chat with your Swedish friend</h2>
        </div>
        <p className="text-sm text-muted-foreground mt-1">
          Practice casual Swedish conversation in a friendly environment
        </p>
      </div>

      {/* Scrollable Messages Area */}
      <div className="flex-1 min-h-0 overflow-hidden">
        <ScrollArea className="h-full">
          <div className="p-4 space-y-4">
            {messages.length === 0 && (
              <div className="text-center text-muted-foreground py-8">
                <p>
                  Start a conversation in Swedish! Ask about daily life, culture, or practice any topic.
                </p>
              </div>
            )}
            
            {messages.map((message) => (
              <EnhancedChatMessage
                key={message.id}
                message={message}
                onTextSelect={onTextSelect}
              />
            ))}
            
            {isLoading && (
              <div className="flex items-center space-x-2 text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Chat Mate is thinking...</span>
              </div>
            )}
            
            <div ref={messagesEndRef} />
          </div>
        </ScrollArea>
      </div>

      {/* Fixed Bottom Input Area */}
      <div className="flex-shrink-0 p-4 border-t bg-background">
        <div className="flex space-x-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Skriv på svenska... (Write in Swedish...)"
            className="flex-1 min-h-[60px] max-h-[120px] resize-none"
            disabled={isLoading}
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="self-end"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default MobileChatInterface;
