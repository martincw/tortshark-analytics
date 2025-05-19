
import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';

interface InvitationDetails {
  id: string;
  workspaceName: string;
  email: string;
  role: string;
  expired: boolean;
}

export const InvitationAccepter = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [invitationDetails, setInvitationDetails] = useState<InvitationDetails | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isAccepting, setIsAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  useEffect(() => {
    if (!token) {
      setError("No invitation token provided");
      setIsLoading(false);
      return;
    }
    
    const fetchInvitation = async () => {
      try {
        // Get invitation details
        const { data: invitationData, error: invitationError } = await supabase
          .from('workspace_invitations')
          .select(`
            id,
            workspace_id,
            email,
            role,
            expires_at,
            workspaces (
              name
            )
          `)
          .eq('token', token)
          .single();
          
        if (invitationError) {
          setError("Invalid or expired invitation token");
          setIsLoading(false);
          return;
        }
        
        if (!invitationData) {
          setError("Invitation not found");
          setIsLoading(false);
          return;
        }
        
        // Check if invitation is expired
        const now = new Date();
        const expiresAt = new Date(invitationData.expires_at);
        const isExpired = now > expiresAt;
        
        setInvitationDetails({
          id: invitationData.id,
          workspaceName: invitationData.workspaces.name,
          email: invitationData.email,
          role: invitationData.role,
          expired: isExpired
        });
        
        if (isExpired) {
          setError("This invitation has expired");
        }
      } catch (error) {
        console.error("Error fetching invitation:", error);
        setError("Failed to load invitation details");
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchInvitation();
  }, [token]);
  
  const handleAcceptInvitation = async () => {
    if (!user || !invitationDetails || !token) return;
    
    setIsAccepting(true);
    
    try {
      // Check if user email matches invitation email
      if (user.email?.toLowerCase() !== invitationDetails.email.toLowerCase()) {
        toast.error("Your email doesn't match the invitation. Please log in with the invited email address.");
        setIsAccepting(false);
        return;
      }
      
      // Get workspace ID from invitation
      const { data: inviteData, error: inviteError } = await supabase
        .from('workspace_invitations')
        .select('workspace_id, role')
        .eq('token', token)
        .single();
        
      if (inviteError || !inviteData) {
        throw new Error("Failed to verify invitation");
      }
      
      // Add user to workspace members
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: inviteData.workspace_id,
          user_id: user.id,
          role: inviteData.role
        });
        
      if (memberError) {
        if (memberError.code === '23505') { // Unique constraint violation
          toast.error("You're already a member of this workspace");
        } else {
          throw memberError;
        }
      } else {
        // Update invitation to mark as accepted
        const { error: updateError } = await supabase
          .from('workspace_invitations')
          .update({ accepted_at: new Date().toISOString() })
          .eq('token', token);
          
        if (updateError) {
          console.error("Error marking invitation as accepted:", updateError);
        }
        
        toast.success(`You've joined the ${invitationDetails.workspaceName} workspace!`);
        
        // Redirect to the dashboard or workspace page
        setTimeout(() => {
          navigate('/dashboard');
        }, 1500);
      }
    } catch (error) {
      console.error("Error accepting invitation:", error);
      toast.error("Failed to accept invitation. Please try again.");
    } finally {
      setIsAccepting(false);
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-[50vh]">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
      </div>
    );
  }
  
  if (error || !invitationDetails) {
    return (
      <Card className="max-w-md mx-auto mt-8">
        <CardHeader>
          <CardTitle>Invitation Error</CardTitle>
        </CardHeader>
        <CardContent>
          <p>{error || "Could not load invitation details"}</p>
        </CardContent>
        <CardFooter>
          <Button onClick={() => navigate('/')}>Go to Dashboard</Button>
        </CardFooter>
      </Card>
    );
  }
  
  return (
    <Card className="max-w-md mx-auto mt-8">
      <CardHeader>
        <CardTitle>Workspace Invitation</CardTitle>
        <CardDescription>
          You've been invited to join "{invitationDetails.workspaceName}"
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div>
            <p className="font-semibold">Workspace:</p>
            <p>{invitationDetails.workspaceName}</p>
          </div>
          <div>
            <p className="font-semibold">Role:</p>
            <p className="capitalize">{invitationDetails.role}</p>
          </div>
          <div>
            <p className="font-semibold">Email:</p>
            <p>{invitationDetails.email}</p>
          </div>
          
          {invitationDetails.expired && (
            <div className="bg-destructive/10 text-destructive p-3 rounded-md">
              This invitation has expired. Please request a new one.
            </div>
          )}
          
          {!isAuthenticated && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md">
              You need to sign in before accepting this invitation.
            </div>
          )}
          
          {isAuthenticated && user?.email !== invitationDetails.email && (
            <div className="bg-yellow-100 text-yellow-800 p-3 rounded-md">
              You're logged in as {user?.email}, but this invitation is for {invitationDetails.email}.
              Please log out and sign in with the correct account.
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={() => navigate('/')}>
          Cancel
        </Button>
        <Button 
          onClick={handleAcceptInvitation} 
          disabled={
            isAccepting || 
            !isAuthenticated || 
            invitationDetails.expired || 
            user?.email?.toLowerCase() !== invitationDetails.email.toLowerCase()
          }
        >
          {isAccepting ? "Accepting..." : "Accept Invitation"}
        </Button>
      </CardFooter>
    </Card>
  );
};
