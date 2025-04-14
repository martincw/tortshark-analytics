
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadLogoToStorage = async () => {
  try {
    console.log("Starting logo upload process...");
    
    // Call the edge function to upload the logo
    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/upload-logo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3FzZ2Z0andwYm5xZW5oZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMTcyNTksImV4cCI6MjA1OTY5MzI1OX0.NHzPUSTETpeT6mIzNhjo8LmXas--pRV01Z9APewORpc"}`,
      },
    });

    console.log("Upload logo response status:", response.status);
    
    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to upload logo:", errorData);
      toast.error("Failed to upload logo to storage");
      return false;
    }

    const data = await response.json();
    console.log("Logo upload success:", data);
    toast.success("Logo uploaded successfully");
    return true;
  } catch (error) {
    console.error("Error uploading logo:", error);
    toast.error("Error uploading logo to storage");
    return false;
  }
};

// Function to check if the logo exists in storage
export const checkLogoExists = async (): Promise<boolean> => {
  try {
    const { data, error } = await supabase
      .storage
      .from('assets')
      .list('', {
        search: 'tortshark-logo.png'
      });
    
    if (error) {
      console.error("Error checking logo existence:", error);
      return false;
    }
    
    return data && data.length > 0 && data.some(item => item.name === 'tortshark-logo.png');
  } catch (error) {
    console.error("Error checking if logo exists:", error);
    return false;
  }
};
