import type { Theme } from '@/schemas/settings';

import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

interface UISettingsTabProps {
  onSettingChange: (key: string, value: boolean | number | string) => void;
  settings: {
    theme: Theme;
  };
}

const UISettingsTab = ({ onSettingChange, settings }: UISettingsTabProps) => {
  const handleThemeChange = (value: Theme) => {
    onSettingChange('theme', value);
    // Remove the immediate setTheme call to prevent conflicts
  };

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-medium mb-4">User Interface</h3>
        <div className="space-y-4">
          <div>
            <Label htmlFor="theme">Theme</Label>
            <Select onValueChange={handleThemeChange} value={settings.theme}>
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
