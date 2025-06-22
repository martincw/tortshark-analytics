
import React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Trash2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { toast } from "sonner";

interface Contractor {
  id: string;
  user_id: string;
  user_email?: string;
  created_at: string;
}

interface ContractorListProps {
  contractors: Contractor[];
  onContractorRemoved: () => void;
}

export const ContractorList: React.FC<ContractorListProps> = ({ contractors, onContractorRemoved }) => {
  const { currentWorkspace } = useWorkspace();

  const handleRemoveContractor = async (contractorId: string, email?: string) => {
    if (!confirm(`Are you sure you want to remove contractor ${email || 'this user'}?`)) {
      return;
    }

    try {
      const { error } = await supabase
        .from('workspace_members')
        .delete()
        .eq('id', contractorId);

      if (error) {
        throw error;
      }

      toast.success("Contractor removed successfully");
      onContractorRemoved();
    } catch (error) {
      console.error("Error removing contractor:", error);
      toast.error("Failed to remove contractor");
    }
  };

  if (contractors.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Contractors</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <p className="text-muted-foreground">No contractors found</p>
            <p className="text-sm text-muted-foreground mt-1">
              Create contractor accounts to allow limited access to Daily Stats only
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Contractors ({contractors.length})</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {contractors.map((contractor) => (
            <div key={contractor.id} className="flex items-center justify-between border-b pb-3 last:border-0">
              <div className="flex items-center space-x-3">
                <div className="bg-orange-100 h-10 w-10 rounded-full flex items-center justify-center text-orange-700">
                  {contractor.user_email 
                    ? contractor.user_email.substring(0, 2).toUpperCase() 
                    : 'C'}
                </div>
                <div>
                  <p className="font-medium">
                    {contractor.user_email || contractor.user_id.substring(0, 8)}
                  </p>
                  <div className="flex space-x-2 items-center">
                    <Badge variant="outline" className="bg-orange-50 text-orange-700 border-orange-200">
                      Contractor
                    </Badge>
                    <p className="text-xs text-muted-foreground">
                      Created: {new Date(contractor.created_at).toLocaleDateString()}
                    </p>
                  </div>
                </div>
              </div>
              
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                onClick={() => handleRemoveContractor(contractor.id, contractor.user_email)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
};
