
import React from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { AlertCircle, X } from "lucide-react";

interface DraftRecoveryBannerProps {
  lastSaved: Date | null;
  onRestore: () => void;
  onDiscard: () => void;
  show: boolean;
}

export const DraftRecoveryBanner: React.FC<DraftRecoveryBannerProps> = ({
  lastSaved,
  onRestore,
  onDiscard,
  show
}) => {
  if (!show || !lastSaved) return null;

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <Alert className="mb-4 border-amber-200 bg-amber-50">
      <AlertCircle className="h-4 w-4 text-amber-600" />
      <AlertDescription className="flex items-center justify-between">
        <span className="text-amber-800">
          You have unsaved changes from {formatTime(lastSaved)}. Would you like to continue where you left off?
        </span>
        <div className="flex gap-2 ml-4">
          <Button 
            size="sm" 
            variant="outline" 
            onClick={onRestore}
            className="h-7 text-xs"
          >
            Restore
          </Button>
          <Button 
            size="sm" 
            variant="ghost" 
            onClick={onDiscard}
            className="h-7 text-xs"
          >
            <X className="h-3 w-3" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
