
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import ModelSelector from './ModelSelector';
import DataManagementTab from './DataManagementTab';

interface UnifiedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'main' | 'chat';
  initialSettings: any;
  onSave: (settings: any) => void;
  conversationTitle?: string;
}

const UnifiedSettingsDialog = ({
  open,
  onOpenChange,
  mode,
  initialSettings,
  onSave,
  conversationTitle
}: UnifiedSettingsDialogProps) => {
  const [settings, setSettings] = useState(initialSettings);

  useEffect(() => {
    setSettings(initialSettings);
  }, [initialSettings, open]);

  const handleSave = () => {
    onSave(settings);
    onOpenChange(false);
  };

  const handleSettingChange = (key: string, value: any) => {
    setSettings(prev => ({ ...prev, [key]: value }));
  };

  const isMainMode = mode === 'main';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle>
            {isMainMode ? 'Main Settings' : `Chat Settings - ${conversationTitle}`}
          </DialogTitle>
          <DialogDescription>
            {isMainMode 
              ? 'Configure your global application settings and AI model preferences.'
              : 'Customize the AI personalities and behaviors for this specific conversation.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-hidden">
          <Tabs defaultValue={isMainMode ? "general" : "personalities"} className="h-full flex flex-col">
            <TabsList className="grid w-full grid-cols-3">
              {isMainMode && <TabsTrigger value="general">General</TabsTrigger>}
              <TabsTrigger value="personalities">AI Personalities</TabsTrigger>
              {isMainMode && <TabsTrigger value="data">Data</TabsTrigger>}
            </TabsList>

            <div className="flex-1 overflow-y-auto mt-4">
              {isMainMode && (
                <TabsContent value="general" className="space-y-6 mt-0">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                      <div>
                        <Label htmlFor="target-language">Target Language</Label>
                        <Select
                          value={settings.targetLanguage}
                          onValueChange={(value) => handleSettingChange('targetLanguage', value)}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="swedish">Swedish</SelectItem>
                            <SelectItem value="english">English</SelectItem>
                            <SelectItem value="spanish">Spanish</SelectItem>
                            <SelectItem value="french">French</SelectItem>
                            <SelectItem value="german">German</SelectItem>
                            <SelectItem value="italian">Italian</SelectItem>
                            <SelectItem value="portuguese">Portuguese</SelectItem>
                            <SelectItem value="dutch">Dutch</SelectItem>
                            <SelectItem value="norwegian">Norwegian</SelectItem>
                            <SelectItem value="danish">Danish</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div>
                        <Label htmlFor="api-key">OpenRouter API Key</Label>
                        <Input
                          id="api-key"
                          type="password"
                          value={settings.apiKey}
                          onChange={(e) => handleSettingChange('apiKey', e.target.value)}
                          placeholder="sk-or-..."
                        />
                      </div>

                      <div className="flex items-center space-x-2">
                        <Switch
                          id="streaming"
                          checked={settings.streaming}
                          onCheckedChange={(checked) => handleSettingChange('streaming', checked)}
                        />
                        <Label htmlFor="streaming">Enable streaming responses</Label>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div>
                        <Label>AI Model</Label>
                        <ModelSelector
                          value={settings.model}
                          onValueChange={(value) => handleSettingChange('model', value)}
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>
              )}

              <TabsContent value="personalities" className="space-y-6 mt-0">
                <div className="space-y-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="chat-mate-personality">Chat Mate Personality</Label>
                      <Textarea
                        id="chat-mate-personality"
                        value={settings.chatMatePersonality}
                        onChange={(e) => handleSettingChange('chatMatePersonality', e.target.value)}
                        placeholder="Describe how Chat Mate should behave..."
                        className="min-h-[100px]"
                      />
                    </div>

                    <div>
                      <Label htmlFor="editor-mate-personality">Editor Mate Personality</Label>
                      <Textarea
                        id="editor-mate-personality"
                        value={settings.editorMatePersonality}
                        onChange={(e) => handleSettingChange('editorMatePersonality', e.target.value)}
                        placeholder="Describe how Editor Mate should provide feedback..."
                        className="min-h-[100px]"
                      />
                    </div>
                  </div>

                  {isMainMode && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="chat-mate-background">Chat Mate Background</Label>
                          <Input
                            id="chat-mate-background"
                            value={settings.chatMateBackground}
                            onChange={(e) => handleSettingChange('chatMateBackground', e.target.value)}
                            placeholder="e.g., young professional, loves local culture"
                          />
                        </div>

                        <div>
                          <Label htmlFor="editor-mate-expertise">Editor Mate Expertise</Label>
                          <Input
                            id="editor-mate-expertise"
                            value={settings.editorMateExpertise}
                            onChange={(e) => handleSettingChange('editorMateExpertise', e.target.value)}
                            placeholder="e.g., 10+ years teaching experience"
                          />
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label htmlFor="feedback-style">Feedback Style</Label>
                          <Select
                            value={settings.feedbackStyle}
                            onValueChange={(value) => handleSettingChange('feedbackStyle', value)}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="encouraging">Encouraging</SelectItem>
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
                              onCheckedChange={(checked) => handleSettingChange('culturalContext', checked)}
                            />
                            <Label htmlFor="cultural-context">Include cultural context</Label>
                          </div>

                          <div className="flex items-center space-x-2">
                            <Switch
                              id="progressive-complexity"
                              checked={settings.progressiveComplexity}
                              onCheckedChange={(checked) => handleSettingChange('progressiveComplexity', checked)}
                            />
                            <Label htmlFor="progressive-complexity">Progressive complexity</Label>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </TabsContent>

              {isMainMode && (
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
          <Button onClick={handleSave}>
            Save Changes
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedSettingsDialog;
