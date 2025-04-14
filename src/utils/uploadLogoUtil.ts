
import { toast } from "sonner";

// This is kept for compatibility, but we're now loading directly from URL
export const uploadLogoToStorage = async () => {
  console.log("Logo utility is now deprecated. Loading directly from URL.");
  return false;
};

// This is kept for compatibility, but always returns false
export const checkLogoExists = async (): Promise<boolean> => {
  console.log("Logo utility is now deprecated. Loading directly from URL.");
  return false;
};
