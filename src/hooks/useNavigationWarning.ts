
import { useEffect, useCallback } from "react";

interface NavigationWarningOptions {
  isDirty: boolean;
  message?: string;
}

export const useNavigationWarning = ({ 
  isDirty, 
  message = "You have unsaved changes. Are you sure you want to leave?" 
}: NavigationWarningOptions) => {
  
  const handleBeforeUnload = useCallback((event: BeforeUnloadEvent) => {
    if (isDirty) {
      event.preventDefault();
      event.returnValue = message;
      return message;
    }
  }, [isDirty, message]);

  useEffect(() => {
    if (isDirty) {
      window.addEventListener("beforeunload", handleBeforeUnload);
      return () => {
        window.removeEventListener("beforeunload", handleBeforeUnload);
      };
    }
  }, [isDirty, handleBeforeUnload]);

  return {
    showWarning: isDirty
  };
};
