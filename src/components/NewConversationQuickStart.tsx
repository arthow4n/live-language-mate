import { Globe, Zap } from 'lucide-react';
import { useState } from 'react';

import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUnifiedStorage } from '@/contexts/UnifiedStorageContext';
import {
  extractRecentLanguages,
  extractRecentModels,
} from '@/utils/recentDetection';

import ModelSelector from './ModelSelector';

// Language options from UnifiedSettingsDialog
const LANGUAGE_OPTIONS = [
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
];

/**
 *
 */
interface NewConversationQuickStartProps {
  onLanguageSelect: (language: string) => void;
  onLanguageSelectorOpen: () => void;
  onModelSelect: (model: string) => void;
  onModelSelectorOpen: () => void;
}

const NewConversationQuickStart = ({
  onLanguageSelect,
  onLanguageSelectorOpen,
  onModelSelect,
  onModelSelectorOpen,
}: NewConversationQuickStartProps): React.JSX.Element => {
  const [languageSelectorOpen, setLanguageSelectorOpen] = useState(false);
  const [modelSelectorOpen, setModelSelectorOpen] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState('');
  const [selectedModel, setSelectedModel] = useState('');

  const { conversations, conversationSettings, globalSettings } =
    useUnifiedStorage();

  // Get recent languages and models
  const recentLanguages = extractRecentLanguages(conversations);
  const recentModels = extractRecentModels(
    conversations,
    conversationSettings,
    globalSettings
  );

  // Get fallback languages/models when not enough recent history
  const getLanguageButtons = (): string[] => {
    if (recentLanguages.length >= 2) {
      return recentLanguages;
    }

    const fallbackLanguages = [...recentLanguages];

    // Add default language if we don't have enough languages and it's not already included
    if (
      fallbackLanguages.length < 2 &&
      !fallbackLanguages.includes(globalSettings.targetLanguage)
    ) {
      fallbackLanguages.push(globalSettings.targetLanguage);
    }

    return fallbackLanguages.slice(0, 2);
  };

  const getModelButtons = (): string[] => {
    if (recentModels.length >= 2) {
      return recentModels;
    }

    const fallbackModels = [...recentModels];

    // Add default model if we don't have enough models and it's not already included
    if (
      fallbackModels.length < 2 &&
      !fallbackModels.includes(globalSettings.model)
    ) {
      fallbackModels.push(globalSettings.model);
    }

    return fallbackModels.slice(0, 2);
  };

  const languageButtons = getLanguageButtons();
  const modelButtons = getModelButtons();

  const handleLanguageSelectorOpen = (): void => {
    setLanguageSelectorOpen(true);
    onLanguageSelectorOpen();
  };

  const handleModelSelectorOpen = (): void => {
    setModelSelectorOpen(true);
    onModelSelectorOpen();
  };

  const handleLanguageSelection = (language: string): void => {
    setSelectedLanguage(language);
    setLanguageSelectorOpen(false);
    onLanguageSelect(language);
  };

  const handleModelSelection = (model: string): void => {
    setSelectedModel(model);
    setModelSelectorOpen(false);
    onModelSelect(model);
  };

  // Helper to format model names for display
  const formatModelName = (model: string): string => {
    const parts = model.split('/');
    return parts[parts.length - 1] || model;
  };

  return (
    <div className="text-center py-8 space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-2">Start a new conversation</h3>
        <p className="text-sm text-muted-foreground">
          Choose a language and model to get started quickly
        </p>
      </div>

      {/* Recent Languages */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <Globe className="w-4 h-4" />
          <span>Recent Languages:</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {languageButtons.map((language) => (
            <Button
              key={language}
              onClick={() => {
                onLanguageSelect(language);
              }}
              size="sm"
              variant="outline"
            >
              {language}
            </Button>
          ))}
          <Button
            onClick={handleLanguageSelectorOpen}
            size="sm"
            variant="ghost"
          >
            More languages...
          </Button>
        </div>
      </div>

      {/* Recent Models */}
      <div className="space-y-3">
        <div className="flex items-center justify-center gap-2 text-sm font-medium">
          <Zap className="w-4 h-4" />
          <span>Recent Models:</span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {modelButtons.map((model) => (
            <Button
              key={model}
              onClick={() => {
                onModelSelect(model);
              }}
              size="sm"
              variant="outline"
            >
              {formatModelName(model)}
            </Button>
          ))}
          <Button onClick={handleModelSelectorOpen} size="sm" variant="ghost">
            More models...
          </Button>
        </div>
      </div>

      {/* Language Selector Dialog */}
      <Dialog
        onOpenChange={setLanguageSelectorOpen}
        open={languageSelectorOpen}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Language</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="language-select">Target Language</Label>
              <Select
                onValueChange={handleLanguageSelection}
                value={selectedLanguage}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select a language..." />
                </SelectTrigger>
                <SelectContent>
                  {LANGUAGE_OPTIONS.map((lang) => (
                    <SelectItem key={lang} value={lang}>
                      {lang}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Model Selector Dialog */}
      <Dialog onOpenChange={setModelSelectorOpen} open={modelSelectorOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Choose Model</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="model-select">AI Model</Label>
              <ModelSelector
                onValueChange={handleModelSelection}
                placeholder="Select a model..."
                value={selectedModel}
              />
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default NewConversationQuickStart;
