
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
  Loader2
} from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
}

const AskInterface = ({ 
  selectedText, 
  onClose, 
  targetLanguage = 'Swedish',
  editorMatePrompt = 'You are a patient teacher. Provide helpful explanations about language usage, grammar, and cultural context.'
}: AskInterfaceProps) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize conversation when selectedText changes
  useEffect(() => {
    if (selectedText && selectedText.trim()) {
      const welcomeMessage: Message = {
        id: Date.now().toString(),
        type: 'editor',
        content: `I can help you understand "${selectedText}". What would you like to know about this text?`,
        timestamp: new Date()
      };
      setConversation([welcomeMessage]);
    }
  }, [selectedText]);

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

    const contextMessage = selectedText 
      ? `The user has selected this text: "${selectedText}". Answer their question about it: ${question}`
      : question;

    const { data: aiData, error: aiError } = await supabase.functions.invoke('ai-chat', {
      body: {
        message: contextMessage,
        messageType: 'editor-mate-user-comment',
        conversationHistory,
        editorMatePrompt,
        targetLanguage
      }
    });

    if (aiError) {
      throw new Error(aiError.message || 'Failed to get Editor Mate response');
    }

    if (!aiData || !aiData.response) {
      throw new Error('No response from Editor Mate');
    }

    return aiData.response;
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

  return (
    <div className="flex flex-col h-full bg-white">
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-2">
          <h2 className="font-semibold flex items-center gap-2">
            <Search className="w-4 h-4" />
            Ask Interface
          </h2>
          {onClose && (
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="w-4 h-4" />
            </Button>
          )}
        </div>
        
        {selectedText && (
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm font-medium text-gray-700 mb-2">Selected text:</p>
            <p className="text-sm bg-white rounded px-2 py-1 border">
              "{selectedText}"
            </p>
          </div>
        )}

        {/* Quick Links */}
        {selectedText && (
          <div className="space-y-2">
            <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
              Quick Tools
            </p>
            <div className="grid grid-cols-1 gap-2">
              {quickLinks.map((link) => (
                <Button
                  key={link.name}
                  variant="outline"
                  size="sm"
                  className="justify-start h-8 text-xs"
                  onClick={() => window.open(link.url(selectedText), '_blank')}
                >
                  <link.icon className="w-3 h-3 mr-2" />
                  {link.name}
                  <ExternalLink className="w-3 h-3 ml-auto" />
                </Button>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Conversation Area */}
      <ScrollArea className="flex-1 p-4">
        <div className="space-y-4">
          {conversation.length === 0 && (
            <div className="text-center py-8">
              <Search className="w-12 h-12 mx-auto text-gray-300 mb-4" />
              <p className="text-sm text-gray-500 mb-2">
                Select text from the chat to ask questions
              </p>
              <p className="text-xs text-gray-400">
                Or ask Editor Mate anything about {targetLanguage}!
              </p>
            </div>
          )}
          
          {conversation.map((msg) => (
            <div key={msg.id} className="space-y-1">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">
                  {msg.type === 'user' ? 'You' : 'Editor Mate'}
                </span>
                <span className="text-xs text-gray-400">
                  {formatTime(msg.timestamp)}
                </span>
              </div>
              <div
                className={`p-3 rounded-lg ${
                  msg.type === 'user'
                    ? 'bg-blue-50 border border-blue-200 ml-4'
                    : 'bg-orange-50 border border-orange-200 mr-4'
                }`}
              >
                <div className="text-sm prose prose-sm max-w-none">
                  <ReactMarkdown
                    components={{
                      p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                      ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>,
                      ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>,
                      li: ({ children }) => <li className="leading-relaxed">{children}</li>,
                      strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
                      em: ({ children }) => <em className="italic">{children}</em>,
                      code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
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
      <div className="p-4 border-t">
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
