
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Users, 
  Search, 
  MoreHorizontal, 
  UserPlus, 
  Edit, 
  Trash, 
  Check, 
  X,
  LogOut
} from "lucide-react";

import { useTeamMembers } from "@/hooks/useTeamMembers";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { useAccountType } from "@/contexts/AccountTypeContext";

const TeamPage: React.FC = () => {
  const { 
    members, 
    invitations, 
    isLoading,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation
  } = useTeamMembers();
  const { user } = useAuth();
  const { accountType } = useAccountType();
  
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("admin");
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setIsInvitingMember(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("admin");
      
      // In a real app, you would send an email here
      toast.info("In a production app, an email would be sent to the invitee. For now, check the console for invitation details.");
    } finally {
      setIsInvitingMember(false);
    }
  };
  
  const filteredMembers = searchQuery 
    ? members.filter(m => 
        m.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;
    
  const isUserOwner = members.some(
    m => m.user_id === user?.id && m.role === 'owner'
  );
  
  const isUserAdmin = members.some(
    m => m.user_id === user?.id && (m.role === 'owner' || m.role === 'admin')
  );
  
  // Don't show team page to contractors
  if (accountType === 'contractor') {
    return (
      <div className="container max-w-screen-xl py-6">
        <div className="text-center py-8">
          <h1 className="text-2xl font-bold mb-4">Access Restricted</h1>
          <p className="text-muted-foreground">
            You don't have permission to access team settings.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="container max-w-screen-xl py-6">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Team Members</h1>
          <p className="text-muted-foreground mt-2">
            Invite your business partner or team members to access all data as admins.
          </p>
        </div>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="max-w-4xl">
          <Tabs defaultValue="members">
            <TabsList className="mb-4">
              <TabsTrigger value="members">Team Members</TabsTrigger>
              <TabsTrigger value="invitations">Pending Invitations</TabsTrigger>
            </TabsList>
            
            <TabsContent value="members">
              <Card>
                <CardHeader>
                  <CardTitle className="flex justify-between items-center">
                    <span>Team Members</span>
                    {isUserAdmin && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button size="sm">
                            <UserPlus className="h-4 w-4 mr-2" />
                            Invite Admin
                          </Button>
                        </DialogTrigger>
                        <DialogContent>
                          <DialogHeader>
                            <DialogTitle>Invite Team Member</DialogTitle>
                            <DialogDescription>
                              Invite your business partner or team member with full admin access to all data.
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <label htmlFor="email" className="block text-sm font-medium mb-1">
                                Email Address
                              </label>
                              <Input 
                                id="email"
                                type="email"
                                placeholder="partner@example.com"
                                value={inviteEmail}
                                onChange={(e) => setInviteEmail(e.target.value)}
                              />
                            </div>
                            <div>
                              <label htmlFor="role" className="block text-sm font-medium mb-1">
                                Access Level
                              </label>
                              <select
                                id="role"
                                className="w-full rounded-md border border-input bg-transparent px-3 py-2"
                                value={inviteRole}
                                onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                              >
                                <option value="admin">Admin (Full Access)</option>
                                <option value="member">Member (Limited Access)</option>
                              </select>
                              <p className="text-xs text-muted-foreground mt-1">
                                Admins have full access to all data and can manage team members.
                              </p>
                            </div>
                          </div>
                          <DialogFooter>
                            <Button disabled={isInvitingMember} onClick={handleInviteMember}>
                              {isInvitingMember ? "Sending..." : "Send Invitation"}
                            </Button>
                          </DialogFooter>
                        </DialogContent>
                      </Dialog>
                    )}
                  </CardTitle>
                  <CardDescription>
                    All team members with access to your data.
                  </CardDescription>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Search members..."
                      className="pl-9"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {filteredMembers.map(member => {
                      const isCurrentUser = member.user_id === user?.id;
                      const canManage = isUserOwner || 
                        (isUserAdmin && member.role !== 'owner');
                      const canBeManaged = !isCurrentUser || 
                        (isCurrentUser && isUserOwner && members.filter(m => m.role === 'owner').length > 1);
                      
                      return (
                        <div key={member.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div className="flex items-center space-x-3">
                            <div className="bg-secondary h-10 w-10 rounded-full flex items-center justify-center text-secondary-foreground">
                              {member.user_name 
                                ? member.user_name.substring(0, 2).toUpperCase() 
                                : member.user_email 
                                  ? member.user_email.substring(0, 2).toUpperCase()
                                  : 'U'}
                            </div>
                            <div>
                              <p className="font-medium">
                                {member.user_email || member.user_id.substring(0, 8)}
                                {isCurrentUser && " (You)"}
                              </p>
                              <div className="flex space-x-2 items-center">
                                <Badge variant={member.role === 'owner' ? 'default' : member.role === 'admin' ? 'outline' : 'secondary'}>
                                  {member.role}
                                </Badge>
                              </div>
                            </div>
                          </div>
                          
                          {canManage && canBeManaged && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                {member.role !== 'owner' && (
                                  <>
                                    <DropdownMenuItem 
                                      onClick={() => updateMemberRole(member.id, member.role === 'admin' ? 'member' : 'admin')}
                                    >
                                      {member.role === 'admin' ? (
                                        <>
                                          <LogOut className="mr-2 h-4 w-4" />
                                          Change to Member
                                        </>
                                      ) : (
                                        <>
                                          <Edit className="mr-2 h-4 w-4" />
                                          Make Admin
                                        </>
                                      )}
                                    </DropdownMenuItem>
                                    <DropdownMenuItem
                                      onClick={() => {
                                        if (confirm(`Are you sure you want to remove this member from the team?`)) {
                                          removeMember(member.id);
                                        }
                                      }}
                                      className="text-destructive"
                                    >
                                      <Trash className="mr-2 h-4 w-4" />
                                      Remove from team
                                    </DropdownMenuItem>
                                  </>
                                )}
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      );
                    })}
                    
                    {filteredMembers.length === 0 && (
                      <div className="text-center py-8">
                        {searchQuery ? (
                          <p className="text-muted-foreground">No members match your search</p>
                        ) : (
                          <p className="text-muted-foreground">No team members found</p>
                        )}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="invitations">
              <Card>
                <CardHeader>
                  <CardTitle>Pending Invitations</CardTitle>
                  <CardDescription>
                    Manage pending invitations to your team.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {invitations.length > 0 ? (
                      invitations.map(invitation => (
                        <div key={invitation.id} className="flex items-center justify-between border-b pb-3 last:border-0">
                          <div>
                            <p className="font-medium">{invitation.email}</p>
                            <div className="flex space-x-2 items-center">
                              <Badge variant={invitation.role === 'admin' ? 'outline' : 'secondary'}>
                                {invitation.role}
                              </Badge>
                              <p className="text-xs text-muted-foreground">
                                Expires: {new Date(invitation.expires_at).toLocaleString()}
                              </p>
                            </div>
                          </div>
                          
                          {isUserAdmin && (
                            <div className="flex space-x-2">
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-2"
                                onClick={() => {
                                  toast.success(`Invitation resent to ${invitation.email}`);
                                }}
                              >
                                <Check className="h-4 w-4" />
                                <span className="sr-only">Resend</span>
                              </Button>
                              <Button 
                                size="sm" 
                                variant="outline"
                                className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                onClick={() => cancelInvitation(invitation.id)}
                              >
                                <X className="h-4 w-4" />
                                <span className="sr-only">Cancel</span>
                              </Button>
                            </div>
                          )}
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-8">
                        <p className="text-muted-foreground">No pending invitations</p>
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      )}
    </div>
  );
};

export default TeamPage;
