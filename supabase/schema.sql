
-- Create google_ads_tokens table if it doesn't exist
CREATE TABLE IF NOT EXISTS public.google_ads_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users NOT NULL,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  CONSTRAINT unique_user_id UNIQUE (user_id)
);

-- Enable RLS on the google_ads_tokens table
ALTER TABLE public.google_ads_tokens ENABLE ROW LEVEL SECURITY;

-- Add RLS policy to only allow users to access their own tokens
CREATE POLICY "Users can only access their own tokens" 
ON public.google_ads_tokens
FOR ALL
USING (auth.uid() = user_id);
