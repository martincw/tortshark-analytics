import React, { createContext, useContext, useState, useEffect } from "react";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "./AuthContext";

export interface Workspace {
  id: string;
  name: string;
  created_at: string;
  updated_at: string;
  owner_id: string;
}

export interface WorkspaceMember {
  id: string;
  workspace_id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface WorkspaceInvitation {
  id: string;
  workspace_id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  accepted_at: string | null;
}

interface WorkspaceContextType {
  currentWorkspace: Workspace | null;
  workspaces: Workspace[];
  members: WorkspaceMember[];
  invitations: WorkspaceInvitation[];
  isLoading: boolean;
  error: string | null;
  switchWorkspace: (workspaceId: string) => Promise<void>;
  createWorkspace: (name: string) => Promise<Workspace | null>;
  updateWorkspace: (id: string, name: string) => Promise<void>;
  deleteWorkspace: (id: string) => Promise<void>;
  inviteMember: (email: string, role: 'admin' | 'member') => Promise<WorkspaceInvitation | null>;
  updateMemberRole: (memberId: string, role: 'admin' | 'member') => Promise<void>;
  removeMember: (memberId: string) => Promise<void>;
  cancelInvitation: (invitationId: string) => Promise<void>;
  retryWorkspaceLoad: () => Promise<void>;
}

export const WorkspaceContext = createContext<WorkspaceContextType | undefined>(undefined);

export const WorkspaceProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, isAuthenticated } = useAuth();
  const [currentWorkspace, setCurrentWorkspace] = useState<Workspace | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [members, setMembers] = useState<WorkspaceMember[]>([]);
  const [invitations, setInvitations] = useState<WorkspaceInvitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch workspaces when user auth state changes
  useEffect(() => {
    if (isAuthenticated && user) {
      fetchWorkspaces();
    } else {
      setWorkspaces([]);
      setCurrentWorkspace(null);
      setMembers([]);
      setInvitations([]);
      setError(null);
      setIsLoading(false);
    }
  }, [isAuthenticated, user]);

  // Fetch workspaces that the user is a member of
  const fetchWorkspaces = async () => {
    if (!user) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      console.log("Fetching workspaces for user:", user.id);
      
      // First try to get the user's workspace memberships
      const { data: membershipData, error: membershipError } = await supabase
        .from('workspace_members')
        .select('workspace_id')
        .eq('user_id', user.id);
      
      if (membershipError) {
        console.error("Error fetching memberships:", membershipError);
        
        // If it's an RLS error, try to create a default workspace
        if (membershipError.message.includes('policy') || membershipError.message.includes('permission')) {
          console.log("RLS policy issue detected, attempting to create default workspace");
          await createDefaultWorkspaceForUser();
          return;
        }
        
        throw membershipError;
      }
      
      if (!membershipData || membershipData.length === 0) {
        console.log("User has no workspaces, creating default workspace");
        await createDefaultWorkspaceForUser();
        return;
      }
      
      const workspaceIds = membershipData.map(m => m.workspace_id);
      console.log("Found workspace IDs:", workspaceIds);
      
      const { data: workspacesData, error: workspacesError } = await supabase
        .from('workspaces')
        .select('*')
        .in('id', workspaceIds);
        
      if (workspacesError) {
        console.error("Error fetching workspaces:", workspacesError);
        throw workspacesError;
      }
      
      if (workspacesData && workspacesData.length > 0) {
        console.log("Successfully loaded workspaces:", workspacesData.length);
        setWorkspaces(workspacesData);
        
        // Set current workspace (either from local storage or default to first)
        const storedWorkspaceId = localStorage.getItem('current_workspace_id');
        let selectedWorkspace = null;
        
        if (storedWorkspaceId) {
          selectedWorkspace = workspacesData.find(w => w.id === storedWorkspaceId);
        }
        
        // If no stored workspace or stored one not found, use first workspace
        if (!selectedWorkspace) {
          selectedWorkspace = workspacesData[0];
          localStorage.setItem('current_workspace_id', selectedWorkspace.id);
          console.log("Auto-selected first workspace:", selectedWorkspace.name);
        }
        
        setCurrentWorkspace(selectedWorkspace);
        await fetchWorkspaceDetails(selectedWorkspace.id);
      } else {
        console.log("No workspaces returned, creating default");
        await createDefaultWorkspaceForUser();
      }
    } catch (error) {
      console.error("Error in fetchWorkspaces:", error);
      setError("Failed to load workspaces. Please try again.");
      toast.error("Failed to load workspaces");
    } finally {
      setIsLoading(false);
    }
  };

  // Create a default workspace for users who don't have one
  const createDefaultWorkspaceForUser = async () => {
    if (!user) return;
    
    try {
      console.log("Creating default workspace for user");
      const defaultWorkspace = await createWorkspace("Default Workspace");
      
      if (defaultWorkspace) {
        console.log("Default workspace created successfully");
        setError(null);
        // Auto-select the newly created workspace
        setCurrentWorkspace(defaultWorkspace);
        localStorage.setItem('current_workspace_id', defaultWorkspace.id);
        await fetchWorkspaceDetails(defaultWorkspace.id);
      } else {
        throw new Error("Failed to create default workspace");
      }
    } catch (error) {
      console.error("Error creating default workspace:", error);
      setError("Failed to create workspace. Please refresh the page.");
      toast.error("Failed to create workspace");
    }
  };

  // Retry loading workspaces
  const retryWorkspaceLoad = async () => {
    await fetchWorkspaces();
  };

  // Fetch members and invitations for a specific workspace
  const fetchWorkspaceDetails = async (workspaceId: string) => {
    try {
      console.log("Fetching workspace details for:", workspaceId);
      
      // Fetch members
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*')
        .eq('workspace_id', workspaceId);
        
      if (membersError) {
        console.error("Error fetching members:", membersError);
        throw membersError;
      }
      
      setMembers(membersData || []);
      
      // Fetch invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .eq('workspace_id', workspaceId)
        .is('accepted_at', null);
        
      if (invitationsError) {
        console.error("Error fetching invitations:", invitationsError);
        throw invitationsError;
      }
      
      setInvitations(invitationsData || []);
      console.log("Workspace details loaded successfully");
    } catch (error) {
      console.error("Error fetching workspace details:", error);
      // Don't show error toast for workspace details as it's not critical
      setMembers([]);
      setInvitations([]);
    }
  };

  // Switch to a different workspace
  const switchWorkspace = async (workspaceId: string) => {
    const workspace = workspaces.find(w => w.id === workspaceId);
    if (!workspace) {
      toast.error("Workspace not found");
      return;
    }
    
    setCurrentWorkspace(workspace);
    localStorage.setItem('current_workspace_id', workspaceId);
    await fetchWorkspaceDetails(workspaceId);
    
    toast.success(`Switched to ${workspace.name}`);
  };

  // Create a new workspace using the atomic database function
  const createWorkspace = async (name: string): Promise<Workspace | null> => {
    if (!user) {
      console.error("Cannot create workspace: user not authenticated");
      toast.error("You must be logged in to create a workspace");
      return null;
    }
    
    // Validate input on frontend
    if (!name || !name.trim()) {
      toast.error("Workspace name cannot be empty");
      return null;
    }
    
    const trimmedName = name.trim();
    
    // Check for duplicate names in existing workspaces
    const existingWorkspace = workspaces.find(w => 
      w.name.toLowerCase() === trimmedName.toLowerCase()
    );
    
    if (existingWorkspace) {
      toast.error(`You already have a workspace named "${trimmedName}"`);
      return null;
    }
    
    try {
      console.log("Creating workspace using database function:", trimmedName);
      
      // Call the database function for atomic workspace creation
      const { data, error } = await supabase
        .rpc('create_workspace_with_owner', {
          p_workspace_name: trimmedName
        });
        
      if (error) {
        console.error("Database function error:", error);
        
        // Handle specific error types
        if (error.message.includes('already have a workspace named')) {
          toast.error(error.message);
        } else if (error.message.includes('must be authenticated')) {
          toast.error("Authentication required to create workspace");
        } else if (error.message.includes('cannot be empty')) {
          toast.error("Workspace name cannot be empty");
        } else {
          console.error("Unexpected error:", error);
          toast.error("Failed to create workspace. Please try again.");
        }
        return null;
      }
      
      if (!data || data.length === 0) {
        console.error("No data returned from workspace creation function");
        toast.error("Failed to create workspace. Please try again.");
        return null;
      }
      
      const workspaceData = data[0];
      const newWorkspace: Workspace = {
        id: workspaceData.workspace_id,
        name: workspaceData.workspace_name,
        created_at: workspaceData.created_at,
        updated_at: workspaceData.created_at,
        owner_id: user.id
      };
      
      // Update state
      setWorkspaces([...workspaces, newWorkspace]);
      console.log("Workspace created successfully:", newWorkspace.name);
      toast.success(`Created workspace: ${newWorkspace.name}`);
      
      return newWorkspace;
    } catch (error) {
      console.error("Error creating workspace:", error);
      toast.error("Failed to create workspace. Please try again.");
      return null;
    }
  };

  // Update workspace name
  const updateWorkspace = async (id: string, name: string) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .update({ name })
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Update state
      setWorkspaces(workspaces.map(w => 
        w.id === id ? { ...w, name } : w
      ));
      
      if (currentWorkspace && currentWorkspace.id === id) {
        setCurrentWorkspace({ ...currentWorkspace, name });
      }
      
      toast.success("Workspace updated");
    } catch (error) {
      console.error("Error updating workspace:", error);
      toast.error("Failed to update workspace");
    }
  };

  // Delete workspace (only if user is owner)
  const deleteWorkspace = async (id: string) => {
    try {
      const { error } = await supabase
        .from('workspaces')
        .delete()
        .eq('id', id);
        
      if (error) {
        throw error;
      }
      
      // Update state
      const updatedWorkspaces = workspaces.filter(w => w.id !== id);
      setWorkspaces(updatedWorkspaces);
      
      // If deleted the current workspace, switch to another one
      if (currentWorkspace && currentWorkspace.id === id) {
        if (updatedWorkspaces.length > 0) {
          setCurrentWorkspace(updatedWorkspaces[0]);
          localStorage.setItem('current_workspace_id', updatedWorkspaces[0].id);
          await fetchWorkspaceDetails(updatedWorkspaces[0].id);
        } else {
          setCurrentWorkspace(null);
          localStorage.removeItem('current_workspace_id');
          setMembers([]);
          setInvitations([]);
        }
      }
      
      toast.success("Workspace deleted");
    } catch (error) {
      console.error("Error deleting workspace:", error);
      toast.error("Failed to delete workspace");
    }
  };

  // Invite a new member to the workspace
  const inviteMember = async (email: string, role: 'admin' | 'member'): Promise<WorkspaceInvitation | null> => {
    if (!currentWorkspace || !user) return null;
    
    try {
      // Generate token and expiry (24 hours)
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const { data: invitationData, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: currentWorkspace.id,
          email,
          role,
          token,
          expires_at: expiresAt.toISOString(),
          created_by: user.id
        })
        .select()
        .single();
        
      if (error) {
        throw error;
      }
      
      if (!invitationData) {
        throw new Error("Failed to create invitation");
      }
      
      // Update state
      setInvitations([...invitations, invitationData]);
      
      toast.success(`Invitation sent to ${email}`);
      
      // In a real app, send an email here
      console.log(`Invitation link: /invite?token=${token}`);
      
      return invitationData;
    } catch (error) {
      console.error("Error inviting member:", error);
      toast.error("Failed to send invitation");
      return null;
    }
  };

  // Update a member's role
  const updateMemberRole = async (memberId: string, role: 'admin' | 'member') => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .update({ role })
        .eq('id', memberId);
        
      if (error) {
        throw error;
      }
      
      // Update state
      setMembers(members.map(m => 
        m.id === memberId ? { ...m, role } : m
      ));
      
      toast.success("Member role updated");
    } catch (error) {
      console.error("Error updating member role:", error);
      toast.error("Failed to update member role");
    }
  };

  // Remove a member from the workspace
  const removeMember = async (memberId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', memberId);
        
      if (error) {
        throw error;
      }
      
      // Update state
      setMembers(members.filter(m => m.id !== memberId));
      
      toast.success("Member removed from workspace");
    } catch (error) {
      console.error("Error removing member:", error);
      toast.error("Failed to remove member");
    }
  };

  // Cancel a pending invitation
  const cancelInvitation = async (invitationId: string) => {
    try {
      const { error } = await supabase
        .from('workspace_invitations')
        .delete()
        .eq('id', invitationId);
        
      if (error) {
        throw error;
      }
      
      // Update state
      setInvitations(invitations.filter(i => i.id !== invitationId));
      
      toast.success("Invitation cancelled");
    } catch (error) {
      console.error("Error cancelling invitation:", error);
      toast.error("Failed to cancel invitation");
    }
  };

  // Execute migration for existing data (for first-time setup)
  useEffect(() => {
    if (isAuthenticated && user) {
      const migrateData = async () => {
        try {
          const { data, error } = await supabase.rpc('migrate_data_to_workspaces');
          if (error) {
            console.error("Error migrating data:", error);
            // Don't show toast to users as this is a background operation
          } else {
            console.log("Data migration completed");
            // Refresh workspaces after migration
            await fetchWorkspaces();
          }
        } catch (error) {
          console.error("Error calling migration function:", error);
        }
      };
      
      migrateData();
    }
  }, []);

  const contextValue: WorkspaceContextType = {
    currentWorkspace,
    workspaces,
    members,
    invitations,
    isLoading,
    error,
    switchWorkspace,
    createWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    retryWorkspaceLoad,
  };

  return (
    <WorkspaceContext.Provider value={contextValue}>
      {children}
    </WorkspaceContext.Provider>
  );
};

export const useWorkspace = (): WorkspaceContextType => {
  const context = useContext(WorkspaceContext);
  if (context === undefined) {
    throw new Error("useWorkspace must be used within a WorkspaceProvider");
  }
  return context;
};
