// ============================================
// Sync Choice Dialog - Choose upload vs cloud on sign-in
// ============================================

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Upload, Cloud, Loader2 } from 'lucide-react';

export type SyncChoice = 'upload' | 'cloud';

interface SyncChoiceDialogProps {
  open: boolean;
  onChoice: (choice: SyncChoice) => void;
  localBoardCount: number;
}

export function SyncChoiceDialog({ open, onChoice, localBoardCount }: SyncChoiceDialogProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [processingChoice, setProcessingChoice] = useState<SyncChoice | null>(null);

  const handleChoice = (choice: SyncChoice) => {
    setIsProcessing(true);
    setProcessingChoice(choice);
    onChoice(choice);
  };

  return (
    <Dialog open={open}>
      <DialogContent
        showCloseButton={false}
        onInteractOutside={(e) => e.preventDefault()}
        onEscapeKeyDown={(e) => e.preventDefault()}
        className="sm:max-w-md"
      >
        <DialogHeader>
          <DialogTitle>Sync your boards</DialogTitle>
          <DialogDescription>
            You have {localBoardCount} local board{localBoardCount !== 1 ? 's' : ''} on this device.
            How would you like to handle them?
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          <button
            className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleChoice('upload')}
            disabled={isProcessing}
          >
            <Upload className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Upload local boards</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Push your local boards to the cloud, then sync with any existing cloud data.
              </div>
            </div>
            {processingChoice === 'upload' && <Loader2 className="w-4 h-4 animate-spin ml-auto mt-0.5" />}
          </button>

          <button
            className="w-full flex items-start gap-3 p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-colors text-left disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={() => handleChoice('cloud')}
            disabled={isProcessing}
          >
            <Cloud className="w-5 h-5 text-purple-600 mt-0.5 flex-shrink-0" />
            <div>
              <div className="font-medium text-sm">Use cloud data</div>
              <div className="text-xs text-gray-500 mt-0.5">
                Discard local boards and download your data from the cloud.
              </div>
            </div>
            {processingChoice === 'cloud' && <Loader2 className="w-4 h-4 animate-spin ml-auto mt-0.5" />}
          </button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
