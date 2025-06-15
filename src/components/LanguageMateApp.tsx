import { useState, useEffect } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { Settings, LogOut, MessageSquare } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import AskInterface from './AskInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';
import { SettingsProvider, useSettings } from '@/contexts/SettingsContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { supabase } from "@/integrations/supabase/client";
import { generateChatTitle, updateConversationTitle } from '@/utils/chatTitleGenerator';

interface LanguageMateAppProps {
  user: User;
}

const LanguageMateAppContent = ({ user }: LanguageMateAppProps) => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [mainSettingsOpen, setMainSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionSource, setSelectionSource] = useState<'main-chat' | 'ask-interface'>('main-chat');
  const [askInterfaceOpen, setAskInterfaceOpen] = useState(false);
  const [pendingNewChatSettings, setPendingNewChatSettings] = useState<any>(null);
  
  const { mainSettings, updateMainSettings, getChatSettings, updateChatSettings, getMainSettings } = useSettings();
  const isMobile = useIsMobile();
  
  // Get current conversation settings
  const currentChatSettings = currentConversationId ? getChatSettings(currentConversationId) : null;
  const currentMainSettings = getMainSettings();

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    // Clear pending settings when selecting an existing conversation
    setPendingNewChatSettings(null);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
    // Clear pending settings when starting fresh
    setPendingNewChatSettings(null);
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
    } else {
      // For new conversations, store the settings temporarily
      setPendingNewChatSettings(settings);
      console.log('📝 Stored pending settings for new conversation:', settings);
    }
  };

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    
    // Apply pending settings if they exist
    if (pendingNewChatSettings) {
      console.log('✨ Applying pending settings to new conversation:', conversationId, pendingNewChatSettings);
      updateChatSettings(conversationId, pendingNewChatSettings);
      setPendingNewChatSettings(null);
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

  const handleTextSelect = (text: string, source: 'main-chat' | 'ask-interface' = 'main-chat') => {
    setSelectedText(text);
    setSelectionSource(source);
    if (isMobile && text.trim()) {
      setAskInterfaceOpen(true);
    }
  };

  const handleAskInterfaceTextSelect = (text: string) => {
    handleTextSelect(text, 'ask-interface');
  };

  // Get effective chat settings (pending settings for new conversations, or saved settings for existing ones)
  const effectiveChatSettings = currentConversationId 
    ? currentChatSettings 
    : (pendingNewChatSettings || {
        chatMatePersonality: `You are a friendly local who loves helping newcomers feel welcome. You're enthusiastic about culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into society.`,
        editorMatePersonality: `You are an experienced language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.`
      });

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          user={user}
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          targetLanguage={currentMainSettings.targetLanguage}
          refreshTrigger={refreshSidebar}
          onChatSettingsOpen={() => setChatSettingsOpen(true)}
          onMainSettingsOpen={() => setMainSettingsOpen(true)}
          isNewConversation={currentConversationId === null}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header with Sidebar Toggle */}
          <div className="flex items-center h-12 px-4 border-b bg-background shrink-0">
            <SidebarTrigger className="mr-2" />
            <h1 className="text-lg font-semibold">Live Language Mate</h1>
          </div>

          {/* Content Area - Chat + Ask Interface */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Desktop: Resizable panels for Chat and Ask Interface */}
            {!isMobile && (
              <div className="flex-1 h-full">
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
                      targetLanguage={currentMainSettings.targetLanguage}
                      onConversationUpdate={handleConversationUpdate}
                      onConversationCreated={handleConversationCreated}
                      onTextSelect={(text) => handleTextSelect(text, 'main-chat')}
                      pendingChatSettings={pendingNewChatSettings}
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
                      targetLanguage={currentMainSettings.targetLanguage}
                      editorMatePrompt={effectiveChatSettings?.editorMatePersonality || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.'}
                      onTextSelect={handleAskInterfaceTextSelect}
                      selectionSource={selectionSource}
                    />
                  </ResizablePanel>
                </ResizablePanelGroup>
              </div>
            )}

            {/* Mobile: Single column layout with drawer for Ask Interface */}
            {isMobile && (
              <div className="flex-1 min-w-0 h-full relative">
                <EnhancedChatInterface
                  user={user}
                  conversationId={currentConversationId}
                  targetLanguage={currentMainSettings.targetLanguage}
                  onConversationUpdate={handleConversationUpdate}
                  onConversationCreated={handleConversationCreated}
                  onTextSelect={(text) => handleTextSelect(text, 'main-chat')}
                  onAskInterfaceOpen={() => setAskInterfaceOpen(true)}
                  selectedText={selectedText}
                  editorMatePrompt={effectiveChatSettings?.editorMatePersonality || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.'}
                  pendingChatSettings={pendingNewChatSettings}
                />

                {/* Editor Mate Drawer for Mobile */}
                <Drawer open={askInterfaceOpen} onOpenChange={setAskInterfaceOpen}>
                  <DrawerContent className="h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Editor Mate</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-hidden">
                      <AskInterface
                        selectedText={selectedText}
                        targetLanguage={currentMainSettings.targetLanguage}
                        editorMatePrompt={effectiveChatSettings?.editorMatePersonality || 'You are a patient language teacher. Provide helpful corrections and suggestions to improve language skills.'}
                        onClose={() => setAskInterfaceOpen(false)}
                        onTextSelect={handleAskInterfaceTextSelect}
                        selectionSource={selectionSource}
                        hideHeader={true}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            )}
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

        {/* Chat Settings Dialog - Updated to handle new conversations */}
        <UnifiedSettingsDialog
          open={chatSettingsOpen}
          onOpenChange={setChatSettingsOpen}
          mode="chat"
          initialSettings={effectiveChatSettings}
          onSave={handleChatSettingsSave}
          conversationTitle={currentConversationId ? "Current Chat" : "New Chat"}
        />
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
