
-- First, drop all existing policies on workspace_members to start fresh
DROP POLICY IF EXISTS "Users can view their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can insert their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can update their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can delete their own memberships" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;

-- Create simple, non-recursive RLS policies for workspace_members
-- Policy 1: Users can view memberships in workspaces they belong to
CREATE POLICY "Users can view workspace memberships" 
ON public.workspace_members 
FOR SELECT 
USING (
  user_id = auth.uid() OR 
  workspace_id IN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

-- Policy 2: Only workspace owners can insert new memberships
CREATE POLICY "Workspace owners can add members" 
ON public.workspace_members 
FOR INSERT 
WITH CHECK (
  EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- Policy 3: Only workspace owners can update memberships
CREATE POLICY "Workspace owners can update members" 
ON public.workspace_members 
FOR UPDATE 
USING (
  EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- Policy 4: Users can leave workspaces, owners can remove members
CREATE POLICY "Users can leave or owners can remove members" 
ON public.workspace_members 
FOR DELETE 
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- Also fix the workspace_invitations table policies if they exist
DROP POLICY IF EXISTS "Workspace admins can manage invitations" ON public.workspace_invitations;
DROP POLICY IF EXISTS "Workspace owners can manage invitations" ON public.workspace_invitations;

-- Create simple policies for workspace_invitations
CREATE POLICY "Workspace owners can manage invitations" 
ON public.workspace_invitations 
FOR ALL 
USING (
  EXISTS (
    SELECT 1 
    FROM public.workspaces 
    WHERE id = workspace_id 
    AND owner_id = auth.uid()
  )
);

-- For workspaces table, add basic RLS if not exists
DROP POLICY IF EXISTS "Users can view their workspaces" ON public.workspaces;
DROP POLICY IF EXISTS "Users can manage their own workspaces" ON public.workspaces;

CREATE POLICY "Users can view their workspaces" 
ON public.workspaces 
FOR SELECT 
USING (
  owner_id = auth.uid() OR 
  id IN (
    SELECT workspace_id 
    FROM public.workspace_members 
    WHERE user_id = auth.uid()
  )
);

CREATE POLICY "Workspace owners can manage workspaces" 
ON public.workspaces 
FOR ALL 
USING (owner_id = auth.uid());
