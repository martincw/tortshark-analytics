
-- Delete existing stats for Video Game Addiction campaign for these dates
DELETE FROM campaign_stats_history 
WHERE campaign_id = '5acc3ede-795f-4492-8ec7-982a6c9bae9a' 
AND date IN ('2026-02-02','2026-02-05','2026-02-06','2026-02-07','2026-02-08','2026-02-09');

-- Insert new stats from CSV data
INSERT INTO campaign_stats_history (campaign_id, date, leads, cases, retainers, revenue)
VALUES
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-02', 5, 2, 2, 500),
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-05', 8, 2, 2, 500),
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-06', 13, 3, 3, 750),
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-07', 46, 17, 17, 4250),
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-08', 46, 9, 9, 2250),
  ('5acc3ede-795f-4492-8ec7-982a6c9bae9a', '2026-02-09', 8, 2, 2, 500);

-- Update campaign_manual_stats with the latest date's data
UPDATE campaign_manual_stats 
SET leads = 8, cases = 2, retainers = 2, revenue = 500, date = '2026-02-09'
WHERE id = '4ee90acb-5892-4b12-942c-8e39be702154';
