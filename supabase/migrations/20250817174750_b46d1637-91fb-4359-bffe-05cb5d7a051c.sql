-- Create backend_cases table for tracking law firm's backend cases
CREATE TABLE public.backend_cases (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  case_number TEXT GENERATED ALWAYS AS ('BC-' || EXTRACT(YEAR FROM created_at) || '-' || LPAD(RIGHT(id::text, 3), 3, '0')) STORED,
  client_name TEXT NOT NULL,
  case_type TEXT NOT NULL,
  campaign_id UUID REFERENCES public.campaigns(id),
  estimated_value NUMERIC NOT NULL DEFAULT 0,
  date_opened DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'Active',
  progress INTEGER NOT NULL DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
  notes TEXT,
  user_id UUID NOT NULL DEFAULT auth.uid(),
  workspace_id UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.backend_cases ENABLE ROW LEVEL SECURITY;

-- Create policies for backend cases
CREATE POLICY "Users can view workspace backend cases" 
ON public.backend_cases 
FOR SELECT 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can create workspace backend cases" 
ON public.backend_cases 
FOR INSERT 
WITH CHECK (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can update workspace backend cases" 
ON public.backend_cases 
FOR UPDATE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

CREATE POLICY "Users can delete workspace backend cases" 
ON public.backend_cases 
FOR DELETE 
USING (workspace_id IN (
  SELECT workspace_members.workspace_id
  FROM workspace_members
  WHERE workspace_members.user_id = auth.uid()
));

-- Create function to update timestamps
CREATE OR REPLACE FUNCTION public.update_backend_cases_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for automatic timestamp updates
CREATE TRIGGER update_backend_cases_updated_at
BEFORE UPDATE ON public.backend_cases
FOR EACH ROW
EXECUTE FUNCTION public.update_backend_cases_updated_at();