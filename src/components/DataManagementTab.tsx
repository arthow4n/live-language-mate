import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import {
  getDefaultGlobalSettings,
  useSettings,
} from '@/contexts/SettingsContext';
import { Download, Upload, Trash2 } from 'lucide-react';
import { type ChatSettingsUpdate, type GlobalSettings } from '@/types/settings';
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

const DataManagementTab = () => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const {
    globalSettings,
    chatSettings,
    updateGlobalSettings,
    updateChatSettings,
  } = useSettings();
  const { toast } = useToast();

  const handleExportData = () => {
    try {
      const exportData = {
        version: '1.0.0',
        exportDate: new Date().toISOString(),
        globalSettings,
        chatSettings,
        // Include conversations from localStorage for backwards compatibility
        conversations:
          (
            JSON.parse(
              localStorage.getItem('language-mate-data') ??
                '{"conversations": []}'
            ) as { conversations?: unknown[] }
          ).conversations ?? [],
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
        title: 'Data exported',
        description: 'Your data has been successfully exported as a JSON file.',
      });
    } catch {
      toast({
        title: 'Export failed',
        description: 'There was an error exporting your data.',
        variant: 'destructive',
      });
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast({
        title: 'No file selected',
        description: 'Please select a file to import.',
        variant: 'destructive',
      });
      return;
    }

    try {
      const text = await importFile.text();
      const importedData = JSON.parse(text) as {
        version?: string;
        globalSettings?: Partial<GlobalSettings>;
        chatSettings?: Record<string, Partial<ChatSettingsUpdate>>;
        conversations?: unknown[];
        settings?: unknown;
      };

      // Handle different export formats for backwards compatibility
      if (importedData.version) {
        // New format with version
        if (importedData.globalSettings) {
          updateGlobalSettings(importedData.globalSettings);
        }
        if (importedData.chatSettings) {
          Object.entries(importedData.chatSettings).forEach(
            ([id, settings]) => {
              updateChatSettings(id, settings);
            }
          );
        }
        // Handle conversations if present
        if (importedData.conversations) {
          const oldData = JSON.parse(
            localStorage.getItem('language-mate-data') ??
              '{"conversations": [], "settings": {}}'
          ) as { conversations: unknown[]; settings: unknown };
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
          const oldSettings = importedData.settings as Record<string, unknown>;
          if (Object.keys(oldSettings).length > 0) {
            const newGlobalSettings: Partial<GlobalSettings> = {
              model:
                (oldSettings.model as string | undefined) ??
                globalSettings.model,
              apiKey:
                (oldSettings.apiKey as string | undefined) ??
                globalSettings.apiKey,
              targetLanguage:
                (oldSettings.targetLanguage as string | undefined) ??
                globalSettings.targetLanguage,
              streaming:
                oldSettings.streaming !== undefined
                  ? (oldSettings.streaming as boolean)
                  : globalSettings.streaming,
              theme:
                (oldSettings.theme as string | undefined) ??
                globalSettings.theme,
            };
            updateGlobalSettings(newGlobalSettings);
          }
        }
      }

      toast({
        title: 'Data imported',
        description: 'Your data has been successfully imported.',
      });
      setImportFile(null);
      // Reset the file input
      const fileInput = document.getElementById(
        'import-file'
      ) as HTMLInputElement | null;
      if (fileInput) {
        fileInput.value = '';
      }
    } catch {
      toast({
        title: 'Import failed',
        description:
          'The selected file contains invalid data or an unsupported format.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteAllChats = () => {
    localStorage.removeItem('language-mate-data');

    toast({
      title: 'All chats deleted',
      description: 'All conversations have been permanently deleted.',
    });
  };

  const handleDeleteAllData = () => {
    // Clear all settings
    localStorage.removeItem('language-mate-global-settings');
    localStorage.removeItem('language-mate-chat-settings');
    localStorage.removeItem('language-mate-data');

    // Reset to defaults
    updateGlobalSettings(getDefaultGlobalSettings());

    toast({
      title: 'All data deleted',
      description:
        'All conversations and settings have been permanently deleted.',
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] ?? null;
    setImportFile(file ?? null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Export Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download all your conversations, settings, and preferences as a JSON
            file.
          </p>
          <Button onClick={handleExportData} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Import Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Import conversations and settings from a previously exported JSON
            file. Supports both current and legacy formats.
          </p>
          <div className="space-y-2">
            <Label htmlFor="import-file">Select backup file</Label>
            <Input
              id="import-file"
              type="file"
              accept=".json"
              onChange={handleFileChange}
              className="cursor-pointer"
            />
            <Button
              onClick={() => void handleImportData()}
              disabled={!importFile}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2 text-destructive">
            Danger Zone
          </h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all conversations and settings. This action
            cannot be undone.
          </p>

          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Chats
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your conversations, settings, and preferences.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllChats}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                >
                  Yes, delete all chats
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" className="w-full">
                <Trash2 className="w-4 h-4 mr-2" />
                Delete All Data
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone. This will permanently delete all
                  your conversations, settings, and preferences.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleDeleteAllData}
                  className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
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
