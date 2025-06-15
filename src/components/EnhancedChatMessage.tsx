
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { 
  MessageCircle, 
  GraduationCap, 
  User, 
  MoreVertical,
  Edit3,
  Trash2,
  RotateCcw,
  Copy,
  GitBranch,
  Check,
  X
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
  onEditMessage?: (messageId: string, newContent: string) => void;
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
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);

  const handleTextSelection = () => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
      onTextSelect(text);
    }
  };

  const handleEditSave = () => {
    if (onEditMessage && editContent.trim() !== message.content) {
      onEditMessage(message.id, editContent.trim());
    }
    setIsEditing(false);
  };

  const handleEditCancel = () => {
    setEditContent(message.content);
    setIsEditing(false);
  };

  const getMessageStyles = () => {
    switch (message.type) {
      case 'user':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-blue-50 border border-blue-200 text-blue-900',
          avatar: 'bg-blue-500 text-white',
          icon: User,
          label: 'User',
          badgeClass: 'bg-blue-100 text-blue-700'
        };
      case 'chat-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-green-50 border border-green-200 text-green-900',
          avatar: 'bg-green-500 text-white',
          icon: MessageCircle,
          label: 'Chat Mate',
          badgeClass: 'bg-green-100 text-green-700'
        };
      case 'editor-mate':
        return {
          container: 'mr-auto max-w-[70%] ml-10',
          bubble: 'bg-orange-50 border border-orange-200 text-orange-900',
          avatar: 'bg-orange-500 text-white',
          icon: GraduationCap,
          label: 'Editor Mate',
          badgeClass: 'bg-orange-100 text-orange-700'
        };
      default:
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-gray-100',
          avatar: 'bg-gray-500 text-white',
          icon: MessageCircle,
          label: 'Unknown',
          badgeClass: 'bg-gray-100 text-gray-700'
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

  if (isEditing) {
    return (
      <div className={`flex items-start gap-3 group ${styles.container} mb-4`}>
        <Avatar className="w-8 h-8 mt-1">
          <AvatarFallback className={styles.avatar}>
            <IconComponent className="w-4 h-4" />
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <Badge variant="secondary" className={`text-xs ${styles.badgeClass}`}>
              {styles.label}
            </Badge>
            <span className="text-xs text-muted-foreground">
              {formatTime(message.timestamp)}
            </span>
          </div>
          
          <div className="space-y-2">
            <Textarea
              value={editContent}
              onChange={(e) => setEditContent(e.target.value)}
              className="min-h-[100px]"
              placeholder="Edit your message..."
            />
            <div className="flex gap-2">
              <Button size="sm" onClick={handleEditSave}>
                <Check className="w-3 h-3 mr-1" />
                Save
              </Button>
              <Button size="sm" variant="outline" onClick={handleEditCancel}>
                <X className="w-3 h-3 mr-1" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`flex items-start gap-3 group ${styles.container} mb-4`}>
      <Avatar className="w-8 h-8 mt-1">
        <AvatarFallback className={styles.avatar}>
          <IconComponent className="w-4 h-4" />
        </AvatarFallback>
      </Avatar>
      
      <div className="flex-1 space-y-1">
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className={`text-xs ${styles.badgeClass}`}>
            {styles.label}
          </Badge>
          <span className="text-xs text-muted-foreground">
            {formatTime(message.timestamp)}
          </span>
        </div>
        
        <div className={`rounded-2xl px-4 py-3 ${styles.bubble} relative group`}>
          <div 
            className="text-sm leading-relaxed select-text prose prose-sm max-w-none"
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
                code: ({ children }) => <code className="bg-gray-100 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
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
                {onEditMessage && (
                  <DropdownMenuItem onClick={() => setIsEditing(true)}>
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
      </div>
    </div>
  );
};

export default EnhancedChatMessage;
