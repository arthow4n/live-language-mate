
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

interface SettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const SettingsDialog = ({ open, onOpenChange }: SettingsDialogProps) => {
  const [apiKey, setApiKey] = useState('');
  const [provider, setProvider] = useState('openrouter');
  const [model, setModel] = useState('anthropic/claude-3-haiku');
  const [targetLanguage, setTargetLanguage] = useState('swedish');
  const [streamingEnabled, setStreamingEnabled] = useState(true);
  
  const [chatMatePersonality, setChatMatePersonality] = useState(
    "You are a friendly Swedish local who loves helping newcomers feel welcome. You're enthusiastic about Swedish culture, traditions, and everyday life. You speak naturally and assume the user is already integrated into Swedish society."
  );
  
  const [editorMatePersonality, setEditorMatePersonality] = useState(
    "You are an experienced Swedish language teacher who provides gentle, encouraging feedback. Focus on practical improvements and cultural context. Be concise but helpful, and always maintain a supportive tone."
  );

  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Settings saved",
      description: "Your language learning preferences have been updated."
    });
    onOpenChange(false);
  };

  const providers = [
    { value: 'openrouter', label: 'OpenRouter' },
    { value: 'openai', label: 'OpenAI' },
    { value: 'anthropic', label: 'Anthropic' },
    { value: 'local', label: 'Local LLM' }
  ];

  const models = [
    { value: 'anthropic/claude-3-haiku', label: 'Claude 3 Haiku' },
    { value: 'anthropic/claude-3-sonnet', label: 'Claude 3 Sonnet' },
    { value: 'openai/gpt-4', label: 'GPT-4' },
    { value: 'openai/gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
    { value: 'meta-llama/llama-2-70b', label: 'Llama 2 70B' }
  ];

  const languages = [
    { value: 'swedish', label: 'Swedish' },
    { value: 'english', label: 'English' },
    { value: 'german', label: 'German' },
    { value: 'french', label: 'French' },
    { value: 'spanish', label: 'Spanish' }
  ];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-hidden">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Settings className="w-5 h-5" />
            Language Mate Settings
          </DialogTitle>
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
                    <Select value={targetLanguage} onValueChange={setTargetLanguage}>
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
                    <Select value={provider} onValueChange={setProvider}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select LLM provider" />
                      </SelectTrigger>
                      <SelectContent>
                        {providers.map((p) => (
                          <SelectItem key={p.value} value={p.value}>
                            {p.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="model">Model</Label>
                    <Select value={model} onValueChange={setModel}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select model" />
                      </SelectTrigger>
                      <SelectContent>
                        {models.map((m) => (
                          <SelectItem key={m.value} value={m.value}>
                            {m.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="api-key">API Key</Label>
                    <div className="flex gap-2">
                      <Input
                        id="api-key"
                        type="password"
                        value={apiKey}
                        onChange={(e) => setApiKey(e.target.value)}
                        placeholder="Enter your API key..."
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
