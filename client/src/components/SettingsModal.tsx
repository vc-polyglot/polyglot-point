import { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { X, Trash2, Download, Volume2 } from 'lucide-react';
import type { ConversationSettings } from '@/types/conversation';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  settings: ConversationSettings;
  onSaveSettings: (settings: ConversationSettings) => void;
  onClearConversation?: () => void;
  onDownloadConversation?: () => void;
  messageCount?: number;
}

export function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSaveSettings,
  onClearConversation,
  onDownloadConversation,
  messageCount = 0
}: SettingsModalProps) {
  const [localSettings, setLocalSettings] = useState<ConversationSettings>(settings);

  // Update local settings when props change
  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    onSaveSettings(localSettings);
    onClose();
  };

  const handleCancel = () => {
    setLocalSettings(settings); // Reset to original settings
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            Settings
            <Button
              variant="ghost"
              size="sm"
              className="w-8 h-8 p-0 bg-slate-100 hover:bg-slate-200 rounded-lg"
              onClick={onClose}
            >
              <X className="w-4 h-4 text-slate-600" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Voice Settings */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Voice Settings</h3>
            <div className="space-y-4">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="speechSpeed" className="text-sm text-slate-600">
                    Speech Speed
                  </Label>
                  <span className="text-sm text-slate-500">
                    {localSettings.speechSpeed.toFixed(1)}x
                  </span>
                </div>
                <Slider
                  id="speechSpeed"
                  min={0.5}
                  max={2.0}
                  step={0.1}
                  value={[localSettings.speechSpeed]}
                  onValueChange={(value) =>
                    setLocalSettings(prev => ({ ...prev, speechSpeed: value[0] }))
                  }
                  className="w-full"
                />
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label htmlFor="voiceVolume" className="text-sm text-slate-600">
                    Voice Volume
                  </Label>
                  <span className="text-sm text-slate-500">
                    {localSettings.voiceVolume}%
                  </span>
                </div>
                <Slider
                  id="voiceVolume"
                  min={0}
                  max={100}
                  step={1}
                  value={[localSettings.voiceVolume]}
                  onValueChange={(value) =>
                    setLocalSettings(prev => ({ ...prev, voiceVolume: value[0] }))
                  }
                  className="w-full"
                />
              </div>
            </div>
          </div>

          {/* AI Behavior */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">AI Behavior</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="enableCorrections" className="text-sm text-slate-600 flex-1">
                  Enable pronunciation corrections
                </Label>
                <Switch
                  id="enableCorrections"
                  checked={localSettings.enableCorrections}
                  onCheckedChange={(checked) =>
                    setLocalSettings(prev => ({ ...prev, enableCorrections: checked }))
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="enableSuggestions" className="text-sm text-slate-600 flex-1">
                  Show conversation suggestions
                </Label>
                <Switch
                  id="enableSuggestions"
                  checked={localSettings.enableSuggestions}
                  onCheckedChange={(checked) =>
                    setLocalSettings(prev => ({ ...prev, enableSuggestions: checked }))
                  }
                />
              </div>
            </div>
          </div>

          {/* Session Actions */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Session Actions</h3>
            <div className="space-y-3">
              <Button
                variant="outline"
                onClick={onClearConversation}
                className="w-full justify-start text-left"
                disabled={messageCount === 0}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Clear Conversation ({messageCount} messages)
              </Button>
              
              <Button
                variant="outline"
                onClick={onDownloadConversation}
                className="w-full justify-start text-left"
                disabled={messageCount === 0}
              >
                <Download className="w-4 h-4 mr-2" />
                Download Conversation
              </Button>
            </div>
          </div>

          <Separator />

          {/* Privacy */}
          <div>
            <h3 className="text-sm font-medium text-slate-700 mb-3">Privacy</h3>
            <div className="space-y-3">
              <p className="text-sm text-slate-500">
                All conversations are processed securely and follow your privacy preferences.
              </p>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex space-x-3 pt-4">
          <Button
            onClick={handleSave}
            className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            Save Settings
          </Button>
          <Button
            variant="ghost"
            onClick={handleCancel}
            className="px-4 text-slate-600 hover:text-slate-800"
          >
            Cancel
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
