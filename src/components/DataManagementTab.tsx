import { Download, Trash2, Upload } from 'lucide-react';
import { useState } from 'react';
import { z } from 'zod/v4';

import type { GlobalSettings } from '@/schemas/settings';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  getDefaultGlobalSettings,
  useUnifiedStorage,
} from '@/contexts/UnifiedStorageContext';
import { useToast } from '@/hooks/use-toast';

const DataManagementTab = (): React.JSX.Element => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const {
    conversationSettings,
    globalSettings,
    updateConversationSettings,
    updateGlobalSettings,
  } = useUnifiedStorage();
  const { toast } = useToast();

  const handleExportData = (): void => {
    try {
      const exportData = {
        chatSettings: conversationSettings,
        // Include conversations from localStorage for backwards compatibility
        conversations: ((): unknown[] => {
          try {
            const data = JSON.parse(
              localStorage.getItem('language-mate-data') ??
                '{"conversations": []}'
            );
            return data &&
              typeof data === 'object' &&
              'conversations' in data &&
              Array.isArray(data.conversations)
              ? data.conversations
              : [];
          } catch {
            return [];
          }
        })(),
        exportDate: new Date().toISOString(),
        globalSettings,
        version: '1.0.0',
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `language-mate-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);

      toast({
        description: 'Your data has been successfully exported as a JSON file.',
        title: 'Data exported',
      });
    } catch {
      toast({
        description: 'There was an error exporting your data.',
        title: 'Export failed',
        variant: 'destructive',
      });
    }
  };

  const handleImportData = async (): Promise<void> => {
    if (!importFile) {
      toast({
        description: 'Please select a file to import.',
        title: 'No file selected',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await importFile.text();
      const rawData = JSON.parse(text);
      const importedData = z
        .looseObject({
          chatSettings: z.record(z.string(), z.object({})).optional(),
          conversations: z.array(z.unknown()).optional(),
          globalSettings: z.looseObject({}).optional(),
          settings: z.unknown().optional(),
          version: z.string().optional(),
        })
        .parse(rawData);

      // Handle different export formats for backwards compatibility
      if (importedData.version) {
        // New format with version
        if (importedData.globalSettings) {
          updateGlobalSettings(importedData.globalSettings);
        }
        if (importedData.chatSettings) {
          Object.entries(importedData.chatSettings).forEach(
            ([id, settings]) => {
              updateConversationSettings(id, settings);
            }
          );
        }
        // Handle conversations if present
        if (importedData.conversations) {
          const rawOldData = JSON.parse(
            localStorage.getItem('language-mate-data') ??
              '{"conversations": [], "settings": {}}'
          );
          const oldData = z
            .object({
              conversations: z.array(z.unknown()),
              settings: z.unknown(),
            })
            .parse(rawOldData);
          oldData.conversations = importedData.conversations;
          localStorage.setItem('language-mate-data', JSON.stringify(oldData));
        }
      } else {
        // Legacy format - try to handle old exports
        if (importedData.conversations && importedData.settings) {
          // This is the old localStorageService format
          localStorage.setItem(
            'language-mate-data',
            JSON.stringify(importedData)
          );

          // Try to migrate settings to new structure
          const oldSettings = importedData.settings;
          const settingsParseResult = z
            .record(z.string(), z.unknown())
            .safeParse(oldSettings);
          if (
            settingsParseResult.success &&
            Object.keys(settingsParseResult.data).length > 0
          ) {
            const validatedSettings = settingsParseResult.data;
            const newGlobalSettings: Partial<GlobalSettings> = {
              apiKey:
                'apiKey' in validatedSettings &&
                typeof validatedSettings.apiKey === 'string'
                  ? validatedSettings.apiKey
                  : globalSettings.apiKey,
              model:
                'model' in validatedSettings &&
                typeof validatedSettings.model === 'string'
                  ? validatedSettings.model
                  : globalSettings.model,
              streaming:
                'streaming' in validatedSettings &&
                typeof validatedSettings.streaming === 'boolean'
                  ? validatedSettings.streaming
                  : globalSettings.streaming,
              targetLanguage:
                'targetLanguage' in validatedSettings &&
                typeof validatedSettings.targetLanguage === 'string'
                  ? validatedSettings.targetLanguage
                  : globalSettings.targetLanguage,
              theme: ((): 'dark' | 'light' | 'system' => {
                const theme = validatedSettings.theme;
                if (typeof theme === 'string') {
                  if (
                    theme === 'dark' ||
                    theme === 'light' ||
                    theme === 'system'
                  ) {
                    return theme;
                  }
                }
                return globalSettings.theme;
              })(),
            };
            updateGlobalSettings(newGlobalSettings);
          }
        }
      }

      toast({
        description: 'Your data has been successfully imported.',
        title: 'Data imported',
      });
      setImportFile(null);
      // Reset the file input
      const fileInput = document.getElementById('import-file');
      if (fileInput instanceof HTMLInputElement) {
        fileInput.value = '';
      }
    } catch {
      toast({
        description:
          'The selected file contains invalid data or an unsupported format.',
        title: 'Import failed',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllChats = (): void => {
    localStorage.removeItem('language-mate-data');

    toast({
      description: 'All conversations have been permanently deleted.',
      title: 'All chats deleted',
    });
  };

  const handleDeleteAllData = (): void => {
    // Clear all settings
    localStorage.removeItem('language-mate-global-settings');
    localStorage.removeItem('language-mate-chat-settings');
    localStorage.removeItem('language-mate-data');

    // Reset to defaults
    updateGlobalSettings(getDefaultGlobalSettings());

    toast({
      description:
        'All conversations and settings have been permanently deleted.',
      title: 'All data deleted',
    });
  };

  const handleFileChange = (
    event: React.ChangeEvent<HTMLInputElement>
  ): void => {
    const file = event.target.files?.[0] ?? null;
    setImportFile(file ?? null);
  };

  return (
    <div className="space-y-6" data-testid="data-management-tab">
      <div className="space-y-4">
        <div data-testid="export-section">
          <h3 className="text-lg font-medium mb-2">Export Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download all your conversations, settings, and preferences as a JSON
            file.
          </p>
          <Button
            className="w-full"
            data-testid="export-button"
            onClick={handleExportData}
          >
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
        </div>

        <div data-testid="import-section">
          <h3 className="text-lg font-medium mb-2">Import Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Import conversations and settings from a previously exported JSON
            file. Supports both current and legacy formats.
          </p>
          <div className="space-y-2">
            <Label htmlFor="import-file">Select backup file</Label>
            <Input
              accept=".json"
              className="cursor-pointer"
              data-testid="import-file-input"
              id="import-file"
              onChange={handleFileChange}
              type="file"
            />
            <Button
              className="w-full"
              data-testid="import-button"
              disabled={!importFile}
              onClick={() => void handleImportData()}
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        <div data-testid="danger-zone">
          <h3 className="text-lg font-medium mb-2 text-destructive">
            Danger Zone
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all conversations and settings. This action
            cannot be undone.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                data-testid="delete-chats-button"
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Chats
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="delete-chats-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your conversations, settings, and preferences.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="delete-chats-cancel">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="delete-chats-confirm"
                  onClick={handleDeleteAllChats}
                >
                  Yes, delete all chats
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button
                className="w-full"
                data-testid="delete-data-button"
                variant="destructive"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent data-testid="delete-data-dialog">
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your conversations, settings, and preferences.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel data-testid="delete-data-cancel">
                  Cancel
                </AlertDialogCancel>
                <AlertDialogAction
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  data-testid="delete-data-confirm"
                  onClick={handleDeleteAllData}
                >
                  Yes, delete all data
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      </div>
    </div>
  );
};

export default DataManagementTab;
