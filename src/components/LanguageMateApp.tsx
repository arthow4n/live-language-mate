
import { useState } from 'react';
import { User } from '@supabase/supabase-js';
import { Button } from "@/components/ui/button";
import { MessageCircle, GraduationCap, Settings, LogOut } from 'lucide-react';
import ChatInterface from './ChatInterface';
import SettingsDialog from './SettingsDialog';
import { supabase } from "@/integrations/supabase/client";

interface LanguageMateAppProps {
  user: User;
}

type AIMode = 'chat-mate' | 'editor-mate';

const LanguageMateApp = ({ user }: LanguageMateAppProps) => {
  const [aiMode, setAiMode] = useState<AIMode>('chat-mate');
  const [settingsOpen, setSettingsOpen] = useState(false);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="flex space-x-1">
              <MessageCircle className="w-6 h-6 text-chat-mate" />
              <GraduationCap className="w-6 h-6 text-editor-mate" />
            </div>
            <h1 className="text-xl font-bold">Language Mate</h1>
          </div>

          <div className="flex items-center space-x-3">
            <div className="flex bg-muted rounded-lg p-1">
              <Button
                variant={aiMode === 'chat-mate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAiMode('chat-mate')}
                className="flex items-center space-x-2"
              >
                <MessageCircle className="w-4 h-4" />
                <span>Chat Mate</span>
              </Button>
              <Button
                variant={aiMode === 'editor-mate' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setAiMode('editor-mate')}
                className="flex items-center space-x-2"
              >
                <GraduationCap className="w-4 h-4" />
                <span>Editor Mate</span>
              </Button>
            </div>

            <Button
              variant="outline"
              size="icon"
              onClick={() => setSettingsOpen(true)}
            >
              <Settings className="w-4 h-4" />
            </Button>

            <Button
              variant="outline"
              size="icon"
              onClick={handleSignOut}
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-4 py-6">
        <ChatInterface user={user} aiMode={aiMode} />
      </main>

      {/* Settings Dialog */}
      <SettingsDialog open={settingsOpen} onOpenChange={setSettingsOpen} />
    </div>
  );
};

export default LanguageMateApp;
