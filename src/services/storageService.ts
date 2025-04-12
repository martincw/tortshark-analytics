
import { supabase } from "@/integrations/supabase/client";

// Function to upload a file to Supabase storage
export const uploadFile = async (
  bucket: string,
  path: string,
  file: File
): Promise<string | null> => {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(path, file, { upsert: true });

    if (error) {
      console.error("Error uploading file:", error);
      return null;
    }

    // Get the public URL for the file
    const { data: urlData } = supabase.storage.from(bucket).getPublicUrl(path);

    return urlData.publicUrl;
  } catch (error) {
    console.error("Error in upload function:", error);
    return null;
  }
};

// Function to get a public URL for a file in Supabase storage
export const getPublicUrl = (bucket: string, path: string): string => {
  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
};
