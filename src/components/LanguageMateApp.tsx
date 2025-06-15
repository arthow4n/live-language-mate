
import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Settings, LogOut } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
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

  const handlePanelSizeChange = (sizes: number[]) => {
    localStorage.setItem('languageMate_panelSizes', JSON.stringify(sizes));
  };

  const getDefaultPanelSizes = () => {
    const saved = localStorage.getItem('languageMate_panelSizes');
    if (saved) {
      try {
        const sizes = JSON.parse(saved);
        return Array.isArray(sizes) && sizes.length === 2 ? sizes : [70, 30];
      } catch {
        return [70, 30];
      }
    }
    return [70, 30];
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
          onChatSettingsOpen={() => setChatSettingsOpen(true)}
          onMainSettingsOpen={() => setMainSettingsOpen(true)}
        />

        {/* Main Content */}
        <div className="flex-1 flex min-w-0 h-full">
          {/* Content Area - Chat + Ask Interface */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Desktop: Resizable panels for Chat and Ask Interface */}
            <div className="hidden lg:flex flex-1 h-full">
              <ResizablePanelGroup
                direction="horizontal"
                onLayout={handlePanelSizeChange}
                className="h-full"
              >
                <ResizablePanel
                  defaultSize={getDefaultPanelSizes()[0]}
                  minSize={30}
                  className="h-full"
                >
                  <EnhancedChatInterface
                    user={user}
                    conversationId={currentConversationId}
                    targetLanguage={currentSettings.targetLanguage}
                    onConversationUpdate={handleConversationUpdate}
                    onConversationCreated={setCurrentConversationId}
                    onTextSelect={setSelectedText}
                  />
                </ResizablePanel>
                
                <ResizableHandle withHandle />
                
                <ResizablePanel
                  defaultSize={getDefaultPanelSizes()[1]}
                  minSize={20}
                  className="h-full bg-card border-l"
                >
                  <AskInterface
                    selectedText={selectedText}
                    targetLanguage={currentSettings.targetLanguage}
                    editorMatePrompt={currentSettings.editorMatePersonality}
                  />
                </ResizablePanel>
              </ResizablePanelGroup>
            </div>

            {/* Mobile: Single column layout */}
            <div className="lg:hidden flex-1 min-w-0 h-full">
              <EnhancedChatInterface
                user={user}
                conversationId={currentConversationId}
                targetLanguage={currentSettings.targetLanguage}
                onConversationUpdate={handleConversationUpdate}
                onConversationCreated={setCurrentConversationId}
                onTextSelect={setSelectedText}
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
          onSignOut={handleSignOut}
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
