
import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { useLocalStorage } from '@/contexts/LocalStorageContext';
import { Download, Upload, Trash2 } from 'lucide-react';
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
} from "@/components/ui/alert-dialog";

const DataManagementTab = () => {
  const [importFile, setImportFile] = useState<File | null>(null);
  const { deleteAllChats, exportData, importData } = useLocalStorage();
  const { toast } = useToast();

  const handleExportData = () => {
    try {
      const data = exportData();
      const blob = new Blob([data], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `language-mate-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
      
      toast({
        title: "Data exported",
        description: "Your data has been successfully exported as a JSON file.",
      });
    } catch (error) {
      toast({
        title: "Export failed",
        description: "There was an error exporting your data.",
        variant: "destructive",
      });
    }
  };

  const handleImportData = async () => {
    if (!importFile) {
      toast({
        title: "No file selected",
        description: "Please select a file to import.",
        variant: "destructive",
      });
      return;
    }

    try {
      const text = await importFile.text();
      const success = importData(text);
      
      if (success) {
        toast({
          title: "Data imported",
          description: "Your data has been successfully imported.",
        });
        setImportFile(null);
        // Reset the file input
        const fileInput = document.getElementById('import-file') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      } else {
        toast({
          title: "Import failed",
          description: "The selected file contains invalid data.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Import failed",
        description: "There was an error reading the file.",
        variant: "destructive",
      });
    }
  };

  const handleDeleteAllChats = () => {
    deleteAllChats();
    toast({
      title: "All chats deleted",
      description: "All conversations have been permanently deleted.",
    });
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    setImportFile(file || null);
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div>
          <h3 className="text-lg font-medium mb-2">Export Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Download all your conversations and settings as a JSON file.
          </p>
          <Button onClick={handleExportData} className="w-full">
            <Download className="w-4 h-4 mr-2" />
            Export All Data
          </Button>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2">Import Data</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Import conversations and settings from a previously exported JSON file.
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
              onClick={handleImportData} 
              disabled={!importFile}
              className="w-full"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import Data
            </Button>
          </div>
        </div>

        <div>
          <h3 className="text-lg font-medium mb-2 text-destructive">Danger Zone</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Permanently delete all conversations. This action cannot be undone.
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
                  This action cannot be undone. This will permanently delete all your conversations and cannot be recovered.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={handleDeleteAllChats} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                  Yes, delete all chats
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
