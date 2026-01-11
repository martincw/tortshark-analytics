-- Add unique constraint on campaign_id for proper upsert operations
ALTER TABLE public.campaign_targets ADD CONSTRAINT campaign_targets_campaign_id_key UNIQUE (campaign_id);