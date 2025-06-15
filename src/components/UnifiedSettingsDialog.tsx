
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Dialog, 
  DialogContent, 
  DialogHeader, 
  DialogTitle, 
  DialogFooter 
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { 
  Settings, 
  MessageCircle, 
  GraduationCap, 
  Brain,
  Globe,
  Key,
  Zap,
  LogOut,
  User,
  Monitor,
  Moon,
  Sun
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import { useTheme } from "@/components/ThemeProvider";
import ModelSelector from "./ModelSelector";

interface SettingsData {
  // AI Agent settings
  chatMatePersonality: string;
  editorMatePersonality: string;
  
  // Advanced settings
  chatMateBackground: string;
  editorMateExpertise: string;
  feedbackStyle: 'gentle' | 'direct' | 'encouraging' | 'detailed';
  culturalContext: boolean;
  progressiveComplexity: boolean;
  
  // User profile
  userDescription: string;
  
  // UI settings
  darkMode: 'system' | 'light' | 'dark';
  
  // Language settings
  targetLanguage: string;
  streamingEnabled: boolean;
  
  // API settings
  provider: string;
  model: string;
  apiKey: string;
}

interface UnifiedSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'main' | 'chat';
  initialSettings?: Partial<SettingsData>;
  onSave: (settings: SettingsData) => void;
  conversationTitle?: string;
  onSignOut?: () => void;
}

