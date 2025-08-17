-- Create table for LeadProsper leads data
CREATE TABLE IF NOT EXISTS public.leadprosper_leads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lead_id text NOT NULL,
  campaign_id text,
  campaign_name text,
  date date NOT NULL,
  status text,
  revenue numeric DEFAULT 0,
  cost numeric DEFAULT 0,
  created_at timestamp with time zone DEFAULT now(),
  updated_at timestamp with time zone DEFAULT now(),
  raw_data jsonb,
  UNIQUE(lead_id, date)
);

-- Enable RLS
ALTER TABLE public.leadprosper_leads ENABLE ROW LEVEL SECURITY;

-- Create policy for authenticated users to view their data
CREATE POLICY "Users can view leadprosper leads" 
ON public.leadprosper_leads 
FOR SELECT 
USING (true);

-- Create policy for service role to insert/update data
CREATE POLICY "Service can manage leadprosper leads" 
ON public.leadprosper_leads 
FOR ALL 
USING (true);