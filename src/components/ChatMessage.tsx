
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { 
  MessageCircle, 
  GraduationCap, 
  User, 
  MoreVertical,
  Edit3,
  Trash2,
  RotateCcw,
  Copy,
  Clock,
  Cpu
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Message } from '@/types/Message';

interface ChatMessageProps {
  message: Message;
  onTextSelect: (text: string) => void;
}

const ChatMessage = ({ message, onTextSelect }: ChatMessageProps) => {
  const [selectedText, setSelectedText] = useState('');

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
      onTextSelect(text);
    }
  };

  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-user-light border border-user/20 dark:bg-user/10 dark:border-user/30',
          avatar: 'bg-user text-white',
          icon: User
        };
      case 'chat-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-chat-mate-light border border-chat-mate/20 dark:bg-chat-mate/10 dark:border-chat-mate/30',
          avatar: 'bg-chat-mate text-white',
          icon: MessageCircle
        };
      case 'editor-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-editor-mate-light border border-editor-mate/20 dark:bg-editor-mate/10 dark:border-editor-mate/30',
          avatar: 'bg-editor-mate text-white',
          icon: GraduationCap
        };
      default:
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-muted',
          avatar: 'bg-muted-foreground text-background',
          icon: MessageCircle
        };
    }
  };

  const styles = getMessageStyles();
  const IconComponent = styles.icon;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatGenerationTime = (timeMs: number) => {
    if (timeMs < 1000) {
      return `${timeMs}ms`;
    }
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  const getDisplayName = () => {
    switch (message.type) {
      case 'user':
        return 'User';
      case 'chat-mate':
        return 'Chat Mate';
      case 'editor-mate':
        return 'Editor Mate';
      default:
        return 'Unknown';
    }
  };

  return (
    <div className="mb-4">
      <div className={`flex items-start gap-3 group ${styles.container}`}>
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={styles.avatar}>
            <IconComponent className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary" className="text-xs">
              {getDisplayName()}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
          
          <div className={`rounded-2xl px-4 py-3 ${styles.bubble} relative group`}>
            <div 
              className="text-sm leading-relaxed select-text prose prose-sm max-w-none dark:prose-invert"
              onMouseUp={handleTextSelection}
            >
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
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
              )}
            </div>
            
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40">
                  <DropdownMenuItem onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <Edit3 className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem>
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Regenerate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="text-destructive">
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
      
      {/* Metadata rendered outside the bubble */}
      {message.metadata && (message.metadata.model || message.metadata.generationTime) && (
        <div className="ml-11 mt-1 flex items-center gap-3 text-xs text-muted-foreground">
          {message.metadata.model && (
            <div className="flex items-center gap-1">
              <Cpu className="w-3 h-3" />
              <span>{message.metadata.model}</span>
            </div>
          )}
          {message.metadata.generationTime && (
            <div className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              <span>{formatGenerationTime(message.metadata.generationTime)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatMessage;
