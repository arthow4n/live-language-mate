
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import AskInterface from './AskInterface';
import SettingsDialog from './SettingsDialog';
import { supabase } from "@/integrations/supabase/client";

interface LanguageMateAppProps {
  user: User;
}

const LanguageMateApp = ({ user }: LanguageMateAppProps) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [targetLanguage, setTargetLanguage] = useState('Swedish');
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [selectedText, setSelectedText] = useState('');

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null); // Just clear the current conversation, don't create until first message
  };

  const handleConversationUpdate = () => {
    // Trigger sidebar refresh by incrementing the refresh counter
    setRefreshSidebar(prev => prev + 1);
  };

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-background">
        {/* Chat Sidebar */}
        <ChatSidebar
          user={user}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          targetLanguage={targetLanguage}
          refreshTrigger={refreshSidebar}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0">
          {/* Header */}
          <header className="border-b bg-card h-14 flex items-center justify-between px-4">
            <div className="flex items-center space-x-3">
              <SidebarTrigger />
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

          {/* Content Area - Chat + Ask Interface */}
          <div className="flex-1 flex overflow-hidden">
            {/* Chat Interface */}
            <div className="flex-1 min-w-0">
              <EnhancedChatInterface
                user={user}
                conversationId={currentConversationId}
                targetLanguage={targetLanguage}
                onConversationUpdate={handleConversationUpdate}
                onConversationCreated={setCurrentConversationId}
                onTextSelect={setSelectedText}
              />
            </div>

            {/* Ask Interface - Desktop only */}
            <div className="hidden lg:flex w-80 border-l bg-card">
              <AskInterface
                selectedText={selectedText}
                targetLanguage={targetLanguage}
              />
            </div>
          </div>
        </div>

        {/* Settings Dialog */}
        <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
      </div>
    </SidebarProvider>
  );
};

export default LanguageMateApp;
