
CREATE OR REPLACE FUNCTION public.upsert_daily_lead_metrics(
  p_ts_campaign_id UUID,
  p_date DATE,
  p_lead_count INT,
  p_accepted INT,
  p_duplicated INT,
  p_failed INT,
  p_cost NUMERIC,
  p_revenue NUMERIC
) RETURNS UUID AS $$
DECLARE
  v_id UUID;
BEGIN
  -- Check if record exists
  SELECT id INTO v_id
  FROM public.ts_daily_lead_metrics
  WHERE ts_campaign_id = p_ts_campaign_id
    AND date = p_date;
    
  -- If record exists, update it
  IF v_id IS NOT NULL THEN
    UPDATE public.ts_daily_lead_metrics
    SET 
      lead_count = lead_count + p_lead_count,
      accepted = accepted + p_accepted,
      duplicated = duplicated + p_duplicated,
      failed = failed + p_failed,
      cost = cost + p_cost,
      revenue = revenue + p_revenue,
      updated_at = NOW()
    WHERE id = v_id;
    
    RETURN v_id;
  -- If record doesn't exist, insert new one
  ELSE
    INSERT INTO public.ts_daily_lead_metrics (
      ts_campaign_id,
      date,
      lead_count,
      accepted,
      duplicated,
      failed,
      cost,
      revenue
    ) VALUES (
      p_ts_campaign_id,
      p_date,
      p_lead_count,
      p_accepted,
      p_duplicated,
      p_failed,
      p_cost,
      p_revenue
    )
    RETURNING id INTO v_id;
    
    RETURN v_id;
  END IF;
END;
$$ LANGUAGE plpgsql;
