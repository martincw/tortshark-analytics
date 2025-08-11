-- Fix recursive RLS policies on workspace_members causing "infinite recursion" errors
-- Remove problematic policies that reference workspace_members (directly or via functions)

-- Ensure RLS is enabled
ALTER TABLE public.workspace_members ENABLE ROW LEVEL SECURITY;

-- Drop recursive/problematic policies if they exist
DROP POLICY IF EXISTS "Owners and admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members in their workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members of workspaces they belong to" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can insert members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can update members" ON public.workspace_members;

-- Keep existing safe policies (not dropping):
--   "view_own_membership" (USING: user_id = auth.uid())
--   "insert_own_membership" (WITH CHECK: user_id = auth.uid())
--   "workspace_owner_full_access" (USING/WITH CHECK referencing workspaces only)
--   "Users can leave or owners can remove members" (USING references workspaces only)

-- Add a simple, safe policy for owners to view all members in their workspaces
CREATE POLICY "Workspace owners can view all members"
ON public.workspace_members
FOR SELECT
USING (
  workspace_id IN (
    SELECT id FROM public.workspaces WHERE owner_id = auth.uid()
  )
);
