
import { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ChatSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  chatMatePrompt: string;
  editorMatePrompt: string;
  onPromptsUpdate: (chatMate: string, editorMate: string) => void;
  targetLanguage: string;
  isNewConversation?: boolean;
}

const ChatSettingsDialog = ({
  open,
  onOpenChange,
  chatMatePrompt,
  editorMatePrompt,
  onPromptsUpdate,
  targetLanguage,
  isNewConversation = false
}: ChatSettingsDialogProps) => {
  const [localChatMatePrompt, setLocalChatMatePrompt] = useState(chatMatePrompt);
  const [localEditorMatePrompt, setLocalEditorMatePrompt] = useState(editorMatePrompt);

  // Update local state when props change
  useEffect(() => {
    setLocalChatMatePrompt(chatMatePrompt);
    setLocalEditorMatePrompt(editorMatePrompt);
  }, [chatMatePrompt, editorMatePrompt]);

  const handleSave = () => {
    onPromptsUpdate(localChatMatePrompt, localEditorMatePrompt);
    onOpenChange(false);
  };

  const handleReset = () => {
    const defaultChatMate = `You are a friendly ${targetLanguage} native who loves to chat about daily life, culture, and local experiences.`;
    const defaultEditor = `You are a patient ${targetLanguage} teacher. Provide helpful corrections and suggestions to improve language skills.`;
    
    setLocalChatMatePrompt(defaultChatMate);
    setLocalEditorMatePrompt(defaultEditor);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {isNewConversation ? 'New Chat Settings' : 'Chat Settings'}
          </DialogTitle>
          <DialogDescription>
            {isNewConversation 
              ? 'Configure the personalities and behaviors for your new conversation before starting to chat.'
              : 'Customize the personalities and behaviors of Chat Mate and Editor Mate for this conversation.'
            }
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="chat-mate-prompt" className="text-sm font-medium">
              Chat Mate Personality
            </Label>
            <p className="text-xs text-muted-foreground">
              Chat Mate is your conversation partner. They're a native speaker who chats naturally about daily life and culture.
            </p>
            <Textarea
              id="chat-mate-prompt"
              value={localChatMatePrompt}
              onChange={(e) => setLocalChatMatePrompt(e.target.value)}
              placeholder="Describe Chat Mate's personality and background..."
              className="min-h-[120px]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="editor-mate-prompt" className="text-sm font-medium">
              Editor Mate Personality
            </Label>
            <p className="text-xs text-muted-foreground">
              Editor Mate provides feedback on your language use. They help with corrections, suggestions, and explanations.
            </p>
            <Textarea
              id="editor-mate-prompt"
              value={localEditorMatePrompt}
              onChange={(e) => setLocalEditorMatePrompt(e.target.value)}
              placeholder="Describe Editor Mate's teaching style and approach..."
              className="min-h-[120px]"
            />
          </div>

          <div className="flex justify-between">
            <Button variant="outline" onClick={handleReset}>
              Reset to Defaults
            </Button>
            <div className="space-x-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button onClick={handleSave}>
                Save Changes
              </Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ChatSettingsDialog;
