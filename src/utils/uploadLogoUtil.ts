
import { supabase } from "@/integrations/supabase/client";
import { SUPABASE_PROJECT_URL } from "@/integrations/supabase/client";

export const uploadLogoToStorage = async () => {
  try {
    // Call the edge function to upload the logo
    const response = await fetch(`${SUPABASE_PROJECT_URL}/functions/v1/upload-logo`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${process.env.ANON_KEY || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1zZ3FzZ2Z0andwYm5xZW5oZm1jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQxMTcyNTksImV4cCI6MjA1OTY5MzI1OX0.NHzPUSTETpeT6mIzNhjo8LmXas--pRV01Z9APewORpc"}`,
      },
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Failed to upload logo:", errorData);
      return false;
    }

    const data = await response.json();
    console.log("Logo upload success:", data);
    return true;
  } catch (error) {
    console.error("Error uploading logo:", error);
    return false;
  }
};
