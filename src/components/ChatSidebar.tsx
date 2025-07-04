import {
  Edit2,
  GitBranch,
  MessageSquare,
  MoreVertical,
  Plus,
  Settings,
  Trash2,
} from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
} from '@/components/ui/sidebar';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useToast } from '@/hooks/use-toast';
import { logError } from '@/lib/utils';

/**
 *
 */
interface ChatSidebarProps {
  currentConversationId: null | string;
  onChatSettingsOpen: () => void;
  onConversationSelect: (id: null | string) => void;
  onMainSettingsOpen: () => void;
  onNewConversation: () => void;
}

const ChatSidebar = ({
  currentConversationId,
  onChatSettingsOpen,
  onConversationSelect,
  onMainSettingsOpen,
  onNewConversation,
}: ChatSidebarProps): React.JSX.Element => {
  const [editingConversation, setEditingConversation] = useState<null | string>(
    null
  );
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();
  const {
    conversations,
    createConversation,
    deleteConversation,
    updateConversation,
  } = useUnifiedStorage();

  // Sort conversations by updated_at timestamp (most recent first)
  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = new Date(a.updated_at);
    const dateB = new Date(b.updated_at);
    return dateB.getTime() - dateA.getTime();
  });

  const handleRenameConversation = (): void => {
    if (!editingConversation || !editTitle.trim()) return;

    try {
      const conversation = conversations.find(
        (c) => c.id === editingConversation
      );
      if (conversation) {
        updateConversation(editingConversation, {
          title: editTitle.trim(),
        });
        setEditingConversation(null);
        toast({
          description: 'Conversation renamed',
          title: 'Success',
        });
      }
    } catch (error) {
      logError('Error renaming conversation:', error);
      toast({
        description: 'Failed to rename conversation',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteConversation = (conversationId: string): void => {
    try {
      deleteConversation(conversationId);
      if (currentConversationId === conversationId) {
        onConversationSelect(null);
      }
      toast({
        description: 'Conversation deleted',
        title: 'Success',
      });
    } catch (error) {
      logError('Error deleting conversation:', error);
      toast({
        description: 'Failed to delete conversation',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  const handleForkConversation = (conversationId: string): void => {
    try {
      const originalConversation = conversations.find(
        (c) => c.id === conversationId
      );
      if (!originalConversation) return;

      const forkedConversation = createConversation({
        language: originalConversation.language,
        title: `Forked: ${originalConversation.title}`,
      });

      onConversationSelect(forkedConversation.id);

      toast({
        description: 'Conversation forked',
        title: 'Success',
      });
    } catch (error) {
      logError('Error forking conversation:', error);
      toast({
        description: 'Failed to fork conversation',
        title: 'Error',
        variant: 'destructive',
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Button
          className="w-full justify-start"
          data-testid="new-chat-button"
          onClick={onNewConversation}
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
          <SidebarGroupContent>
            <ScrollArea className="h-full">
              <SidebarMenu>
                {sortedConversations.length === 0 ? (
                  <div
                    className="p-4 text-center text-muted-foreground text-sm"
                    data-testid="empty-state"
                  >
                    No conversations yet. Start a new chat!
                  </div>
                ) : (
                  sortedConversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <div
                        className={`group relative w-full flex items-center ${
                          currentConversationId === conversation.id
                            ? 'bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm border-l-4 border-gray-800 dark:border-gray-200 font-medium rounded-md'
                            : 'hover:bg-accent/50 rounded-md'
                        }`}
                        data-testid={`conversation-item-${conversation.id}`}
                      >
                        <button
                          className="flex items-center flex-1 p-2 text-left min-w-0"
                          data-testid={`conversation-button-${conversation.id}`}
                          onClick={() => {
                            onConversationSelect(conversation.id);
                          }}
                        >
                          <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {conversation.title}
                          </span>
                        </button>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              className={`w-6 h-6 mr-2 flex-shrink-0 !opacity-100 !visible ${
                                currentConversationId === conversation.id
                                  ? 'hover:bg-primary-foreground/20 text-primary-foreground'
                                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                              }`}
                              data-testid={`conversation-menu-${conversation.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                              }}
                              size="icon"
                              variant="ghost"
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              data-testid={`chat-settings-${conversation.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                onChatSettingsOpen();
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Chat Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              data-testid={`rename-${conversation.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingConversation(conversation.id);
                                setEditTitle(conversation.title);
                              }}
                            >
                              <Edit2 className="w-4 h-4 mr-2" />
                              Rename
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              data-testid={`fork-${conversation.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForkConversation(conversation.id);
                              }}
                            >
                              <GitBranch className="w-4 h-4 mr-2" />
                              Fork Chat
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-destructive focus:text-destructive"
                              data-testid={`delete-${conversation.id}`}
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                            >
                              <Trash2 className="w-4 h-4 mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </SidebarMenuItem>
                  ))
                )}
              </SidebarMenu>
            </ScrollArea>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter>
        <Button
          className="w-full justify-start"
          data-testid="main-settings-button"
          onClick={onMainSettingsOpen}
          variant="outline"
        >
          <Settings className="w-4 h-4 mr-2" />
          Main Settings
        </Button>
      </SidebarFooter>

      {/* Rename Dialog */}
      <Dialog
        data-testid="rename-dialog"
        onOpenChange={() => {
          setEditingConversation(null);
        }}
        open={!!editingConversation}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <Input
            data-testid="rename-input"
            onChange={(e) => {
              setEditTitle(e.target.value);
            }}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleRenameConversation();
              }
            }}
            placeholder="Enter new title..."
            value={editTitle}
          />
          <DialogFooter>
            <Button
              data-testid="rename-cancel-button"
              onClick={() => {
                setEditingConversation(null);
              }}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              data-testid="rename-save-button"
              onClick={handleRenameConversation}
            >
              Save
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};

export default ChatSidebar;
