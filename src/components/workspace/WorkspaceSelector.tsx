
import React, { useState } from "react";
import { Check, ChevronDown, PlusCircle, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { useNavigate } from "react-router-dom";
import { Skeleton } from "@/components/ui/skeleton";

export const WorkspaceSelector = () => {
  const { currentWorkspace, workspaces, switchWorkspace, createWorkspace, isLoading } = useWorkspace();
  const [isCreating, setIsCreating] = useState(false);
  const [newWorkspaceName, setNewWorkspaceName] = useState("");
  const navigate = useNavigate();
  
  const handleCreateWorkspace = async () => {
    if (!newWorkspaceName.trim()) return;
    
    setIsCreating(true);
    const workspace = await createWorkspace(newWorkspaceName);
    setIsCreating(false);
    
    if (workspace) {
      setNewWorkspaceName("");
    }
  };
  
  if (isLoading) {
    return (
      <div className="flex items-center space-x-2">
        <Skeleton className="h-6 w-6 rounded-full" />
        <Skeleton className="h-4 w-24" />
      </div>
    );
  }
  
  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="ml-4 flex items-center gap-1">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="max-w-[120px] overflow-hidden text-ellipsis whitespace-nowrap">
              {currentWorkspace?.name || "No workspace"}
            </span>
            <ChevronDown className="h-3 w-3 text-muted-foreground ml-1" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="start" className="w-56">
          {workspaces.map(workspace => (
            <DropdownMenuItem
              key={workspace.id}
              onClick={() => switchWorkspace(workspace.id)}
              className="flex items-center justify-between"
            >
              <span className="max-w-[180px] overflow-hidden text-ellipsis whitespace-nowrap">
                {workspace.name}
              </span>
              {currentWorkspace?.id === workspace.id && (
                <Check className="h-4 w-4 ml-2" />
              )}
            </DropdownMenuItem>
          ))}
          
          {workspaces.length > 0 && <DropdownMenuSeparator />}
          
          <DropdownMenuItem
            onClick={() => navigate('/team-settings')}
          >
            <Users className="h-4 w-4 mr-2" />
            Team settings
          </DropdownMenuItem>
          
          <DropdownMenuItem
            onClick={() => setIsCreating(true)}
          >
            <PlusCircle className="h-4 w-4 mr-2" />
            New workspace
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
      
      <Dialog open={isCreating} onOpenChange={setIsCreating}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create new workspace</DialogTitle>
          </DialogHeader>
          <Input
            placeholder="Workspace name"
            value={newWorkspaceName}
            onChange={(e) => setNewWorkspaceName(e.target.value)}
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsCreating(false)}>Cancel</Button>
            <Button onClick={handleCreateWorkspace}>Create</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
};
