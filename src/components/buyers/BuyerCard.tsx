
import { useState } from "react";
import { CaseBuyer } from "@/types/campaign";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { 
  Building, 
  Globe, 
  Mail, 
  MoreVertical, 
  User, 
  Trash2, 
  PencilLine, 
  ListChecks, 
  ExternalLink 
} from "lucide-react";
import { useBuyers } from "@/hooks/useBuyers";
import { toast } from "sonner";
import { BuyerEditDialog } from "./BuyerEditDialog";

interface BuyerCardProps {
  buyer: CaseBuyer;
  onViewCoverage?: () => void;
}

export function BuyerCard({ buyer, onViewCoverage }: BuyerCardProps) {
  const { deleteBuyer } = useBuyers();
  const [showEditDialog, setShowEditDialog] = useState(false);
  
  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to delete ${buyer.name}?`)) {
      await deleteBuyer(buyer.id);
    }
  };

  const openWebsite = () => {
    if (!buyer.url) {
      toast.error("No website URL available");
      return;
    }

    let url = buyer.url;
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
      url = 'https://' + url;
    }
    window.open(url, '_blank');
  };

  return (
    <Card className="overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-lg font-semibold truncate">
            {buyer.name}
          </CardTitle>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8">
                <MoreVertical className="h-4 w-4" />
                <span className="sr-only">Open menu</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => setShowEditDialog(true)}>
                <PencilLine className="mr-2 h-4 w-4" />
                Edit Buyer
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onViewCoverage}>
                <ListChecks className="mr-2 h-4 w-4" />
                View Tort Coverage
              </DropdownMenuItem>
              {buyer.url && (
                <DropdownMenuItem onClick={openWebsite}>
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Visit Website
                </DropdownMenuItem>
              )}
              <DropdownMenuSeparator />
              <DropdownMenuItem 
                className="text-destructive focus:text-destructive"
                onClick={handleDelete}
              >
                <Trash2 className="mr-2 h-4 w-4" />
                Delete Buyer
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        {buyer.platform && (
          <div className="flex mt-1">
            <Badge variant="outline" className="text-xs">
              {buyer.platform}
            </Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="pb-3">
        <ul className="space-y-2 text-sm">
          {buyer.contact_name && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <User className="h-3.5 w-3.5" />
              <span className="truncate">{buyer.contact_name}</span>
            </li>
          )}
          {buyer.email && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-3.5 w-3.5" />
              <span className="truncate">{buyer.email}</span>
            </li>
          )}
          {buyer.url && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Globe className="h-3.5 w-3.5" />
              <span className="truncate">{buyer.url}</span>
            </li>
          )}
          {buyer.payout_terms && (
            <li className="flex items-center gap-2 text-muted-foreground">
              <Building className="h-3.5 w-3.5" />
              <span>{buyer.payout_terms}</span>
            </li>
          )}
        </ul>
        {buyer.notes && buyer.notes.length > 0 && (
          <div className="mt-3 pt-3 border-t text-sm">
            <p className="text-muted-foreground line-clamp-2">{buyer.notes}</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="pt-0 flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onViewCoverage}
        >
          <ListChecks className="mr-1 h-3 w-3" />
          Tort Coverage
        </Button>
      </CardFooter>

      {showEditDialog && (
        <BuyerEditDialog 
          buyer={buyer} 
          isOpen={showEditDialog}
          onClose={() => setShowEditDialog(false)}
        />
      )}
    </Card>
  );
}