const UnifiedSettingsDialog = ({ 
  open, 
  onOpenChange, 
  mode,
  initialSettings = {},
  onSave,
  conversationTitle,
  onSignOut
}: UnifiedSettingsDialogProps) => {
  const [settings, setSettings] = useState<SettingsData>({
    chatMatePersonality: initialSettings.chatMatePersonality || "You are a friendly local who loves helping newcomers feel welcome. You're enthusiastic about culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into society.",
    editorMatePersonality: initialSettings.editorMatePersonality || "You are an experienced language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.",
    chatMateBackground: initialSettings.chatMateBackground || "young professional, loves local culture and outdoor activities",
    editorMateExpertise: initialSettings.editorMateExpertise || "10+ years teaching experience, specializes in conversational fluency",
    feedbackStyle: initialSettings.feedbackStyle || 'encouraging',
    culturalContext: initialSettings.culturalContext ?? true,
    progressiveComplexity: initialSettings.progressiveComplexity ?? true,
    userDescription: initialSettings.userDescription || '',
    darkMode: initialSettings.darkMode || 'system',
    targetLanguage: initialSettings.targetLanguage || 'swedish',
    streamingEnabled: initialSettings.streamingEnabled ?? true,
    provider: 'openrouter', // Always OpenRouter
    model: initialSettings.model || 'anthropic/claude-3-5-sonnet',
    apiKey: initialSettings.apiKey || ''
  });

  const { toast } = useToast();
  const { setTheme } = useTheme();

  useEffect(() => {
    if (open) {
      setSettings({
        chatMatePersonality: initialSettings.chatMatePersonality || "You are a friendly local who loves helping newcomers feel welcome. You're enthusiastic about culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into society.",
        editorMatePersonality: initialSettings.editorMatePersonality || "You are an experienced language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.",
        chatMateBackground: initialSettings.chatMateBackground || "young professional, loves local culture and outdoor activities",
        editorMateExpertise: initialSettings.editorMateExpertise || "10+ years teaching experience, specializes in conversational fluency",
        feedbackStyle: initialSettings.feedbackStyle || 'encouraging',
        culturalContext: initialSettings.culturalContext ?? true,
        progressiveComplexity: initialSettings.progressiveComplexity ?? true,
        userDescription: initialSettings.userDescription || '',
        darkMode: initialSettings.darkMode || 'system',
        targetLanguage: initialSettings.targetLanguage || 'swedish',
        streamingEnabled: initialSettings.streamingEnabled ?? true,
        provider: 'openrouter', // Always OpenRouter
        model: initialSettings.model || 'anthropic/claude-3-5-sonnet',
        apiKey: initialSettings.apiKey || ''
      });
    }
  }, [open, initialSettings]);

  const handleSave = () => {
    // Apply theme change immediately
    setTheme(settings.darkMode);
    onSave(settings);
    toast({
      title: mode === 'main' ? "Settings template saved" : "Chat settings saved",
      description: mode === 'main' 
        ? "Your default settings have been updated for new conversations."
        : "Settings for this conversation have been updated."
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    const language = settings.targetLanguage;
    const languageLabel = languages.find(l => l.value === language)?.label || 'Swedish';
    
    setSettings({
      ...settings,
      chatMatePersonality: `You are a friendly ${languageLabel} local who loves helping newcomers feel welcome. You're enthusiastic about ${languageLabel} culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into ${languageLabel} society.`,
      editorMatePersonality: `You are an experienced ${languageLabel} language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.`,
      chatMateBackground: "young professional, loves local culture and outdoor activities",
      editorMateExpertise: "10+ years teaching experience, specializes in conversational fluency"
    });
  };

  const languages = [
    { value: 'swedish', label: 'Swedish' },
    { value: 'english', label: 'English' },
    { value: 'german', label: 'German' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'italian', label: 'Italian' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'dutch', label: 'Dutch' },
    { value: 'norwegian', label: 'Norwegian' },
    { value: 'danish', label: 'Danish' }
  ];

  const feedbackStyles = [
    { value: 'gentle', label: 'Gentle & Patient' },
    { value: 'encouraging', label: 'Encouraging & Positive' },
    { value: 'direct', label: 'Direct & Clear' },
    { value: 'detailed', label: 'Detailed & Comprehensive' }
  ];

  const handleSignOut = () => {
    if (onSignOut) {
      onSignOut();
    }
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {mode === 'main' ? 'Main Settings (Template)' : `Chat Settings${conversationTitle ? ` - ${conversationTitle}` : ''}`}
          </DialogTitle>
          {mode === 'main' && (
            <p className="text-sm text-muted-foreground">
              These settings will be used as defaults for new conversations.
            </p>
          )}
          {mode === 'chat' && (
            <p className="text-sm text-muted-foreground">
              These settings only apply to this conversation.
            </p>
          )}
        </DialogHeader>

        <Tabs defaultValue="agents" className="flex-1 overflow-hidden">
          <TabsList className="h-auto p-1 bg-muted overflow-x-auto w-full flex-nowrap justify-start">
            <div className="flex gap-1 min-w-max">
              <TabsTrigger value="agents" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                AI Agents
              </TabsTrigger>
              <TabsTrigger value="advanced" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                Advanced
              </TabsTrigger>
              <TabsTrigger value="language" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                Language
              </TabsTrigger>
              {mode === 'main' && (
                <TabsTrigger value="ui" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                  UI
                </TabsTrigger>
              )}
              <TabsTrigger value="api" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                API Settings
              </TabsTrigger>
              {mode === 'main' && (
                <TabsTrigger value="account" className="whitespace-nowrap text-xs sm:text-sm px-2 sm:px-3">
                  Account
                </TabsTrigger>
              )}
            </div>
          </TabsList>

          <div className="overflow-y-auto max-h-[55vh] pr-2">
            <TabsContent value="agents" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <User className="w-4 h-4 text-green-600" />
                  <h3 className="font-semibold">Your Profile</h3>
                  <Badge variant="secondary">Help AI understand you</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="user-description">About You</Label>
                  <Textarea
                    id="user-description"
                    value={settings.userDescription}
                    onChange={(e) => setSettings({ ...settings, userDescription: e.target.value })}
                    placeholder="Tell the AI agents about yourself: your background, interests, learning goals, current language level, etc. This helps them personalize their responses."
                    rows={3}
                  />
                  <p className="text-xs text-muted-foreground">
                    This information helps both Chat Mate and Editor Mate provide more personalized and relevant responses.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MessageCircle className="w-4 h-4 text-blue-600" />
                  <h3 className="font-semibold">Chat Mate Configuration</h3>
                  <Badge variant="secondary">Native Speaker</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chat-mate-personality">Personality & Conversation Style</Label>
                  <Textarea
                    id="chat-mate-personality"
                    value={settings.chatMatePersonality}
                    onChange={(e) => setSettings({ ...settings, chatMatePersonality: e.target.value })}
                    placeholder="Describe Chat Mate's personality and conversation style..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chat-mate-background">Background & Interests</Label>
                  <Input
                    id="chat-mate-background"
                    value={settings.chatMateBackground}
                    onChange={(e) => setSettings({ ...settings, chatMateBackground: e.target.value })}
                    placeholder="e.g., university student, works in tech, loves hiking..."
                  />
                  <p className="text-xs text-muted-foreground">
                    This helps create more engaging, contextual conversations.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <GraduationCap className="w-4 h-4 text-orange-600" />
                  <h3 className="font-semibold">Editor Mate Configuration</h3>
                  <Badge variant="secondary">Language Teacher</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editor-mate-personality">Teaching Philosophy & Approach</Label>
                  <Textarea
                    id="editor-mate-personality"
                    value={settings.editorMatePersonality}
                    onChange={(e) => setSettings({ ...settings, editorMatePersonality: e.target.value })}
                    placeholder="Describe Editor Mate's teaching style and approach..."
                    rows={3}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="editor-mate-expertise">Expertise & Experience</Label>
                  <Input
                    id="editor-mate-expertise"
                    value={settings.editorMateExpertise}
                    onChange={(e) => setSettings({ ...settings, editorMateExpertise: e.target.value })}
                    placeholder="e.g., 5+ years teaching, TESOL certified, specializes in business language..."
                  />
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset} size="sm">
                  Reset to Language Defaults
                </Button>
              </div>
            </TabsContent>

            <TabsContent value="advanced" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Zap className="w-4 h-4" />
                  <h3 className="font-semibold">Advanced AI Behavior</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="feedback-style">Editor Mate Feedback Style</Label>
                    <Select value={settings.feedbackStyle} onValueChange={(value: any) => setSettings({ ...settings, feedbackStyle: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select feedback style" />
                      </SelectTrigger>
                      <SelectContent>
                        {feedbackStyles.map((style) => (
                          <SelectItem key={style.value} value={style.value}>
                            {style.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      Controls how Editor Mate delivers corrections and suggestions.
                    </p>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Cultural Context Integration</Label>
                      <p className="text-xs text-muted-foreground">
                        Include cultural explanations and local context in responses
                      </p>
                    </div>
                    <Switch
                      checked={settings.culturalContext}
                      onCheckedChange={(checked) => setSettings({ ...settings, culturalContext: checked })}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Progressive Complexity</Label>
                      <p className="text-xs text-muted-foreground">
                        Gradually increase language complexity as conversation progresses
                      </p>
                    </div>
                    <Switch
                      checked={settings.progressiveComplexity}
                      onCheckedChange={(checked) => setSettings({ ...settings, progressiveComplexity: checked })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="language" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Globe className="w-4 h-4" />
                  <h3 className="font-semibold">Language Learning Settings</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="target-language">Target Language</Label>
                    <Select value={settings.targetLanguage} onValueChange={(value) => setSettings({ ...settings, targetLanguage: value })}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select language to learn" />
                      </SelectTrigger>
                      <SelectContent>
                        {languages.map((lang) => (
                          <SelectItem key={lang.value} value={lang.value}>
                            {lang.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between">
                    <div className="space-y-1">
                      <Label>Live Streaming</Label>
                      <p className="text-xs text-muted-foreground">
                        Stream AI responses in real-time as they're generated
                      </p>
                    </div>
                    <Switch
                      checked={settings.streamingEnabled}
                      onCheckedChange={(checked) => setSettings({ ...settings, streamingEnabled: checked })}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

            {mode === 'main' && (
              <TabsContent value="ui" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <Monitor className="w-4 h-4" />
                    <h3 className="font-semibold">User Interface Settings</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="dark-mode">Theme</Label>
                      <Select value={settings.darkMode} onValueChange={(value: 'system' | 'light' | 'dark') => setSettings({ ...settings, darkMode: value })}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select theme" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="system">
                            <div className="flex items-center gap-2">
                              <Monitor className="w-4 h-4" />
                              System
                            </div>
                          </SelectItem>
                          <SelectItem value="light">
                            <div className="flex items-center gap-2">
                              <Sun className="w-4 h-4" />
                              Light
                            </div>
                          </SelectItem>
                          <SelectItem value="dark">
                            <div className="flex items-center gap-2">
                              <Moon className="w-4 h-4" />
                              Dark
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <p className="text-xs text-muted-foreground">
                        Choose your preferred color theme. System automatically matches your device settings.
                      </p>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}

            <TabsContent value="api" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <Brain className="w-4 h-4" />
                  <h3 className="font-semibold">LLM Provider Settings</h3>
                </div>

                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="provider">Provider</Label>
                    <Select value="openrouter" disabled>
                      <SelectTrigger>
                        <SelectValue placeholder="OpenRouter (only supported provider)" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="openrouter">OpenRouter</SelectItem>
                      </SelectContent>
                    </Select>
                    <p className="text-xs text-muted-foreground">
                      OpenRouter provides access to multiple AI models through a single API.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <ModelSelector
                      value={settings.model}
                      onValueChange={(value) => setSettings({ ...settings, model: value })}
                      placeholder="Select an AI model..."
                    />
                    <p className="text-xs text-muted-foreground">
                      Choose the AI model that will power your conversations. Different models have varying capabilities and costs.
                    </p>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">OpenRouter API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="api-key"
                        type="password"
                        value={settings.apiKey}
                        onChange={(e) => setSettings({ ...settings, apiKey: e.target.value })}
                        placeholder="Enter your OpenRouter API key..."
                      />
                      <Button variant="outline" size="icon">
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored locally and never sent to our servers. Get your key from OpenRouter.ai.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>

            {mode === 'main' && (
              <TabsContent value="account" className="space-y-6 mt-4">
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b">
                    <User className="w-4 h-4" />
                    <h3 className="font-semibold">Account Management</h3>
                  </div>

                  <div className="space-y-4">
                    <div className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium">Sign Out</h4>
                          <p className="text-sm text-muted-foreground">
                            Sign out of your account and return to the login screen
                          </p>
                        </div>
                        <Button 
                          variant="destructive" 
                          onClick={handleSignOut}
                        >
                          <LogOut className="w-4 h-4 mr-2" />
                          Sign Out
                        </Button>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>
            )}
          </div>
        </Tabs>

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <div className="flex gap-2 w-full sm:w-auto sm:ml-auto">
            <Button variant="outline" onClick={() => onOpenChange(false)} className="flex-1 sm:flex-none">
              Cancel
            </Button>
            <Button onClick={handleSave} className="flex-1 sm:flex-none">
              Save Settings
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default UnifiedSettingsDialog;
