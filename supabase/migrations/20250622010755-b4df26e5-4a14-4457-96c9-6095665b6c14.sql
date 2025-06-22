
-- Drop ALL existing policies on workspace_members to ensure clean slate
DROP POLICY IF EXISTS "Users can view own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view workspace co-members" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can view members in owned workspaces" ON public.workspace_members;
DROP POLICY IF EXISTS "Users can create own membership" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can manage members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can update members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace owners can delete members" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can manage non-owners" ON public.workspace_members;
DROP POLICY IF EXISTS "Workspace admins can delete non-owners" ON public.workspace_members;

-- Create completely new, simple policies that avoid any circular dependencies
-- Policy 1: Users can see their own membership
CREATE POLICY "Own membership view" 
  ON public.workspace_members 
  FOR SELECT 
  USING (user_id = auth.uid());

-- Policy 2: Workspace owners can see all members in their workspaces
CREATE POLICY "Owner can view all members" 
  ON public.workspace_members 
  FOR SELECT 
  USING (
    workspace_id IN (
      SELECT w.id 
      FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );

-- Policy 3: Users can create their own membership
CREATE POLICY "Own membership insert" 
  ON public.workspace_members 
  FOR INSERT 
  WITH CHECK (user_id = auth.uid());

-- Policy 4: Workspace owners can update members
CREATE POLICY "Owner can update members" 
  ON public.workspace_members 
  FOR UPDATE 
  USING (
    workspace_id IN (
      SELECT w.id 
      FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );

-- Policy 5: Workspace owners can delete members (except themselves)
CREATE POLICY "Owner can delete members" 
  ON public.workspace_members 
  FOR DELETE 
  USING (
    user_id != auth.uid() AND
    workspace_id IN (
      SELECT w.id 
      FROM public.workspaces w 
      WHERE w.owner_id = auth.uid()
    )
  );
