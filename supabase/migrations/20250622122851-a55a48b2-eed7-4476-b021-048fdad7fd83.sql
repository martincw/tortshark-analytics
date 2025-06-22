
-- Create contractor_submissions table to store submissions from the public bulk stats page
CREATE TABLE public.contractor_submissions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contractor_email text NOT NULL,
  contractor_name text NOT NULL,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id),
  submission_date date NOT NULL,
  ad_spend numeric NOT NULL DEFAULT 0,
  leads integer NOT NULL DEFAULT 0,
  cases integer NOT NULL DEFAULT 0,
  revenue numeric NOT NULL DEFAULT 0,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  ip_address text,
  notes text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  approved_by uuid REFERENCES auth.users(id),
  approved_at timestamp with time zone
);

-- Create index for faster lookups
CREATE INDEX contractor_submissions_status_idx ON public.contractor_submissions(status);
CREATE INDEX contractor_submissions_created_at_idx ON public.contractor_submissions(created_at);
CREATE INDEX contractor_submissions_campaign_id_idx ON public.contractor_submissions(campaign_id);

-- Enable Row Level Security
ALTER TABLE public.contractor_submissions ENABLE ROW LEVEL SECURITY;

-- Create policy to allow anyone to insert (for public access)
CREATE POLICY "Anyone can create contractor submissions" 
  ON public.contractor_submissions
  FOR INSERT 
  WITH CHECK (true);

-- Create policy to allow authenticated users to view all submissions (for admin)
CREATE POLICY "Authenticated users can view all contractor submissions" 
  ON public.contractor_submissions
  FOR SELECT 
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to update submissions (for admin approval/rejection)
CREATE POLICY "Authenticated users can update contractor submissions" 
  ON public.contractor_submissions
  FOR UPDATE 
  TO authenticated
  USING (true);

-- Create policy to allow authenticated users to delete submissions (for admin)
CREATE POLICY "Authenticated users can delete contractor submissions" 
  ON public.contractor_submissions
  FOR DELETE 
  TO authenticated
  USING (true);
