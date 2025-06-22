
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { UserPlus } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface CreateContractorDialogProps {
  onContractorCreated: () => void;
}

export const CreateContractorDialog: React.FC<CreateContractorDialogProps> = ({ onContractorCreated }) => {
  const { currentWorkspace } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const handleCreateContractor = async () => {
    if (!currentWorkspace) {
      toast.error("No workspace selected");
      return;
    }

    if (!email || !password) {
      toast.error("Please fill in all fields");
      return;
    }

    if (password !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    if (password.length < 6) {
      toast.error("Password must be at least 6 characters");
      return;
    }

    setIsCreating(true);

    try {
      // Create the user account
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: `${window.location.origin}/daily-stats`,
          data: {
            account_type: 'contractor'
          }
        }
      });

      if (authError) {
        throw authError;
      }

      if (!authData.user) {
        throw new Error("Failed to create user account");
      }

      // Add the user as a contractor to the current workspace
      const { error: memberError } = await supabase
        .from('workspace_members')
        .insert({
          workspace_id: currentWorkspace.id,
          user_id: authData.user.id,
          role: 'member',
          account_type: 'contractor'
        });

      if (memberError) {
        throw memberError;
      }

      toast.success(`Contractor account created successfully for ${email}`);
      setEmail("");
      setPassword("");
      setConfirmPassword("");
      setIsOpen(false);
      onContractorCreated();

      // Show login credentials to admin
      toast.info(`Login credentials: Email: ${email}, Password: ${password}`, {
        duration: 10000,
      });

    } catch (error) {
      console.error("Error creating contractor:", error);
      toast.error("Failed to create contractor account: " + (error as Error).message);
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm">
          <UserPlus className="h-4 w-4 mr-2" />
          Create Contractor
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Contractor Account</DialogTitle>
          <DialogDescription>
            Create a contractor account that can only access the Daily Stats page.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="contractor-email">Email Address</Label>
            <Input
              id="contractor-email"
              type="email"
              placeholder="contractor@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="contractor-password">Password</Label>
            <Input
              id="contractor-password"
              type="password"
              placeholder="Enter password (min 6 characters)"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          
          <div>
            <Label htmlFor="contractor-confirm-password">Confirm Password</Label>
            <Input
              id="contractor-confirm-password"
              type="password"
              placeholder="Confirm password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
            />
          </div>
          
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="font-medium mb-1">Contractor Access:</p>
            <ul className="text-muted-foreground space-y-1">
              <li>• Can only access the Daily Stats page</li>
              <li>• Cannot view other pages or navigation</li>
              <li>• Can enter and update campaign statistics</li>
              <li>• Cannot manage teams or settings</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setIsOpen(false)}>
            Cancel
          </Button>
          <Button onClick={handleCreateContractor} disabled={isCreating}>
            {isCreating ? "Creating..." : "Create Contractor"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
