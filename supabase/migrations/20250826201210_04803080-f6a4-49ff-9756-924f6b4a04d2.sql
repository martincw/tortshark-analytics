-- Drop the existing weekly returns table and create a simpler campaign-wide returns table
DROP TABLE IF EXISTS public.campaign_returns;

-- Create table for campaign-wide returns
CREATE TABLE public.campaign_returns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  campaign_id UUID NOT NULL,
  workspace_id UUID,
  return_amount NUMERIC NOT NULL DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(campaign_id) -- Only one returns entry per campaign
);

-- Enable Row Level Security
ALTER TABLE public.campaign_returns ENABLE ROW LEVEL SECURITY;

-- Create policies for campaign returns
CREATE POLICY "Users can view their campaign returns" 
ON public.campaign_returns 
FOR SELECT 
USING (EXISTS (
  SELECT 1 FROM campaigns 
  WHERE campaigns.id = campaign_returns.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "Users can insert their campaign returns" 
ON public.campaign_returns 
FOR INSERT 
WITH CHECK (EXISTS (
  SELECT 1 FROM campaigns 
  WHERE campaigns.id = campaign_returns.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "Users can update their campaign returns" 
ON public.campaign_returns 
FOR UPDATE 
USING (EXISTS (
  SELECT 1 FROM campaigns 
  WHERE campaigns.id = campaign_returns.campaign_id 
  AND campaigns.user_id = auth.uid()
));

CREATE POLICY "Users can delete their campaign returns" 
ON public.campaign_returns 
FOR DELETE 
USING (EXISTS (
  SELECT 1 FROM campaigns 
  WHERE campaigns.id = campaign_returns.campaign_id 
  AND campaigns.user_id = auth.uid()
));

-- Workspace policies
CREATE POLICY "Users can manage workspace campaign returns" 
ON public.campaign_returns 
FOR ALL 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_campaign_returns_updated_at
BEFORE UPDATE ON public.campaign_returns
FOR EACH ROW
EXECUTE FUNCTION public.update_campaign_returns_updated_at();