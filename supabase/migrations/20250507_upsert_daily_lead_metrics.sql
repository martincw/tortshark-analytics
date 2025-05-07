
-- Create a function to upsert daily lead metrics with increments
CREATE OR REPLACE FUNCTION public.upsert_daily_lead_metrics(
  p_ts_campaign_id UUID,
  p_date DATE,
  p_lead_count INTEGER DEFAULT 0,
  p_accepted INTEGER DEFAULT 0,
  p_duplicated INTEGER DEFAULT 0,
  p_failed INTEGER DEFAULT 0,
  p_cost NUMERIC DEFAULT 0,
  p_revenue NUMERIC DEFAULT 0
)
RETURNS void AS $$
BEGIN
  INSERT INTO public.ts_daily_lead_metrics (
    ts_campaign_id, 
    date, 
    lead_count, 
    accepted, 
    duplicated, 
    failed,
    cost,
    revenue
  )
  VALUES (
    p_ts_campaign_id,
    p_date,
    p_lead_count,
    p_accepted,
    p_duplicated,
    p_failed,
    p_cost,
    p_revenue
  )
  ON CONFLICT (ts_campaign_id, date) DO UPDATE
  SET 
    lead_count = ts_daily_lead_metrics.lead_count + EXCLUDED.lead_count,
    accepted = ts_daily_lead_metrics.accepted + EXCLUDED.accepted,
    duplicated = ts_daily_lead_metrics.duplicated + EXCLUDED.duplicated,
    failed = ts_daily_lead_metrics.failed + EXCLUDED.failed,
    cost = ts_daily_lead_metrics.cost + EXCLUDED.cost,
    revenue = ts_daily_lead_metrics.revenue + EXCLUDED.revenue,
    updated_at = now();
END;
$$ LANGUAGE plpgsql;
