-- Create table to track historical target changes
CREATE TABLE public.campaign_target_history (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  target_leads_per_day NUMERIC DEFAULT 0,
  case_payout_amount NUMERIC DEFAULT 0,
  target_roas NUMERIC DEFAULT 0,
  target_profit NUMERIC DEFAULT 0,
  effective_date DATE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  workspace_id UUID REFERENCES public.workspaces(id),
  UNIQUE(campaign_id, effective_date)
);

-- Enable RLS
ALTER TABLE public.campaign_target_history ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view target history in their workspace"
ON public.campaign_target_history
FOR SELECT
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert target history in their workspace"
ON public.campaign_target_history
FOR INSERT
WITH CHECK (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can update target history in their workspace"
ON public.campaign_target_history
FOR UPDATE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete target history in their workspace"
ON public.campaign_target_history
FOR DELETE
USING (
  workspace_id IN (
    SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
  )
);

-- Index for efficient lookups
CREATE INDEX idx_campaign_target_history_lookup 
ON public.campaign_target_history(campaign_id, effective_date DESC);

-- Function to get the applicable target for a given date
CREATE OR REPLACE FUNCTION public.get_target_for_date(
  p_campaign_id UUID,
  p_date DATE
) RETURNS TABLE (
  target_leads_per_day NUMERIC,
  case_payout_amount NUMERIC,
  target_roas NUMERIC,
  target_profit NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    cth.target_leads_per_day,
    cth.case_payout_amount,
    cth.target_roas,
    cth.target_profit
  FROM public.campaign_target_history cth
  WHERE cth.campaign_id = p_campaign_id
    AND cth.effective_date <= p_date
  ORDER BY cth.effective_date DESC
  LIMIT 1;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;