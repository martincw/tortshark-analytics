-- Create buyer_budget_capacity table for tracking monthly budget capacity per buyer
CREATE TABLE public.buyer_budget_capacity (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  buyer_id UUID NOT NULL REFERENCES public.case_buyers(id) ON DELETE CASCADE,
  monthly_capacity NUMERIC NOT NULL DEFAULT 0,
  effective_date DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  workspace_id UUID REFERENCES public.workspaces(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create index for faster lookups
CREATE INDEX idx_buyer_budget_capacity_buyer_id ON public.buyer_budget_capacity(buyer_id);
CREATE INDEX idx_buyer_budget_capacity_effective_date ON public.buyer_budget_capacity(effective_date);
CREATE INDEX idx_buyer_budget_capacity_workspace_id ON public.buyer_budget_capacity(workspace_id);

-- Enable Row Level Security
ALTER TABLE public.buyer_budget_capacity ENABLE ROW LEVEL SECURITY;

-- Create RLS policies for workspace access
CREATE POLICY "Users can view workspace buyer capacity"
ON public.buyer_budget_capacity
FOR SELECT
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

CREATE POLICY "Users can manage workspace buyer capacity"
ON public.buyer_budget_capacity
FOR ALL
USING (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
))
WITH CHECK (workspace_id IN (
  SELECT workspace_id FROM workspace_members WHERE user_id = auth.uid()
));

-- Also allow access through buyer ownership for backward compatibility
CREATE POLICY "Users can manage their own buyer capacity"
ON public.buyer_budget_capacity
FOR ALL
USING (EXISTS (
  SELECT 1 FROM case_buyers WHERE case_buyers.id = buyer_budget_capacity.buyer_id AND case_buyers.user_id = auth.uid()
))
WITH CHECK (EXISTS (
  SELECT 1 FROM case_buyers WHERE case_buyers.id = buyer_budget_capacity.buyer_id AND case_buyers.user_id = auth.uid()
));

-- Create trigger for updating updated_at
CREATE OR REPLACE FUNCTION public.update_buyer_budget_capacity_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_buyer_budget_capacity_updated_at
BEFORE UPDATE ON public.buyer_budget_capacity
FOR EACH ROW
EXECUTE FUNCTION public.update_buyer_budget_capacity_updated_at();