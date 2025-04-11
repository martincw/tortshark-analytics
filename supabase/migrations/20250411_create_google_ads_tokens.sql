
-- Create the google_ads_tokens table to store OAuth tokens
CREATE TABLE IF NOT EXISTS public.google_ads_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Create an index on user_id for faster lookups
CREATE INDEX IF NOT EXISTS google_ads_tokens_user_id_idx ON public.google_ads_tokens (user_id);

-- Add RLS policies to protect the table
ALTER TABLE public.google_ads_tokens ENABLE ROW LEVEL SECURITY;

-- Only allow users to see their own tokens
CREATE POLICY "Users can only view their own tokens"
  ON public.google_ads_tokens
  FOR SELECT
  USING (auth.uid() = user_id);

-- Only allow users to insert their own tokens
CREATE POLICY "Users can only insert their own tokens"
  ON public.google_ads_tokens
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Only allow users to update their own tokens
CREATE POLICY "Users can only update their own tokens"
  ON public.google_ads_tokens
  FOR UPDATE
  USING (auth.uid() = user_id);

-- Only allow users to delete their own tokens
CREATE POLICY "Users can only delete their own tokens"
  ON public.google_ads_tokens
  FOR DELETE
  USING (auth.uid() = user_id);
