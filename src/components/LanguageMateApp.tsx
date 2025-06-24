import { GraduationCap } from 'lucide-react';
import { useEffect, useState } from 'react';

import type {
  ConversationSettings,
  ConversationSettingsUpdate,
  GlobalSettings,
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

import ChatSidebar from './ChatSidebar';
import EditorMatePanel from './EditorMatePanel';
import EnhancedChatInterface from './EnhancedChatInterface';
import UnifiedSettingsDialog from './UnifiedSettingsDialog';

const LanguageMateApp = (): React.JSX.Element => {
  const [currentConversationId, setCurrentConversationId] = useState<
    null | string
  >(null);
  const [globalSettingsOpen, setGlobalSettingsOpen] = useState(false);
  const [chatSettingsOpen, setChatSettingsOpen] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const [selectionSource, setSelectionSource] = useState<
    'ask-interface' | 'main-chat'
  >('main-chat');
  const [editorMatePanelOpen, setEditorMatePanelOpen] = useState(false);

  const {
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

  const handleConversationSelect = (conversationId: null | string): void => {
    setCurrentConversationId(conversationId);
  };

  const handleNewConversation = (): void => {
    setCurrentConversationId(null);
  };

  const handleConversationUpdate = (): void => {
    // Sidebar will auto-refresh from localStorage context
  };

  const handleConversationCreated = (conversationId: string): void => {
    setCurrentConversationId(conversationId);
    // Don't call createConversationSettings here as it overwrites any custom settings
    // that were already set during conversation creation (e.g., custom model/language)
    // The settings will be created on-demand by getConversationSettings if needed
  };

  const handleGlobalSettingsSave = (
    newSettings: GlobalSettingsUpdate
  ): void => {
    updateGlobalSettings(newSettings);
  };

  const handleChatSettingsSave = (
    chatSettings: ConversationSettingsUpdate
  ): void => {
    if (currentConversationId) {
      updateConversationSettings(currentConversationId, chatSettings);
    }
  };

  const handlePanelSizeChange = (sizes: number[]): void => {
    localStorage.setItem('languageMate_panelSizes', JSON.stringify(sizes));
  };

  const getDefaultPanelSizes = (): number[] => {
    const saved = localStorage.getItem('languageMate_panelSizes');
    if (saved) {
      try {
        const sizes = JSON.parse(saved);
        return Array.isArray(sizes) &&
          sizes.length === 2 &&
          typeof sizes[0] === 'number' &&
          typeof sizes[1] === 'number'
          ? [sizes[0], sizes[1]]
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
  ): void => {
    setSelectedText(text);
    setSelectionSource(source);
    if (isMobile && text.trim()) {
      setEditorMatePanelOpen(true);
    }
  };

  const handleEditorMatePanelTextSelect = (text: string): void => {
    handleTextSelect(text, 'ask-interface');
  };

  const getCurrentChatSettings = (): ConversationSettings => {
    if (currentConversationId) {
      return getConversationSettings(currentConversationId);
    }
    return getConversationSettings('default');
  };

  const getCurrentTargetLanguage = (): string => {
    if (currentConversationId) {
      const chatSettings = getConversationSettings(currentConversationId);
      return chatSettings.targetLanguage;
    }
    return globalSettings.targetLanguage;
  };

  const getCombinedGlobalSettings = (): GlobalSettings => {
    const chatDefaults = getConversationSettings('default');
    return {
      ...globalSettings,
      ...chatDefaults,
    };
  };

  const getCombinedChatSettings = (): ConversationSettings => {
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
                  setEditorMatePanelOpen(true);
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
                      targetLanguage={getCurrentTargetLanguage()}
                    />
                  </ResizablePanel>

                  <ResizableHandle withHandle />

                  <ResizablePanel
                    className="h-full bg-card border-l"
                    defaultSize={getDefaultPanelSizes()[1]}
                    minSize={20}
                  >
                    <EditorMatePanel
                      editorMatePrompt={
                        getCurrentChatSettings().editorMatePersonality
                      }
                      onTextSelect={handleEditorMatePanelTextSelect}
                      selectedText={selectedText}
                      selectionSource={selectionSource}
                      targetLanguage={getCurrentTargetLanguage()}
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
                  targetLanguage={getCurrentTargetLanguage()}
                />

                {/* Editor Mate Drawer for Mobile */}
                <Drawer
                  onOpenChange={setEditorMatePanelOpen}
                  open={editorMatePanelOpen}
                >
                  <DrawerContent className="h-[80vh]">
                    <DrawerHeader>
                      <DrawerTitle>Editor Mate</DrawerTitle>
                    </DrawerHeader>
                    <div className="flex-1 overflow-hidden">
                      <EditorMatePanel
                        editorMatePrompt={
                          getCurrentChatSettings().editorMatePersonality
                        }
                        hideHeader={true}
                        onClose={() => {
                          setEditorMatePanelOpen(false);
                        }}
                        onTextSelect={handleEditorMatePanelTextSelect}
                        selectedText={selectedText}
                        selectionSource={selectionSource}
                        targetLanguage={getCurrentTargetLanguage()}
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
