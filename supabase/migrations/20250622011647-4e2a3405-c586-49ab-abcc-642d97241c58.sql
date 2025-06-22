
-- Enable RLS and create policies for campaigns table
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace campaigns" 
  ON public.campaigns 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace campaigns" 
  ON public.campaigns 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for case_buyers table
ALTER TABLE public.case_buyers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace buyers" 
  ON public.case_buyers 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace buyers" 
  ON public.case_buyers 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for campaign_stats_history table
ALTER TABLE public.campaign_stats_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace campaign stats" 
  ON public.campaign_stats_history 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace campaign stats" 
  ON public.campaign_stats_history 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for campaign_targets table
ALTER TABLE public.campaign_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace campaign targets" 
  ON public.campaign_targets 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace campaign targets" 
  ON public.campaign_targets 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for buyer_tort_coverage table
ALTER TABLE public.buyer_tort_coverage ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace tort coverage" 
  ON public.buyer_tort_coverage 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace tort coverage" 
  ON public.buyer_tort_coverage 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for campaign_buyer_stack table
ALTER TABLE public.campaign_buyer_stack ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace buyer stack" 
  ON public.campaign_buyer_stack 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace buyer stack" 
  ON public.campaign_buyer_stack 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for case_attributions table
ALTER TABLE public.case_attributions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace case attributions" 
  ON public.case_attributions 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace case attributions" 
  ON public.case_attributions 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for account_connections table
ALTER TABLE public.account_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace account connections" 
  ON public.account_connections 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace account connections" 
  ON public.account_connections 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

-- Enable RLS and create policies for campaign_manual_stats table
ALTER TABLE public.campaign_manual_stats ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view workspace manual stats" 
  ON public.campaign_manual_stats 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );

CREATE POLICY "Users can manage workspace manual stats" 
  ON public.campaign_manual_stats 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT workspace_id FROM public.workspace_members WHERE user_id = auth.uid()
    )
  );
