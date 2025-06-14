
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { 
  Search, 
  Send, 
  ExternalLink, 
  Volume2,
  X,
  Globe,
  Book,
  Play
} from 'lucide-react';

interface AskInterfaceProps {
  selectedText: string;
  onClose?: () => void;
}

const AskInterface = ({ selectedText, onClose }: AskInterfaceProps) => {
  const [question, setQuestion] = useState('');
  const [conversation, setConversation] = useState<Array<{ type: 'user' | 'editor'; content: string }>>([]);

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
      url: (text: string) => `https://youglish.com/pronounce/${encodeURIComponent(text)}/swedish`
    }
  ];

  const handleSendQuestion = () => {
    if (!question.trim()) return;

    const newConversation = [
      ...conversation,
      { type: 'user' as const, content: question },
    ];

    // Simulate Editor Mate response
    setTimeout(() => {
      const responses = [
        `Great question about "${selectedText || 'the selected text'}"! This word/phrase is commonly used in Swedish conversations...`,
        `"${selectedText || 'The selected text'}" is an interesting expression. Let me explain the grammar and usage...`,
        `Good observation! "${selectedText || 'The selected text'}" has some nuances in Swedish that are worth understanding...`,
        `Excellent question! This relates to Swedish grammar rules about...`
      ];

      const response = responses[Math.floor(Math.random() * responses.length)];
      
      setConversation([
        ...newConversation,
        { type: 'editor', content: response }
      ]);
    }, 1000);

    setConversation(newConversation);
    setQuestion('');
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendQuestion();
    }
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
                Or ask Editor Mate anything about Swedish!
              </p>
            </div>
          )}
          
          {conversation.map((msg, index) => (
            <div
              key={index}
              className={`p-3 rounded-lg ${
                msg.type === 'user'
                  ? 'bg-user-light ml-4'
                  : 'bg-editor-mate-light mr-4'
              }`}
            >
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-medium">
                  {msg.type === 'user' ? 'You' : 'Editor Mate'}
                </span>
              </div>
              <p className="text-sm">{msg.content}</p>
            </div>
          ))}
        </div>
      </ScrollArea>

      {/* Input Area */}
      <div className="p-4 border-t">
        <div className="flex gap-2">
          <Input
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            onKeyPress={handleKeyPress}
            placeholder="Ask Editor Mate about language..."
            className="flex-1 text-sm"
          />
          <Button 
            size="icon" 
            onClick={handleSendQuestion}
            disabled={!question.trim()}
          >
            <Send className="w-4 h-4" />
          </Button>
        </div>
      </div>
    </div>
  );
};

export default AskInterface;
