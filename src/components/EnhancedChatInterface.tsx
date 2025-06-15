import { useState, useEffect, useRef } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Settings, MessageSquare } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import EnhancedChatMessage from './EnhancedChatMessage';

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
  onChatSettingsOpen?: () => void;
  onAskInterfaceOpen?: () => void;
  selectedText?: string;
  editorMatePrompt?: string;
}

const EnhancedChatInterface = ({ 
  user, 
  conversationId, 
  targetLanguage,
  onConversationUpdate,
  onConversationCreated,
  onTextSelect,
  onChatSettingsOpen,
  onAskInterfaceOpen,
  selectedText,
  editorMatePrompt
}: EnhancedChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false);
  const [componentReady, setComponentReady] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { getChatSettings, getMainSettings, isLoaded } = useSettings();
  const isMobile = useIsMobile();

  // Get current conversation settings only after settings are loaded
  const currentChatSettings = conversationId && isLoaded ? getChatSettings(conversationId) : null;
  const mainSettings = isLoaded ? getMainSettings() : null;
  const chatMatePrompt = currentChatSettings?.chatMatePersonality || 'You are a friendly local who loves to chat about daily life, culture, and local experiences.';
  const currentEditorMatePrompt = currentChatSettings?.editorMatePersonality || editorMatePrompt || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.';

  // Mark component as ready when settings are loaded and ensure focus
  useEffect(() => {
    if (isLoaded && mainSettings && !componentReady) {
      console.log('🎯 Component ready, focusing textarea');
      setComponentReady(true);
      
      // Use a small delay to ensure the textarea is fully rendered
      setTimeout(() => {
        if (textareaRef.current && !conversationId) {
          textareaRef.current.focus();
          console.log('🎯 Textarea focused after component ready');
        }
      }, 100);
    }
  }, [isLoaded, mainSettings, componentReady, conversationId]);

  // Only log settings debug info after settings are loaded to reduce noise
  useEffect(() => {
    if (isLoaded && mainSettings) {
      console.log('🔧 EnhancedChatInterface settings debug:', {
        conversationId,
        mainSettings: {
          model: mainSettings.model,
          apiKey: mainSettings.apiKey ? 'Set' : 'Not set',
          targetLanguage: mainSettings.targetLanguage
        },
        chatSettings: currentChatSettings ? {
          chatMatePersonality: currentChatSettings.chatMatePersonality.substring(0, 50) + '...',
          editorMatePersonality: currentChatSettings.editorMatePersonality.substring(0, 50) + '...'
        } : 'No chat settings found'
      });
    }
  }, [conversationId, currentChatSettings, mainSettings, isLoaded]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages and prompts when conversation changes - only after settings are loaded
  useEffect(() => {
    if (!isLoaded) return; // Wait for settings to load
    
    if (conversationId && !isCreatingNewConversation) {
      console.log('🔄 Loading messages for conversation:', conversationId);
      loadMessages();
      loadConversationPrompts();
    } else if (!conversationId) {
      console.log('🆕 New conversation - clearing messages');
      setMessages([]);
      // Reset to default prompts for new conversation
    }
  }, [conversationId, isCreatingNewConversation, isLoaded]);

  const loadMessages = async () => {
    if (!conversationId) return;

    try {
      console.log('📥 Loading messages from database for conversation:', conversationId);
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

      console.log('📥 Loaded messages:', formattedMessages.length);
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

    } catch (error) {
      console.error('Error loading prompts:', error);
    }
  };

  const saveMessage = async (message: Omit<Message, 'id' | 'timestamp'>, actualConversationId: string) => {
    try {
      console.log('💾 Saving message to database:', message.type, message.content.substring(0, 50) + '...');
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
      console.log('✅ Message saved successfully with ID:', data.id);
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
          editor_mate_prompt: currentEditorMatePrompt
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

  const callAI = async (message: string, messageType: string, history: any[], streamingMessageId?: string) => {
    if (!mainSettings) {
      throw new Error('Main settings not loaded');
    }

    console.log('🚀 Calling AI with streaming enabled');

    const response = await fetch(`https://ycjruxeyboafjlnurmdp.supabase.co/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanJ1eGV5Ym9hZmpsbnVybWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mzg2NDQsImV4cCI6MjA2NTUxNDY0NH0.5gwYrvysirE3E4iFHuS8ekAvGUrtxgJPmZDyMtvQaMA`,
      },
      body: JSON.stringify({
        message,
        messageType,
        conversationHistory: history,
        chatMatePrompt,
        editorMatePrompt: currentEditorMatePrompt,
        targetLanguage,
        model: mainSettings.model,
        apiKey: mainSettings.apiKey,
        // Pass new advanced settings
        chatMateBackground: currentChatSettings?.chatMateBackground || 'young professional, loves local culture',
        editorMateExpertise: currentChatSettings?.editorMateExpertise || '10+ years teaching experience',
        feedbackStyle: currentChatSettings?.feedbackStyle || 'encouraging',
        culturalContext: currentChatSettings?.culturalContext ?? true,
        progressiveComplexity: currentChatSettings?.progressiveComplexity ?? true,
        streaming: mainSettings.streaming ?? true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    // Check if the response is streaming
    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      // Handle streaming response
      return await handleStreamingResponse(response, streamingMessageId);
    } else {
      // Handle non-streaming response (fallback)
      const data = await response.json();
      return data.response;
    }
  };

  const handleStreamingResponse = async (response: Response, streamingMessageId?: string): Promise<string> => {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();
        
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');
        
        // Keep the last potentially incomplete line in the buffer
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as { type: string; content?: string };
              
              if (data.type === 'content' && typeof data.content === 'string') {
                fullContent += data.content;
                
                // Update the streaming message with the new content
                if (streamingMessageId) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === streamingMessageId 
                      ? { ...msg, content: fullContent, isStreaming: true }
                      : msg
                  ));
                }
              } else if (data.type === 'done') {
                console.log('✅ Streaming completed');
                
                // Mark streaming as complete
                if (streamingMessageId) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === streamingMessageId 
                      ? { ...msg, content: fullContent, isStreaming: false }
                      : msg
                  ));
                }
                
                return fullContent;
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    return fullContent;
  };

  const createNewConversation = async () => {
    if (!mainSettings) {
      throw new Error('Main settings not loaded');
    }

    try {
      console.log('🆕 Creating new conversation with settings:', {
        targetLanguage,
        chatMatePrompt: chatMatePrompt.substring(0, 50) + '...',
        editorMatePrompt: currentEditorMatePrompt.substring(0, 50) + '...'
      });
      
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `${targetLanguage} Practice`,
          language: targetLanguage.toLowerCase(),
          chat_mate_prompt: chatMatePrompt,
          editor_mate_prompt: currentEditorMatePrompt
        })
        .select()
        .single();

      if (error) throw error;
      console.log('✅ New conversation created with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading || !mainSettings) return;

    console.log('📤 Sending message with streaming enabled');

    let currentConversationId = conversationId;

    // Create conversation only when first message is sent
    if (!currentConversationId) {
      try {
        setIsCreatingNewConversation(true);
        currentConversationId = await createNewConversation();
        onConversationCreated(currentConversationId);
      } catch (error) {
        toast({
          title: "Error",
          description: "Failed to create conversation",
          variant: "destructive",
        });
        setIsCreatingNewConversation(false);
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

      console.log('🔄 Processing AI responses for message:', currentInput);

      // Create placeholder messages for streaming
      const editorUserMessage: Message = {
        id: `temp-${Date.now() + 1}`,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        parentMessageId: savedUserMessage?.id || userMessage.id,
        isStreaming: true,
      };

      const chatMateMessage: Message = {
        id: `temp-${Date.now() + 2}`,
        type: 'chat-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      const editorChatMateMessage: Message = {
        id: `temp-${Date.now() + 3}`,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        parentMessageId: chatMateMessage.id,
        isStreaming: true,
      };

      // Add placeholder messages
      setMessages(prev => [...prev, editorUserMessage, chatMateMessage, editorChatMateMessage]);

      // Start all AI calls with streaming
      const [editorUserComment, chatMateResponse, editorChatMateComment] = await Promise.all([
        callAI(currentInput, 'editor-mate-user-comment', fullHistory, editorUserMessage.id),
        callAI(currentInput, 'chat-mate-response', chatMateHistory, chatMateMessage.id),
        // For editor mate chat comment, we'll call it after chat mate response starts
        new Promise(resolve => {
          setTimeout(async () => {
            const response = await callAI(chatMateMessage.content || currentInput, 'editor-mate-chatmate-comment', fullHistory, editorChatMateMessage.id);
            resolve(response);
          }, 1000); // Small delay to let chat mate response start
        })
      ]);

      // Save all messages to database
      const savedEditorUserMessage = await saveMessage({
        type: 'editor-mate',
        content: editorUserComment,
        parentMessageId: savedUserMessage?.id || userMessage.id,
      }, currentConversationId);

      const savedChatMateMessage = await saveMessage({
        type: 'chat-mate',
        content: chatMateResponse,
      }, currentConversationId);

      const savedEditorChatMateMessage = await saveMessage({
        type: 'editor-mate',
        content: editorChatMateComment,
        parentMessageId: savedChatMateMessage?.id || chatMateMessage.id,
      }, currentConversationId);

      // Update messages with real IDs
      setMessages(prev => prev.map(msg => {
        if (msg.id === editorUserMessage.id && savedEditorUserMessage) {
          return { ...msg, id: savedEditorUserMessage.id, isStreaming: false };
        }
        if (msg.id === chatMateMessage.id && savedChatMateMessage) {
          return { ...msg, id: savedChatMateMessage.id, isStreaming: false };
        }
        if (msg.id === editorChatMateMessage.id && savedEditorChatMateMessage) {
          return { ...msg, id: savedEditorChatMateMessage.id, isStreaming: false };
        }
        return msg;
      }));

      onConversationUpdate();

    } catch (error) {
      console.error('❌ Error sending message:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to send message",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      setIsCreatingNewConversation(false);
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

  // Don't render the interface until settings are loaded and component is ready
  if (!isLoaded || !mainSettings || !componentReady) {
    return (
      <div className="flex flex-col h-full items-center justify-center">
        <div className="text-muted-foreground">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Messages Area - Scrollable */}
      <div className="flex-1 overflow-y-auto p-4 min-h-0">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground py-8">
            <p className="mb-2">Start a conversation in {targetLanguage}!</p>
            <p className="text-sm">
              Chat Mate will respond naturally, and Editor Mate will provide helpful feedback.
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
        <div className="flex items-end space-x-2">
          <Textarea
            ref={textareaRef}
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Type in ${targetLanguage} or your native language...`}
            className="flex-1 min-h-[40px] max-h-[120px]"
            disabled={isLoading}
            rows={1}
          />
          {isMobile && onAskInterfaceOpen && (
            <Button
              variant="outline"
              size="icon"
              onClick={onAskInterfaceOpen}
              className="h-10 w-10 flex-shrink-0"
              title="Open Ask Interface"
            >
              <MessageSquare className="w-4 h-4" />
            </Button>
          )}
          <Button
            onClick={handleSendMessage}
            disabled={!inputMessage.trim() || isLoading}
            size="icon"
            className="h-10 w-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatInterface;
