-- Add channel-specific lead fields to contractor_submissions table
ALTER TABLE contractor_submissions 
ADD COLUMN youtube_leads integer DEFAULT 0,
ADD COLUMN meta_leads integer DEFAULT 0,
ADD COLUMN newsbreak_leads integer DEFAULT 0;

-- Add channel-specific lead fields to campaign_stats_history table
ALTER TABLE campaign_stats_history 
ADD COLUMN youtube_leads integer DEFAULT 0,
ADD COLUMN meta_leads integer DEFAULT 0,
ADD COLUMN newsbreak_leads integer DEFAULT 0;