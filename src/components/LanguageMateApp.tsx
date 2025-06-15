
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Settings, MessageSquare } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { ResizablePanelGroup, ResizablePanel, ResizableHandle } from "@/components/ui/resizable";
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle, DrawerTrigger } from "@/components/ui/drawer";
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import AskInterface from './AskInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { LocalConversation } from '@/services/localStorageService';

const LanguageMateApp = () => {
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [mainSettingsOpen, setMainSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [refreshSidebar, setRefreshSidebar] = useState(0);
  const [selectedText, setSelectedText] = useState('');
  const [selectionSource, setSelectionSource] = useState<'main-chat' | 'ask-interface'>('main-chat');
  const [askInterfaceOpen, setAskInterfaceOpen] = useState(false);
  const [pendingChatSettings, setPendingChatSettings] = useState<any>(null);
  
  const { settings, getConversation, updateSettings } = useLocalStorage();
  const isMobile = useIsMobile();
  
  // Get current conversation settings
  const currentConversation = currentConversationId ? getConversation(currentConversationId) : null;

  const handleConversationSelect = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    setPendingChatSettings(null); // Clear pending settings when selecting existing conversation
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleConversationUpdate = () => {
    setRefreshSidebar(prev => prev + 1);
  };

  const handleMainSettingsSave = (newSettings: any) => {
    updateSettings(newSettings);
  };

  const handleChatSettingsSave = (chatSettings: any) => {
    if (currentConversationId && currentConversation) {
      // Update existing conversation
      const updatedConversation: LocalConversation = {
        ...currentConversation,
        chat_mate_prompt: chatSettings.chatMatePersonality,
        editor_mate_prompt: chatSettings.editorMatePersonality,
        updated_at: new Date()
      };
      // This would need to be handled by the conversation update mechanism
    } else {
      // Store settings for new conversation
      setPendingChatSettings(chatSettings);
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

  const getCurrentChatSettings = () => {
    if (currentConversation) {
      return {
        chatMatePersonality: currentConversation.chat_mate_prompt || settings.chatMatePersonality,
        editorMatePersonality: currentConversation.editor_mate_prompt || settings.editorMatePersonality,
        chatMateBackground: settings.chatMateBackground,
        editorMateExpertise: settings.editorMateExpertise,
        feedbackStyle: settings.feedbackStyle,
        culturalContext: settings.culturalContext,
        progressiveComplexity: settings.progressiveComplexity,
      };
    }
    return pendingChatSettings || {
      chatMatePersonality: settings.chatMatePersonality,
      editorMatePersonality: settings.editorMatePersonality,
      chatMateBackground: settings.chatMateBackground,
      editorMateExpertise: settings.editorMateExpertise,
      feedbackStyle: settings.feedbackStyle,
      culturalContext: settings.culturalContext,
      progressiveComplexity: settings.progressiveComplexity,
    };
  };

  return (
    <SidebarProvider>
      <div className="h-screen flex w-full bg-background overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          currentConversationId={currentConversationId}
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          targetLanguage={settings.targetLanguage}
          refreshTrigger={refreshSidebar}
          onChatSettingsOpen={() => setChatSettingsOpen(true)}
          onMainSettingsOpen={() => setMainSettingsOpen(true)}
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
                      conversationId={currentConversationId}
                      targetLanguage={settings.targetLanguage}
                      onConversationUpdate={handleConversationUpdate}
                      onConversationCreated={setCurrentConversationId}
                      onTextSelect={(text) => handleTextSelect(text, 'main-chat')}
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
                      targetLanguage={settings.targetLanguage}
                      editorMatePrompt={getCurrentChatSettings().editorMatePersonality}
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
                  conversationId={currentConversationId}
                  targetLanguage={settings.targetLanguage}
                  onConversationUpdate={handleConversationUpdate}
                  onConversationCreated={setCurrentConversationId}
                  onTextSelect={(text) => handleTextSelect(text, 'main-chat')}
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
                        targetLanguage={settings.targetLanguage}
                        editorMatePrompt={getCurrentChatSettings().editorMatePersonality}
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
          initialSettings={settings}
          onSave={handleMainSettingsSave}
        />

        {/* Chat Settings Dialog */}
        <UnifiedSettingsDialog
          open={chatSettingsOpen}
          onOpenChange={setChatSettingsOpen}
          mode="chat"
          initialSettings={getCurrentChatSettings()}
          onSave={handleChatSettingsSave}
          conversationTitle={currentConversation?.title || "New Chat"}
        />
      </div>
    </SidebarProvider>
  );
};

export default LanguageMateApp;
