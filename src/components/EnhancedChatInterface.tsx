import { Bot, Loader2, MessageSquare, Send, Square, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { z } from 'zod/v4';

import type { Attachment } from '@/schemas/imageAttachment';
import type { Message, MessageMetadata } from '@/schemas/messages';
import type {
  MessageType as PromptMessageType,
  PromptVariables,
} from '@/services/prompts/promptTypes';

import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useToast } from '@/hooks/use-toast';
import { useAIStreaming } from '@/hooks/useAIStreaming';
import { useImageUpload } from '@/hooks/useImageUpload';
import { useTitleGeneration } from '@/hooks/useTitleGeneration';
import { logError } from '@/lib/utils';
import { apiMessageTypeSchema } from '@/schemas/api';
import { apiClient } from '@/services/apiClient';
import { buildPrompt } from '@/services/prompts/promptBuilder';
import { convertMessagesToApiFormat } from '@/utils/messageRoleMapper';
import { extractImageUrls } from '@/utils/urlDetection';

import EnhancedChatMessage from './EnhancedChatMessage';
import { ImageDropZone } from './ImageDropZone';
import { ImageGrid } from './ImageGrid';
import { ImageUploadButton } from './ImageUploadButton';
import NewConversationQuickStart from './NewConversationQuickStart';

/**
 *
 */
interface EnhancedChatInterfaceProps {
  conversationId: null | string;
  editorMatePrompt?: string;
  onChatSettingsOpen?: () => void;
  onConversationCreated: (id: string) => void;
  onConversationUpdate: () => void;
  onEditorMatePanelOpen?: () => void;
  onTextSelect: (text: string) => void;
  selectedText?: string;
  targetLanguage: string;
}

