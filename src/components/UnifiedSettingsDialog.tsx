import { useEffect, useState } from 'react';

import type {
  ConversationSettings,
  ConversationSettingsUpdate,
  GlobalSettings,
  GlobalSettingsUpdate,
} from '@/schemas/settings';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';

import DataManagementTab from './DataManagementTab';
import ModelSelector from './ModelSelector';
import UISettingsTab from './UISettingsTab';

/**
 *
 */
interface UnifiedSettingsDialogProps {
  conversationTitle?: string;
  initialSettings: ConversationSettings | GlobalSettings;
  mode: 'chat' | 'global';
  onOpenChange: (open: boolean) => void;
  onSave: (settings: ConversationSettingsUpdate | GlobalSettingsUpdate) => void;
  open: boolean;
}

const UnifiedSettingsDialog = ({
  conversationTitle,
  initialSettings,
  mode,
  onOpenChange,
  onSave,
  open,
}: UnifiedSettingsDialogProps): React.JSX.Element => {
  const [settings, setSettings] = useState<
    ConversationSettings | GlobalSettings
  >(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, open]);

  const handleSave = (): void => {
    onSave(settings);
    onOpenChange(false);
  };

  const handleSettingChange = (
    key: string,
    value: boolean | number | string
  ): void => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isGlobalMode = mode === 'global';

  // Define which tabs to show based on mode
  const tabs = [];

  // Both global and chat modes get general and personalities tabs
  tabs.push(
    { label: 'General', value: 'general' },
    { label: 'AI Personalities', value: 'personalities' }
  );

  // Only global mode gets UI and data tabs
  if (isGlobalMode) {
    tabs.push({ label: 'UI', value: 'ui' }, { label: 'Data', value: 'data' });
  }

  return (
    <Dialog onOpenChange={onOpenChange} open={open}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isGlobalMode
              ? 'Settings'
              : `Chat Settings - ${conversationTitle ?? 'Unknown'}`}
          </DialogTitle>
          <DialogDescription>
            {isGlobalMode
              ? 'Configure your global application settings and AI model preferences.'
              : 'Customize the AI personalities and behaviors for this specific conversation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs className="h-full flex flex-col" defaultValue="general">
            <TabsList
              className="grid w-full grid-cols-2 lg:grid-cols-4"
              style={{
                gridTemplateColumns: `repeat(${String(tabs.length)}, 1fr)`,
              }}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  className="text-sm"
                  key={tab.value}
                  value={tab.value}
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent className="space-y-6 mt-0" value="general">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="target-language">Target Language</Label>
                      <Select
                        onValueChange={(value) => {
                          handleSettingChange('targetLanguage', value);
                        }}
                        value={settings.targetLanguage}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {[
                            'Burmese',
                            'Cantonese',
                            'Chinese (Simplified)',
                            'Chinese (Traditional)',
                            'Danish',
                            'Dutch',
                            'English',
                            'French',
                            'German',
                            'Hakka',
                            'Hindi',
                            'Hokkien',
                            'Italian',
                            'Japanese',
                            'Korean',
                            'Norwegian',
                            'Portuguese',
                            'Russian',
                            'Sinhala',
                            'Spanish',
                            'Swedish',
                            'Thai',
                            'Ukrainian',
                            'Vietnamese',
                          ].map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="api-key">OpenRouter API Key</Label>
                      <Input
                        id="api-key"
                        onChange={(e) => {
                          handleSettingChange('apiKey', e.target.value);
                        }}
                        placeholder="sk-or-..."
                        type="password"
                        value={settings.apiKey}
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>AI Model</Label>
                        <div>
                          <ModelSelector
                            onValueChange={(value) => {
                              handleSettingChange('model', value);
                            }}
                            value={settings.model}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.streaming}
                        id="streaming"
                        onCheckedChange={(checked) => {
                          handleSettingChange('streaming', checked);
                        }}
                      />
                      <Label htmlFor="streaming">
                        Enable streaming responses
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.enableReasoning}
                        id="enableReasoning"
                        onCheckedChange={(checked) => {
                          handleSettingChange('enableReasoning', checked);
                        }}
                      />
                      <Label htmlFor="enableReasoning">
                        Enable reasoning tokens
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        checked={settings.reasoningExpanded}
                        id="reasoningExpanded"
                        onCheckedChange={(checked) => {
                          handleSettingChange('reasoningExpanded', checked);
                        }}
                      />
                      <Label htmlFor="reasoningExpanded">
                        Reasoning expanded by default
                      </Label>
                    </div>
                  </div>
                </div>

                {/* Advanced Settings - available in both modes */}
                <div className="border-t pt-6">
                  <h4 className="text-md font-medium mb-4">
                    Advanced Settings
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="chat-mate-background">
                          Chat Mate Background
                        </Label>
                        <Input
                          id="chat-mate-background"
                          onChange={(e) => {
                            handleSettingChange(
                              'chatMateBackground',
                              e.target.value
                            );
                          }}
                          placeholder="e.g., young professional, loves local culture"
                          value={
                            !isGlobalMode && 'chatMateBackground' in settings
                              ? settings.chatMateBackground
                              : ''
                          }
                        />
                      </div>

                      <div>
                        <Label htmlFor="editor-mate-expertise">
                          Editor Mate Expertise
                        </Label>
                        <Input
                          id="editor-mate-expertise"
                          onChange={(e) => {
                            handleSettingChange(
                              'editorMateExpertise',
                              e.target.value
                            );
                          }}
                          placeholder="e.g., 10+ years teaching experience"
                          value={
                            !isGlobalMode && 'editorMateExpertise' in settings
                              ? settings.editorMateExpertise
                              : ''
                          }
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feedback-style">Feedback Style</Label>
                        <Select
                          onValueChange={(value) => {
                            handleSettingChange('feedbackStyle', value);
                          }}
                          value={
                            !isGlobalMode && 'feedbackStyle' in settings
                              ? settings.feedbackStyle
                              : undefined
                          }
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="encouraging">
                              Encouraging
                            </SelectItem>
                            <SelectItem value="gentle">Gentle</SelectItem>
                            <SelectItem value="direct">Direct</SelectItem>
                            <SelectItem value="detailed">Detailed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-3">
                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={
                              !isGlobalMode && 'culturalContext' in settings
                                ? settings.culturalContext
                                : false
                            }
                            id="cultural-context"
                            onCheckedChange={(checked) => {
                              handleSettingChange('culturalContext', checked);
                            }}
                          />
                          <Label htmlFor="cultural-context">
                            Include cultural context
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            checked={
                              !isGlobalMode &&
                              'progressiveComplexity' in settings
                                ? settings.progressiveComplexity
                                : false
                            }
                            id="progressive-complexity"
                            onCheckedChange={(checked) => {
                              handleSettingChange(
                                'progressiveComplexity',
                                checked
                              );
                            }}
                          />
                          <Label htmlFor="progressive-complexity">
                            Progressive complexity
                          </Label>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              <TabsContent className="space-y-6 mt-0" value="personalities">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chat-mate-personality">
                        Chat Mate Personality
                      </Label>
                      <Textarea
                        className="min-h-[100px]"
                        id="chat-mate-personality"
                        onChange={(e) => {
                          handleSettingChange(
                            'chatMatePersonality',
                            e.target.value
                          );
                        }}
                        placeholder="Describe how Chat Mate should behave..."
                        value={
                          !isGlobalMode && 'chatMatePersonality' in settings
                            ? settings.chatMatePersonality
                            : ''
                        }
                      />
                    </div>

                    <div>
                      <Label htmlFor="editor-mate-personality">
                        Editor Mate Personality
                      </Label>
                      <Textarea
                        className="min-h-[100px]"
                        id="editor-mate-personality"
                        onChange={(e) => {
                          handleSettingChange(
                            'editorMatePersonality',
                            e.target.value
                          );
                        }}
                        placeholder="Describe how Editor Mate should provide feedback..."
                        value={
                          !isGlobalMode && 'editorMatePersonality' in settings
                            ? settings.editorMatePersonality
                            : ''
                        }
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {isGlobalMode && (
                <TabsContent className="mt-0" value="ui">
                  <UISettingsTab
                    onSettingChange={handleSettingChange}
                    settings={{
                      theme: 'theme' in settings ? settings.theme : 'system',
                    }}
                  />
                </TabsContent>
              )}

              {isGlobalMode && (
                <TabsContent className="mt-0" value="data">
                  <DataManagementTab />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button
            onClick={() => {
              onOpenChange(false);
            }}
            variant="outline"
          >
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedSettingsDialog;
