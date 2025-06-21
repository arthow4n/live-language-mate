import { useState, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import {
  Search,
  Send,
  ExternalLink,
  Globe,
  Book,
  Play,
  BookOpen,
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import EnhancedChatMessage from './EnhancedChatMessage';
import { Message } from '@/schemas/messages';
import { apiClient } from '@/services/apiClient';
import { buildPrompt, PromptVariables } from '@/services/prompts';

interface AskInterfaceProps {
  selectedText: string;
  onClose?: () => void;
  targetLanguage?: string;
  editorMatePrompt?: string;
  onTextSelect?: (text: string) => void;
  selectionSource?: 'main-chat' | 'ask-interface';
  hideHeader?: boolean;
}

const AskInterface = ({
  selectedText,
  onClose,
  targetLanguage = 'Swedish',
  editorMatePrompt = 'You are a patient teacher. Provide helpful explanations about language usage, grammar, and cultural context.',
  onTextSelect,
  selectionSource = 'main-chat',
  hideHeader = false,
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
          id: Date.now().toString(),
          type: 'editor-mate',
          content: `I can help you understand "${selectedText}". What would you like to know about this text?`,
          timestamp: new Date(),
        };
        setConversation([welcomeMessage]);
      }
    }
  }, [selectedText, selectionSource]);

  const quickLinks = [
    {
      name: 'Google Quoted',
      icon: Globe,
      url: (text: string) =>
        `https://www.google.com/search?q=${encodeURIComponent(`"${text}"`)}`,
    },
    {
      name: 'Wiktionary',
      icon: Book,
      url: (text: string) =>
        `https://en.wiktionary.org/wiki/${encodeURIComponent(text)}`,
    },
    {
      name: 'SAOL',
      icon: BookOpen,
      url: (text: string) =>
        `https://svenska.se/tre/?sok=${encodeURIComponent(text)}`,
    },
    {
      name: 'YouGlish',
      icon: Play,
      url: (text: string) =>
        `https://youglish.com/pronounce/${encodeURIComponent(text)}/${targetLanguage.toLowerCase()}`,
    },
  ];

  const callEditorMateStreaming = async (question: string) => {
    const conversationHistory = conversation.map((msg) => ({
      // Always send as user to prevent the assistant from misunderstanding its role.
      role: 'user' as const,
      content: `[${msg.type}]: ${msg.content}`,
    }));

    const contextMessage = editableSelectedText
      ? `The user has selected this text: "${editableSelectedText}". Answer their question about it: ${question}`
      : question;

    // Build system prompt using the new prompt system
    const promptVariables: PromptVariables = {
      targetLanguage,
      chatMatePersonality:
        'A friendly native speaker who enjoys helping people learn the language.',
      chatMateBackground:
        'A friendly local who enjoys helping people learn the language and culture.',
      editorMatePersonality: editorMatePrompt,
      editorMateExpertise: globalSettings.editorMateExpertise,
      feedbackStyle: globalSettings.feedbackStyle,
      culturalContext: globalSettings.culturalContext,
      progressiveComplexity: globalSettings.progressiveComplexity,
    };

    const builtPrompt = buildPrompt({
      messageType: 'editor-mate-response',
      variables: promptVariables,
    });

    const startTime: number = Date.now();

    const currentDateTime = new Date().toLocaleString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true,
    });
    const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    const response = await apiClient.aiChat({
      message: contextMessage,
      messageType: 'editor-mate-response',
      conversationHistory,
      systemPrompt: builtPrompt.systemPrompt,
      chatMatePrompt:
        promptVariables.chatMatePersonality ?? 'A friendly native speaker',
      editorMatePrompt:
        promptVariables.editorMatePersonality ?? editorMatePrompt,
      targetLanguage,
      model: globalSettings.model || 'google/gemini-2.5-flash',
      apiKey: globalSettings.apiKey || '',
      chatMateBackground:
        promptVariables.chatMateBackground ?? 'A friendly local',
      editorMateExpertise:
        promptVariables.editorMateExpertise ?? '10+ years teaching experience',
      feedbackStyle: promptVariables.feedbackStyle,
      culturalContext: promptVariables.culturalContext,
      progressiveComplexity: promptVariables.progressiveComplexity,
      streaming: globalSettings.streaming,
      currentDateTime,
      userTimezone,
      enableReasoning: globalSettings.enableReasoning,
    });

    if (!response.ok) {
      const errorData = (await response.json()) as { error?: string };
      throw new Error(errorData.error ?? 'Failed to get Editor Mate response');
    }

    if (globalSettings.streaming && response.body) {
      return {
        response: response.body,
        startTime,
        model: globalSettings.model,
      };
    } else {
      const data = (await response.json()) as {
        response?: string;
        reasoning?: string;
      };
      if (!data.response) {
        throw new Error('No response from Editor Mate');
      }
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      return {
        response: data.response,
        generationTime,
        model: globalSettings.model,
      };
    }
  };

  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date(),
    };

    setConversation((prev) => [...prev, userMessage]);
    const currentQuestion = question.trim();
    setQuestion('');
    setIsLoading(true);

    const editorMessageId = (Date.now() + 1).toString();

    // Create initial streaming message
    const initialEditorMessage: Message = {
      id: editorMessageId,
      type: 'editor-mate',
      content: '',
      timestamp: new Date(),
      isStreaming: true,
      metadata: {
        startTime: Date.now(),
      },
    };

    setConversation((prev) => [...prev, initialEditorMessage]);

    try {
      const result = await callEditorMateStreaming(currentQuestion);
      const { response, startTime, model } = result as {
        response: string | ReadableStream;
        startTime?: number;
        model: string;
        generationTime?: number;
      };

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
                    model,
                    generationTime,
                    startTime,
                    endTime,
                  },
                }
              : msg
          )
        );
      } else {
        // Streaming response
        const reader = (response as ReadableStream<Uint8Array>).getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let isStreamingComplete = false;

        try {
          // eslint-disable-next-line @typescript-eslint/no-unnecessary-condition
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
                              model,
                              generationTime,
                              startTime,
                              endTime,
                            },
                          }
                        : msg
                    )
                  );
                  break;
                }

                try {
                  const parsed = JSON.parse(data) as {
                    content?: string;
                    type?: string;
                  };
                  if (parsed.content) {
                    accumulatedContent += parsed.content;
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
      console.error('Error getting Editor Mate response:', error);
      setConversation((prev) =>
        prev.filter((msg) => msg.id !== editorMessageId)
      );
      toast({
        title: 'Error',
        description:
          (error as Error).message || 'Failed to get response from Editor Mate',
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
              value={editableSelectedText}
              onChange={(e) => {
                setEditableSelectedText(e.target.value);
              }}
              placeholder="Enter or paste text you want to ask about..."
              className="bg-background"
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
                    key={link.name}
                    variant="outline"
                    size="sm"
                    className="justify-start h-6 text-xs px-2"
                    onClick={() =>
                      window.open(link.url(editableSelectedText), '_blank')
                    }
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
              value={editableSelectedText}
              onChange={(e) => {
                setEditableSelectedText(e.target.value);
              }}
              placeholder="Enter or paste text you want to ask about..."
              className="bg-background"
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
                    key={link.name}
                    variant="outline"
                    size="sm"
                    className="justify-start h-6 text-xs px-2"
                    onClick={() =>
                      window.open(link.url(editableSelectedText), '_blank')
                    }
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
            value={question}
            onChange={(e) => {
              setQuestion(e.target.value);
            }}
            onKeyDown={handleKeyDown}
            placeholder={`Ask Editor Mate about ${targetLanguage}...`}
            className="flex-1 text-sm min-h-[40px] max-h-[120px]"
            disabled={isLoading}
            rows={1}
          />
          <Button
            size="icon"
            onClick={() => void handleSendQuestion()}
            disabled={!question.trim() || isLoading}
            className="h-10 w-10 flex-shrink-0"
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskInterface;
