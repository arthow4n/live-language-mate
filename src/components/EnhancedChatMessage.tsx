
import { useState } from 'react';
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
  GitBranch
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface Message {
  id: string;
  type: 'user' | 'chat-mate' | 'editor-mate';
  content: string;
  timestamp: Date;
  isStreaming?: boolean;
  parentMessageId?: string;
}

interface EnhancedChatMessageProps {
  message: Message;
  onTextSelect: (text: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onForkFrom?: (messageId: string) => void;
}

const EnhancedChatMessage = ({ 
  message, 
  onTextSelect,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onForkFrom
}: EnhancedChatMessageProps) => {
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
          container: 'ml-auto max-w-[80%]',
          bubble: 'bg-blue-500 text-white',
          avatar: 'bg-blue-500 text-white',
          icon: User,
          label: 'You'
        };
      case 'chat-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-green-50 border border-green-200 text-green-900',
          avatar: 'bg-green-500 text-white',
          icon: MessageCircle,
          label: 'Chat Mate'
        };
      case 'editor-mate':
        return {
          container: 'mr-auto max-w-[70%] ml-10',
          bubble: 'bg-orange-50 border border-orange-200 text-orange-900',
          avatar: 'bg-orange-500 text-white',
          icon: GraduationCap,
          label: 'Editor Mate'
        };
      default:
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-gray-100',
          avatar: 'bg-gray-500 text-white',
          icon: MessageCircle,
          label: 'Unknown'
        };
    }
  };

  const styles = getMessageStyles();
  const IconComponent = styles.icon;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const copyToClipboard = () => {
    navigator.clipboard.writeText(message.content);
  };

  return (
    <div className={`flex items-start gap-3 group ${styles.container} mb-4`}>
      {message.type !== 'user' && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={styles.avatar}>
            <IconComponent className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
      
      <div className="flex-1 space-y-1">
        {message.type !== 'user' && (
          <div className="flex items-center gap-2">
            <Badge 
              variant="secondary" 
              className={`text-xs ${
                message.type === 'chat-mate' ? 'bg-green-100 text-green-700' : 'bg-orange-100 text-orange-700'
              }`}
            >
              {styles.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
        
        <div className={`rounded-2xl px-4 py-3 ${styles.bubble} relative group`}>
          <p 
            className="text-sm leading-relaxed select-text"
            onMouseUp={handleTextSelection}
          >
            {message.content}
            {message.isStreaming && (
              <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
            )}
          </p>
          
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
                {onEditMessage && (
                  <DropdownMenuItem onClick={() => onEditMessage(message.id)}>
                    <Edit3 className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                )}
                {onRegenerateMessage && message.type !== 'user' && (
                  <DropdownMenuItem onClick={() => onRegenerateMessage(message.id)}>
                    <RotateCcw className="w-3 h-3 mr-2" />
                    Regenerate
                  </DropdownMenuItem>
                )}
                {onForkFrom && (
                  <DropdownMenuItem onClick={() => onForkFrom(message.id)}>
                    <GitBranch className="w-3 h-3 mr-2" />
                    Fork from here
                  </DropdownMenuItem>
                )}
                {onDeleteMessage && (
                  <DropdownMenuItem 
                    className="text-destructive"
                    onClick={() => onDeleteMessage(message.id)}
                  >
                    <Trash2 className="w-3 h-3 mr-2" />
                    Delete
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
        
        {message.type === 'user' && (
          <div className="text-right">
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
        )}
      </div>

      {message.type === 'user' && (
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={styles.avatar}>
            <IconComponent className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
      )}
    </div>
  );
};

export default EnhancedChatMessage;