const EnhancedChatInterface = ({
  conversationId,
  editorMatePrompt,
  onConversationCreated,
  onConversationUpdate,
  onEditorMatePanelOpen,
  onTextSelect,
  targetLanguage,
}: EnhancedChatInterfaceProps): React.JSX.Element => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [abortController, setAbortController] =
    useState<AbortController | null>(null);
  const [isCreatingNewConversation, setIsCreatingNewConversation] =
    useState(false);
  const [componentReady, setComponentReady] = useState(false);
  const [pendingLanguage, setPendingLanguage] = useState<null | string>(null);
  const [pendingModel, setPendingModel] = useState<null | string>(null);
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
    updateConversationSettings,
    updateMessage,
  } = useUnifiedStorage();
  const isMobile = useIsMobile();

  // Image upload functionality
  const {
    clearImages,
    getValidImages,
    images: uploadedImages,
    isUploading,
    removeImage,
    reorderImages,
    uploadImages,
  } = useImageUpload({
    maxImages: 5,
    onError: (error) => {
      toast({
        description: error.getUserMessage(),
        title: 'Image Upload Error',
        variant: 'destructive',
      });
    },
    onSuccess: (images) => {
      toast({
        description: `Successfully uploaded ${String(images.length)} image${images.length > 1 ? 's' : ''}`,
        title: 'Upload Complete',
      });
    },
  });

  // Set up streaming hook with callbacks for message updates
  const { handleStreamingResponse: handleStreamingWithHook } = useAIStreaming({
    onComplete: ({ messageId, metadata }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                isStreaming: false,
                metadata,
              }
            : msg
        )
      );
    },
    onContentUpdate: ({ content, messageId, reasoning }) => {
      setMessages((prev) =>
        prev.map((msg) =>
          msg.id === messageId
            ? {
                ...msg,
                content,
                isStreaming: true,
                reasoning,
              }
            : msg
        )
      );
    },
  });

  // Get current conversation settings
  const chatSettings = conversationId
    ? getConversationSettings(conversationId)
    : null;

  // Use chat-specific settings if available, otherwise fall back to global settings
  const effectiveModel = chatSettings?.model ?? globalSettings.model;
  const effectiveApiKey = chatSettings?.apiKey ?? globalSettings.apiKey;

  // Set up title generation
  useTitleGeneration({
    conversationId,
    effectiveModel,
    getConversation,
    messages,
    onConversationUpdate,
    targetLanguage,
    updateConversation,
  });

  const chatMatePrompt =
    chatSettings?.chatMatePersonality ??
    'You are a friendly local who loves to chat about daily life, culture, and local experiences.';
  const currentEditorMatePrompt =
    editorMatePrompt ??
    chatSettings?.editorMatePersonality ??
    'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.';

  // Mark component as ready and ensure focus
  useEffect(() => {
    if (!componentReady) {
      setComponentReady(true);

      // Use a small delay to ensure the textarea is fully rendered
      setTimeout(() => {
        if (textareaRef.current && !conversationId) {
          textareaRef.current.focus();
        }
      }, 100);
    }
  }, [componentReady, conversationId]);

  const scrollToBottom = (): void => {
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
      loadMessages();
      // Clear pending selections when we switch to an existing conversation
      setPendingLanguage(null);
      setPendingModel(null);
    } else if (!conversationId) {
      setMessages([]);
      // Keep pending selections when no conversation is selected
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- To be reviewed and fixed
  }, [conversationId, isCreatingNewConversation]);

  // Focus input field when AI responses complete
  useEffect(() => {
    if (!isLoading && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isLoading]);

  const loadMessages = (): void => {
    if (!conversationId) return;

    try {
      const conversationMessages = getMessages(conversationId);

      const formattedMessages = conversationMessages.map((msg) => ({
        attachments: msg.attachments,
        content: msg.content,
        id: msg.id,
        isStreaming: msg.isStreaming,
        metadata: msg.metadata,
        parentMessageId: msg.parentMessageId,
        reasoning: msg.reasoning,
        timestamp: msg.timestamp,
        type: msg.type,
      }));

      setMessages(formattedMessages);
    } catch (error) {
      logError('Error loading messages:', error);
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
  ): Message | null => {
    try {
      const savedMessage = addMessage(actualConversationId, {
        attachments: message.attachments,
        content: message.content,
        metadata: message.metadata,
        parentMessageId: message.parentMessageId,
        reasoning: message.reasoning,
        type: message.type,
      });
      return savedMessage;
    } catch (error) {
      logError('Error saving message:', error);
      return null;
    }
  };

  const deleteMessage = (messageId: string): void => {
    try {
      deleteMessageFromStorage(messageId);
      setMessages((prev) => prev.filter((msg) => msg.id !== messageId));

      toast({
        description: 'Message deleted',
        title: 'Success',
      });
    } catch (error) {
      logError('Error deleting message:', error);
      toast({
        description: 'Failed to delete message',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const deleteAllBelow = (messageId: string): void => {
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
      logError('Error deleting messages:', error);
      toast({
        description: 'Failed to delete messages',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const editMessage = (messageId: string, newContent: string): void => {
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
      logError('Error editing message:', error);
      toast({
        description: 'Failed to edit message',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const regenerateMessage = async (messageId: string): Promise<void> => {
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
      const conversationHistory = convertMessagesToApiFormat(historyMessages);

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

      const parseResult = apiMessageTypeSchema.safeParse(messageType);
      if (!parseResult.success) {
        throw new Error('Invalid message type');
      }

      /**
       * Type guard to ensure we have a valid prompt message type
       * @param messageType - The message type to validate
       */
      function isPromptMessageType(
        messageType: string
      ): messageType is PromptMessageType {
        return (
          messageType === 'chat-mate-response' ||
          messageType === 'editor-mate-chatmate-comment' ||
          messageType === 'editor-mate-response' ||
          messageType === 'editor-mate-user-comment'
        );
      }

      if (!isPromptMessageType(parseResult.data)) {
        throw new Error(
          `Message type ${parseResult.data} should not be handled in chat interface`
        );
      }

      const response = await callAI({
        currentConversationId: conversationId ?? undefined,
        history: conversationHistory,
        message: userMessage,
        messageType: parseResult.data,
        signal: controller.signal,
        streamingMessageId: messageId,
      });

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
        toast({
          description: 'Message regeneration was cancelled.',
          title: 'Cancelled',
        });
      } else {
        logError('Error regenerating message:', error);
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

  const forkFromMessage = (messageId: string): void => {
    try {
      // Find the message index
      const messageIndex = messages.findIndex((msg) => msg.id === messageId);
      if (messageIndex === -1) return;

      // Create a new conversation
      const newConversation = createConversation({
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
      logError('Error forking conversation:', error);
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
      feedbackLanguage:
        chatSettings?.feedbackLanguage ?? globalSettings.feedbackLanguage,
      feedbackStyle: chatSettings?.feedbackStyle ?? 'encouraging',
      progressiveComplexity: chatSettings?.progressiveComplexity ?? true,
      targetLanguage,
    };
  };

  const callAI = async (options: {
    attachments?: Attachment[];
    currentConversationId?: string;
    history: {
      content: string;
      role: 'assistant' | 'system' | 'user';
    }[];
    message: string;
    messageType: PromptMessageType;
    overrideModel?: string;
    overrideTargetLanguage?: string;
    signal: AbortSignal;
    streamingMessageId: string;
  }): Promise<{
    content: string;
    metadata: MessageMetadata;
    reasoning: string | undefined;
  }> => {
    const {
      attachments,
      currentConversationId,
      history,
      message,
      messageType,
      overrideModel,
      overrideTargetLanguage,
      signal,
      streamingMessageId,
    } = options;
    // Build system prompt using the new prompt system
    const promptVariables = buildPromptVariables();

    // Get current target language - priority: override > conversation-specific > prop fallback
    const currentTargetLanguage =
      overrideTargetLanguage ??
      (currentConversationId
        ? getConversationSettings(currentConversationId).targetLanguage
        : targetLanguage);

    // Get current model - priority: override > conversation-specific > prop fallback
    const currentModel =
      overrideModel ??
      (currentConversationId
        ? getConversationSettings(currentConversationId).model
        : effectiveModel);
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
        attachments,
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
        model: currentModel,
        progressiveComplexity: promptVariables.progressiveComplexity,
        streaming:
          (conversationId
            ? chatSettings?.streaming
            : globalSettings.streaming) ?? true,
        systemPrompt: builtPrompt.systemPrompt,
        targetLanguage: currentTargetLanguage,
        userTimezone,
      },
      { signal }
    );

    if (!response.ok) {
      const rawErrorData = await response.json();
      const errorData = z
        .looseObject({ error: z.string().optional() })
        .parse(rawErrorData);
      throw new Error(errorData.error ?? 'Failed to get AI response');
    }

    const contentType = response.headers.get('content-type');
    if (contentType?.includes('text/event-stream')) {
      return await handleStreamingWithHook({
        messageId: streamingMessageId,
        model: currentModel,
        response,
        startTime,
      });
    } else {
      const rawData = await response.json();
      const data = z
        .object({
          reasoning: z.string().optional(),
          response: z.string(),
        })
        .parse(rawData);
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      const metadata = {
        endTime,
        generationTime,
        model: currentModel,
        startTime,
      };
      return { content: data.response, metadata, reasoning: data.reasoning };
    }
  };

  const createNewConversation = (language?: string, model?: string): string => {
    try {
      // Use pending selections or provided parameters
      const finalLanguage = language ?? pendingLanguage ?? targetLanguage;
      const finalModel = model ?? pendingModel;

      const newConversation = createConversation({
        language: finalLanguage,
        title: `${finalLanguage} Chat`, // Better initial title that will be replaced
      });

      // Apply model setting if specified (either pending or provided)
      if (finalModel) {
        updateConversationSettings(newConversation.id, { model: finalModel });
      }

      // Apply language setting to target language for AI interactions
      if (finalLanguage !== targetLanguage) {
        updateConversationSettings(newConversation.id, {
          targetLanguage: finalLanguage,
        });
      }

      // Clear pending selections after use
      setPendingLanguage(null);
      setPendingModel(null);

      return newConversation.id;
    } catch (error) {
      logError('❌ Error creating conversation:', error);
      throw error;
    }
  };

  const handleSendMessage = async (): Promise<void> => {
    if (!inputMessage.trim() || isLoading) return;

    const controller = new AbortController();
    setAbortController(controller);

    let currentConversationId = conversationId;
    let effectiveTargetLanguage = targetLanguage;
    let effectiveModelForCall = chatSettings?.model ?? globalSettings.model;

    if (!currentConversationId) {
      try {
        setIsCreatingNewConversation(true);

        // Store the effective target language and model before creating conversation
        effectiveTargetLanguage = pendingLanguage ?? targetLanguage;
        effectiveModelForCall = pendingModel ?? effectiveModelForCall;
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

    // Extract URLs from input text and get file attachments
    const { cleanedText, urlAttachments } = extractImageUrls(
      inputMessage.trim()
    );
    const fileAttachments = getValidImages();

    // Combine all attachments
    const allAttachments: Attachment[] = [
      ...fileAttachments,
      ...urlAttachments,
    ];

    const userMessage: Message = {
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
      content: cleanedText,
      id: `temp-${Date.now().toString()}`,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = cleanedText;
    setInputMessage('');
    setIsLoading(true);

    if (!currentConversationId) {
      logError('❌ Error: No conversation ID available');
      toast({
        description: 'Failed to get conversation ID',
        title: 'Error',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

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

      const chatMateHistory = convertMessagesToApiFormat(
        messages.filter(
          (msg) => msg.type === 'user' || msg.type === 'chat-mate'
        )
      );

      const fullHistory = convertMessagesToApiFormat(messages);

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

      const editorUserResult = await callAI({
        attachments: allAttachments,
        currentConversationId,
        history: fullHistory,
        message: currentInput,
        messageType: 'editor-mate-user-comment',
        overrideModel: effectiveModelForCall,
        overrideTargetLanguage: effectiveTargetLanguage,
        signal: controller.signal,
        streamingMessageId: editorUserTempId,
      });

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

      const chatMateResult = await callAI({
        attachments: allAttachments,
        currentConversationId,
        history: chatMateHistory,
        message: currentInput,
        messageType: 'chat-mate-response',
        overrideModel: effectiveModelForCall,
        overrideTargetLanguage: effectiveTargetLanguage,
        signal: controller.signal,
        streamingMessageId: chatMateTempId,
      });

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

      const editorChatMateResult = await callAI({
        currentConversationId,
        history: fullHistory,
        message: chatMateResult.content,
        messageType: 'editor-mate-chatmate-comment',
        overrideModel: effectiveModelForCall,
        overrideTargetLanguage: effectiveTargetLanguage,
        signal: controller.signal,
        streamingMessageId: editorChatMateTempId,
      });

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
        toast({
          description: 'Message generation was cancelled.',
          title: 'Cancelled',
        });
        setMessages((prev) =>
          prev.filter((msg) => !msg.isStreaming && !msg.id.startsWith('temp-'))
        );
      } else {
        logError('❌ Error sending message:', error);
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
      // Clear uploaded images after all AI operations complete
      clearImages();
    }
  };

  const handleSendUserOnly = async (): Promise<void> => {
    if (!inputMessage.trim() || isLoading) return;

    const controller = new AbortController();
    setAbortController(controller);

    let currentConversationId = conversationId;
    let effectiveTargetLanguage = targetLanguage;
    let effectiveModelForCall = chatSettings?.model ?? globalSettings.model;

    if (!currentConversationId) {
      try {
        setIsCreatingNewConversation(true);

        // Store the effective target language and model before creating conversation
        effectiveTargetLanguage = pendingLanguage ?? targetLanguage;
        effectiveModelForCall = pendingModel ?? effectiveModelForCall;
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

    // Extract URLs from input text and get file attachments
    const { cleanedText, urlAttachments } = extractImageUrls(
      inputMessage.trim()
    );
    const fileAttachments = getValidImages();

    // Combine all attachments
    const allAttachments: Attachment[] = [
      ...fileAttachments,
      ...urlAttachments,
    ];

    const userMessage: Message = {
      attachments: allAttachments.length > 0 ? allAttachments : undefined,
      content: cleanedText,
      id: `temp-${Date.now().toString()}`,
      timestamp: new Date(),
      type: 'user',
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = cleanedText;
    setInputMessage('');
    setIsLoading(true);

    // Clear uploaded images immediately after sending message
    clearImages();

    if (!currentConversationId) {
      logError('❌ Error: No conversation ID available');
      toast({
        description: 'Failed to get conversation ID',
        title: 'Error',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

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

      const fullHistory = messages.map((msg) => ({
        content: `[${msg.type}]: ${msg.content}`,
        // Always send as user to prevent the assistant from misunderstanding its role.
        role: 'user' as const,
      }));

      const editorUserTempId = `temp-${(Date.now() + 1).toString()}`;

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

      const editorUserResult = await callAI({
        attachments: allAttachments,
        currentConversationId,
        history: fullHistory,
        message: currentInput,
        messageType: 'editor-mate-user-comment',
        overrideModel: effectiveModelForCall,
        overrideTargetLanguage: effectiveTargetLanguage,
        signal: controller.signal,
        streamingMessageId: editorUserTempId,
      });

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

      onConversationUpdate();
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        toast({
          description: 'Message generation was cancelled.',
          title: 'Cancelled',
        });
        setMessages((prev) =>
          prev.filter((msg) => !msg.isStreaming && !msg.id.startsWith('temp-'))
        );
      } else {
        logError('❌ Error sending message:', error);
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
      // Clear uploaded images after all AI operations complete
      clearImages();
    }
  };

  const handleSendChatMateOnly = async (): Promise<void> => {
    if (!inputMessage.trim() || isLoading) return;

    const controller = new AbortController();
    setAbortController(controller);

    let currentConversationId = conversationId;
    let effectiveTargetLanguage = targetLanguage;
    let effectiveModelForCall = chatSettings?.model ?? globalSettings.model;

    if (!currentConversationId) {
      try {
        setIsCreatingNewConversation(true);

        // Store the effective target language and model before creating conversation
        effectiveTargetLanguage = pendingLanguage ?? targetLanguage;
        effectiveModelForCall = pendingModel ?? effectiveModelForCall;
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

    // Extract URLs from input text (chat-mate messages don't have attachments, but we clean the text)
    const { cleanedText } = extractImageUrls(inputMessage.trim());

    const chatMateMessage: Message = {
      content: cleanedText,
      id: `temp-${Date.now().toString()}`,
      timestamp: new Date(),
      type: 'chat-mate',
    };

    setMessages((prev) => [...prev, chatMateMessage]);
    const currentInput = cleanedText;
    setInputMessage('');
    // Clear uploaded images after adding to message
    clearImages();
    setIsLoading(true);

    if (!currentConversationId) {
      logError('❌ Error: No conversation ID available');
      toast({
        description: 'Failed to get conversation ID',
        title: 'Error',
        variant: 'destructive',
      });
      setIsLoading(false);
      return;
    }

    try {
      const savedChatMateMessage = saveMessage(
        chatMateMessage,
        currentConversationId
      );
      if (savedChatMateMessage) {
        setMessages((prev) =>
          prev.map((msg) =>
            msg.id === chatMateMessage.id
              ? { ...msg, id: savedChatMateMessage.id }
              : msg
          )
        );
      }

      const fullHistory = messages.map((msg) => ({
        content: `[${msg.type}]: ${msg.content}`,
        // Always send as user to prevent the assistant from misunderstanding its role.
        role: 'user' as const,
      }));

      const editorChatMateTempId = `temp-${(Date.now() + 1).toString()}`;

      // Editor Mate comment on Chat Mate message
      const editorChatMateMessage: Message = {
        content: '',
        id: editorChatMateTempId,
        isStreaming: true,
        parentMessageId: savedChatMateMessage?.id ?? chatMateMessage.id,
        timestamp: new Date(),
        type: 'editor-mate',
      };

      setMessages((prev) => [...prev, editorChatMateMessage]);

      const editorChatMateResult = await callAI({
        currentConversationId,
        history: fullHistory,
        message: currentInput,
        messageType: 'editor-mate-chatmate-comment',
        overrideModel: effectiveModelForCall,
        overrideTargetLanguage: effectiveTargetLanguage,
        signal: controller.signal,
        streamingMessageId: editorChatMateTempId,
      });

      const savedEditorChatMateMessage = saveMessage(
        {
          content: editorChatMateResult.content,
          metadata: editorChatMateResult.metadata,
          parentMessageId: savedChatMateMessage?.id ?? chatMateMessage.id,
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
        toast({
          description: 'Message generation was cancelled.',
          title: 'Cancelled',
        });
        setMessages((prev) =>
          prev.filter((msg) => !msg.isStreaming && !msg.id.startsWith('temp-'))
        );
      } else {
        logError('❌ Error sending message:', error);
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

  const handleKeyPress = (e: React.KeyboardEvent): void => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  const handlePaste = (e: React.ClipboardEvent): void => {
    const clipboardData = e.clipboardData;

    // Check if there are any image files in the clipboard
    const imageFiles: File[] = [];
    for (const file of Array.from(clipboardData.files)) {
      if (file.type.startsWith('image/')) {
        imageFiles.push(file);
      }
    }

    // If we found image files, upload them
    if (imageFiles.length > 0) {
      e.preventDefault(); // Prevent default paste behavior
      void uploadImages(imageFiles);
    }
  };

  const handleTextSelect = (text: string): void => {
    onTextSelect(text);
  };

  const handleCancel = (): void => {
    if (abortController) {
      abortController.abort();
    }
  };

  const handleLanguageSelect = (language: string): void => {
    // Set pending language selection instead of creating conversation immediately
    setPendingLanguage(language);
    toast({
      description: `Selected ${language} for next conversation`,
      title: 'Language Selected',
    });
  };

  const handleModelSelect = (model: string): void => {
    // Set pending model selection instead of creating conversation immediately
    setPendingModel(model);
    const modelName = model.split('/').pop() ?? model;
    toast({
      description: `Selected ${modelName} for next conversation`,
      title: 'Model Selected',
    });
  };

  const handleLanguageSelectorOpen = (): void => {
    // This would open a language selector dialog - for now we'll use a placeholder
    // TODO: Implement language selector dialog
    toast({
      description: 'Language selector not yet implemented',
      title: 'Info',
    });
  };

  const handleModelSelectorOpen = (): void => {
    // This would open a model selector dialog - for now we'll use a placeholder
    // TODO: Implement model selector dialog
    toast({
      description: 'Model selector not yet implemented',
      title: 'Info',
    });
  };

  return (
    <ImageDropZone
      disabled={isLoading || isUploading}
      onFilesDropped={(files) => {
        void uploadImages(files);
      }}
    >
      <div className="flex flex-col h-full">
        {/* Messages Area - Scrollable */}
        <div
          className="flex-1 overflow-y-auto p-4 min-h-0"
          data-testid="messages-container"
        >
          {messages.length === 0 && (
            <div data-testid="empty-state">
              <NewConversationQuickStart
                onLanguageSelect={handleLanguageSelect}
                onLanguageSelectorOpen={handleLanguageSelectorOpen}
                onModelSelect={handleModelSelect}
                onModelSelectorOpen={handleModelSelectorOpen}
                selectedLanguage={pendingLanguage}
                selectedModel={pendingModel}
              />
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
          {/* Image Grid - Show uploaded images */}
          {uploadedImages.length > 0 && !isLoading && (
            <div className="mb-4">
              <ImageGrid
                items={uploadedImages.map((item) => ({
                  error: item.error,
                  image: item.image,
                  isLoading: item.isLoading,
                  src: item.src,
                }))}
                onRemove={removeImage}
                onReorder={reorderImages}
                size="sm"
              />
            </div>
          )}

          <div className="flex items-end space-x-2">
            <Textarea
              className="flex-1 min-h-[40px] max-h-[120px]"
              data-testid="message-input"
              onChange={(e) => {
                setInputMessage(e.target.value);
              }}
              onKeyDown={handleKeyPress}
              onPaste={handlePaste}
              placeholder={`Type in ${targetLanguage} or your native language...`}
              ref={textareaRef}
              rows={1}
              value={inputMessage}
            />
            <ImageUploadButton
              disabled={isLoading || isUploading}
              onFilesSelected={(files) => {
                void uploadImages(files);
              }}
              size="icon"
            />
            {isMobile && onEditorMatePanelOpen && (
              <Button
                className="h-10 w-10 flex-shrink-0"
                onClick={onEditorMatePanelOpen}
                size="icon"
                title="Open Ask Interface"
                variant="outline"
              >
                <MessageSquare className="w-4 h-4" />
              </Button>
            )}
            {isLoading ? (
              <Button
                className="h-10 w-10 flex-shrink-0"
                onClick={handleCancel}
                size="icon"
                title="Stop generating"
                variant="outline"
              >
                <Square className="w-4 h-4" />
              </Button>
            ) : (
              <>
                <Button
                  className="h-10 w-10 flex-shrink-0"
                  data-testid="send-user-editor-button"
                  disabled={!inputMessage.trim() || isLoading}
                  onClick={() => void handleSendUserOnly()}
                  size="icon"
                  title="Send as user and get editor feedback only"
                  variant="outline"
                >
                  <User className="w-4 h-4" />
                </Button>
                <Button
                  className="h-10 w-10 flex-shrink-0"
                  data-testid="send-chatmate-editor-button"
                  disabled={!inputMessage.trim() || isLoading}
                  onClick={() => void handleSendChatMateOnly()}
                  size="icon"
                  title="Send as chat mate and get editor feedback"
                  variant="outline"
                >
                  <Bot className="w-4 h-4" />
                </Button>
                <Button
                  className="h-10 w-10 flex-shrink-0"
                  data-testid="send-button"
                  disabled={!inputMessage.trim() || isLoading}
                  onClick={() => void handleSendMessage()}
                  size="icon"
                  title="Send message and get full conversation flow"
                >
                  <Send className="w-4 h-4" />
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </ImageDropZone>
  );
};

export default EnhancedChatInterface;
