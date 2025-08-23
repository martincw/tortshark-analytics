-- Add channel-specific ad spend columns to contractor_submissions table
ALTER TABLE public.contractor_submissions 
ADD COLUMN youtube_spend numeric DEFAULT 0,
ADD COLUMN meta_spend numeric DEFAULT 0,
ADD COLUMN newsbreak_spend numeric DEFAULT 0;

-- Add channel-specific ad spend columns to campaign_stats_history table
ALTER TABLE public.campaign_stats_history
ADD COLUMN youtube_spend numeric DEFAULT 0,
ADD COLUMN meta_spend numeric DEFAULT 0, 
ADD COLUMN newsbreak_spend numeric DEFAULT 0;