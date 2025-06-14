
import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2 } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import ChatMessage from './ChatMessage';

interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
}

interface ChatInterfaceProps {
  user: User;
  aiMode: 'chat-mate' | 'editor-mate';
}

const ChatInterface = ({ user, aiMode }: ChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Create or get conversation
  useEffect(() => {
    const createConversation = async () => {
      try {
        const { data, error } = await supabase
          .from('conversations')
          .insert({
            user_id: user.id,
            title: `${aiMode === 'chat-mate' ? 'Chat' : 'Editor'} Session`,
            ai_mode: aiMode,
          })
          .select()
          .single();

        if (error) throw error;
        setConversationId(data.id);
      } catch (error) {
        console.error('Error creating conversation:', error);
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
      }
    };

    createConversation();
    setMessages([]); // Clear messages when switching modes
  }, [user.id, aiMode]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || !conversationId || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Save user message to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: userMessage.content,
        message_type: 'user',
      });

      // Prepare conversation history for AI context
      const conversationHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.content
      }));

      console.log('Sending message to AI:', { message: currentInput, aiMode, conversationHistory });

      // Call AI edge function
      const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat', {
        body: {
          message: currentInput,
          aiMode: aiMode,
          conversationHistory: conversationHistory
        }
      });

      if (aiError) {
        console.error('AI function error:', aiError);
        throw new Error(aiError.message || 'Failed to get AI response');
      }

      if (!aiData || !aiData.response) {
        throw new Error('No response from AI');
      }

      console.log('Received AI response:', aiData.response);

      const aiResponse: Message = {
        id: (Date.now() + 1).toString(),
        type: aiMode,
        content: aiData.response,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, aiResponse]);

      // Save AI response to database
      await supabase.from('messages').insert({
        conversation_id: conversationId,
        user_id: user.id,
        content: aiResponse.content,
        message_type: aiMode,
      });

    } catch (error) {
      console.error('Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleTextSelect = (text: string) => {
    console.log('Selected text:', text);
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="bg-card rounded-lg border min-h-[600px] flex flex-col">
        {/* Chat Header */}
        <div className="p-4 border-b">
          <h2 className="text-lg font-semibold flex items-center space-x-2">
            {aiMode === 'chat-mate' ? (
              <>
                <span className="w-3 h-3 bg-chat-mate rounded-full"></span>
                <span>Chat with your Swedish friend</span>
              </>
            ) : (
              <>
                <span className="w-3 h-3 bg-editor-mate rounded-full"></span>
                <span>Get feedback from your language teacher</span>
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {aiMode === 'chat-mate' 
              ? 'Practice casual Swedish conversation in a friendly environment'
              : 'Submit your Swedish text for corrections and suggestions'
            }
          </p>
        </div>

        {/* Messages Area */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-8">
              <p>
                {aiMode === 'chat-mate' 
                  ? 'Start a conversation in Swedish! Ask about daily life, culture, or practice any topic.'
                  : 'Submit your Swedish text to get helpful feedback and corrections.'
                }
              </p>
            </div>
          )}
          
          {messages.map((message) => (
            <ChatMessage
              key={message.id}
              message={message}
              onTextSelect={handleTextSelect}
            />
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>{aiMode === 'chat-mate' ? 'Chat Mate' : 'Editor Mate'} is thinking...</span>
            </div>
          )}
          
          <div ref={messagesEndRef} />
        </div>

        {/* Input Area */}
        <div className="p-4 border-t">
          <div className="flex space-x-2">
            <Textarea
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={
                aiMode === 'chat-mate'
                  ? 'Skriv på svenska... (Write in Swedish...)'
                  : 'Paste your Swedish text for feedback...'
              }
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
    </div>
  );
};

export default ChatInterface;
