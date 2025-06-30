
import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { v4 as uuidv4 } from "uuid";

export interface TeamMember {
  id: string;
  user_id: string;
  role: 'owner' | 'admin' | 'member';
  created_at: string;
  updated_at: string;
  user_email?: string;
  user_name?: string;
}

export interface TeamInvitation {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member';
  token: string;
  expires_at: string;
  created_at: string;
  created_by: string;
  accepted_at: string | null;
}

export const useTeamMembers = () => {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [invitations, setInvitations] = useState<TeamInvitation[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Fetch team members (simplified without workspace filtering)
  const fetchMembers = async () => {
    setIsLoading(true);
    try {
      const { data: membersData, error: membersError } = await supabase
        .from('workspace_members')
        .select('*');
        
      if (membersError) {
        throw membersError;
      }
      
      if (membersData) {
        setMembers(membersData);
      } else {
        setMembers([]);
      }
      
      // Fetch pending invitations
      const { data: invitationsData, error: invitationsError } = await supabase
        .from('workspace_invitations')
        .select('*')
        .is('accepted_at', null);
        
      if (invitationsError) {
        throw invitationsError;
      }
      
      if (invitationsData) {
        setInvitations(invitationsData);
      } else {
        setInvitations([]);
      }
    } catch (error) {
      console.error("Error fetching team members:", error);
      toast.error("Failed to load team members");
    } finally {
      setIsLoading(false);
    }
  };

  // Invite a new member (simplified)
  const inviteMember = async (email: string, role: 'admin' | 'member' = 'admin'): Promise<TeamInvitation | null> => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        toast.error('You must be logged in to invite members');
        return null;
      }
      
      // Generate token and expiry (24 hours)
      const token = uuidv4();
      const expiresAt = new Date();
      expiresAt.setHours(expiresAt.getHours() + 24);
      
      const { data: invitationData, error } = await supabase
        .from('workspace_invitations')
        .insert({
          workspace_id: '00000000-0000-0000-0000-000000000000', // Dummy workspace ID
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
      
      toast.success(`Admin invitation sent to ${email}`);
      
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

  // Remove a member from the team
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
      
      toast.success("Member removed from team");
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

  useEffect(() => {
    fetchMembers();
  }, []);

  return {
    members,
    invitations,
    isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation,
    refetch: fetchMembers
  };
};
