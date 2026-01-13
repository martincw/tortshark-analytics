-- Clean up duplicate entries in campaign_stats_history keeping the most recent one
DELETE FROM campaign_stats_history a
USING campaign_stats_history b
WHERE a.campaign_id = b.campaign_id 
  AND a.date = b.date 
  AND a.created_at < b.created_at;

-- Now add the unique constraint
ALTER TABLE public.campaign_stats_history 
ADD CONSTRAINT campaign_stats_history_campaign_date_unique 
UNIQUE (campaign_id, date);