import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { GraduationCap } from 'lucide-react';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from '@/components/ui/resizable';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import ChatSidebar from './ChatSidebar';
import EnhancedChatInterface from './EnhancedChatInterface';
import AskInterface from './AskInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useTheme } from '@/components/ThemeProvider';
import {
  type GlobalSettingsUpdate,
  type ConversationSettingsUpdate,
} from '@/schemas/settings';

const LanguageMateApp = () => {
  const [currentConversationId, setCurrentConversationId] = useState<
    string | null
  >(null);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionSource, setSelectionSource] = useState<
    'main-chat' | 'ask-interface'
  >('main-chat');
  const [askInterfaceOpen, setAskInterfaceOpen] = useState(false);

  const {
    globalSettings,
    updateGlobalSettings,
    getConversationSettings,
    updateConversationSettings,
    createConversationSettings,
    getConversation,
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

  const handleConversationSelect = (conversationId: string | null) => {
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
    source: 'main-chat' | 'ask-interface' = 'main-chat'
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
          onConversationSelect={handleConversationSelect}
          onNewConversation={handleNewConversation}
          onChatSettingsOpen={() => {
            setChatSettingsOpen(true);
          }}
          onMainSettingsOpen={() => {
            setGlobalSettingsOpen(true);
          }}
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
                variant="outline"
                size="sm"
                onClick={() => {
                  setAskInterfaceOpen(true);
                }}
                className="flex items-center gap-2"
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
                      targetLanguage={globalSettings.targetLanguage}
                      onConversationUpdate={handleConversationUpdate}
                      onConversationCreated={handleConversationCreated}
                      onTextSelect={(text) => {
                        handleTextSelect(text, 'main-chat');
                      }}
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
                      targetLanguage={globalSettings.targetLanguage}
                      editorMatePrompt={
                        getCurrentChatSettings().editorMatePersonality
                      }
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
                  targetLanguage={globalSettings.targetLanguage}
                  onConversationUpdate={handleConversationUpdate}
                  onConversationCreated={handleConversationCreated}
                  onTextSelect={(text) => {
                    handleTextSelect(text, 'main-chat');
                  }}
                />

                {/* Editor Mate Drawer for Mobile */}
                <Drawer
                  open={askInterfaceOpen}
                  onOpenChange={setAskInterfaceOpen}
                >
                  <DrawerContent className="h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Editor Mate</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-hidden">
                      <AskInterface
                        selectedText={selectedText}
                        targetLanguage={globalSettings.targetLanguage}
                        editorMatePrompt={
                          getCurrentChatSettings().editorMatePersonality
                        }
                        onClose={() => {
                          setAskInterfaceOpen(false);
                        }}
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

        {/* Global Settings Dialog */}
        <UnifiedSettingsDialog
          open={globalSettingsOpen}
          onOpenChange={setGlobalSettingsOpen}
          mode="global"
          initialSettings={getCombinedGlobalSettings()}
          onSave={handleGlobalSettingsSave}
        />

        {/* Chat Settings Dialog */}
        <UnifiedSettingsDialog
          open={chatSettingsOpen}
          onOpenChange={setChatSettingsOpen}
          mode="chat"
          initialSettings={getCombinedChatSettings()}
          onSave={handleChatSettingsSave}
          conversationTitle={currentConversation?.title ?? 'New Chat'}
        />
      </div>
    </SidebarProvider>
  );
};

export default LanguageMateApp;
