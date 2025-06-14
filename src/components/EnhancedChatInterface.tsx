import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Settings, PanelRight } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import EnhancedChatMessage from './EnhancedChatMessage';
import ChatSettingsDialog from './ChatSettingsDialog';

interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  parentMessageId?: string;
}

interface EnhancedChatInterfaceProps {
  user: User;
  conversationId: string | null;
  targetLanguage: string;
  onConversationUpdate: () => void;
  onConversationCreated: (id: string) => void;
  onTextSelect: (text: string) => void;
}

const EnhancedChatInterface = ({ 
  user, 
  conversationId, 
  targetLanguage,
  onConversationUpdate,
  onConversationCreated,
  onTextSelect
}: EnhancedChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [chatMatePrompt, setChatMatePrompt] = useState('You are a friendly Swedish native who loves to chat about daily life, culture, and local experiences.');
  const [editorMatePrompt, setEditorMatePrompt] = useState('You are a patient Swedish teacher. Provide helpful corrections and suggestions to improve language skills.');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages and prompts when conversation changes
  useEffect(() => {
    if (conversationId) {
      loadMessages();
      loadConversationPrompts();
    } else {
      setMessages([]);
      // Reset to default prompts for new conversation
      setChatMatePrompt('You are a friendly Swedish native who loves to chat about daily life, culture, and local experiences.');
      setEditorMatePrompt('You are a patient Swedish teacher. Provide helpful corrections and suggestions to improve language skills.');
    }
  }, [conversationId]);

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const formattedMessages = data.map(msg => ({
        id: msg.id,
        type: msg.message_type as 'user' | 'chat-mate' | 'editor-mate',
        content: msg.content,
        timestamp: new Date(msg.created_at),
      }));

      setMessages(formattedMessages);
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const loadConversationPrompts = async () => {
    if (!conversationId) return;

    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('chat_mate_prompt, editor_mate_prompt')
        .eq('id', conversationId)
        .single();

      if (error) throw error;

      if (data?.chat_mate_prompt) setChatMatePrompt(data.chat_mate_prompt);
      if (data?.editor_mate_prompt) setEditorMatePrompt(data.editor_mate_prompt);
    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const saveConversationPrompts = async (chatMate: string, editorMate: string) => {
    if (!conversationId) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({
          chat_mate_prompt: chatMate,
          editor_mate_prompt: editorMate
        })
        .eq('id', conversationId);

      if (error) throw error;
    } catch (error) {
      console.error('Error saving prompts:', error);
    }
  };

  const saveMessage = async (message: Omit<Message, 'id' | 'timestamp'>, actualConversationId: string) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: actualConversationId,
          user_id: user.id,
          content: message.content,
          message_type: message.type,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const deleteMessage = async (messageId: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .delete()
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.filter(msg => msg.id !== messageId));
      
      toast({
        title: "Success",
        description: "Message deleted",
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        title: "Error",
        description: "Failed to delete message",
        variant: "destructive",
      });
    }
  };

  const editMessage = async (messageId: string, newContent: string) => {
    try {
      const { error } = await supabase
        .from('messages')
        .update({ content: newContent })
        .eq('id', messageId);

      if (error) throw error;

      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: newContent } : msg
      ));

      toast({
        title: "Success",
        description: "Message updated",
      });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        title: "Error",
        description: "Failed to edit message",
        variant: "destructive",
      });
    }
  };

  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex(msg => msg.id === messageId);
    if (messageIndex === -1) return;

    const message = messages[messageIndex];
    if (message.type === 'user') return;

    setIsLoading(true);

    try {
      // Get the previous user message for context
      let userMessage = '';
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          userMessage = messages[i].content;
          break;
        }
      }

      // Prepare conversation history up to this point
      const historyMessages = messages.slice(0, messageIndex);
      const conversationHistory = historyMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.type === 'user' ? msg.content : `[${msg.type}]: ${msg.content}`
      }));

      // Determine message type for regeneration
      let messageType = '';
      if (message.type === 'chat-mate') {
        messageType = 'chat-mate-response';
      } else if (message.type === 'editor-mate') {
        // Check if this is a comment on user message or chat mate message
        const isUserComment = message.parentMessageId && 
          messages.find(m => m.id === message.parentMessageId)?.type === 'user';
        messageType = isUserComment ? 'editor-mate-user-comment' : 'editor-mate-chatmate-comment';
      }

      const response = await callAI(userMessage, messageType, conversationHistory);

      // Update the message in the database
      const { error } = await supabase
        .from('messages')
        .update({ content: response })
        .eq('id', messageId);

      if (error) throw error;

      // Update the message in the local state
      setMessages(prev => prev.map(msg => 
        msg.id === messageId ? { ...msg, content: response } : msg
      ));

      toast({
        title: "Success",
        description: "Message regenerated",
      });
    } catch (error) {
      console.error('Error regenerating message:', error);
      toast({
        title: "Error",
        description: "Failed to regenerate message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const forkFromMessage = async (messageId: string) => {
    try {
      // Find the message index
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      // Create a new conversation
      const { data: newConversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `Forked Chat - ${targetLanguage}`,
          language: targetLanguage.toLowerCase(),
          chat_mate_prompt: chatMatePrompt,
          editor_mate_prompt: editorMatePrompt
        })
        .select()
        .single();

      if (convError) throw convError;

      // Copy messages up to and including the selected message
      const messagesToCopy = messages.slice(0, messageIndex + 1);
      
      for (const msg of messagesToCopy) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: newConversation.id,
            user_id: user.id,
            content: msg.content,
            message_type: msg.type,
          });
      }

      toast({
        title: "Success",
        description: "Chat forked successfully",
      });

      onConversationUpdate();
    } catch (error) {
      console.error('Error forking conversation:', error);
      toast({
        title: "Error",
        description: "Failed to fork conversation",
        variant: "destructive",
      });
    }
  };

  const callAI = async (message: string, messageType: string, history: any[]) => {
    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message,
        messageType,
        conversationHistory: history,
        chatMatePrompt,
        editorMatePrompt,
        targetLanguage
      }
    });

    if (aiError) {
      console.error('AI function error:', aiError);
      throw new Error(aiError.message || 'Failed to get AI response');
    }

    if (!aiData || !aiData.response) {
      throw new Error('No response from AI');
    }

    return aiData.response;
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `${targetLanguage} Practice`,
          language: targetLanguage.toLowerCase(),
          chat_mate_prompt: chatMatePrompt,
          editor_mate_prompt: editorMatePrompt
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    let currentConversationId = conversationId;

    // Create conversation only when first message is sent
    if (!currentConversationId) {
      try {
        currentConversationId = await createNewConversation();
        onConversationCreated(currentConversationId);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        return;
      }
    }

    const userMessage: Message = {
      id: `temp-${Date.now()}`,
      type: 'user',
      content: inputMessage.trim(),
      timestamp: new Date(),
    };

    setMessages(prev => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      // Save user message and get the actual ID
      const savedUserMessage = await saveMessage(userMessage, currentConversationId);
      if (savedUserMessage) {
        // Update the message with the real ID from database
        setMessages(prev => prev.map(msg => 
          msg.id === userMessage.id ? { ...msg, id: savedUserMessage.id } : msg
        ));
      }

      // Prepare conversation history for AI context
      const chatMateHistory = messages
        .filter(msg => msg.type === 'user' || msg.type === 'chat-mate')
        .map(msg => ({
          role: msg.type === 'user' ? 'user' : 'assistant',
          content: msg.content
        }));

      const fullHistory = messages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: `[${msg.type}]: ${msg.content}`
      }));

      // Get Editor Mate comment on user message first
      const editorUserComment = await callAI(currentInput, 'editor-mate-user-comment', fullHistory);
      
      const editorUserMessage: Message = {
        id: `temp-${Date.now() + 1}`,
        type: 'editor-mate',
        content: editorUserComment,
        timestamp: new Date(),
        parentMessageId: savedUserMessage?.id || userMessage.id,
      };

      setMessages(prev => [...prev, editorUserMessage]);
      const savedEditorUserMessage = await saveMessage(editorUserMessage, currentConversationId);
      if (savedEditorUserMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === editorUserMessage.id ? { ...msg, id: savedEditorUserMessage.id } : msg
        ));
      }

      // Get Chat Mate response
      const chatMateResponse = await callAI(currentInput, 'chat-mate-response', chatMateHistory);
      
      const chatMateMessage: Message = {
        id: `temp-${Date.now() + 2}`,
        type: 'chat-mate',
        content: chatMateResponse,
        timestamp: new Date(),
      };

      setMessages(prev => [...prev, chatMateMessage]);
      const savedChatMateMessage = await saveMessage(chatMateMessage, currentConversationId);
      if (savedChatMateMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === chatMateMessage.id ? { ...msg, id: savedChatMateMessage.id } : msg
        ));
      }

      // Get Editor Mate comment on Chat Mate response
      const editorChatMateComment = await callAI(chatMateResponse, 'editor-mate-chatmate-comment', fullHistory);
      
      const editorChatMateMessage: Message = {
        id: `temp-${Date.now() + 3}`,
        type: 'editor-mate',
        content: editorChatMateComment,
        timestamp: new Date(),
        parentMessageId: savedChatMateMessage?.id || chatMateMessage.id,
      };

      setMessages(prev => [...prev, editorChatMateMessage]);
      const savedEditorChatMateMessage = await saveMessage(editorChatMateMessage, currentConversationId);
      if (savedEditorChatMateMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === editorChatMateMessage.id ? { ...msg, id: savedEditorChatMateMessage.id } : msg
        ));
      }

      onConversationUpdate();

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
    onTextSelect(text);
  };

  const handlePromptsUpdate = (chatMate: string, editorMate: string) => {
    setChatMatePrompt(chatMate);
    setEditorMatePrompt(editorMate);
    saveConversationPrompts(chatMate, editorMate);
  };

  return (
    <div className="flex flex-col h-full">
      {/* Chat Header */}
      <div className="p-4 border-b bg-card flex-shrink-0">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold">Learning {targetLanguage}</h2>
            <p className="text-sm text-muted-foreground">
              Chat with your language partner and get real-time feedback
            </p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={() => setShowSettings(true)}>
              <Settings className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </div>

      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-2">Start a conversation in {targetLanguage}!</p>
            <p className="text-sm">
              Your Chat Mate will respond naturally, and Editor Mate will provide helpful feedback.
            </p>
          </div>
        )}
        
        {messages.map((message) => (
          <EnhancedChatMessage
            key={message.id}
            message={message}
            onTextSelect={handleTextSelect}
            onRegenerateMessage={regenerateMessage}
            onEditMessage={editMessage}
            onDeleteMessage={deleteMessage}
            onForkFrom={forkFromMessage}
          />
        ))}
        
        {isLoading && (
          <div className="flex items-center space-x-2 text-muted-foreground mb-4">
            <Loader2 className="w-4 h-4 animate-spin" />
            <span>Getting responses...</span>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 border-t bg-card flex-shrink-0">
        <div className="flex space-x-2">
          <Textarea
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Write in ${targetLanguage} or your native language...`}
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

      {/* Chat Settings Dialog */}
      <ChatSettingsDialog
        open={showSettings}
        onOpenChange={setShowSettings}
        chatMatePrompt={chatMatePrompt}
        editorMatePrompt={editorMatePrompt}
        onPromptsUpdate={handlePromptsUpdate}
        targetLanguage={targetLanguage}
      />
    </div>
  );
};

export default EnhancedChatInterface;
