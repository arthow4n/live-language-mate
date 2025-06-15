import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, Settings, MessageSquare } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateChatTitle, updateConversationTitle } from '@/utils/chatTitleGenerator';
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
  const [titleGenerationProcessed, setTitleGenerationProcessed] = useState(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const { 
    settings, 
    getConversation, 
    createConversation, 
    updateConversation, 
    addMessage, 
    getMessages, 
    deleteMessage: deleteMessageFromStorage, 
    updateMessage 
  } = useLocalStorage();
  const isMobile = useIsMobile();

  // Get current conversation settings
  const currentConversation = conversationId ? getConversation(conversationId) : null;
  const chatMatePrompt = currentConversation?.chat_mate_prompt || settings.chatMatePersonality || 'You are a friendly local who loves to chat about daily life, culture, and local experiences.';
  const currentEditorMatePrompt = currentConversation?.editor_mate_prompt || editorMatePrompt || settings.editorMatePersonality || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.';

  // Check if we should generate a title - more robust logic
  const shouldGenerateTitle = (messagesList: Message[], convId: string | null) => {
    if (!convId || titleGenerationProcessed.has(convId)) return false;
    
    // Count messages by type
    const userMessages = messagesList.filter(m => m.type === 'user').length;
    const chatMateMessages = messagesList.filter(m => m.type === 'chat-mate').length;
    const editorMateMessages = messagesList.filter(m => m.type === 'editor-mate').length;
    
    // Generate title after first complete round: 1 user, 1 chat-mate, 2 editor-mate (one for user, one for chat-mate)
    return userMessages >= 1 && chatMateMessages >= 1 && editorMateMessages >= 2;
  };

  const generateAndUpdateTitle = async (messagesList: Message[], convId: string) => {
    if (!convId || titleGenerationProcessed.has(convId)) return;
    
    try {
      console.log('🏷️ Starting title generation for conversation:', convId);
      
      // Mark this conversation as being processed to prevent duplicates
      setTitleGenerationProcessed(prev => new Set(prev).add(convId));
      
      // Convert messages to the format expected by title generator
      const conversationHistory = messagesList.map(msg => ({
        message_type: msg.type,
        content: msg.content
      }));

      const newTitle = await generateChatTitle(conversationHistory, targetLanguage);
      
      if (newTitle && newTitle !== 'Chat') {
        const conversation = getConversation(convId);
        if (conversation) {
          updateConversation(convId, {
            ...conversation,
            title: newTitle,
            updated_at: new Date()
          });
          console.log('✅ Title generated and updated successfully:', newTitle);
          // Force sidebar refresh after title update
          setTimeout(() => {
            onConversationUpdate();
          }, 200);
        }
      }
    } catch (error) {
      console.error('❌ Error in title generation process:', error);
      // Remove from processed set on error so it can be retried
      setTitleGenerationProcessed(prev => {
        const newSet = new Set(prev);
        newSet.delete(convId);
        return newSet;
      });
    }
  };

  // Mark component as ready and ensure focus
  useEffect(() => {
    if (!componentReady) {
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
  }, [componentReady, conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId && !isCreatingNewConversation) {
      console.log('🔄 Loading messages for conversation:', conversationId);
      loadMessages();
    } else if (!conversationId) {
      console.log('🆕 New conversation - clearing messages');
      setMessages([]);
      // Clear title generation tracking for new conversation
      setTitleGenerationProcessed(new Set());
    }
  }, [conversationId, isCreatingNewConversation]);

  // Check for title generation when messages change - with better race condition handling
  useEffect(() => {
    if (conversationId && shouldGenerateTitle(messages, conversationId)) {
      // Use a small delay to ensure all messages are saved before generating title
      const timeoutId = setTimeout(() => {
        generateAndUpdateTitle(messages, conversationId);
      }, 500);
      
      return () => clearTimeout(timeoutId);
    }
  }, [messages, conversationId]);

  // Reset title generation tracking when conversation changes
  useEffect(() => {
    if (conversationId) {
      setTitleGenerationProcessed(prev => {
        // Keep the current conversation in the set if it's already there
        const newSet = new Set<string>();
        if (prev.has(conversationId)) {
          newSet.add(conversationId);
        }
        return newSet;
      });
    }
  }, [conversationId]);

  const loadMessages = () => {
    if (!conversationId) return;

    try {
      console.log('📥 Loading messages from local storage for conversation:', conversationId);
      const conversationMessages = getMessages(conversationId);

      const formattedMessages = conversationMessages.map(msg => ({
        id: msg.id,
        type: msg.message_type as 'user' | 'chat-mate' | 'editor-mate',
        content: msg.content,
        timestamp: new Date(msg.created_at),
        parentMessageId: msg.parent_message_id,
      }));

      console.log('📥 Loaded messages:', formattedMessages.length);
      setMessages(formattedMessages);
      
      // Check if title should already be generated for this conversation
      if (shouldGenerateTitle(formattedMessages, conversationId)) {
        setTitleGenerationProcessed(prev => new Set(prev).add(conversationId));
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        title: "Error",
        description: "Failed to load messages",
        variant: "destructive",
      });
    }
  };

  const saveMessage = (message: Omit<Message, 'id' | 'timestamp'>, actualConversationId: string) => {
    try {
      console.log('💾 Saving message to local storage:', message.type, message.content.substring(0, 50) + '...');
      const savedMessage = addMessage(actualConversationId, {
        content: message.content,
        message_type: message.type,
        parent_message_id: message.parentMessageId,
      });
      console.log('✅ Message saved successfully with ID:', savedMessage.id);
      return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const deleteMessage = (messageId: string) => {
    try {
      deleteMessageFromStorage(messageId);
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

  const editMessage = (messageId: string, newContent: string) => {
    try {
      updateMessage(messageId, { content: newContent });
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
      updateMessage(messageId, { content: response });

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
      const newConversation = createConversation({
        title: `Forked Chat - ${targetLanguage}`,
        language: targetLanguage.toLowerCase(),
        chat_mate_prompt: chatMatePrompt,
        editor_mate_prompt: currentEditorMatePrompt
      });

      // Copy messages up to and including the selected message
      const messagesToCopy = messages.slice(0, messageIndex + 1);
      
      for (const msg of messagesToCopy) {
        addMessage(newConversation.id, {
          content: msg.content,
          message_type: msg.type,
          parent_message_id: msg.parentMessageId,
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
        model: settings.model,
        apiKey: settings.apiKey,
        // Pass new advanced settings
        chatMateBackground: currentConversation?.chatMateBackground || 'young professional, loves local culture',
        editorMateExpertise: currentConversation?.editorMateExpertise || '10+ years teaching experience',
        feedbackStyle: currentConversation?.feedbackStyle || 'encouraging',
        culturalContext: currentConversation?.culturalContext ?? true,
        progressiveComplexity: currentConversation?.progressiveComplexity ?? true,
        streaming: settings.streaming ?? true
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
      return await handleStreamingResponse(response);
    } else {
      // Handle non-streaming response (fallback)
      const data = await response.json();
      return data.response;
    }
  };

  const handleStreamingResponse = async (response: Response, messageId?: string): Promise<string> => {
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
              const data = JSON.parse(line.slice(6));
              
              if (data.type === 'content') {
                fullContent += data.content;
                
                // Update message content in real-time if messageId is provided
                if (messageId) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, content: fullContent } : msg
                  ));
                }
              } else if (data.type === 'done') {
                console.log('✅ Streaming completed');
                
                // Mark streaming as complete
                if (messageId) {
                  setMessages(prev => prev.map(msg => 
                    msg.id === messageId ? { ...msg, isStreaming: false } : msg
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

  const createNewConversation = () => {
    try {
      console.log('🆕 Creating new conversation...');
      
      const newConversation = createConversation({
        title: `${targetLanguage} Chat`, // Better initial title that will be replaced
        language: targetLanguage.toLowerCase(),
        chat_mate_prompt: chatMatePrompt,
        editor_mate_prompt: currentEditorMatePrompt
      });

      console.log('✅ New conversation created with ID:', newConversation.id);
      return newConversation.id;
    } catch (error) {
      console.error('❌ Error creating conversation:', error);
      throw error;
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    console.log('📤 Sending message with streaming enabled');

    let currentConversationId = conversationId;

    // Create conversation only when first message is sent
    if (!currentConversationId) {
      try {
        setIsCreatingNewConversation(true);
        currentConversationId = createNewConversation();
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
      const savedUserMessage = saveMessage(userMessage, currentConversationId);
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
      const editorUserTempId = `temp-${Date.now() + 1}`;
      const chatMateTempId = `temp-${Date.now() + 2}`;
      const editorChatMateTempId = `temp-${Date.now() + 3}`;

      // Get Editor Mate comment on user message first
      const editorUserMessage: Message = {
        id: editorUserTempId,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        parentMessageId: savedUserMessage?.id || userMessage.id,
      };

      setMessages(prev => [...prev, editorUserMessage]);

      const editorUserResponse = await fetch(`https://ycjruxeyboafjlnurmdp.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanJ1eGV5Ym9hZmpsbnVybWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mzg2NDQsImV4cCI6MjA2NTUxNDY0NH0.5gwYrvysirE3E4iFHuS8ekAvGUrtxgJPmZDyMtvQaMA`,
        },
        body: JSON.stringify({
          message: currentInput,
          messageType: 'editor-mate-user-comment',
          conversationHistory: fullHistory,
          chatMatePrompt,
          editorMatePrompt: currentEditorMatePrompt,
          targetLanguage,
          model: settings.model,
          apiKey: settings.apiKey,
          chatMateBackground: currentConversation?.chatMateBackground || 'young professional, loves local culture',
          editorMateExpertise: currentConversation?.editorMateExpertise || '10+ years teaching experience',
          feedbackStyle: currentConversation?.feedbackStyle || 'encouraging',
          culturalContext: currentConversation?.culturalContext ?? true,
          progressiveComplexity: currentConversation?.progressiveComplexity ?? true,
          streaming: settings.streaming ?? true
        })
      });

      if (!editorUserResponse.ok) {
        throw new Error('Failed to get editor mate response');
      }

      const editorUserComment = await handleStreamingResponse(editorUserResponse, editorUserTempId);
      
      // Save the completed message
      const savedEditorUserMessage = saveMessage({
        type: 'editor-mate',
        content: editorUserComment,
        parentMessageId: savedUserMessage?.id || userMessage.id,
      }, currentConversationId);

      if (savedEditorUserMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === editorUserTempId ? { ...msg, id: savedEditorUserMessage.id, isStreaming: false } : msg
        ));
      }

      // Get Chat Mate response
      const chatMateMessage: Message = {
        id: chatMateTempId,
        type: 'chat-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, chatMateMessage]);

      const chatMateResponse = await fetch(`https://ycjruxeyboafjlnurmdp.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanJ1eGV5Ym9hZmpsbnVybWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mzg2NDQsImV4cCI6MjA2NTUxNDY0NH0.5gwYrvysirE3E4iFHuS8ekAvGUrtxgJPmZDyMtvQaMA`,
        },
        body: JSON.stringify({
          message: currentInput,
          messageType: 'chat-mate-response',
          conversationHistory: chatMateHistory,
          chatMatePrompt,
          editorMatePrompt: currentEditorMatePrompt,
          targetLanguage,
          model: settings.model,
          apiKey: settings.apiKey,
          chatMateBackground: currentConversation?.chatMateBackground || 'young professional, loves local culture',
          editorMateExpertise: currentConversation?.editorMateExpertise || '10+ years teaching experience',
          feedbackStyle: currentConversation?.feedbackStyle || 'encouraging',
          culturalContext: currentConversation?.culturalContext ?? true,
          progressiveComplexity: currentConversation?.progressiveComplexity ?? true,
          streaming: settings.streaming ?? true
        })
      });

      if (!chatMateResponse.ok) {
        throw new Error('Failed to get chat mate response');
      }

      const chatMateContent = await handleStreamingResponse(chatMateResponse, chatMateTempId);
      
      // Save the completed message
      const savedChatMateMessage = saveMessage({
        type: 'chat-mate',
        content: chatMateContent,
      }, currentConversationId);

      if (savedChatMateMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === chatMateTempId ? { ...msg, id: savedChatMateMessage.id, isStreaming: false } : msg
        ));
      }

      // Get Editor Mate comment on Chat Mate response
      const editorChatMateMessage: Message = {
        id: editorChatMateTempId,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        parentMessageId: savedChatMateMessage?.id || chatMateTempId,
      };

      setMessages(prev => [...prev, editorChatMateMessage]);

      const editorChatMateResponse = await fetch(`https://ycjruxeyboafjlnurmdp.supabase.co/functions/v1/ai-chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanJ1eGV5Ym9hZmpsbnVybWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mzg2NDQsImV4cCI6MjA2NTUxNDY0NH0.5gwYrvysirE3E4iFHuS8ekAvGUrtxgJPmZDyMtvQaMA`,
        },
        body: JSON.stringify({
          message: chatMateContent,
          messageType: 'editor-mate-chatmate-comment',
          conversationHistory: fullHistory,
          chatMatePrompt,
          editorMatePrompt: currentEditorMatePrompt,
          targetLanguage,
          model: settings.model,
          apiKey: settings.apiKey,
          chatMateBackground: currentConversation?.chatMateBackground || 'young professional, loves local culture',
          editorMateExpertise: currentConversation?.editorMateExpertise || '10+ years teaching experience',
          feedbackStyle: currentConversation?.feedbackStyle || 'encouraging',
          culturalContext: currentConversation?.culturalContext ?? true,
          progressiveComplexity: currentConversation?.progressiveComplexity ?? true,
          streaming: settings.streaming ?? true
        })
      });

      if (!editorChatMateResponse.ok) {
        throw new Error('Failed to get editor mate chat response');
      }

      const editorChatMateComment = await handleStreamingResponse(editorChatMateResponse, editorChatMateTempId);
      
      // Save the completed message
      const savedEditorChatMateMessage = saveMessage({
        type: 'editor-mate',
        content: editorChatMateComment,
        parentMessageId: savedChatMateMessage?.id || chatMateTempId,
      }, currentConversationId);

      if (savedEditorChatMateMessage) {
        setMessages(prev => prev.map(msg => 
          msg.id === editorChatMateTempId ? { ...msg, id: savedEditorChatMateMessage.id, isStreaming: false } : msg
        ));
      }

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
