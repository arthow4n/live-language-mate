import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Plus, MessageSquare, MoreVertical, Trash2, Edit2, GitBranch, Settings } from 'lucide-react';
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
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

interface Conversation {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  ai_mode: string;
  language: string;
  chat_mate_prompt?: string;
  editor_mate_prompt?: string;
}

interface ChatSidebarProps {
  user: User;
  currentConversationId: string | null;
  onConversationSelect: (id: string | null) => void;
  onNewConversation: () => void;
  targetLanguage: string;
  refreshTrigger?: number;
  onChatSettingsOpen: () => void;
  onMainSettingsOpen: () => void;
}

const ChatSidebar = ({
  user,
  currentConversationId,
  onConversationSelect,
  onNewConversation,
  targetLanguage,
  refreshTrigger = 0,
  onChatSettingsOpen,
  onMainSettingsOpen,
}: ChatSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingConversation, setEditingConversation] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();

  const loadConversations = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;

      setConversations(data);
    } catch (error) {
      console.error('Error loading conversations:', error);
      toast({
        title: "Error",
        description: "Failed to load conversations",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleRenameConversation = async () => {
    if (!editingConversation || !editTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: editTitle.trim(), updated_at: new Date().toISOString() })
        .eq('id', editingConversation);

      if (error) throw error;

      setConversations(prev =>
        prev.map(conv =>
          conv.id === editingConversation ? { ...conv, title: editTitle.trim() } : conv
        )
      );
      setEditingConversation(null);
      toast({
        title: "Success",
        description: "Conversation renamed",
      });
    } catch (error) {
      console.error('Error renaming conversation:', error);
      toast({
        title: "Error",
        description: "Failed to rename conversation",
        variant: "destructive",
      });
    }
  };

  const handleDeleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(conv => conv.id !== conversationId));
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

  const handleForkConversation = async (conversationId: string) => {
    try {
      const { data: originalConversation, error: originalError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (originalError) throw originalError;

      const { data: forkedConversation, error: forkError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `Forked: ${originalConversation.title}`,
          language: originalConversation.language,
          chat_mate_prompt: originalConversation.chat_mate_prompt,
          editor_mate_prompt: originalConversation.editor_mate_prompt
        })
        .select()
        .single();

      if (forkError) throw forkError;

      setConversations(prev => [forkedConversation, ...prev]);
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

  useEffect(() => {
    loadConversations();
  }, [user.id]);

  // Reload conversations when refreshTrigger changes
  useEffect(() => {
    if (refreshTrigger > 0) {
      loadConversations();
    }
  }, [refreshTrigger]);

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
            <SidebarMenu>
              {isLoading ? (
                <div className="p-4 text-center text-muted-foreground">
                  Loading conversations...
                </div>
              ) : conversations.length === 0 ? (
                <div className="p-4 text-center text-muted-foreground text-sm">
                  No conversations yet. Start a new chat!
                </div>
              ) : (
                conversations.map((conversation) => (
                  <SidebarMenuItem key={conversation.id}>
                    <SidebarMenuButton
                      onClick={() => onConversationSelect(conversation.id)}
                      isActive={currentConversationId === conversation.id}
                      className="group relative w-full"
                    >
                      <MessageSquare className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="truncate flex-1 text-left">
                        {conversation.title}
                      </span>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="w-6 h-6 opacity-0 group-hover:opacity-100 ml-auto flex-shrink-0"
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
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))
              )}
            </SidebarMenu>
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
