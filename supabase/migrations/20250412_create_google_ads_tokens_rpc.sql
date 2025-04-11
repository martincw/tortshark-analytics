
-- Create an RPC function to create the google_ads_tokens table if it doesn't exist
CREATE OR REPLACE FUNCTION public.create_google_ads_tokens_if_not_exists()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Check if the table exists
  IF NOT EXISTS (
    SELECT FROM pg_catalog.pg_tables 
    WHERE schemaname = 'public'
    AND tablename = 'google_ads_tokens'
  ) THEN
    -- Create the table if it doesn't exist
    CREATE TABLE public.google_ads_tokens (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      user_id UUID REFERENCES auth.users NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT,
      expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
      scope TEXT,
      email TEXT,
      created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
      updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
    );

    -- Create index for faster lookups
    CREATE INDEX google_ads_tokens_user_id_idx ON public.google_ads_tokens(user_id);
    
    -- Enable Row Level Security
    ALTER TABLE public.google_ads_tokens ENABLE ROW LEVEL SECURITY;
    
    -- Create policy to allow users to only see their own tokens
    CREATE POLICY "Users can only access their own tokens" 
      ON public.google_ads_tokens
      FOR ALL
      USING (auth.uid() = user_id);
      
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$$;

-- Grant execute permission to authenticated users
GRANT EXECUTE ON FUNCTION public.create_google_ads_tokens_if_not_exists() TO authenticated;
