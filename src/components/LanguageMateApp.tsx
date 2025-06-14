
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from 'lucide-react';
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import SettingsDialog from './SettingsDialog';
import { supabase } from "@/integrations/supabase/client";

interface LanguageMateAppProps {
  user: User;
}

const LanguageMateApp = ({ user }: LanguageMateAppProps) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Swedish');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const createNewConversation = async () => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .insert({
          user_id: user.id,
          title: `${targetLanguage} Practice`,
          language: targetLanguage.toLowerCase(),
        })
        .select()
        .single();

      if (error) throw error;
      setCurrentConversationId(data.id);
    } catch (error) {
      console.error('Error creating conversation:', error);
    }
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    createNewConversation();
  };

  const handleConversationUpdate = () => {
    // Trigger sidebar refresh if needed
  };

  // Create initial conversation
  useEffect(() => {
    if (!currentConversationId) {
      createNewConversation();
    }
  }, []);

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="border-b bg-card h-14 flex items-center justify-between px-4">
        <div className="flex items-center space-x-3">
          <h1 className="text-xl font-bold">Language Mate</h1>
          <span className="text-sm text-muted-foreground">
            for {targetLanguage} learners
          </span>
        </div>

        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="icon"
            onClick={() => setSettingsOpen(true)}
          >
            <Settings className="w-4 h-4" />
          </Button>

          <Button
            variant="outline"
            size="icon"
            onClick={handleSignOut}
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        <ChatSidebar
          user={user}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          targetLanguage={targetLanguage}
        />
        
        <EnhancedChatInterface
          user={user}
          conversationId={currentConversationId}
          targetLanguage={targetLanguage}
          onConversationUpdate={handleConversationUpdate}
        />
      </div>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default LanguageMateApp;
