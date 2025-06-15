import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import AskInterface from './AskInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { supabase } from "@/integrations/supabase/client";

interface LanguageMateAppProps {
  user: User;
}

const LanguageMateAppContent = ({ user }: LanguageMateAppProps) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [mainSettingsOpen, setMainSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  
  const { mainSettings, updateMainSettings, getChatSettings, updateChatSettings } = useSettings();
  
  // Get current conversation settings
  const currentSettings = currentConversationId ? getChatSettings(currentConversationId) : mainSettings;

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleConversationUpdate = () => {
    setRefreshSidebar(prev => prev + 1);
  };

  const handleMainSettingsSave = (settings: any) => {
    updateMainSettings(settings);
  };

  const handleChatSettingsSave = (settings: any) => {
    if (currentConversationId) {
      updateChatSettings(currentConversationId, settings);
    }
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          user={user}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          targetLanguage={currentSettings.targetLanguage}
          refreshTrigger={refreshSidebar}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header */}
          <header className="border-b bg-card h-14 flex items-center justify-between px-4 flex-shrink-0">
            <div className="flex items-center space-x-3">
              <SidebarTrigger />
              <h1 className="text-xl font-bold">Language Mate</h1>
              <span className="text-sm text-muted-foreground">
                for {currentSettings.targetLanguage.charAt(0).toUpperCase() + currentSettings.targetLanguage.slice(1)} learners
              </span>
            </div>

            <div className="flex items-center space-x-2">
              <Button
                variant="outline"
                size="icon"
                onClick={() => setMainSettingsOpen(true)}
                title="Main Settings"
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
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Chat Interface */}
            <div className="flex-1 min-w-0 h-full">
              <EnhancedChatInterface
                user={user}
                conversationId={currentConversationId}
                targetLanguage={currentSettings.targetLanguage}
                onConversationUpdate={handleConversationUpdate}
                onConversationCreated={setCurrentConversationId}
                onTextSelect={setSelectedText}
                onChatSettingsOpen={() => setChatSettingsOpen(true)}
              />
            </div>

            {/* Ask Interface - Desktop only */}
            <div className="hidden lg:flex w-80 border-l bg-card h-full">
              <AskInterface
                selectedText={selectedText}
                targetLanguage={currentSettings.targetLanguage}
                editorMatePrompt={currentSettings.editorMatePersonality}
              />
            </div>
          </div>
        </div>

        {/* Main Settings Dialog */}
        <UnifiedSettingsDialog
          open={mainSettingsOpen}
          onOpenChange={setMainSettingsOpen}
          mode="main"
          initialSettings={mainSettings}
          onSave={handleMainSettingsSave}
        />

        {/* Chat Settings Dialog */}
        {currentConversationId && (
          <UnifiedSettingsDialog
            open={chatSettingsOpen}
            onOpenChange={setChatSettingsOpen}
            mode="chat"
            initialSettings={currentSettings}
            onSave={handleChatSettingsSave}
            conversationTitle="Current Chat"
          />
        )}
      </div>
    </SidebarProvider>
  );
};

const LanguageMateApp = ({ user }: LanguageMateAppProps) => {
  return (
    <SettingsProvider>
      <LanguageMateAppContent user={user} />
    </SettingsProvider>
  );
};

export default LanguageMateApp;
