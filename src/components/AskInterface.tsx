import {
  Book,
  BookOpen,
  ExternalLink,
  Globe,
  Play,
  Search,
  Send,
} from 'lucide-react';
import { useEffect, useRef, useState } from 'react';

import type { Message } from '@/schemas/messages';
import type { PromptVariables } from '@/services/prompts';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useToast } from '@/hooks/use-toast';
import {
  aiChatNonStreamResponseSchema,
  aiChatStreamResponseSchema,
} from '@/schemas/api';
import { apiClient } from '@/services/apiClient';
import { buildPrompt } from '@/services/prompts';

import EnhancedChatMessage from './EnhancedChatMessage';

/**
 *
 */
interface AskInterfaceProps {
  editorMatePrompt?: string;
  hideHeader?: boolean;
  onClose?: () => void;
  onTextSelect?: (text: string) => void;
  selectedText: string;
  selectionSource?: 'ask-interface' | 'main-chat';
  targetLanguage?: string;
}

const AskInterface = ({
  editorMatePrompt = 'You are a patient teacher. Provide helpful explanations about language usage, grammar, and cultural context.',
  hideHeader = false,
  onClose,
  onTextSelect,
  selectedText,
  selectionSource = 'main-chat',
  targetLanguage = 'Swedish',
}: AskInterfaceProps) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editableSelectedText, setEditableSelectedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { globalSettings } = useUnifiedStorage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Don't scroll agressively as the messages come.
  // The output from Chat Mate and Editor Mate is often long,
  // so we should keep the scroll position to let the user scroll themself and read.
  const lastUserMessageId = conversation
    .slice()
    .reverse()
    .find((m) => m.type === 'user')?.id;
  useEffect(() => {
    scrollToBottom();
  }, [lastUserMessageId]);

  // Update editable selected text when selectedText prop changes
  useEffect(() => {
    if (selectedText.trim()) {
      setEditableSelectedText(selectedText);

      if (selectionSource === 'main-chat') {
        const welcomeMessage: Message = {
          content: `I can help you understand "${selectedText}". What would you like to know about this text?`,
          id: Date.now().toString(),
          timestamp: new Date(),
          type: 'editor-mate',
        };
        setConversation([welcomeMessage]);
      }
    }
  }, [selectedText, selectionSource]);

  const quickLinks = [
    {
      icon: Globe,
      name: 'Google Quoted',
      url: (text: string) =>
        `https://www.google.com/search?q=${encodeURIComponent(`"${text}"`)}`,
    },
    {
      icon: Book,
      name: 'Wiktionary',
      url: (text: string) =>
        `https://en.wiktionary.org/wiki/${encodeURIComponent(text)}`,
    },
    {
      icon: BookOpen,
      name: 'SAOL',
      url: (text: string) =>
        `https://svenska.se/tre/?sok=${encodeURIComponent(text)}`,
    },
    {
      icon: Play,
      name: 'YouGlish',
      url: (text: string) =>
        `https://youglish.com/pronounce/${encodeURIComponent(text)}/${targetLanguage.toLowerCase()}`,
    },
  ];

  const callEditorMateStreaming = async (question: string) => {
    const conversationHistory = conversation.map((msg) => ({
      content: `[${msg.type}]: ${msg.content}`,
      // Always send as user to prevent the assistant from misunderstanding its role.
      role: 'user' as const,
    }));

    const contextMessage = editableSelectedText
      ? `The user has selected this text: "${editableSelectedText}". Answer their question about it: ${question}`
      : question;

    // Build system prompt using the new prompt system
    const promptVariables: PromptVariables = {
      chatMateBackground:
        'A friendly local who enjoys helping people learn the language and culture.',
      chatMatePersonality:
        'A friendly native speaker who enjoys helping people learn the language.',
      culturalContext: globalSettings.culturalContext,
      editorMateExpertise: globalSettings.editorMateExpertise,
      editorMatePersonality: editorMatePrompt,
      feedbackStyle: globalSettings.feedbackStyle,
      progressiveComplexity: globalSettings.progressiveComplexity,
      targetLanguage,
    };

    const builtPrompt = buildPrompt({
      messageType: 'editor-mate-response',
      variables: promptVariables,
    });

    const startTime: number = Date.now();

    const currentDateTime = new Date().toLocaleString('en-US', {
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

    const response = await apiClient.aiChat({
      apiKey: globalSettings.apiKey || '',
      chatMateBackground:
        promptVariables.chatMateBackground ?? 'A friendly local',
      chatMatePrompt:
        promptVariables.chatMatePersonality ?? 'A friendly native speaker',
      conversationHistory,
      culturalContext: promptVariables.culturalContext,
      currentDateTime,
      editorMateExpertise:
        promptVariables.editorMateExpertise ?? '10+ years teaching experience',
      editorMatePrompt:
        promptVariables.editorMatePersonality ?? editorMatePrompt,
      enableReasoning: globalSettings.enableReasoning,
      feedbackStyle: promptVariables.feedbackStyle,
      message: contextMessage,
      messageType: 'editor-mate-response',
      model: globalSettings.model || 'google/gemini-2.5-flash',
      progressiveComplexity: promptVariables.progressiveComplexity,
      streaming: globalSettings.streaming,
      systemPrompt: builtPrompt.systemPrompt,
      targetLanguage,
      userTimezone,
    });

    if (!response.ok) {
      const errorData = await response.json();
      const errorMessage =
        errorData &&
        typeof errorData === 'object' &&
        'error' in errorData &&
        typeof errorData.error === 'string'
          ? errorData.error
          : 'Failed to get Editor Mate response';
      throw new Error(errorMessage);
    }

    if (globalSettings.streaming && response.body) {
      return {
        model: globalSettings.model,
        response: response.body,
        startTime,
      };
    } else {
      const rawData = await response.json();
      const parseResult = aiChatNonStreamResponseSchema.safeParse(rawData);
      if (!parseResult.success) {
        throw new Error('Invalid response format from Editor Mate');
      }
      const data = parseResult.data;
      if (!data.response) {
        throw new Error('No response from Editor Mate');
      }
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      return {
        generationTime,
        model: globalSettings.model,
        response: data.response,
      };
    }
  };

  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      content: question.trim(),
      id: Date.now().toString(),
      timestamp: new Date(),
      type: 'user',
    };

    setConversation((prev) => [...prev, userMessage]);
    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    const editorMessageId = (Date.now() + 1).toString();

    // Create initial streaming message
    const initialEditorMessage: Message = {
      content: '',
      id: editorMessageId,
      isStreaming: true,
      metadata: {
        startTime: Date.now(),
      },
      timestamp: new Date(),
      type: 'editor-mate',
    };

    setConversation((prev) => [...prev, initialEditorMessage]);

    try {
      const result = await callEditorMateStreaming(currentQuestion);
      // Type guard to check the result structure
      if (
        typeof result !== 'object' ||
        !('model' in result) ||
        !('response' in result)
      ) {
        throw new Error('Invalid response structure');
      }
      const { model, response } = result;
      const startTime = 'startTime' in result ? result.startTime : undefined;

      if (typeof response === 'string') {
        // Non-streaming response
        const endTime = Date.now();
        const generationTime = endTime - (startTime ?? Date.now());

        setConversation((prev) =>
          prev.map((msg) =>
            msg.id === editorMessageId
              ? {
                  ...msg,
                  content: response,
                  isStreaming: false,
                  metadata: {
                    endTime,
                    generationTime,
                    model,
                    startTime,
                  },
                }
              : msg
          )
        );
      } else {
        // Streaming response
        if (!response.body) {
          throw new Error('No response body for streaming');
        }
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let isStreamingComplete = false;

        try {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition -- infinite loop requires explicit break condition
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            const lines = chunk.split('\n');

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') {
                  isStreamingComplete = true;
                  const endTime = Date.now();
                  const generationTime = endTime - (startTime ?? Date.now());

                  setConversation((prev) =>
                    prev.map((msg) =>
                      msg.id === editorMessageId
                        ? {
                            ...msg,
                            isStreaming: false,
                            metadata: {
                              endTime,
                              generationTime,
                              model,
                              startTime,
                            },
                          }
                        : msg
                    )
                  );
                  break;
                }

                try {
                  const rawParsed = JSON.parse(data);
                  const parseResult =
                    aiChatStreamResponseSchema.safeParse(rawParsed);
                  if (!parseResult.success) {
                    continue;
                  }
                  const parsed = parseResult.data;
                  if (parsed.content && typeof parsed.content === 'string') {
                    const content: string = parsed.content;
                    accumulatedContent += content;
                    setConversation((prev) =>
                      prev.map((msg) =>
                        msg.id === editorMessageId
                          ? {
                              ...msg,
                              content: accumulatedContent,
                              isStreaming: true,
                            }
                          : msg
                      )
                    );
                  }
                } catch {
                  // Skip invalid JSON
                }
              }
            }

            if (isStreamingComplete) break;
          }
        } finally {
          reader.releaseLock();
        }
      }
    } catch (error) {
      setConversation((prev) =>
        prev.filter((msg) => msg.id !== editorMessageId)
      );
      toast({
        description:
          error instanceof Error
            ? error.message
            : 'Failed to get response from Editor Mate',
        title: 'Error',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
      // Set all messages' isStreaming to false when loading is done
      setConversation((prev) =>
        prev.map((msg) => ({
          ...msg,
          isStreaming: false,
        }))
      );
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSendQuestion();
    }
  };

  return (
    <div className="flex flex-col h-full bg-background">
      {/* Header - only show when not in mobile drawer (onClose indicates mobile drawer) and not hideHeader */}
      {!onClose && !hideHeader && (
        <div className="p-4 border-b border-border">
          <div className="flex items-center justify-between mb-2">
            <h2 className="font-semibold flex items-center gap-2 text-foreground">
              <Search className="w-4 h-4" />
              Editor Mate
            </h2>
          </div>

          {/* Always visible selected text input */}
          <div className="bg-muted rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Selected text:
            </p>
            <Input
              className="bg-background"
              onChange={(e) => {
                setEditableSelectedText(e.target.value);
              }}
              placeholder="Enter or paste text you want to ask about..."
              value={editableSelectedText}
            />
          </div>

          {/* Quick Links */}
          {editableSelectedText && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Tools
              </p>
              <div className="grid grid-cols-2 gap-1">
                {quickLinks.map((link) => (
                  <Button
                    className="justify-start h-6 text-xs px-2"
                    key={link.name}
                    onClick={() =>
                      window.open(link.url(editableSelectedText), '_blank')
                    }
                    size="sm"
                    variant="outline"
                  >
                    <link.icon className="w-2.5 h-2.5 mr-1" />
                    {link.name}
                    <ExternalLink className="w-2 h-2 ml-auto" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Mobile header - only show when in mobile drawer and not hideHeader */}
      {onClose && !hideHeader && (
        <div className="p-4 border-b border-border">
          {/* Always visible selected text input */}
          <div className="bg-muted rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-muted-foreground mb-2">
              Selected text:
            </p>
            <Input
              className="bg-background"
              onChange={(e) => {
                setEditableSelectedText(e.target.value);
              }}
              placeholder="Enter or paste text you want to ask about..."
              value={editableSelectedText}
            />
          </div>

          {/* Quick Links */}
          {editableSelectedText && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                Quick Tools
              </p>
              <div className="grid grid-cols-2 gap-1">
                {quickLinks.map((link) => (
                  <Button
                    className="justify-start h-6 text-xs px-2"
                    key={link.name}
                    onClick={() =>
                      window.open(link.url(editableSelectedText), '_blank')
                    }
                    size="sm"
                    variant="outline"
                  >
                    <link.icon className="w-2.5 h-2.5 mr-1" />
                    {link.name}
                    <ExternalLink className="w-2 h-2 ml-auto" />
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Conversation Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto text-muted-foreground mb-4" />
              <p className="text-sm text-muted-foreground mb-2">
                Enter text above or select text from the chat to ask questions
              </p>
              <p className="text-xs text-muted-foreground">
                Or ask Editor Mate anything about {targetLanguage}!
              </p>
            </div>
          )}

          {conversation.map((msg) => (
            <EnhancedChatMessage
              key={msg.id}
              message={msg}
              onTextSelect={
                onTextSelect ??
                (() => {
                  /* No-op fallback */
                })
              }
            />
          ))}

          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t border-border">
        <div className="flex items-end gap-2">
          <Textarea
            className="flex-1 text-sm min-h-[40px] max-h-[120px]"
            disabled={isLoading}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Editor Mate about ${targetLanguage}...`}
            rows={1}
            value={question}
          />
          <Button
            className="h-10 w-10 flex-shrink-0"
            disabled={!question.trim() || isLoading}
            onClick={() => void handleSendQuestion()}
            size="icon"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskInterface;
