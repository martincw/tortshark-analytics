
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
  users as usersIcon, 
  plus, 
  search, 
  moreHorizontal, 
  userPlus, 
  edit, 
  trash, 
  check, 
  x,
  logOut
} from "lucide-react";

import { useWorkspace, Workspace, WorkspaceMember, WorkspaceInvitation } from "@/contexts/WorkspaceContext";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";

const TeamSettingsPage: React.FC = () => {
  const { 
    workspaces, 
    currentWorkspace, 
    members, 
    invitations, 
    isLoading,
    createWorkspace,
    switchWorkspace,
    updateWorkspace,
    deleteWorkspace,
    inviteMember,
    updateMemberRole,
    removeMember,
    cancelInvitation
  } = useWorkspace();
  const { user } = useAuth();
  
  const [isCreatingWorkspace, setIsCreatingWorkspace] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  
  const [isInvitingMember, setIsInvitingMember] = useState(false);
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<"admin" | "member">("member");
  
  const [searchQuery, setSearchQuery] = useState("");
  
  const [editingWorkspace, setEditingWorkspace] = useState<Workspace | null>(null);
  const [editWorkspaceName, setEditWorkspaceName] = useState("");
  
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) {
      toast.error("Please enter a workspace name");
      return;
    }
    
    setIsCreatingWorkspace(true);
    try {
      const workspace = await createWorkspace(newWorkspaceName.trim());
      if (workspace) {
        setNewWorkspaceName("");
        await switchWorkspace(workspace.id);
      }
    } finally {
      setIsCreatingWorkspace(false);
    }
  };
  
  const handleInviteMember = async () => {
    if (!inviteEmail.trim()) {
      toast.error("Please enter an email address");
      return;
    }
    
    setIsInvitingMember(true);
    try {
      await inviteMember(inviteEmail.trim(), inviteRole);
      setInviteEmail("");
      setInviteRole("member");
      
      // In a real app, you would send an email here
      toast.info("In a production app, an email would be sent to the invitee. For now, check the console for invitation details.");
    } finally {
      setIsInvitingMember(false);
    }
  };
  
  const handleUpdateWorkspace = async () => {
    if (editingWorkspace && editWorkspaceName.trim()) {
      await updateWorkspace(editingWorkspace.id, editWorkspaceName.trim());
      setEditingWorkspace(null);
    }
  };
  
  const handleDeleteWorkspace = async (workspace: Workspace) => {
    if (confirm(`Are you sure you want to delete "${workspace.name}"? This action cannot be undone.`)) {
      await deleteWorkspace(workspace.id);
    }
  };
  
  const filteredMembers = searchQuery 
    ? members.filter(m => 
        m.user_email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        m.user_name?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : members;
    
  const isUserWorkspaceOwner = currentWorkspace && members.some(
    m => m.user_id === user?.id && m.role === 'owner' && m.workspace_id === currentWorkspace.id
  );
  
  const isUserWorkspaceAdmin = currentWorkspace && members.some(
    m => m.user_id === user?.id && (m.role === 'owner' || m.role === 'admin') && m.workspace_id === currentWorkspace.id
  );
  
  return (
    <div className="container max-w-screen-xl py-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Team Settings</h1>
        <Dialog open={!!editingWorkspace} onOpenChange={(open) => !open && setEditingWorkspace(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Edit Workspace</DialogTitle>
              <DialogDescription>
                Update your workspace name.
              </DialogDescription>
            </DialogHeader>
            <Input 
              value={editWorkspaceName} 
              onChange={(e) => setEditWorkspaceName(e.target.value)}
              placeholder="Workspace name"
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => setEditingWorkspace(null)}>Cancel</Button>
              <Button onClick={handleUpdateWorkspace}>Save Changes</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
      
      {isLoading ? (
        <div className="flex justify-center p-8">
          <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full"></div>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-1">
            <Card>
              <CardHeader>
                <CardTitle className="flex justify-between items-center">
                  <span>Workspaces</span>
                  <Dialog>
                    <DialogTrigger asChild>
                      <Button size="sm" variant="outline">
                        <plus className="h-4 w-4 mr-1" />
                        New
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>Create New Workspace</DialogTitle>
                        <DialogDescription>
                          Create a new workspace to organize your campaigns and team members.
                        </DialogDescription>
                      </DialogHeader>
                      <Input 
                        value={newWorkspaceName} 
                        onChange={(e) => setNewWorkspaceName(e.target.value)}
                        placeholder="Workspace name"
                      />
                      <DialogFooter>
                        <Button disabled={isCreatingWorkspace} onClick={handleCreateWorkspace}>
                          {isCreatingWorkspace ? "Creating..." : "Create Workspace"}
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </CardTitle>
                <CardDescription>
                  Switch between workspaces or create a new one.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {workspaces.map(workspace => (
                    <div 
                      key={workspace.id} 
                      className={`flex justify-between items-center p-3 rounded-md ${
                        currentWorkspace?.id === workspace.id 
                          ? 'bg-primary/10 border border-primary/20' 
                          : 'hover:bg-muted cursor-pointer'
                      }`}
                      onClick={currentWorkspace?.id !== workspace.id ? () => switchWorkspace(workspace.id) : undefined}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="bg-primary/20 h-8 w-8 rounded-full flex items-center justify-center">
                          <usersIcon className="h-4 w-4 text-primary" />
                        </div>
                        <div>
                          <p className="font-medium">{workspace.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {currentWorkspace?.id === workspace.id ? 'Current workspace' : 'Click to switch'}
                          </p>
                        </div>
                      </div>
                      
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <moreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              setEditingWorkspace(workspace);
                              setEditWorkspaceName(workspace.name);
                            }}
                          >
                            <edit className="mr-2 h-4 w-4" />
                            Rename
                          </DropdownMenuItem>
                          
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDeleteWorkspace(workspace);
                            }}
                            className="text-destructive"
                          >
                            <trash className="mr-2 h-4 w-4" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  ))}

                  {workspaces.length === 0 && (
                    <div className="text-center p-4 border border-dashed rounded-md">
                      <p className="text-muted-foreground">No workspaces found</p>
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="mt-2"
                        onClick={() => document.querySelector<HTMLButtonElement>('[data-dialog-trigger="true"]')?.click()}
                      >
                        Create your first workspace
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          
          <div className="lg:col-span-2">
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
                      {isUserWorkspaceAdmin && (
                        <Dialog>
                          <DialogTrigger asChild>
                            <Button size="sm">
                              <userPlus className="h-4 w-4 mr-2" />
                              Invite
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Invite Team Member</DialogTitle>
                              <DialogDescription>
                                Invite a new user to join your workspace.
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
                                  placeholder="colleague@example.com"
                                  value={inviteEmail}
                                  onChange={(e) => setInviteEmail(e.target.value)}
                                />
                              </div>
                              <div>
                                <label htmlFor="role" className="block text-sm font-medium mb-1">
                                  Role
                                </label>
                                <select
                                  id="role"
                                  className="w-full rounded-md border border-input bg-transparent px-3 py-2"
                                  value={inviteRole}
                                  onChange={(e) => setInviteRole(e.target.value as "admin" | "member")}
                                >
                                  <option value="member">Member</option>
                                  <option value="admin">Admin</option>
                                </select>
                                <p className="text-xs text-muted-foreground mt-1">
                                  Admins can manage team members and workspace settings.
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
                      Manage members in your workspace.
                    </CardDescription>
                    <div className="relative">
                      <search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
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
                        // Determine if this is the current user
                        const isCurrentUser = member.user_id === user?.id;
                        
                        // Determine if the current user can manage this member
                        const canManage = isUserWorkspaceOwner || 
                          (isUserWorkspaceAdmin && member.role !== 'owner');
                          
                        // Can't manage yourself unless you're the owner
                        const canBeManaged = !isCurrentUser || 
                          (isCurrentUser && isUserWorkspaceOwner && members.filter(m => m.role === 'owner').length > 1);
                        
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
                                    <moreHorizontal className="h-4 w-4" />
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
                                            <logOut className="mr-2 h-4 w-4" />
                                            Change to Member
                                          </>
                                        ) : (
                                          <>
                                            <edit className="mr-2 h-4 w-4" />
                                            Make Admin
                                          </>
                                        )}
                                      </DropdownMenuItem>
                                      <DropdownMenuItem
                                        onClick={() => {
                                          if (confirm(`Are you sure you want to remove this member from the workspace?`)) {
                                            removeMember(member.id);
                                          }
                                        }}
                                        className="text-destructive"
                                      >
                                        <trash className="mr-2 h-4 w-4" />
                                        Remove from workspace
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
                            <p className="text-muted-foreground">No members in this workspace</p>
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
                      Manage invitations to your workspace.
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
                            
                            {isUserWorkspaceAdmin && (
                              <div className="flex space-x-2">
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 px-2"
                                  onClick={() => {
                                    // In a real app, this would re-send the invitation email
                                    toast.success(`Invitation resent to ${invitation.email}`);
                                  }}
                                >
                                  <check className="h-4 w-4" />
                                  <span className="sr-only">Resend</span>
                                </Button>
                                <Button 
                                  size="sm" 
                                  variant="outline"
                                  className="h-8 px-2 text-destructive hover:bg-destructive/10"
                                  onClick={() => cancelInvitation(invitation.id)}
                                >
                                  <x className="h-4 w-4" />
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
        </div>
      )}
    </div>
  );
};

export default TeamSettingsPage;
