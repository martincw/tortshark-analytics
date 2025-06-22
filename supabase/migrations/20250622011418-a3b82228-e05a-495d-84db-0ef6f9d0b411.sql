
-- First, completely disable RLS temporarily to clear all policies
ALTER TABLE public.workspace_members DISABLE ROW LEVEL SECURITY;

-- Drop ALL possible existing policies (including the problematic ones)
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace co-members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members in owned workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage non-owners" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can delete non-owners" ON public.workspace_members;
DROP POLICY IF EXISTS "Own membership view" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can view all members" ON public.workspace_members;
DROP POLICY IF EXISTS "Own membership insert" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Owner can delete members" ON public.workspace_members;

-- Drop any other policies that might exist (these are the problematic ones from the logs)
DROP POLICY IF EXISTS "Contractors can only see own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.workspace_members;

-- Re-enable RLS
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Create minimal, safe policies with NO circular dependencies
-- Policy 1: Users can see their own membership records only
CREATE POLICY "view_own_membership" 
  ON public.workspace_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy 2: Users can insert their own membership (for invitations)
CREATE POLICY "insert_own_membership" 
  ON public.workspace_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Policy 3: Workspace owners can manage all members in their workspaces
CREATE POLICY "workspace_owner_full_access" 
  ON public.workspace_members 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  )
  WITH CHECK (
    workspace_id IN (
      SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
    )
  );
