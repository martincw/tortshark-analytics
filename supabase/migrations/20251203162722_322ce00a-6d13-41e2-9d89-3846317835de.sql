-- Create campaign_portfolio_settings table for manual portfolio inputs
CREATE TABLE public.campaign_portfolio_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  settlement_value NUMERIC NOT NULL DEFAULT 0,
  workspace_id UUID REFERENCES public.workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  CONSTRAINT unique_campaign_portfolio UNIQUE (campaign_id)
);

-- Enable RLS
ALTER TABLE public.campaign_portfolio_settings ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view workspace portfolio settings"
ON public.campaign_portfolio_settings
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage workspace portfolio settings"
ON public.campaign_portfolio_settings
FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Create trigger for updated_at
CREATE TRIGGER update_campaign_portfolio_settings_updated_at
BEFORE UPDATE ON public.campaign_portfolio_settings
FOR EACH ROW
EXECUTE FUNCTION public.update_backend_case_stats_updated_at();