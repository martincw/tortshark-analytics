-- Fix infinite recursion in workspace_members policies by using security definer functions

-- First, create a security definer function to check workspace ownership
CREATE OR REPLACE FUNCTION public.is_workspace_owner_safe(workspace_id uuid, user_id uuid DEFAULT auth.uid())
RETURNS boolean
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.workspaces
    WHERE workspaces.id = $1
    AND workspaces.owner_id = COALESCE($2, auth.uid())
  );
$$;

-- Drop existing problematic policies
DROP POLICY IF EXISTS "Users can leave or owners can remove members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can add members" ON workspace_members;
DROP POLICY IF EXISTS "Workspace owners can view all members" ON workspace_members;
DROP POLICY IF EXISTS "insert_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "view_own_membership" ON workspace_members;
DROP POLICY IF EXISTS "workspace_owner_full_access" ON workspace_members;

-- Create new safe policies using security definer functions
CREATE POLICY "Users can view their own membership"
ON workspace_members
FOR SELECT
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own membership"
ON workspace_members
FOR INSERT
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Workspace owners can manage all members"
ON workspace_members
FOR ALL
USING (is_workspace_owner_safe(workspace_id))
WITH CHECK (is_workspace_owner_safe(workspace_id));

CREATE POLICY "Users can leave workspaces"
ON workspace_members
FOR DELETE
USING (user_id = auth.uid());