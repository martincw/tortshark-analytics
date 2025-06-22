
-- Drop all existing policies on workspace_members to start fresh
DROP POLICY IF EXISTS "Contractors can only see own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can manage workspace members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view their own membership" ON public.workspace_members;

-- Create new, simplified policies that avoid circular dependencies
-- Policy 1: Users can always see their own membership records
CREATE POLICY "Users can view own membership" 
  ON public.workspace_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy 2: Users can see other members in workspaces where they are also members
-- This uses a direct join without calling functions that query the same table
CREATE POLICY "Users can view workspace co-members" 
  ON public.workspace_members 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT wm.workspace_id 
      FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid()
    )
  );

-- Policy 3: Users can insert their own membership (for accepting invitations)
CREATE POLICY "Users can create own membership" 
  ON public.workspace_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Workspace owners can manage all members in their workspaces
CREATE POLICY "Workspace owners can manage members" 
  ON public.workspace_members 
  FOR ALL 
  USING (
    workspace_id IN (
      SELECT w.id 
      FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );

-- Policy 5: Workspace admins can manage members (except owners) in their workspaces
CREATE POLICY "Workspace admins can manage non-owners" 
  ON public.workspace_members 
  FOR UPDATE 
  USING (
    role != 'owner' AND
    workspace_id IN (
      SELECT wm.workspace_id 
      FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );

-- Policy 6: Workspace admins can delete members (except owners) in their workspaces
CREATE POLICY "Workspace admins can delete non-owners" 
  ON public.workspace_members 
  FOR DELETE 
  USING (
    role != 'owner' AND
    workspace_id IN (
      SELECT wm.workspace_id 
      FROM public.workspace_members wm 
      WHERE wm.user_id = auth.uid() 
      AND wm.role IN ('owner', 'admin')
    )
  );
