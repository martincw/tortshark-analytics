-- Drop the existing backend_cases table and create a new one matching daily stats format
DROP TABLE IF EXISTS public.backend_cases;

-- Create backend_case_stats table similar to daily stats
CREATE TABLE public.backend_case_stats (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id) NOT NULL,
  case_count INTEGER NOT NULL DEFAULT 0,
  price_per_case NUMERIC NOT NULL DEFAULT 0,
  total_value NUMERIC GENERATED ALWAYS AS (case_count * price_per_case) STORED,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(date, campaign_id, workspace_id)
);

-- Enable Row Level Security
ALTER TABLE public.backend_case_stats ENABLE ROW LEVEL SECURITY;

-- Create policies for backend case stats
CREATE POLICY "Users can view workspace backend case stats" 
ON public.backend_case_stats 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can create workspace backend case stats" 
ON public.backend_case_stats 
FOR INSERT 
WITH CHECK (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can update workspace backend case stats" 
ON public.backend_case_stats 
FOR UPDATE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can delete workspace backend case stats" 
ON public.backend_case_stats 
FOR DELETE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_backend_case_stats_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_backend_case_stats_updated_at
BEFORE UPDATE ON public.backend_case_stats
FOR EACH ROW
EXECUTE FUNCTION public.update_backend_case_stats_updated_at();