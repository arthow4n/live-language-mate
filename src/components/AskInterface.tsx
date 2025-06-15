
import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { 
  Search, 
  Send, 
  ExternalLink, 
  X,
  Globe,
  Book,
  Play,
  Loader2,
  BookOpen
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';

interface Message {
  id: string;
  type: 'user' | 'editor';
  content: string;
  timestamp: Date;
}

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
  const { toast } = useToast();
  const { settings } = useLocalStorage();

  // Update editable selected text when selectedText prop changes
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      setEditableSelectedText(selectedText);
      
      // Only reset conversation if selection is from main chat OR there's no existing conversation
      if (selectionSource === 'main-chat' || conversation.length === 0) {
        const welcomeMessage: Message = {
          id: Date.now().toString(),
          type: 'editor',
          content: `I can help you understand "${selectedText}". What would you like to know about this text?`,
          timestamp: new Date()
        };
        setConversation([welcomeMessage]);
      }
      // If selection is from ask-interface and conversation exists, just update the selected text
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

  const callEditorMate = async (question: string) => {
    const conversationHistory = conversation.map(msg => ({
      role: msg.type === 'user' ? 'user' : 'assistant',
      content: msg.content
    }));

    const contextMessage = editableSelectedText 
      ? `The user has selected this text: "${editableSelectedText}". Answer their question about it: ${question}`
      : question;

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
        streaming: false
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Failed to get Editor Mate response');
    }

    const data = await response.json();
    
    if (!data || !data.response) {
      throw new Error('No response from Editor Mate');
    }

    return data.response;
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

    try {
      const response = await callEditorMate(currentQuestion);
      
      const editorMessage: Message = {
        id: (Date.now() + 1).toString(),
        type: 'editor',
        content: response,
        timestamp: new Date()
      };

      setConversation(prev => [...prev, editorMessage]);
    } catch (error) {
      console.error('Error getting Editor Mate response:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to get response from Editor Mate",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (selection && selection.toString().trim() && onTextSelect) {
      onTextSelect(selection.toString().trim());
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
        <div className="space-y-4" onMouseUp={handleTextSelection}>
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
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium text-foreground">
                  {msg.type === 'user' ? 'You' : 'Editor Mate'}
                </span>
                <span className="text-xs text-muted-foreground">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-primary text-primary-foreground ml-4'
                    : 'bg-muted border border-border mr-4'
                }`}
              >
                <div className="text-sm prose prose-sm max-w-none dark:prose-invert">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                    }}
                  >
                    {msg.content}
                  </ReactMarkdown>
                </div>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex items-center space-x-2 text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Editor Mate is thinking...</span>
            </div>
          )}
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
