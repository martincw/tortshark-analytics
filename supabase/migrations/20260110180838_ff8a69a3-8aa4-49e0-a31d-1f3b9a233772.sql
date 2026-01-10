-- Add target_leads_per_day column to campaign_targets table
ALTER TABLE public.campaign_targets
ADD COLUMN target_leads_per_day INTEGER DEFAULT 0;