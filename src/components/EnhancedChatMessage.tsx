import { useState, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import {
  Brain,
  MessageCircle,
  GraduationCap,
  User,
  MoreVertical,
  Edit3,
  Trash2,
  RotateCcw,
  Copy,
  Clock,
  Cpu,
  GitBranch,
  Scissors,
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import { Message } from '@/types/Message';
import { useSettings } from '@/contexts/SettingsContext';

interface EnhancedChatMessageProps {
  message: Message;
  onTextSelect: (text: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onDeleteAllBelow?: (messageId: string) => void;
  onForkFrom?: (messageId: string) => void;
}

const EnhancedChatMessage = ({
  message,
  onTextSelect,
  onRegenerateMessage,
  onEditMessage,
  onDeleteMessage,
  onDeleteAllBelow,
  onForkFrom,
}: EnhancedChatMessageProps) => {
  const [, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const { globalSettings } = useSettings();

  useEffect(() => {
    if (message.type !== 'user') {
      console.log('EnhancedChatMessage received message:', {
        messageId: message.id,
        messageType: message.type,
        hasContent: !!message.content,
        contentLength: message.content.length,
        hasReasoning: !!message.reasoning,
        reasoningLength: message.reasoning?.length ?? 0,
        isStreaming: message.isStreaming,
        globalReasoningEnabled: globalSettings.enableReasoning,
      });
    }
  }, [message, globalSettings.enableReasoning]);

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
          bubble:
            'bg-user-light border border-user/20 dark:bg-user/10 dark:border-user/30',
          avatar: 'bg-user text-white',
          icon: User,
        };
      case 'chat-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble:
            'bg-chat-mate-light border border-chat-mate/20 dark:bg-chat-mate/10 dark:border-chat-mate/30',
          avatar: 'bg-chat-mate text-white',
          icon: MessageCircle,
        };
      case 'editor-mate':
        return {
          container: 'mr-auto max-w-[80%]',
          bubble:
            'bg-editor-mate-light border border-editor-mate/20 dark:bg-editor-mate/10 dark:border-editor-mate/30',
          avatar: 'bg-editor-mate text-white',
          icon: GraduationCap,
        };
      default:
        return {
          container: 'mr-auto max-w-[80%]',
          bubble: 'bg-muted',
          avatar: 'bg-muted-foreground text-background',
          icon: MessageCircle,
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
      return `${timeMs.toString()}ms`;
    }
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const copyToClipboard = () => {
    void navigator.clipboard.writeText(message.content);
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

  const handleEdit = () => {
    if (isEditing && onEditMessage) {
      onEditMessage(message.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    setEditContent(message.content);
  };

  return (
    <div className={`flex items-start gap-3 group mb-4 ${styles.container}`}>
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

          {/* Metadata display */}
          {message.metadata &&
            (message.metadata.model ?? message.metadata.generationTime) && (
              <div className="flex items-center gap-2 text-xs text-muted-foreground">
                {message.metadata.model && (
                  <div className="flex items-center gap-1">
                    <Cpu className="w-3 h-3" />
                    <span>{message.metadata.model}</span>
                  </div>
                )}
                {message.metadata.generationTime && (
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    <span>
                      {formatGenerationTime(message.metadata.generationTime)}
                    </span>
                  </div>
                )}
              </div>
            )}
        </div>

        <div
          className={`rounded-2xl px-4 py-3 ${styles.bubble} relative group`}
        >
          {message.reasoning && (
            <Collapsible
              defaultOpen={globalSettings.reasoningExpanded}
              className="mb-3 border-b pb-2"
            >
              <CollapsibleTrigger asChild>
                <button className="flex items-center gap-2 text-xs text-muted-foreground font-semibold w-full hover:text-foreground transition-colors">
                  <Brain className="w-3.5 h-3.5" />
                  AI Reasoning
                </button>
              </CollapsibleTrigger>
              <CollapsibleContent>
                <div className="mt-2 p-2 bg-background/30 rounded-md text-xs prose prose-sm max-w-none dark:prose-invert font-mono prose-p:my-1">
                  <ReactMarkdown>{message.reasoning}</ReactMarkdown>
                </div>
              </CollapsibleContent>
            </Collapsible>
          )}

          {isEditing ? (
            <div className="space-y-2">
              <textarea
                value={editContent}
                onChange={(e) => {
                  setEditContent(e.target.value);
                }}
                className="w-full p-2 border rounded-md resize-none min-h-[100px] bg-background"
                autoFocus
              />
              <div className="flex gap-2">
                <Button size="sm" onClick={handleEdit}>
                  Save
                </Button>
                <Button size="sm" variant="outline" onClick={handleCancelEdit}>
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div
              className="text-sm leading-relaxed select-text prose prose-sm max-w-none dark:prose-invert"
              onMouseUp={handleTextSelection}
            >
              <ReactMarkdown
                components={{
                  p: ({ children }) => (
                    <p className="mb-2 last:mb-0">{children}</p>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside mb-2 space-y-1">
                      {children}
                    </ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside mb-2 space-y-1">
                      {children}
                    </ol>
                  ),
                  li: ({ children }) => (
                    <li className="leading-relaxed">{children}</li>
                  ),
                  strong: ({ children }) => (
                    <strong className="font-semibold">{children}</strong>
                  ),
                  em: ({ children }) => <em className="italic">{children}</em>,
                  code: ({ children }) => (
                    <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                      {children}
                    </code>
                  ),
                }}
              >
                {message.content}
              </ReactMarkdown>
              {message.isStreaming && (
                <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
              )}
            </div>
          )}

          {!isEditing && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="w-6 h-6">
                    <MoreVertical className="w-3 h-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem onClick={copyToClipboard}>
                    <Copy className="w-3 h-3 mr-2" />
                    Copy
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleEdit}>
                    <Edit3 className="w-3 h-3 mr-2" />
                    Edit
                  </DropdownMenuItem>
                  {onRegenerateMessage && message.type !== 'user' && (
                    <DropdownMenuItem
                      onClick={() => {
                        onRegenerateMessage(message.id);
                      }}
                    >
                      <RotateCcw className="w-3 h-3 mr-2" />
                      Regenerate
                    </DropdownMenuItem>
                  )}
                  {onForkFrom && (
                    <DropdownMenuItem
                      onClick={() => {
                        onForkFrom(message.id);
                      }}
                    >
                      <GitBranch className="w-3 h-3 mr-2" />
                      Fork from here
                    </DropdownMenuItem>
                  )}
                  <DropdownMenuSeparator />
                  {onDeleteMessage && (
                    <DropdownMenuItem
                      onClick={() => {
                        onDeleteMessage(message.id);
                      }}
                      className="text-destructive"
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  )}
                  {onDeleteAllBelow && (
                    <DropdownMenuItem
                      onClick={() => {
                        onDeleteAllBelow(message.id);
                      }}
                      className="text-destructive"
                    >
                      <Scissors className="w-3 h-3 mr-2" />
                      Delete all below
                    </DropdownMenuItem>
                  )}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EnhancedChatMessage;
