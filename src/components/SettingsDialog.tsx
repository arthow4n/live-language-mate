import { useState } from 'react';
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
  Key
} from 'lucide-react';
import { useToast } from "@/hooks/use-toast";
import ModelSelector from "./ModelSelector";

interface SettingsData {
  // AI Agent settings
  chatMatePersonality: string;
  editorMatePersonality: string;
  
  // Language settings
  targetLanguage: string;
  streamingEnabled: boolean;
  
  // API settings
  provider: string;
  model: string;
  apiKey: string;
}

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode?: 'main' | 'chat';
  initialSettings?: Partial<SettingsData>;
  onSave?: (settings: SettingsData) => void;
  conversationTitle?: string;
}

const SettingsDialog = ({ 
  open, 
  onOpenChange, 
  mode = 'main',
  initialSettings = {},
  onSave,
  conversationTitle
}: SettingsDialogProps) => {
  const [apiKey, setApiKey] = useState(initialSettings.apiKey || '');
  const [provider, setProvider] = useState('openrouter'); // Always OpenRouter
  const [model, setModel] = useState(initialSettings.model || 'anthropic/claude-3-5-sonnet');
  const [targetLanguage, setTargetLanguage] = useState(initialSettings.targetLanguage || 'swedish');
  const [streamingEnabled, setStreamingEnabled] = useState(initialSettings.streamingEnabled ?? true);
  
  const [chatMatePersonality, setChatMatePersonality] = useState(
    initialSettings.chatMatePersonality || "You are a friendly Swedish local who loves helping newcomers feel welcome. You're enthusiastic about Swedish culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into Swedish society."
  );
  
  const [editorMatePersonality, setEditorMatePersonality] = useState(
    initialSettings.editorMatePersonality || "You are an experienced Swedish language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone."
  );

  const { toast } = useToast();

  const handleSave = () => {
    const settings: SettingsData = {
      chatMatePersonality,
      editorMatePersonality,
      targetLanguage,
      streamingEnabled,
      provider: 'openrouter',
      model,
      apiKey
    };
    
    if (onSave) {
      onSave(settings);
    }
    
    toast({
      title: mode === 'main' ? "Settings saved" : "Chat settings saved",
      description: mode === 'main' 
        ? "Your language learning preferences have been updated."
        : "Settings for this conversation have been updated."
    });
    onOpenChange(false);
  };

  const handleReset = () => {
    const languageLabel = languages.find(l => l.value === targetLanguage)?.label || 'Swedish';
    
    setChatMatePersonality(
      `You are a friendly ${languageLabel} local who loves helping newcomers feel welcome. You're enthusiastic about ${languageLabel} culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into ${languageLabel} society.`
    );
    
    setEditorMatePersonality(
      `You are an experienced ${languageLabel} language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone.`
    );
  };

  const languages = [
    { value: 'swedish', label: 'Swedish' },
    { value: 'english', label: 'English' },
    { value: 'german', label: 'German' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' },
    { value: 'italian', label: 'Italian' },
    { value: 'portuguese', label: 'Portuguese' },
    { value: 'dutch', label: 'Dutch' }
  ];

  const handleLanguageChange = (newLanguage: string) => {
    setTargetLanguage(newLanguage);
    // Optionally update the personalities based on the new language
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            {mode === 'main' ? 'Language Mate Settings' : `Chat Settings${conversationTitle ? ` - ${conversationTitle}` : ''}`}
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
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="agents">AI Agents</TabsTrigger>
            <TabsTrigger value="language">Language</TabsTrigger>
            <TabsTrigger value="api">API Settings</TabsTrigger>
          </TabsList>

          <div className="overflow-y-auto max-h-[60vh] pr-2">
            <TabsContent value="agents" className="space-y-6 mt-4">
              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <MessageCircle className="w-4 h-4 text-chat-mate" />
                  <h3 className="font-semibold">Chat Mate Configuration</h3>
                  <Badge variant="secondary">Native Speaker</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="chat-mate-personality">Personality & Background</Label>
                  <Textarea
                    id="chat-mate-personality"
                    value={chatMatePersonality}
                    onChange={(e) => setChatMatePersonality(e.target.value)}
                    placeholder="Describe Chat Mate's personality, background, and conversation style..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    This will be added to Chat Mate's system prompt to customize their personality and conversation style.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div className="flex items-center gap-2 pb-2 border-b">
                  <GraduationCap className="w-4 h-4 text-editor-mate" />
                  <h3 className="font-semibold">Editor Mate Configuration</h3>
                  <Badge variant="secondary">Language Teacher</Badge>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="editor-mate-personality">Teaching Style & Approach</Label>
                  <Textarea
                    id="editor-mate-personality"
                    value={editorMatePersonality}
                    onChange={(e) => setEditorMatePersonality(e.target.value)}
                    placeholder="Describe Editor Mate's teaching style, feedback approach, and expertise level..."
                    rows={4}
                  />
                  <p className="text-xs text-muted-foreground">
                    Customize how detailed and encouraging Editor Mate's feedback should be.
                  </p>
                </div>
              </div>

              <div className="flex justify-center">
                <Button variant="outline" onClick={handleReset} size="sm">
                  Reset to Language Defaults
                </Button>
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
                    <Select value={targetLanguage} onValueChange={handleLanguageChange}>
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
                      checked={streamingEnabled}
                      onCheckedChange={setStreamingEnabled}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>

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
                      value={model}
                      onValueChange={setModel}
                      placeholder="Select an AI model..."
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">OpenRouter API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your OpenRouter API key..."
                      />
                      <Button variant="outline" size="icon">
                        <Key className="w-4 h-4" />
                      </Button>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      Your API key is stored locally and never sent to our servers.
                    </p>
                  </div>
                </div>
              </div>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            Save Settings
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default SettingsDialog;
