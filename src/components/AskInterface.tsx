
import { useState, useEffect, useRef } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Send, 
  ExternalLink, 
  Globe,
  Book,
  Play,
  BookOpen
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import EnhancedChatMessage from './EnhancedChatMessage';
import { Message } from '@/types/Message';

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
  hideHeader = false
}: AskInterfaceProps) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [editableSelectedText, setEditableSelectedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { toast } = useToast();
  const { settings } = useLocalStorage();

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [conversation]);

  // Update editable selected text when selectedText prop changes
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      setEditableSelectedText(selectedText);
      
      // Only reset conversation if selection is from main chat OR there's no existing conversation
      if (selectionSource === 'main-chat' || conversation.length === 0) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'editor-mate',
          content: `I can help you understand "${selectedText}". What would you like to know about this text?`,
          timestamp: new Date()
        };
        setConversation([welcomeMessage]);
      }
    }
  }, [selectedText, selectionSource]);

  const quickLinks = [
    {
      name: 'Google Translate',
      icon: Globe,
      url: (text: string) => `https://translate.google.com/?sl=auto&tl=en&text=${encodeURIComponent(text)}`
    },
    {
      name: 'Wiktionary',
      icon: Book,
      url: (text: string) => `https://en.wiktionary.org/wiki/${encodeURIComponent(text)}`
    },
    {
      name: 'SAOL',
      icon: BookOpen,
      url: (text: string) => `https://svenska.se/tre/?sok=${encodeURIComponent(text)}`
    },
    {
      name: 'YouGlish',
      icon: Play,
      url: (text: string) => `https://youglish.com/pronounce/${encodeURIComponent(text)}/${targetLanguage.toLowerCase()}`
    }
  ];

  const callEditorMateStreaming = async (question: string) => {
    const conversationHistory = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const contextMessage = editableSelectedText 
      ? `The user has selected this text: "${editableSelectedText}". Answer their question about it: ${question}`
      : question;

    const startTime = Date.now();
    
    const response = await fetch(`https://ycjruxeyboafjlnurmdp.supabase.co/functions/v1/ai-chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InljanJ1eGV5Ym9hZmpsbnVybWRwIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDk5Mzg2NDQsImV4cCI6MjA2NTUxNDY0NH0.5gwYrvysirE3E4iFHuS8ekAvGUrtxgJPmZDyMtvQaMA`,
      },
      body: JSON.stringify({
        message: contextMessage,
        messageType: 'editor-mate-user-comment',
        conversationHistory,
        editorMatePrompt,
        targetLanguage,
        model: settings.model,
        apiKey: settings.apiKey,
        chatMateBackground: settings.chatMateBackground || 'young professional, loves local culture',
        editorMateExpertise: settings.editorMateExpertise || '10+ years teaching experience',
        feedbackStyle: settings.feedbackStyle || 'encouraging',
        culturalContext: settings.culturalContext ?? true,
        progressiveComplexity: settings.progressiveComplexity ?? true,
        streaming: settings.streaming ?? true
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get Editor Mate response');
    }

    if (settings.streaming && response.body) {
      return { response: response.body, startTime, model: settings.model };
    } else {
      const data = await response.json();
      if (!data || !data.response) {
        throw new Error('No response from Editor Mate');
      }
      const endTime = Date.now();
      const generationTime = endTime - startTime;
      return { response: data.response, generationTime, model: settings.model };
    }
  };

  const handleSendQuestion = async () => {
    if (!question.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      type: 'user',
      content: question.trim(),
      timestamp: new Date()
    };

    setConversation(prev => [...prev, userMessage]);
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
        startTime: Date.now()
      }
    };

    setConversation(prev => [...prev, initialEditorMessage]);

    try {
      const { response, startTime, model } = await callEditorMateStreaming(currentQuestion);
      
      if (typeof response === 'string') {
        // Non-streaming response
        const endTime = Date.now();
        const generationTime = endTime - startTime;
        
        console.log('Saving metadata for non-streaming response:', {
          model,
          generationTime,
          startTime,
          endTime
        });
        
        setConversation(prev => prev.map(msg => 
          msg.id === editorMessageId 
            ? { 
                ...msg, 
                content: response, 
                isStreaming: false,
                metadata: {
                  model,
                  generationTime,
                  startTime,
                  endTime
                }
              }
            : msg
        ));
      } else {
        // Streaming response
        const reader = response.getReader();
        const decoder = new TextDecoder();
        let accumulatedContent = '';
        let isStreamingComplete = false;

        try {
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
                  const generationTime = endTime - startTime;
                  
                  console.log('Saving metadata for streaming response:', {
                    model,
                    generationTime,
                    startTime,
                    endTime
                  });
                  
                  setConversation(prev => prev.map(msg => 
                    msg.id === editorMessageId 
                      ? { 
                          ...msg, 
                          isStreaming: false,
                          metadata: {
                            model,
                            generationTime,
                            startTime,
                            endTime
                          }
                        }
                      : msg
                  ));
                  break;
                }

                try {
                  const parsed = JSON.parse(data);
                  if (parsed.content && !isStreamingComplete) {
                    accumulatedContent += parsed.content;
                    setConversation(prev => prev.map(msg => 
                      msg.id === editorMessageId 
                        ? { 
                            ...msg, 
                            content: accumulatedContent,
                            isStreaming: true
                          }
                        : msg
                    ));
                  }
                } catch (e) {
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
      setConversation(prev => prev.filter(msg => msg.id !== editorMessageId));
      toast({
        title: "Error",
        description: error.message || "Failed to get response from Editor Mate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
      // Set all messages' isStreaming to false when loading is done
      setConversation(prev => prev.map(msg => ({
        ...msg,
        isStreaming: false
      })));
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Selected text:</p>
            <Input
              value={editableSelectedText}
              onChange={(e) => setEditableSelectedText(e.target.value)}
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
                    onClick={() => window.open(link.url(editableSelectedText), '_blank')}
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
            <p className="text-sm font-medium text-muted-foreground mb-2">Selected text:</p>
            <Input
              value={editableSelectedText}
              onChange={(e) => setEditableSelectedText(e.target.value)}
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
                    onClick={() => window.open(link.url(editableSelectedText), '_blank')}
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
              onTextSelect={onTextSelect || (() => {})}
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
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder={`Ask Editor Mate about ${targetLanguage}...`}
            className="flex-1 text-sm min-h-[40px] max-h-[120px]"
            disabled={isLoading}
            rows={1}
          />
          <Button 
            size="icon" 
            onClick={handleSendQuestion}
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
