
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export const uploadLogoToStorage = async () => {
  try {
    console.log("Starting logo upload process...");
    
    // Use the new logo URL
    const logoUrl = "http://www.digitalnomad.com/wp-content/uploads/2025/04/TortShark-Logo.png";
    
    // Fetch the logo from the specified URL
    const logoResponse = await fetch(logoUrl);
    
    if (!logoResponse.ok) {
      console.error(`Failed to fetch logo: ${logoResponse.status} ${logoResponse.statusText}`);
      toast.error("Failed to download logo");
      return false;
    }

    const logoBlob = await logoResponse.blob();
    
    // Upload to Supabase storage
    const { data, error } = await supabase.storage
      .from("assets")
      .upload("tortshark-logo.png", logoBlob, { 
        contentType: "image/png",
        upsert: true 
      });
    
    if (error) {
      console.error("Supabase storage upload error:", error);
      toast.error("Failed to upload logo to storage");
      return false;
    }

    console.log("Logo uploaded successfully:", data);
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
