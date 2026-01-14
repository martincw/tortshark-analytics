-- Backfill campaign_target_history from existing campaign_targets
-- Use the campaign's created_at date as the effective_date for initial targets
INSERT INTO public.campaign_target_history (
  campaign_id,
  target_leads_per_day,
  case_payout_amount,
  target_roas,
  target_profit,
  effective_date,
  workspace_id
)
SELECT 
  ct.campaign_id,
  ct.target_leads_per_day,
  ct.case_payout_amount,
  ct.target_roas,
  ct.target_profit,
  COALESCE(c.created_at::date, '2024-01-01'::date) as effective_date,
  ct.workspace_id
FROM public.campaign_targets ct
JOIN public.campaigns c ON c.id = ct.campaign_id
WHERE NOT EXISTS (
  SELECT 1 FROM public.campaign_target_history cth 
  WHERE cth.campaign_id = ct.campaign_id
);