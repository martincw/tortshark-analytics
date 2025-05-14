
import { Button } from "@/components/ui/button";
import { Inbox } from "lucide-react";

interface EmptyStateProps {
  open: boolean;
  setOpen: (open: boolean) => void;
}

export const EmptyState = ({ open, setOpen }: EmptyStateProps) => {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center p-6 border border-dashed rounded-lg bg-background">
      <Inbox className="w-12 h-12 mb-4 text-muted-foreground" />
      <h2 className="text-xl font-semibold mb-2">No campaigns found</h2>
      <p className="text-muted-foreground mb-4">
        Get started by adding your first campaign.
      </p>
      <Button onClick={() => setOpen(true)}>Add Campaign</Button>
    </div>
  );
};
