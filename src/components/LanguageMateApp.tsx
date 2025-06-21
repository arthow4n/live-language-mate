import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  ConversationSettingsUpdate,
  GlobalSettingsUpdate,
} from '@/schemas/settings';

import { useTheme } from '@/components/ThemeProvider';
import { Button } from '@/components/ui/button';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from '@/components/ui/resizable';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';

import AskInterface from './AskInterface';
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';

const LanguageMateApp = () => {
  const [currentConversationId, setCurrentConversationId] = useState<
    null | string
  >(null);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionSource, setSelectionSource] = useState<
    'ask-interface' | 'main-chat'
  >('main-chat');
  const [askInterfaceOpen, setAskInterfaceOpen] = useState(false);

  const {
    createConversationSettings,
    getConversation,
    getConversationSettings,
    globalSettings,
    updateConversationSettings,
    updateGlobalSettings,
  } = useUnifiedStorage();
  const { setTheme } = useTheme();
  const isMobile = useIsMobile();

  // Apply theme on load
  useEffect(() => {
    setTheme(globalSettings.theme);
  }, [globalSettings.theme, setTheme]);

  // Get current conversation
  const currentConversation = currentConversationId
    ? getConversation(currentConversationId)
    : null;

  const handleConversationSelect = (conversationId: null | string) => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setCurrentConversationId(null);
  };

  const handleConversationUpdate = () => {
    // Sidebar will auto-refresh from localStorage context
  };

  const handleConversationCreated = (conversationId: string) => {
    setCurrentConversationId(conversationId);
    createConversationSettings(conversationId);
  };

  const handleGlobalSettingsSave = (newSettings: GlobalSettingsUpdate) => {
    updateGlobalSettings(newSettings);
  };

  const handleChatSettingsSave = (chatSettings: ConversationSettingsUpdate) => {
    if (currentConversationId) {
      updateConversationSettings(currentConversationId, chatSettings);
    }
  };

  const handlePanelSizeChange = (sizes: number[]) => {
    localStorage.setItem('languageMate_panelSizes', JSON.stringify(sizes));
  };

  const getDefaultPanelSizes = () => {
    const saved = localStorage.getItem('languageMate_panelSizes');
    if (saved) {
      try {
        const sizes = JSON.parse(saved) as unknown[];
        return Array.isArray(sizes) && sizes.length === 2
          ? (sizes as [number, number])
          : [70, 30];
      } catch {
        return [70, 30];
      }
    }
    return [70, 30];
  };

  const handleTextSelect = (
    text: string,
    source: 'ask-interface' | 'main-chat' = 'main-chat'
  ) => {
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
    if (currentConversationId) {
      return getConversationSettings(currentConversationId);
    }
    return getConversationSettings('default');
  };

  const getCombinedGlobalSettings = () => {
    const chatDefaults = getConversationSettings('default');
    return {
      ...globalSettings,
      ...chatDefaults,
    };
  };

  const getCombinedChatSettings = () => {
    if (currentConversationId) {
      const chatSpecificSettings = getConversationSettings(
        currentConversationId
      );
      return {
        ...globalSettings,
        ...chatSpecificSettings,
      };
    }
    return getCombinedGlobalSettings();
  };

  return (
    <SidebarProvider>
      <div className="h-dvh flex w-full bg-background overflow-hidden">
        {/* Chat Sidebar */}
        <ChatSidebar
          currentConversationId={currentConversationId}
          onChatSettingsOpen={() => {
            setChatSettingsOpen(true);
          }}
          onConversationSelect={handleConversationSelect}
          onMainSettingsOpen={() => {
            setGlobalSettingsOpen(true);
          }}
          onNewConversation={handleNewConversation}
        />

        {/* Main Content */}
        <div className="flex-1 flex flex-col min-w-0 h-full">
          {/* Header with Sidebar Toggle and Editor Mate Toggle */}
          <div className="flex items-center justify-between h-12 px-4 border-b bg-background shrink-0">
            <div className="flex items-center">
              <SidebarTrigger className="mr-2" />
              <h1 className="text-lg font-semibold">Live Language Mate</h1>
            </div>

            {/* Editor Mate Toggle Button - visible on mobile */}
            {isMobile && (
              <Button
                className="flex items-center gap-2"
                onClick={() => {
                  setAskInterfaceOpen(true);
                }}
                size="sm"
                variant="outline"
              >
                <GraduationCap className="w-4 h-4" />
                Editor Mate
              </Button>
            )}
          </div>

          {/* Content Area - Chat + Ask Interface */}
          <div className="flex-1 flex overflow-hidden min-h-0">
            {/* Desktop: Resizable panels for Chat and Ask Interface */}
            {!isMobile && (
              <div className="flex-1 h-full">
                <ResizablePanelGroup
                  className="h-full"
                  direction="horizontal"
                  onLayout={handlePanelSizeChange}
                >
                  <ResizablePanel
                    className="h-full"
                    defaultSize={getDefaultPanelSizes()[0]}
                    minSize={30}
                  >
                    <EnhancedChatInterface
                      conversationId={currentConversationId}
                      onConversationCreated={handleConversationCreated}
                      onConversationUpdate={handleConversationUpdate}
                      onTextSelect={(text) => {
                        handleTextSelect(text, 'main-chat');
                      }}
                      targetLanguage={globalSettings.targetLanguage}
                    />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    className="h-full bg-card border-l"
                    defaultSize={getDefaultPanelSizes()[1]}
                    minSize={20}
                  >
                    <AskInterface
                      editorMatePrompt={
                        getCurrentChatSettings().editorMatePersonality
                      }
                      onTextSelect={handleAskInterfaceTextSelect}
                      selectedText={selectedText}
                      selectionSource={selectionSource}
                      targetLanguage={globalSettings.targetLanguage}
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
                  onConversationCreated={handleConversationCreated}
                  onConversationUpdate={handleConversationUpdate}
                  onTextSelect={(text) => {
                    handleTextSelect(text, 'main-chat');
                  }}
                  targetLanguage={globalSettings.targetLanguage}
                />

                {/* Editor Mate Drawer for Mobile */}
                <Drawer
                  onOpenChange={setAskInterfaceOpen}
                  open={askInterfaceOpen}
                >
                  <DrawerContent className="h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Editor Mate</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-hidden">
                      <AskInterface
                        editorMatePrompt={
                          getCurrentChatSettings().editorMatePersonality
                        }
                        hideHeader={true}
                        onClose={() => {
                          setAskInterfaceOpen(false);
                        }}
                        onTextSelect={handleAskInterfaceTextSelect}
                        selectedText={selectedText}
                        selectionSource={selectionSource}
                        targetLanguage={globalSettings.targetLanguage}
                      />
                    </div>
                  </DrawerContent>
                </Drawer>
              </div>
            )}
          </div>
        </div>

        {/* Global Settings Dialog */}
        <UnifiedSettingsDialog
          initialSettings={getCombinedGlobalSettings()}
          mode="global"
          onOpenChange={setGlobalSettingsOpen}
          onSave={handleGlobalSettingsSave}
          open={globalSettingsOpen}
        />

        {/* Chat Settings Dialog */}
        <UnifiedSettingsDialog
          conversationTitle={currentConversation?.title ?? 'New Chat'}
          initialSettings={getCombinedChatSettings()}
          mode="chat"
          onOpenChange={setChatSettingsOpen}
          onSave={handleChatSettingsSave}
          open={chatSettingsOpen}
        />
      </div>
    </SidebarProvider>
  );
};

export default LanguageMateApp;
