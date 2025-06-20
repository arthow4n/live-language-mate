import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import ModelSelector from './ModelSelector';
import DataManagementTab from './DataManagementTab';
import UISettingsTab from './UISettingsTab';
import { 
  type GlobalSettings, 
  type ChatSettings,
  type GlobalSettingsUpdate,
  type ChatSettingsUpdate 
} from '@/types/settings';

interface UnifiedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'global' | 'chat';
  initialSettings: GlobalSettings | ChatSettings;
  onSave: (settings: GlobalSettingsUpdate | ChatSettingsUpdate) => void;
  conversationTitle?: string;
}

const UnifiedSettingsDialog = ({
  open,
  onOpenChange,
  mode,
  initialSettings,
  onSave,
  conversationTitle,
}: UnifiedSettingsDialogProps) => {
  const [settings, setSettings] = useState<GlobalSettings | ChatSettings>(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, open]);

  const handleSave = () => {
    onSave(settings);
    onOpenChange(false);
  };

  const handleSettingChange = (key: string, value: string | boolean | number) => {
    setSettings((prev) => ({ ...prev, [key]: value }));
  };

  const isGlobalMode = mode === 'global';

  // Define which tabs to show based on mode
  const tabs = [];

  // Both global and chat modes get general and personalities tabs
  tabs.push(
    { value: 'general', label: 'General' },
    { value: 'personalities', label: 'AI Personalities' }
  );

  // Only global mode gets UI and data tabs
  if (isGlobalMode) {
    tabs.push({ value: 'ui', label: 'UI' }, { value: 'data', label: 'Data' });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isGlobalMode ? 'Settings' : `Chat Settings - ${conversationTitle}`}
          </DialogTitle>
          <DialogDescription>
            {isGlobalMode
              ? 'Configure your global application settings and AI model preferences.'
              : 'Customize the AI personalities and behaviors for this specific conversation.'}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <Tabs defaultValue="general" className="h-full flex flex-col">
            <TabsList
              className="grid w-full grid-cols-2 lg:grid-cols-4"
              style={{ gridTemplateColumns: `repeat(${tabs.length}, 1fr)` }}
            >
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="text-sm"
                >
                  {tab.label}
                </TabsTrigger>
              ))}
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              <TabsContent value="general" className="space-y-6 mt-0">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="target-language">Target Language</Label>
                      <Select
                        value={settings.targetLanguage}
                        onValueChange={(value) =>
                          handleSettingChange('targetLanguage', value)
                        }
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
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) =>
                          handleSettingChange('apiKey', e.target.value)
                        }
                        placeholder="sk-or-..."
                      />
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>AI Model</Label>
                        <div>
                          <ModelSelector
                            value={settings.model}
                            onValueChange={(value) =>
                              handleSettingChange('model', value)
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="streaming"
                        checked={settings.streaming}
                        onCheckedChange={(checked) =>
                          handleSettingChange('streaming', checked)
                        }
                      />
                      <Label htmlFor="streaming">
                        Enable streaming responses
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="enableReasoning"
                        checked={settings.enableReasoning}
                        onCheckedChange={(checked) =>
                          handleSettingChange('enableReasoning', checked)
                        }
                      />
                      <Label htmlFor="enableReasoning">
                        Enable reasoning tokens
                      </Label>
                    </div>

                    <div className="flex items-center space-x-2">
                      <Switch
                        id="reasoningExpanded"
                        checked={settings.reasoningExpanded}
                        onCheckedChange={(checked) =>
                          handleSettingChange('reasoningExpanded', checked)
                        }
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
                          value={settings.chatMateBackground}
                          onChange={(e) =>
                            handleSettingChange(
                              'chatMateBackground',
                              e.target.value
                            )
                          }
                          placeholder="e.g., young professional, loves local culture"
                        />
                      </div>

                      <div>
                        <Label htmlFor="editor-mate-expertise">
                          Editor Mate Expertise
                        </Label>
                        <Input
                          id="editor-mate-expertise"
                          value={settings.editorMateExpertise}
                          onChange={(e) =>
                            handleSettingChange(
                              'editorMateExpertise',
                              e.target.value
                            )
                          }
                          placeholder="e.g., 10+ years teaching experience"
                        />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="feedback-style">Feedback Style</Label>
                        <Select
                          value={settings.feedbackStyle}
                          onValueChange={(value) =>
                            handleSettingChange('feedbackStyle', value)
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
                            id="cultural-context"
                            checked={settings.culturalContext}
                            onCheckedChange={(checked) =>
                              handleSettingChange('culturalContext', checked)
                            }
                          />
                          <Label htmlFor="cultural-context">
                            Include cultural context
                          </Label>
                        </div>

                        <div className="flex items-center space-x-2">
                          <Switch
                            id="progressive-complexity"
                            checked={settings.progressiveComplexity}
                            onCheckedChange={(checked) =>
                              handleSettingChange(
                                'progressiveComplexity',
                                checked
                              )
                            }
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

              <TabsContent value="personalities" className="space-y-6 mt-0">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chat-mate-personality">
                        Chat Mate Personality
                      </Label>
                      <Textarea
                        id="chat-mate-personality"
                        value={settings.chatMatePersonality}
                        onChange={(e) =>
                          handleSettingChange(
                            'chatMatePersonality',
                            e.target.value
                          )
                        }
                        placeholder="Describe how Chat Mate should behave..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="editor-mate-personality">
                        Editor Mate Personality
                      </Label>
                      <Textarea
                        id="editor-mate-personality"
                        value={settings.editorMatePersonality}
                        onChange={(e) =>
                          handleSettingChange(
                            'editorMatePersonality',
                            e.target.value
                          )
                        }
                        placeholder="Describe how Editor Mate should provide feedback..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {isGlobalMode && (
                <TabsContent value="ui" className="mt-0">
                  <UISettingsTab
                    settings={settings}
                    onSettingChange={handleSettingChange}
                  />
                </TabsContent>
              )}

              {isGlobalMode && (
                <TabsContent value="data" className="mt-0">
                  <DataManagementTab />
                </TabsContent>
              )}
            </div>
          </Tabs>
        </div>

        <div className="flex justify-end space-x-2 pt-4 border-t">
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>Save Changes</Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedSettingsDialog;
