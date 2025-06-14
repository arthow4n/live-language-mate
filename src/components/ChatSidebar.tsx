import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { 
  Plus, 
  MessageCircle, 
  MoreVertical,
  Edit2,
  Trash2,
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
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

interface Conversation {
  id: string;
  title: string;
  updated_at: string;
  ai_mode: string;
  language: string;
  chat_mate_prompt?: string;
  editor_mate_prompt?: string;
}

interface ChatSidebarProps {
  user: User;
  currentConversationId: string | null;
  onConversationSelect: (conversationId: string) => void;
  onNewConversation: () => void;
  targetLanguage: string;
}

const ChatSidebar = ({ 
  user, 
  currentConversationId, 
  onConversationSelect, 
  onNewConversation,
  targetLanguage 
}: ChatSidebarProps) => {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const { toast } = useToast();

  const loadConversations = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      setConversations(data || []);
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

  useEffect(() => {
    loadConversations();
  }, [user.id]);

  const deleteConversation = async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;
      
      setConversations(prev => prev.filter(c => c.id !== conversationId));
      
      if (currentConversationId === conversationId) {
        onNewConversation();
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

  const startRename = (conversation: Conversation) => {
    setEditingId(conversation.id);
    setEditTitle(conversation.title);
  };

  const saveRename = async (conversationId: string) => {
    if (!editTitle.trim()) return;

    try {
      const { error } = await supabase
        .from('conversations')
        .update({ title: editTitle.trim() })
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.map(c => 
        c.id === conversationId ? { ...c, title: editTitle.trim() } : c
      ));

      setEditingId(null);
      setEditTitle('');

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

  const cancelRename = () => {
    setEditingId(null);
    setEditTitle('');
  };

  const forkConversation = async (conversationId: string) => {
    try {
      // Get the original conversation
      const { data: originalConv, error: convError } = await supabase
        .from('conversations')
        .select('*')
        .eq('id', conversationId)
        .single();

      if (convError) throw convError;

      // Create a new conversation
      const { data: newConv, error: newConvError } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `Fork of ${originalConv.title}`,
          language: originalConv.language,
          chat_mate_prompt: originalConv.chat_mate_prompt || null,
          editor_mate_prompt: originalConv.editor_mate_prompt || null
        })
        .select()
        .single();

      if (newConvError) throw newConvError;

      // Copy all messages
      const { data: messages, error: messagesError } = await supabase
        .from('messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (messagesError) throw messagesError;

      for (const msg of messages) {
        await supabase
          .from('messages')
          .insert({
            conversation_id: newConv.id,
            user_id: user.id,
            content: msg.content,
            message_type: msg.message_type,
          });
      }

      loadConversations();
      onConversationSelect(newConv.id);

      toast({
        title: "Success",
        description: "Conversation forked successfully",
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

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) return 'Today';
    if (days === 1) return 'Yesterday';
    if (days < 7) return `${days} days ago`;
    return date.toLocaleDateString();
  };

  return (
    <div className="w-64 h-full border-r bg-card flex flex-col">
      {/* Header */}
      <div className="p-4 border-b">
        <Button 
          onClick={onNewConversation}
          className="w-full justify-start"
          variant="outline"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Chat
        </Button>
      </div>

      {/* Conversations List */}
      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {isLoading ? (
            <div className="p-4 text-center text-muted-foreground">
              Loading...
            </div>
          ) : conversations.length === 0 ? (
            <div className="p-4 text-center text-muted-foreground">
              No conversations yet
            </div>
          ) : (
            conversations.map((conversation) => (
              <div
                key={conversation.id}
                className={`group relative rounded-lg p-3 hover:bg-muted cursor-pointer transition-colors ${
                  currentConversationId === conversation.id ? 'bg-muted' : ''
                }`}
                onClick={() => editingId !== conversation.id && onConversationSelect(conversation.id)}
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <MessageCircle className="w-3 h-3 text-muted-foreground flex-shrink-0" />
                      {editingId === conversation.id ? (
                        <div className="flex items-center gap-1 flex-1">
                          <Input
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            className="h-6 text-sm"
                            onKeyPress={(e) => {
                              if (e.key === 'Enter') saveRename(conversation.id);
                              if (e.key === 'Escape') cancelRename();
                            }}
                            onClick={(e) => e.stopPropagation()}
                            autoFocus
                          />
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-5 h-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              saveRename(conversation.id);
                            }}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="w-5 h-5"
                            onClick={(e) => {
                              e.stopPropagation();
                              cancelRename();
                            }}
                          >
                            <X className="w-3 h-3" />
                          </Button>
                        </div>
                      ) : (
                        <h3 className="text-sm font-medium truncate">
                          {conversation.title}
                        </h3>
                      )}
                    </div>
                    {editingId !== conversation.id && (
                      <p className="text-xs text-muted-foreground">
                        {formatDate(conversation.updated_at)}
                      </p>
                    )}
                  </div>
                  
                  {editingId !== conversation.id && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="w-6 h-6 opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <MoreVertical className="w-3 h-3" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            startRename(conversation);
                          }}
                        >
                          <Edit2 className="w-3 h-3 mr-2" />
                          Rename
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={(e) => {
                            e.stopPropagation();
                            forkConversation(conversation.id);
                          }}
                        >
                          <GitBranch className="w-3 h-3 mr-2" />
                          Fork Chat
                        </DropdownMenuItem>
                        <Separator />
                        <DropdownMenuItem 
                          className="text-destructive"
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteConversation(conversation.id);
                          }}
                        >
                          <Trash2 className="w-3 h-3 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>

      {/* Footer */}
      <div className="p-4 border-t">
        <div className="text-xs text-muted-foreground">
          Learning: {targetLanguage}
        </div>
      </div>
    </div>
  );
};

export default ChatSidebar;
