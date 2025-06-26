import {
  Brain,
  Clock,
  Copy,
  Cpu,
  Edit3,
  GitBranch,
  GraduationCap,
  MessageCircle,
  MoreVertical,
  RotateCcw,
  Scissors,
  Trash2,
  User,
} from 'lucide-react';
import { useState } from 'react';
import ReactMarkdown from 'react-markdown';

import type { ImageAttachment } from '@/schemas/imageAttachment';
import type { Message } from '@/schemas/messages';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';

import { ImageMessage } from './ImageMessage';
import { ImageModal } from './ImageModal';

/**
 *
 */
interface EnhancedChatMessageProps {
  message: Message;
  onDeleteAllBelow?: (messageId: string) => void;
  onDeleteMessage?: (messageId: string) => void;
  onEditMessage?: (messageId: string, newContent: string) => void;
  onForkFrom?: (messageId: string) => void;
  onRegenerateMessage?: (messageId: string) => void;
  onTextSelect: (text: string) => void;
}

const EnhancedChatMessage = ({
  message,
  onDeleteAllBelow,
  onDeleteMessage,
  onEditMessage,
  onForkFrom,
  onRegenerateMessage,
  onTextSelect,
}: EnhancedChatMessageProps): React.JSX.Element => {
  const [, setSelectedText] = useState('');
  const [isEditing, setIsEditing] = useState(false);
  const [editContent, setEditContent] = useState(message.content);
  const [modalImage, setModalImage] = useState<null | {
    attachment: ImageAttachment;
    imageUrl: string;
  }>(null);
  const { globalSettings } = useUnifiedStorage();

  const handleTextSelection = (): void => {
    const selection = window.getSelection();
    const text = selection?.toString().trim();
    if (text) {
      setSelectedText(text);
      onTextSelect(text);
    }
  };

  const getMessageStyles = (): {
    avatar: string;
    bubble: string;
    container: string;
    icon: React.ComponentType<{ className?: string }>;
  } => {
    switch (message.type) {
      case 'chat-mate':
        return {
          avatar: 'bg-chat-mate text-white',
          bubble:
            'bg-chat-mate-light border border-chat-mate/20 dark:bg-chat-mate/10 dark:border-chat-mate/30',
          container: 'mr-auto max-w-[80%]',
          icon: MessageCircle,
        };
      case 'editor-mate':
        return {
          avatar: 'bg-editor-mate text-white',
          bubble:
            'bg-editor-mate-light border border-editor-mate/20 dark:bg-editor-mate/10 dark:border-editor-mate/30',
          container: 'mr-auto max-w-[80%]',
          icon: GraduationCap,
        };
      case 'user':
        return {
          avatar: 'bg-user text-white',
          bubble:
            'bg-user-light border border-user/20 dark:bg-user/10 dark:border-user/30',
          container: 'mr-auto max-w-[80%]',
          icon: User,
        };
      default:
        return {
          avatar: 'bg-muted-foreground text-background',
          bubble: 'bg-muted',
          container: 'mr-auto max-w-[80%]',
          icon: MessageCircle,
        };
    }
  };

  const styles = getMessageStyles();
  const IconComponent = styles.icon;

  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const formatGenerationTime = (timeMs: number): string => {
    if (timeMs < 1000) {
      return `${timeMs.toString()}ms`;
    }
    return `${(timeMs / 1000).toFixed(1)}s`;
  };

  const copyToClipboard = (): void => {
    void navigator.clipboard.writeText(message.content);
  };

  const getDisplayName = (): string => {
    switch (message.type) {
      case 'chat-mate':
        return 'Chat Mate';
      case 'editor-mate':
        return 'Editor Mate';
      case 'user':
        return 'User';
      default:
        return 'Unknown';
    }
  };

  const handleEdit = (): void => {
    if (isEditing && onEditMessage) {
      onEditMessage(message.id, editContent);
      setIsEditing(false);
    } else {
      setIsEditing(true);
    }
  };

  const handleCancelEdit = (): void => {
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
          <Badge className="text-xs" variant="secondary">
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
              className="mb-3 border-b pb-2"
              defaultOpen={globalSettings.reasoningExpanded}
            >
              <CollapsibleTrigger asChild>
                <button
                  className="flex items-center gap-2 text-xs text-muted-foreground font-semibold w-full hover:text-foreground transition-colors"
                  data-testid="reasoning-toggle"
                >
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
                autoFocus
                className="w-full p-2 border rounded-md resize-none min-h-[100px] bg-background"
                onChange={(e) => {
                  setEditContent(e.target.value);
                }}
                value={editContent}
              />
              <div className="flex gap-2">
                <Button
                  data-testid="edit-save-button"
                  onClick={handleEdit}
                  size="sm"
                >
                  Save
                </Button>
                <Button
                  data-testid="edit-cancel-button"
                  onClick={handleCancelEdit}
                  size="sm"
                  variant="outline"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Render attached images */}
              {message.attachments && message.attachments.length > 0 && (
                <ImageMessage
                  attachments={message.attachments}
                  maxPreviewSize="md"
                  onImageClick={(attachment, imageUrl) => {
                    setModalImage({ attachment, imageUrl });
                  }}
                  showMetadata={true}
                />
              )}

              {/* Render text content */}
              <div
                className="text-sm leading-relaxed select-text prose prose-sm max-w-none dark:prose-invert"
                onMouseUp={handleTextSelection}
              >
                <ReactMarkdown
                  components={{
                    code: ({ children }) => (
                      <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">
                        {children}
                      </code>
                    ),
                    em: ({ children }) => (
                      <em className="italic">{children}</em>
                    ),
                    li: ({ children }) => (
                      <li className="leading-relaxed">{children}</li>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside mb-2 space-y-1">
                        {children}
                      </ol>
                    ),
                    p: ({ children }) => (
                      <p className="mb-2 last:mb-0">{children}</p>
                    ),
                    strong: ({ children }) => (
                      <strong className="font-semibold">{children}</strong>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside mb-2 space-y-1">
                        {children}
                      </ul>
                    ),
                  }}
                >
                  {message.content}
                </ReactMarkdown>
                {message.isStreaming && (
                  <span className="inline-block w-2 h-4 bg-current ml-1 animate-pulse" />
                )}
              </div>
            </div>
          )}

          {!isEditing && (
            <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    className="w-6 h-6"
                    data-testid="message-actions-trigger"
                    size="icon"
                    variant="ghost"
                  >
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
                      className="text-destructive"
                      onClick={() => {
                        onDeleteMessage(message.id);
                      }}
                    >
                      <Trash2 className="w-3 h-3 mr-2" />
                      Delete message
                    </DropdownMenuItem>
                  )}
                  {onDeleteAllBelow && (
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => {
                        onDeleteAllBelow(message.id);
                      }}
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

      {/* Image Modal */}
      <ImageModal
        attachment={modalImage?.attachment ?? null}
        imageUrl={modalImage?.imageUrl ?? null}
        isOpen={modalImage !== null}
        onClose={() => {
          setModalImage(null);
        }}
      />
    </div>
  );
};

export default EnhancedChatMessage;
