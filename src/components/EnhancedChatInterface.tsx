import { Loader2, MessageSquare, Send, Square } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Message, MessageMetadata } from '@/schemas/messages';
import type { MessageType, PromptVariables } from '@/services/prompts';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { apiClient } from '@/services/apiClient';
import { buildPrompt } from '@/services/prompts';
import { generateChatTitle } from '@/utils/chatTitleGenerator';

import EnhancedChatMessage from './EnhancedChatMessage';

/**
 *
 */
interface EnhancedChatInterfaceProps {
  conversationId: null | string;
  editorMatePrompt?: string;
  onAskInterfaceOpen?: () => void;
  onChatSettingsOpen?: () => void;
  onConversationCreated: (id: string) => void;
  onConversationUpdate: () => void;
  onTextSelect: (text: string) => void;
  selectedText?: string;
  targetLanguage: string;
}

const EnhancedChatInterface = ({
  conversationId,
  editorMatePrompt,
  onAskInterfaceOpen,
  onConversationCreated,
  onConversationUpdate,
  onTextSelect,
  targetLanguage,
}: EnhancedChatInterfaceProps) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [isCreatingNewConversation, setIsCreatingNewConversation] =
    useState(false);
  const [componentReady, setComponentReady] = useState(false);
  const [titleGenerationProcessed, setTitleGenerationProcessed] = useState(
    new Set<string>()
  );
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { toast } = useToast();
  const {
    addMessage,
    createConversation,
    deleteMessage: deleteMessageFromStorage,
    getConversation,
    getConversationSettings,
    getMessages,
    globalSettings,
    updateConversation,
    updateMessage,
  } = useUnifiedStorage();
  const isMobile = useIsMobile();

  // Get current conversation and settings
  const currentConversation = conversationId
    ? getConversation(conversationId)
    : null;
  const chatSettings = conversationId
    ? getConversationSettings(conversationId)
    : null;

  // Use chat-specific settings if available, otherwise fall back to global settings
  const effectiveModel = chatSettings?.model ?? globalSettings.model;
  const effectiveApiKey = chatSettings?.apiKey ?? globalSettings.apiKey;

  const chatMatePrompt =
    currentConversation?.chat_mate_prompt ??
    chatSettings?.chatMatePersonality ??
    'You are a friendly local who loves to chat about daily life, culture, and local experiences.';
  const currentEditorMatePrompt =
    currentConversation?.editor_mate_prompt ??
    editorMatePrompt ??
    chatSettings?.editorMatePersonality ??
    'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.';

  const shouldGenerateTitle = (
    messagesList: Message[],
    convId: null | string
  ) => {
    if (!convId || titleGenerationProcessed.has(convId)) return false;

    // Count messages by type
    const userMessages = messagesList.filter((m) => m.type === 'user').length;
    const chatMateMessages = messagesList.filter(
      (m) => m.type === 'chat-mate'
    ).length;
    const editorMateMessages = messagesList.filter(
      (m) => m.type === 'editor-mate'
    ).length;

    // Generate title after first complete round: 1 user, 1 chat-mate, 2 editor-mate (one for user, one for chat-mate)
    return (
      userMessages >= 1 && chatMateMessages >= 1 && editorMateMessages >= 2
    );
  };

  const generateAndUpdateTitle = async (
    messagesList: Message[],
    convId: string
  ) => {
    if (!convId || titleGenerationProcessed.has(convId)) return;

    try {
      console.log('🏷️ Starting title generation for conversation:', convId);

      // Mark this conversation as being processed to prevent duplicates
      setTitleGenerationProcessed((prev) => new Set(prev).add(convId));

      // Convert messages to the format expected by title generator
      const conversationHistory = messagesList.map((msg) => ({
        content: msg.content,
        message_type: msg.type,
      }));

      const newTitle = await generateChatTitle(
        conversationHistory,
        targetLanguage,
        effectiveModel
      );

      if (newTitle && newTitle !== 'Chat') {
        const conversation = getConversation(convId);
        if (conversation) {
          updateConversation(convId, {
            ...conversation,
            title: newTitle,
            updated_at: new Date(),
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
      setTitleGenerationProcessed((prev) => {
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
  const lastUserMessageId = messages
    .slice()
    .reverse()
    .find((m) => m.type === 'user')?.id;
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
        void generateAndUpdateTitle(messages, conversationId);
      }, 500);

      return () => {
        clearTimeout(timeoutId);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- To be reviewed and fixed
  }, [messages, conversationId]);

  // Reset title generation tracking when conversation changes
  useEffect(() => {
    if (conversationId) {
      setTitleGenerationProcessed((prev) => {
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
      console.log(
        '📥 Loading messages from local storage for conversation:',
        conversationId
      );
      const conversationMessages = getMessages(conversationId);

      const formattedMessages = conversationMessages.map((msg) => ({
        content: msg.content,
        id: msg.id,
        isStreaming: msg.isStreaming,
        metadata: msg.metadata,
        parentMessageId: msg.parentMessageId,
        reasoning: msg.reasoning,
        timestamp: msg.timestamp,
        type: msg.type,
      }));

      console.log('📥 Loaded messages:', formattedMessages.length);
      setMessages(formattedMessages);

      if (shouldGenerateTitle(formattedMessages, conversationId)) {
        setTitleGenerationProcessed((prev) =>
          new Set(prev).add(conversationId)
        );
      }
    } catch (error) {
      console.error('Error loading messages:', error);
      toast({
        description: 'Failed to load messages',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const saveMessage = (
    message: Omit<Message, 'id' | 'timestamp'>,
    actualConversationId: string
  ) => {
    try {
      console.log(
        '💾 Saving message to local storage:',
        message.type,
        message.content.substring(0, 50) + '...',
        'Reasoning:',
        !!message.reasoning,
        'Metadata:',
        message.metadata
      );
      const savedMessage = addMessage(actualConversationId, {
        content: message.content,
        metadata: message.metadata,
        parentMessageId: message.parentMessageId,
        reasoning: message.reasoning,
        type: message.type,
      });
      console.log(
        '✅ Message saved successfully with ID:',
        savedMessage.id,
        'Metadata:',
        savedMessage.metadata
      );
      return savedMessage;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const deleteMessage = (messageId: string) => {
    try {
      deleteMessageFromStorage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      toast({
        description: 'Message deleted',
        title: 'Success',
      });
    } catch (error) {
      console.error('Error deleting message:', error);
      toast({
        description: 'Failed to delete message',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const deleteAllBelow = (messageId: string) => {
    try {
      // Find the index of the selected message
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      // Get all messages from the selected message onwards (including the selected message)
      const messagesToDelete = messages.slice(messageIndex);

      // Delete each message from storage
      messagesToDelete.forEach((msg) => {
        deleteMessageFromStorage(msg.id);
      });

      // Update local state to remove all messages from the selected index onwards
      setMessages((prev) => prev.slice(0, messageIndex));

      toast({
        description: `Deleted ${messagesToDelete.length.toString()} message${messagesToDelete.length > 1 ? 's' : ''}`,
        title: 'Success',
      });
    } catch (error) {
      console.error('Error deleting messages:', error);
      toast({
        description: 'Failed to delete messages',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const editMessage = (messageId: string, newContent: string) => {
    try {
      updateMessage(messageId, { content: newContent });
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId ? { ...msg, content: newContent } : msg
        )
      );

      toast({
        description: 'Message updated',
        title: 'Success',
      });
    } catch (error) {
      console.error('Error editing message:', error);
      toast({
        description: 'Failed to edit message',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const regenerateMessage = async (messageId: string) => {
    const messageIndex = messages.findIndex((msg) => msg.id === messageId);
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
      const conversationHistory = historyMessages.map((msg) => ({
        content: `[${msg.type}]: ${msg.content}`,
        // Always send as user to prevent the assistant from misunderstanding its role.
        role: 'user' as const,
      }));

      let messageType = '';
      if (message.type === 'chat-mate') {
        messageType = 'chat-mate-response';
      } else {
        const isUserComment =
          message.parentMessageId &&
          messages.find((m) => m.id === message.parentMessageId)?.type ===
            'user';
        messageType = isUserComment
          ? 'editor-mate-user-comment'
          : 'editor-mate-chatmate-comment';
      }

      const response = await callAI(
        userMessage,
        messageType as MessageType,
        conversationHistory,
        messageId,
        controller.signal
      );

      updateMessage(messageId, {
        content: response.content,
        metadata: response.metadata,
        reasoning: response.reasoning,
      });

      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content: response.content,
                metadata: response.metadata,
                reasoning: response.reasoning,
              }
            : msg
        )
      );

      toast({
        description: 'Message regenerated',
        title: 'Success',
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Regeneration cancelled by user.');
        toast({
          description: 'Message regeneration was cancelled.',
          title: 'Cancelled',
        });
      } else {
        console.error('Error regenerating message:', error);
        toast({
          description: 'Failed to regenerate message',
          title: 'Error',
          variant: 'destructive',
        });
      }
    } finally {
      setIsLoading(false);
      setAbortController(null);
    }
  };

  const handleStreamingResponse = async (
    response: Response,
    messageId: string,
    startTime: number
  ): Promise<{
    content: string;
    metadata: MessageMetadata;
    reasoning: string;
  }> => {
    if (!response.body) {
      throw new Error('No response body for streaming');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let fullContent = '';
    let reasoningContent = '';
    let buffer = '';

    try {
      while (componentReady) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n\n');

        buffer = lines.pop() ?? '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6)) as {
                content?: string;
                type?: string;
              };

              if (data.type === 'content' && data.content) {
                fullContent += data.content;

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          content: fullContent,
                          isStreaming: true,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'reasoning' && data.content) {
                reasoningContent += data.content;
                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          isStreaming: true,
                          reasoning: reasoningContent,
                        }
                      : msg
                  )
                );
              } else if (data.type === 'done') {
                console.log('✅ Streaming completed for message:', messageId);

                const endTime = Date.now();
                const generationTime = endTime - startTime;
                const metadata = {
                  endTime,
                  generationTime,
                  model: effectiveModel,
                  startTime,
                };

                setMessages((prev) =>
                  prev.map((msg) =>
                    msg.id === messageId
                      ? {
                          ...msg,
                          content: fullContent,
                          isStreaming: false,
                          metadata,
                          reasoning: reasoningContent,
                        }
                      : msg
                  )
                );

                return {
                  content: fullContent,
                  metadata,
                  reasoning: reasoningContent,
                };
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
      endTime,
      generationTime,
      model: effectiveModel,
      startTime,
    };

    console.log('💾 Finalizing streaming message with metadata:', metadata);

    // Update local state with final content and metadata
    setMessages((prev) =>
      prev.map((msg) =>
        msg.id === messageId
          ? {
              ...msg,
              content: fullContent,
              isStreaming: false,
              metadata,
              reasoning: reasoningContent,
            }
          : msg
      )
    );

    // Ensure the metadata is persisted to storage after streaming completes
    setTimeout(() => {
      console.log('💾 Persisting metadata for message:', messageId);
      updateMessage(messageId, {
        content: fullContent,
        isStreaming: false,
        metadata,
        reasoning: reasoningContent,
      });
    }, 100);

    return { content: fullContent, metadata, reasoning: reasoningContent };
  };

  const forkFromMessage = (messageId: string) => {
    try {
      // Find the message index
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      // Create a new conversation
      const newConversation = createConversation({
        chat_mate_prompt: chatMatePrompt,
        editor_mate_prompt: currentEditorMatePrompt,
        language: targetLanguage.toLowerCase(),
        title: `Forked Chat - ${targetLanguage}`,
      });

      // Copy messages up to and including the selected message
      const messagesToCopy = messages.slice(0, messageIndex + 1);

      for (const msg of messagesToCopy) {
        addMessage(newConversation.id, {
          content: msg.content,
          metadata: msg.metadata,
          parentMessageId: msg.parentMessageId,
          reasoning: msg.reasoning,
          type: msg.type,
        });
      }

      toast({
        description: 'Chat forked successfully',
        title: 'Success',
      });

      onConversationUpdate();
    } catch (error) {
      console.error('Error forking conversation:', error);
      toast({
        description: 'Failed to fork conversation',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const buildPromptVariables = (): PromptVariables => {
    return {
      chatMateBackground:
        chatSettings?.chatMateBackground ??
        'A friendly local who enjoys helping people learn the language and culture.',
      chatMatePersonality: chatMatePrompt,
      culturalContext: chatSettings?.culturalContext ?? true,
      editorMateExpertise:
        chatSettings?.editorMateExpertise ?? '10+ years teaching experience',
      editorMatePersonality: currentEditorMatePrompt,
      feedbackStyle: chatSettings?.feedbackStyle ?? 'encouraging',
      progressiveComplexity: chatSettings?.progressiveComplexity ?? true,
      targetLanguage,
    };
  };

  const callAI = async (
    message: string,
    messageType: MessageType,
    history: {
      content: string;
      role: 'assistant' | 'system' | 'user';
    }[],
    streamingMessageId: string,
    signal: AbortSignal
  ): Promise<{
    content: string;
    metadata: MessageMetadata;
    reasoning: string | undefined;
  }> => {
    console.log('🚀 Calling AI with model:', effectiveModel);

    // Build system prompt using the new prompt system
    const promptVariables = buildPromptVariables();
    const builtPrompt = buildPrompt({
      messageType: messageType,
      variables: promptVariables,
    });

    const startTime = Date.now();
    const now = new Date();
    const currentDateTime = now.toLocaleString('en-US', {
      day: 'numeric',
      hour: '2-digit',
      hour12: true,
      minute: '2-digit',
      month: 'long',
      second: '2-digit',
      weekday: 'long',
      year: 'numeric',
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await apiClient.aiChat(
      {
        apiKey: effectiveApiKey,
        chatMateBackground:
          promptVariables.chatMateBackground ?? 'A friendly local',
        chatMatePrompt:
          promptVariables.chatMatePersonality ??
          'You are a friendly native speaker',
        conversationHistory: history,
        culturalContext: promptVariables.culturalContext,
        currentDateTime,
        editorMateExpertise:
          promptVariables.editorMateExpertise ??
          '10+ years teaching experience',
        editorMatePrompt:
          promptVariables.editorMatePersonality ?? 'You are a patient teacher',
        enableReasoning:
          (conversationId
            ? chatSettings?.enableReasoning
            : globalSettings.enableReasoning) ?? false,
        feedbackStyle: promptVariables.feedbackStyle,
        message,
        messageType,
        model: effectiveModel,
        progressiveComplexity: promptVariables.progressiveComplexity,
        streaming:
          (conversationId
            ? chatSettings?.streaming
            : globalSettings.streaming) ?? true,
        systemPrompt: builtPrompt.systemPrompt,
        targetLanguage,
        userTimezone,
      },
      { signal }
    );

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? 'Failed to get AI response');
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await handleStreamingResponse(
        response,
        streamingMessageId,
        startTime
      );
    } else {
      const data = (await response.json()) as {
        reasoning: string;
        response: string;
      };
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      const metadata = {
        endTime,
        generationTime,
        model: effectiveModel,
        startTime,
      };
      return { content: data.response, metadata, reasoning: data.reasoning };
    }
  };

  const createNewConversation = () => {
    try {
      console.log('🆕 Creating new conversation...');

      const newConversation = createConversation({
        chat_mate_prompt: chatMatePrompt,
        editor_mate_prompt: currentEditorMatePrompt,
        language: targetLanguage.toLowerCase(),
        title: `${targetLanguage} Chat`, // Better initial title that will be replaced
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
      } catch {
        toast({
          description: 'Failed to create conversation',
          title: 'Error',
          variant: 'destructive',
        });
        setIsCreatingNewConversation(false);
        return;
      }
    }

    const userMessage: Message = {
      content: inputMessage.trim(),
      id: `temp-${Date.now().toString()}`,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = inputMessage.trim();
    setInputMessage('');
    setIsLoading(true);

    try {
      const savedUserMessage = saveMessage(userMessage, currentConversationId);
      if (savedUserMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === userMessage.id
              ? { ...msg, id: savedUserMessage.id }
              : msg
          )
        );
      }

      const chatMateHistory = messages
        .filter((msg) => msg.type === 'user' || msg.type === 'chat-mate')
        .map((msg) => ({
          content: `[${msg.type}]: ${msg.content}`,
          // Always send as user to prevent the assistant from misunderstanding its role.
          role: 'user' as const,
        }));

      const fullHistory = messages.map((msg) => ({
        content: `[${msg.type}]: ${msg.content}`,
        // Always send as user to prevent the assistant from misunderstanding its role.
        role: 'user' as const,
      }));

      console.log('🔄 Processing AI responses for message:', currentInput);

      const editorUserTempId = `temp-${(Date.now() + 1).toString()}`;
      const chatMateTempId = `temp-${(Date.now() + 2).toString()}`;
      const editorChatMateTempId = `temp-${(Date.now() + 3).toString()}`;

      // Editor Mate comment on user message
      const editorUserMessage: Message = {
        content: '',
        id: editorUserTempId,
        isStreaming: true,
        parentMessageId: savedUserMessage?.id ?? userMessage.id,
        timestamp: new Date(),
        type: 'editor-mate',
      };

      setMessages((prev) => [...prev, editorUserMessage]);

      const editorUserResult = await callAI(
        currentInput,
        'editor-mate-user-comment',
        fullHistory,
        editorUserTempId,
        controller.signal
      );

      const savedEditorUserMessage = saveMessage(
        {
          content: editorUserResult.content,
          metadata: editorUserResult.metadata,
          parentMessageId: savedUserMessage?.id ?? userMessage.id,
          reasoning: editorUserResult.reasoning,
          type: 'editor-mate',
        },
        currentConversationId
      );

      if (savedEditorUserMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editorUserTempId
              ? {
                  ...msg,
                  content: editorUserResult.content,
                  id: savedEditorUserMessage.id,
                  isStreaming: false,
                  metadata: editorUserResult.metadata,
                  reasoning: editorUserResult.reasoning,
                }
              : msg
          )
        );
      }

      // Chat Mate response
      const chatMateMessage: Message = {
        content: '',
        id: chatMateTempId,
        isStreaming: true,
        timestamp: new Date(),
        type: 'chat-mate',
      };

      setMessages((prev) => [...prev, chatMateMessage]);

      const chatMateResult = await callAI(
        currentInput,
        'chat-mate-response',
        chatMateHistory,
        chatMateTempId,
        controller.signal
      );

      const savedChatMateMessage = saveMessage(
        {
          content: chatMateResult.content,
          metadata: chatMateResult.metadata,
          reasoning: chatMateResult.reasoning,
          type: 'chat-mate',
        },
        currentConversationId
      );

      if (savedChatMateMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === chatMateTempId
              ? {
                  ...msg,
                  content: chatMateResult.content,
                  id: savedChatMateMessage.id,
                  isStreaming: false,
                  metadata: chatMateResult.metadata,
                  reasoning: chatMateResult.reasoning,
                }
              : msg
          )
        );
      }

      // Editor Mate comment on Chat Mate response
      const editorChatMateMessage: Message = {
        content: '',
        id: editorChatMateTempId,
        isStreaming: true,
        parentMessageId: savedChatMateMessage?.id ?? chatMateTempId,
        timestamp: new Date(),
        type: 'editor-mate',
      };

      setMessages((prev) => [...prev, editorChatMateMessage]);

      const editorChatMateResult = await callAI(
        chatMateResult.content,
        'editor-mate-chatmate-comment',
        fullHistory,
        editorChatMateTempId,
        controller.signal
      );

      const savedEditorChatMateMessage = saveMessage(
        {
          content: editorChatMateResult.content,
          metadata: editorChatMateResult.metadata,
          parentMessageId: savedChatMateMessage?.id ?? chatMateTempId,
          reasoning: editorChatMateResult.reasoning,
          type: 'editor-mate',
        },
        currentConversationId
      );

      if (savedEditorChatMateMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === editorChatMateTempId
              ? {
                  ...msg,
                  content: editorChatMateResult.content,
                  id: savedEditorChatMateMessage.id,
                  isStreaming: false,
                  metadata: editorChatMateResult.metadata,
                  reasoning: editorChatMateResult.reasoning,
                }
              : msg
          )
        );
      }

      onConversationUpdate();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        console.log('🛑 Generation cancelled by user.');
        toast({
          description: 'Message generation was cancelled.',
          title: 'Cancelled',
        });
        setMessages((prev) =>
          prev.filter((msg) => !msg.isStreaming && !msg.id.startsWith('temp-'))
        );
      } else {
        console.error('❌ Error sending message:', error);
        toast({
          description:
            error instanceof Error ? error.message : 'Failed to send message',
          title: 'Error',
          variant: 'destructive',
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
      void handleSendMessage();
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
              Chat Mate will respond naturally, and Editor Mate will provide
              helpful feedback.
            </p>
          </div>
        )}

        {messages.map((message) => (
          <EnhancedChatMessage
            key={message.id}
            message={message}
            onDeleteAllBelow={deleteAllBelow}
            onDeleteMessage={deleteMessage}
            onEditMessage={editMessage}
            onForkFrom={forkFromMessage}
            onRegenerateMessage={(messageId) =>
              void regenerateMessage(messageId)
            }
            onTextSelect={handleTextSelect}
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
            <Button onClick={handleCancel} variant="outline">
              <Square className="w-4 h-4 mr-2" />
              Stop generating
            </Button>
          </div>
        ) : (
          <div className="flex items-end space-x-2">
            <Textarea
              className="flex-1 min-h-[40px] max-h-[120px]"
              disabled={isLoading}
              onChange={(e) => {
                setInputMessage(e.target.value);
              }}
              onKeyDown={handleKeyPress}
              placeholder={`Type in ${targetLanguage} or your native language...`}
              ref={textareaRef}
              rows={1}
              value={inputMessage}
            />
            {isMobile && onAskInterfaceOpen && (
              <Button
                className="h-10 w-10 flex-shrink-0"
                onClick={onAskInterfaceOpen}
                size="icon"
                title="Open Ask Interface"
                variant="outline"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
            <Button
              className="h-10 w-10 flex-shrink-0"
              disabled={!inputMessage.trim() || isLoading}
              onClick={() => void handleSendMessage()}
              size="icon"
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
