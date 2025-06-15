
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTheme } from '@/components/ThemeProvider';

interface UISettingsTabProps {
  settings: {
    theme: 'light' | 'dark' | 'system';
  };
  onSettingChange: (key: string, value: any) => void;
}

const UISettingsTab = ({ settings, onSettingChange }: UISettingsTabProps) => {
  const { setTheme } = useTheme();

  const handleThemeChange = (value: 'light' | 'dark' | 'system') => {
    onSettingChange('theme', value);
    setTheme(value);
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">User Interface</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select
              value={settings.theme}
              onValueChange={handleThemeChange}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="system">System</SelectItem>
                <SelectItem value="light">Light</SelectItem>
                <SelectItem value="dark">Dark</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-sm text-muted-foreground mt-1">
              Choose your preferred theme appearance
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default UISettingsTab;
