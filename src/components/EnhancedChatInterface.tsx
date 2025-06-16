import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Loader2, MessageSquare, Square } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import { useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { generateChatTitle, updateConversationTitle } from '@/utils/chatTitleGenerator';
import EnhancedChatMessage from './EnhancedChatMessage';
import { Message, MessageMetadata } from '@/types/Message';
import { SUPABASE_PUBLISHABLE_KEY, SUPABASE_URL } from '@/integrations/supabase/client';

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
  const [abortController, setAbortController] = useState<AbortController | null>(null);
  const [isCreatingNewConversation, setIsCreatingNewConversation] = useState(false);
  const [componentReady, setComponentReady] = useState(false);
  const [titleGenerationProcessed, setTitleGenerationProcessed] = useState(new Set<string>());
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const {
    getConversation,
    createConversation,
    updateConversation,
    addMessage,
    getMessages,
    deleteMessage: deleteMessageFromStorage,
    updateMessage
  } = useLocalStorage();
  const { getChatSettings, getGlobalSettings } = useSettings();
  const isMobile = useIsMobile();

  // Get current conversation and settings
  const currentConversation = conversationId ? getConversation(conversationId) : null;
  const chatSettings = conversationId ? getChatSettings(conversationId) : null;
  const globalSettings = getGlobalSettings();

  // Use chat-specific settings if available, otherwise fall back to global settings
  const effectiveModel = chatSettings?.model || globalSettings.model;
  const effectiveApiKey = chatSettings?.apiKey || globalSettings.apiKey;

  const chatMatePrompt = currentConversation?.chat_mate_prompt || chatSettings?.chatMatePersonality || 'You are a friendly local who loves to chat about daily life, culture, and local experiences.';
  const currentEditorMatePrompt = currentConversation?.editor_mate_prompt || editorMatePrompt || chatSettings?.editorMatePersonality || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.';

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

      const newTitle = await generateChatTitle(conversationHistory, targetLanguage, effectiveModel);

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

  // Don't scroll agressively as the messages come.
  // The output from Chat Mate and Editor Mate is often long,
  // so we should keep the scroll position to let the user scroll themself and read.
  const lastUserMessageId = messages.slice().reverse().find(m => m.type === 'user')?.id;
  useEffect(() => {
    scrollToBottom();
  }, [lastUserMessageId]);

  // Load messages when conversation changes
  useEffect(() => {
    if (conversationId && !isCreatingNewConversation) {
      console.log('🔄 Loading messages for conversation:', conversationId);
      loadMessages();
    } else if (!conversationId) {
      console.log('🆕 New conversation - clearing messages');
      setMessages([]);
      setTitleGenerationProcessed(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- To be reviewed and fixed
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- To be reviewed and fixed
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
        type: msg.type,
        content: msg.content,
        timestamp: msg.timestamp,
        isStreaming: msg.isStreaming,
        parentMessageId: msg.parentMessageId,
        reasoning: msg.reasoning,
        metadata: msg.metadata
      }));

      console.log('📥 Loaded messages:', formattedMessages.length);
      setMessages(formattedMessages);

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
      console.log('💾 Saving message to local storage:', message.type, message.content.substring(0, 50) + '...', 'Reasoning:', !!message.reasoning, 'Metadata:', message.metadata);
      const savedMessage = addMessage(actualConversationId, {
        content: message.content,
        type: message.type,
        parentMessageId: message.parentMessageId,
        reasoning: message.reasoning,
        metadata: message.metadata
      });
      console.log('✅ Message saved successfully with ID:', savedMessage.id, 'Metadata:', savedMessage.metadata);
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

  const deleteAllBelow = (messageId: string) => {
    try {
      // Find the index of the selected message
      const messageIndex = messages.findIndex(msg => msg.id === messageId);
      if (messageIndex === -1) return;

      // Get all messages from the selected message onwards (including the selected message)
      const messagesToDelete = messages.slice(messageIndex);

      // Delete each message from storage
      messagesToDelete.forEach(msg => {
        deleteMessageFromStorage(msg.id);
      });

      // Update local state to remove all messages from the selected index onwards
      setMessages(prev => prev.slice(0, messageIndex));

      toast({
        title: "Success",
        description: `Deleted ${messagesToDelete.length} message${messagesToDelete.length > 1 ? 's' : ''}`,
      });
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast({
        title: "Error",
        description: "Failed to delete messages",
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
    const controller = new AbortController();
    setAbortController(controller);

    try {
      let userMessage = '';
      for (let i = messageIndex - 1; i >= 0; i--) {
        if (messages[i].type === 'user') {
          userMessage = messages[i].content;
          break;
        }
      }

      const historyMessages = messages.slice(0, messageIndex);
      const conversationHistory = historyMessages.map(msg => ({
        role: msg.type === 'user' ? 'user' : 'assistant',
        content: msg.type === 'user' ? msg.content : `[${msg.type}]: ${msg.content}`
      }));

      let messageType = '';
      if (message.type === 'chat-mate') {
        messageType = 'chat-mate-response';
      } else if (message.type === 'editor-mate') {
        const isUserComment = message.parentMessageId &&
          messages.find(m => m.id === message.parentMessageId)?.type === 'user';
        messageType = isUserComment ? 'editor-mate-user-comment' : 'editor-mate-chatmate-comment';
      }

      const response = await callAI(userMessage, messageType, conversationHistory, messageId, controller.signal);

      updateMessage(messageId, { content: response.content, reasoning: response.reasoning, metadata: response.metadata });

      setMessages(prev => prev.map(msg =>
        msg.id === messageId ? { ...msg, content: response.content, reasoning: response.reasoning, metadata: response.metadata } : msg
      ));

      toast({
        title: "Success",
        description: "Message regenerated",
      });
    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Regeneration cancelled by user.');
        toast({
          title: "Cancelled",
          description: "Message regeneration was cancelled.",
        });
      } else {
        console.error('Error regenerating message:', error);
        toast({
          title: "Error",
          description: "Failed to regenerate message",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStreamingResponse = async (response: Response, messageId: string, startTime: number): Promise<{ content: string; reasoning: string; metadata: MessageMetadata }> => {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let reasoningContent = '';
    let buffer = '';

    try {
      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');

        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6));

              if (data.type === 'content' && data.content) {
                fullContent += data.content;

                setMessages(prev => prev.map(msg =>
                  msg.id === messageId ? {
                    ...msg,
                    content: fullContent,
                    isStreaming: true
                  } : msg
                ));
              } else if (data.type === 'reasoning' && data.content) {
                reasoningContent += data.content;
                setMessages(prev => prev.map(msg =>
                  msg.id === messageId ? {
                    ...msg,
                    reasoning: reasoningContent,
                    isStreaming: true
                  } : msg
                ));
              } else if (data.type === 'done') {
                console.log('✅ Streaming completed for message:', messageId);

                const endTime = Date.now();
                const generationTime = endTime - startTime;
                const metadata = {
                  model: effectiveModel,
                  generationTime,
                  startTime,
                  endTime
                };

                setMessages(prev => prev.map(msg =>
                  msg.id === messageId ? {
                    ...msg,
                    content: fullContent,
                    reasoning: reasoningContent,
                    isStreaming: false,
                    metadata
                  } : msg
                ));

                return { content: fullContent, reasoning: reasoningContent, metadata };
              }
            } catch (e) {
              console.error('Error parsing streaming data:', e, 'Line:', line);
            }
          }
        }
      }
    } finally {
      reader.releaseLock();
    }

    const endTime = Date.now();
    const generationTime = endTime - startTime;
    const metadata = {
      model: effectiveModel,
      generationTime,
      startTime,
      endTime
    };

    console.log('💾 Finalizing streaming message with metadata:', metadata);

    // Update local state with final content and metadata
    setMessages(prev => prev.map(msg =>
      msg.id === messageId ? {
        ...msg,
        content: fullContent,
        reasoning: reasoningContent,
        isStreaming: false,
        metadata
      } : msg
    ));

    // Ensure the metadata is persisted to storage after streaming completes
    setTimeout(() => {
      console.log('💾 Persisting metadata for message:', messageId);
      updateMessage(messageId, {
        content: fullContent,
        reasoning: reasoningContent,
        metadata,
        isStreaming: false
      });
    }, 100);

    return { content: fullContent, reasoning: reasoningContent, metadata };
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
          type: msg.type,
          parentMessageId: msg.parentMessageId,
          reasoning: msg.reasoning,
          metadata: msg.metadata
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

  const callAI = async (message: string, messageType: string, history: {
    role: string;
    content: string;
  }[], streamingMessageId: string, signal: AbortSignal): Promise<{ content: string; reasoning: string | null; metadata: MessageMetadata }> => {
    console.log('🚀 Calling AI with model:', effectiveModel);

    const startTime = Date.now();
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await fetch(`${SUPABASE_URL}/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_PUBLISHABLE_KEY}`,
      },
      body: JSON.stringify({
        message,
        messageType,
        conversationHistory: history,
        chatMatePrompt,
        editorMatePrompt: currentEditorMatePrompt,
        targetLanguage,
        model: effectiveModel,
        apiKey: effectiveApiKey,
        chatMateBackground: chatSettings?.chatMateBackground || 'young professional, loves local culture',
        editorMateExpertise: chatSettings?.editorMateExpertise || '10+ years teaching experience',
        feedbackStyle: chatSettings?.feedbackStyle || 'encouraging',
        culturalContext: chatSettings?.culturalContext ?? true,
        progressiveComplexity: chatSettings?.progressiveComplexity ?? true,
        streaming: (conversationId ? chatSettings?.streaming : globalSettings.streaming) ?? true,
        currentDateTime,
        userTimezone,
        enableReasoning: (conversationId ? chatSettings?.enableReasoning : globalSettings.enableReasoning) ?? false,
      }),
      signal,
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get AI response');
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await handleStreamingResponse(response, streamingMessageId, startTime);
    } else {
      const data = await response.json();
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      const metadata = {
        model: effectiveModel,
        generationTime,
        startTime,
        endTime
      };
      return { content: data.response, reasoning: data.reasoning, metadata };
    }
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

    console.log('📤 Sending message with model:', effectiveModel);

    const controller = new AbortController();
    setAbortController(controller);

    let currentConversationId = conversationId;

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
      const savedUserMessage = saveMessage(userMessage, currentConversationId);
      if (savedUserMessage) {
        setMessages(prev => prev.map(msg =>
          msg.id === userMessage.id ? { ...msg, id: savedUserMessage.id } : msg
        ));
      }

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

      const editorUserTempId = `temp-${Date.now() + 1}`;
      const chatMateTempId = `temp-${Date.now() + 2}`;
      const editorChatMateTempId = `temp-${Date.now() + 3}`;

      // Editor Mate comment on user message
      const editorUserMessage: Message = {
        id: editorUserTempId,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        parentMessageId: savedUserMessage?.id || userMessage.id,
      };

      setMessages(prev => [...prev, editorUserMessage]);

      const editorUserResult = await callAI(
        currentInput,
        'editor-mate-user-comment',
        fullHistory,
        editorUserTempId,
        controller.signal
      );

      const savedEditorUserMessage = saveMessage({
        type: 'editor-mate',
        content: editorUserResult.content,
        reasoning: editorUserResult.reasoning,
        parentMessageId: savedUserMessage?.id || userMessage.id,
        metadata: editorUserResult.metadata,
      }, currentConversationId);

      if (savedEditorUserMessage) {
        setMessages(prev => prev.map(msg =>
          msg.id === editorUserTempId ? {
            ...msg,
            id: savedEditorUserMessage.id,
            isStreaming: false,
            content: editorUserResult.content,
            reasoning: editorUserResult.reasoning,
            metadata: editorUserResult.metadata
          } : msg
        ));
      }

      // Chat Mate response
      const chatMateMessage: Message = {
        id: chatMateTempId,
        type: 'chat-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
      };

      setMessages(prev => [...prev, chatMateMessage]);

      const chatMateResult = await callAI(
        currentInput,
        'chat-mate-response',
        chatMateHistory,
        chatMateTempId,
        controller.signal
      );

      const savedChatMateMessage = saveMessage({
        type: 'chat-mate',
        content: chatMateResult.content,
        reasoning: chatMateResult.reasoning,
        metadata: chatMateResult.metadata,
      }, currentConversationId);

      if (savedChatMateMessage) {
        setMessages(prev => prev.map(msg =>
          msg.id === chatMateTempId ? {
            ...msg,
            id: savedChatMateMessage.id,
            isStreaming: false,
            content: chatMateResult.content,
            reasoning: chatMateResult.reasoning,
            metadata: chatMateResult.metadata
          } : msg
        ));
      }

      // Editor Mate comment on Chat Mate response
      const editorChatMateMessage: Message = {
        id: editorChatMateTempId,
        type: 'editor-mate',
        content: '',
        timestamp: new Date(),
        isStreaming: true,
        parentMessageId: savedChatMateMessage?.id || chatMateTempId,
      };

      setMessages(prev => [...prev, editorChatMateMessage]);

      const editorChatMateResult = await callAI(
        chatMateResult.content,
        'editor-mate-chatmate-comment',
        fullHistory,
        editorChatMateTempId,
        controller.signal
      );

      const savedEditorChatMateMessage = saveMessage({
        type: 'editor-mate',
        content: editorChatMateResult.content,
        reasoning: editorChatMateResult.reasoning,
        parentMessageId: savedChatMateMessage?.id || chatMateTempId,
        metadata: editorChatMateResult.metadata,
      }, currentConversationId);

      if (savedEditorChatMateMessage) {
        setMessages(prev => prev.map(msg =>
          msg.id === editorChatMateTempId ? {
            ...msg,
            id: savedEditorChatMateMessage.id,
            isStreaming: false,
            content: editorChatMateResult.content,
            reasoning: editorChatMateResult.reasoning,
            metadata: editorChatMateResult.metadata
          } : msg
        ));
      }

      onConversationUpdate();

    } catch (error) {
      if (error.name === 'AbortError') {
        console.log('🛑 Generation cancelled by user.');
        toast({
          title: "Cancelled",
          description: "Message generation was cancelled.",
        });
        setMessages(prev => prev.filter(msg => !msg.isStreaming && !msg.id.startsWith('temp-')));
      } else {
        console.error('❌ Error sending message:', error);
        toast({
          title: "Error",
          description: error.message || "Failed to send message",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
      setIsCreatingNewConversation(false);
      setAbortController(null);
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

  const handleCancel = () => {
    if (abortController) {
      abortController.abort();
      console.log('👋 Cancel requested');
    }
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
            onDeleteAllBelow={deleteAllBelow}
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
        {isLoading ? (
          <div className="flex items-center justify-center">
            <Button variant="outline" onClick={handleCancel}>
              <Square className="w-4 h-4 mr-2" />
              Stop generating
            </Button>
          </div>
        ) : (
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
        )}
      </div>
    </div>
  );
};

export default EnhancedChatInterface;
