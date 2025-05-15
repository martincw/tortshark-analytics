
import { toast as sonnerToast } from "sonner";

// Define the type for toast options
type ToastOptions = {
  title?: React.ReactNode;
  description?: React.ReactNode;
  action?: React.ReactNode;
  variant?: "default" | "destructive";
};

// Create an adapter function that converts our API to sonner's API
const toast = (options: ToastOptions | string) => {
  // If options is a string, use it as the title
  if (typeof options === 'string') {
    return sonnerToast(options);
  }

  const { title, description, variant, action } = options;
  
  // Map our variant to sonner's type (error for destructive)
  const type = variant === "destructive" ? "error" : "default";
  
  if (title && description) {
    return sonnerToast(title.toString(), {
      description: description,
      action: action,
      // @ts-ignore - sonner has different typing but this works
      type: type
    });
  }
  
  return sonnerToast(title || description || "");
};

export { toast };

export const useToast = () => {
  return {
    toast,
  };
};
