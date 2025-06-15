import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, MessageSquare, MoreVertical, Trash2, Edit2, GitBranch, Settings } from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
  SidebarFooter,
} from "@/components/ui/sidebar";

interface ChatSidebarProps {
  currentConversationId: string | null;
  onConversationSelect: (id: string | null) => void;
  onNewConversation: () => void;
  targetLanguage: string;
  refreshTrigger?: number;
  onChatSettingsOpen: () => void;
  onMainSettingsOpen: () => void;
}

const ChatSidebar = ({
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  targetLanguage,
  refreshTrigger = 0,
  onChatSettingsOpen,
  onMainSettingsOpen,
}: ChatSidebarProps) => {
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();
  const { conversations, updateConversation, deleteConversation, createConversation } = useLocalStorage();

  // Sort conversations by updated_at timestamp (most recent first)
  const sortedConversations = [...conversations].sort((a, b) => {
    const dateA = new Date(a.updated_at);
    const dateB = new Date(b.updated_at);
    return dateB.getTime() - dateA.getTime();
  });

  const handleRenameConversation = () => {
    if (!editingConversation || !editTitle.trim()) return;

    try {
      const conversation = conversations.find(c => c.id === editingConversation);
      if (conversation) {
        updateConversation(editingConversation, {
          title: editTitle.trim(),
        });
        setEditingConversation(null);
        toast({
          title: "Success",
          description: "Conversation renamed",
        });
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = (conversationId: string) => {
    try {
      deleteConversation(conversationId);
      if (currentConversationId === conversationId) {
        onConversationSelect(null);
      }
      toast({
        title: "Success",
        description: "Conversation deleted",
      });
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast({
        title: "Error",
        description: "Failed to delete conversation",
        variant: "destructive",
      });
    }
  };

  const handleForkConversation = (conversationId: string) => {
    try {
      const originalConversation = conversations.find(c => c.id === conversationId);
      if (!originalConversation) return;

      const forkedConversation = createConversation({
        title: `Forked: ${originalConversation.title}`,
        language: originalConversation.language,
        chat_mate_prompt: originalConversation.chat_mate_prompt,
        editor_mate_prompt: originalConversation.editor_mate_prompt
      });

      onConversationSelect(forkedConversation.id);

      toast({
        title: "Success",
        description: "Conversation forked",
      });
    } catch (error) {
      console.error('Error forking conversation:', error);
      toast({
        title: "Error",
        description: "Failed to fork conversation",
        variant: "destructive",
      });
    }
  };

  return (
    <Sidebar>
      <SidebarHeader>
        <Button 
          onClick={onNewConversation}
          className="w-full justify-start"
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
                  <div className="p-4 text-center text-muted-foreground text-sm">
                    No conversations yet. Start a new chat!
                  </div>
                ) : (
                  sortedConversations.map((conversation) => (
                    <SidebarMenuItem key={conversation.id}>
                      <div className={`group relative w-full flex items-center ${
                        currentConversationId === conversation.id 
                          ? 'bg-primary/90 text-primary-foreground hover:bg-primary shadow-sm border-l-4 border-gray-800 dark:border-gray-200 font-medium rounded-md' 
                          : 'hover:bg-accent/50 rounded-md'
                      }`}>
                        <button
                          onClick={() => onConversationSelect(conversation.id)}
                          className="flex items-center flex-1 p-2 text-left min-w-0"
                        >
                          <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                          <span className="truncate flex-1">
                            {conversation.title}
                          </span>
                        </button>
                        
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className={`w-6 h-6 mr-2 flex-shrink-0 !opacity-100 !visible ${
                                currentConversationId === conversation.id 
                                  ? 'hover:bg-primary-foreground/20 text-primary-foreground' 
                                  : 'hover:bg-accent text-muted-foreground hover:text-foreground'
                              }`}
                              onClick={(e) => e.stopPropagation()}
                            >
                              <MoreVertical className="w-3 h-3" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                onChatSettingsOpen();
                              }}
                            >
                              <Settings className="w-4 h-4 mr-2" />
                              Chat Settings
                            </DropdownMenuItem>
                            <DropdownMenuItem
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
                              onClick={(e) => {
                                e.stopPropagation();
                                handleForkConversation(conversation.id);
                              }}
                            >
                              <GitBranch className="w-4 h-4 mr-2" />
                              Fork Chat
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDeleteConversation(conversation.id);
                              }}
                              className="text-destructive focus:text-destructive"
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
          variant="outline"
          onClick={onMainSettingsOpen}
          className="w-full justify-start"
        >
          <Settings className="w-4 h-4 mr-2" />
          Main Settings
        </Button>
      </SidebarFooter>

      {/* Rename Dialog */}
      <Dialog open={!!editingConversation} onOpenChange={() => setEditingConversation(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Rename Conversation</DialogTitle>
          </DialogHeader>
          <Input
            value={editTitle}
            onChange={(e) => setEditTitle(e.target.value)}
            placeholder="Enter new title..."
            onKeyPress={(e) => {
              if (e.key === 'Enter') {
                handleRenameConversation();
              }
            }}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingConversation(null)}>
              Cancel
            </Button>
            <Button onClick={handleRenameConversation}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Sidebar>
  );
};

export default ChatSidebar;
