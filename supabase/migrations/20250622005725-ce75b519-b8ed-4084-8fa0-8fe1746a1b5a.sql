
-- Create account_type enum
CREATE TYPE public.account_type AS ENUM ('admin', 'member', 'contractor');

-- Add account_type column to workspace_members table
ALTER TABLE public.workspace_members 
ADD COLUMN account_type public.account_type NOT NULL DEFAULT 'member';

-- Create RLS policies for contractor access restrictions
-- Contractors can only see their own workspace membership
CREATE POLICY "Contractors can only see own membership" 
  ON public.workspace_members 
  FOR SELECT 
  USING (
    CASE 
      WHEN account_type = 'contractor' THEN user_id = auth.uid()
      ELSE true
    END
  );

-- Contractors can only see campaigns in their workspace (read-only)
CREATE POLICY "Contractors have read-only campaign access" 
  ON public.campaigns 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Contractors can only insert/update their own campaign stats
CREATE POLICY "Contractors can manage own campaign stats" 
  ON public.campaign_stats_history 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT workspace_id 
      FROM public.workspace_members 
      WHERE user_id = auth.uid()
    )
  );

-- Create a function to check if user is contractor
CREATE OR REPLACE FUNCTION public.is_contractor(user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspace_members
    WHERE workspace_members.user_id = COALESCE($1, auth.uid())
    AND workspace_members.account_type = 'contractor'
  );
$$;

-- Create a function to get user account type
CREATE OR REPLACE FUNCTION public.get_user_account_type(user_id uuid DEFAULT auth.uid())
RETURNS public.account_type
LANGUAGE sql
STABLE SECURITY DEFINER
AS $$
  SELECT account_type
  FROM public.workspace_members
  WHERE workspace_members.user_id = COALESCE($1, auth.uid())
  LIMIT 1;
$$;
