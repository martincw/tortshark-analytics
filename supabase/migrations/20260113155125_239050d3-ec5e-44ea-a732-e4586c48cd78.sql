-- Enable pg_cron extension
CREATE EXTENSION IF NOT EXISTS pg_cron WITH SCHEMA extensions;

-- Grant usage to postgres role
GRANT USAGE ON SCHEMA cron TO postgres;

-- Create a function to call the edge function
CREATE OR REPLACE FUNCTION public.trigger_google_ads_sync()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  supabase_url text;
  service_role_key text;
BEGIN
  -- Get secrets from vault (these need to be set up)
  SELECT decrypted_secret INTO supabase_url 
  FROM vault.decrypted_secrets 
  WHERE name = 'supabase_url' 
  LIMIT 1;
  
  SELECT decrypted_secret INTO service_role_key 
  FROM vault.decrypted_secrets 
  WHERE name = 'service_role_key' 
  LIMIT 1;
  
  -- If secrets aren't in vault, use environment approach
  IF supabase_url IS NULL THEN
    supabase_url := current_setting('app.settings.supabase_url', true);
  END IF;
  
  IF service_role_key IS NULL THEN
    service_role_key := current_setting('app.settings.service_role_key', true);
  END IF;
  
  -- Call the edge function using pg_net
  PERFORM net.http_post(
    url := supabase_url || '/functions/v1/google-ads-sync',
    headers := jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || service_role_key
    ),
    body := jsonb_build_object('action', 'sync-spend')
  );
END;
$$;

-- Schedule the cron job to run every 15 minutes
SELECT cron.schedule(
  'google-ads-sync-15min',
  '*/15 * * * *',
  $$SELECT public.trigger_google_ads_sync()$$
);