
import { useState, useEffect } from "react";
import { CaseBuyer, BuyerTortCoverage } from "@/types/campaign";
import { 
  Card, 
  CardContent, 
  CardFooter, 
  CardHeader, 
  CardTitle 
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { 
  Building, 
  Globe, 
  Mail, 
  User, 
  Trash2, 
  PencilLine, 
  ListChecks, 
  ExternalLink,
  ChevronRight,
  Shield,
  DollarSign,
  BadgeDollarSign,
  Info
} from "lucide-react";
import { useBuyers } from "@/hooks/useBuyers";
import { toast } from "sonner";
import { BuyerEditDialog } from "./BuyerEditDialog";
import { StatCard } from "@/components/ui/stat-card";
import { BadgeDelta } from "@/components/ui/badge-delta";
import { formatCurrency } from "@/utils/campaignUtils";

interface BuyerCardProps {
  buyer: CaseBuyer;
  onViewCoverage: () => void;
}

export function BuyerCard({ buyer, onViewCoverage }: BuyerCardProps) {
  const { deleteBuyer, getBuyerTortCoverage } = useBuyers();
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [coverages, setCoverages] = useState<BuyerTortCoverage[]>([]);
  const [isLoadingCoverage, setIsLoadingCoverage] = useState(false);
  const [expandedView, setExpandedView] = useState(false);
  
  useEffect(() => {
    // Load coverage data when component mounts
    fetchCoverageData();
  }, [buyer.id]);

  const fetchCoverageData = async () => {
    setIsLoadingCoverage(true);
    try {
      const coverageData = await getBuyerTortCoverage(buyer.id);
      
      // Transform the data to match the BuyerTortCoverage interface
      const formattedCoverages: BuyerTortCoverage[] = coverageData.map(item => ({
        id: item.id,
        buyer_id: buyer.id,  // Use the current buyer's ID
        campaign_id: item.campaigns?.id || '',
        payout_amount: item.payout_amount,
        campaigns: item.campaigns
      }));
      
      setCoverages(formattedCoverages);
    } catch (error) {
      console.error("Error fetching buyer coverage:", error);
    } finally {
      setIsLoadingCoverage(false);
    }
  };

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

  // Calculate coverage statistics
  const totalPayoutAmount = coverages.reduce((sum, coverage) => sum + coverage.payout_amount, 0);
  const averagePayoutAmount = coverages.length > 0 ? totalPayoutAmount / coverages.length : 0;
  const highestPayout = coverages.length > 0 ? 
    Math.max(...coverages.map(coverage => coverage.payout_amount)) : 0;

  return (
    <Card className={`overflow-hidden transition-all hover:shadow-md ${expandedView ? 'col-span-2' : ''}`}>
      <CardHeader className="pb-2 relative">
        <div className="flex items-start justify-between">
          <div className="flex flex-col">
            <CardTitle className="text-lg font-semibold truncate">
              {buyer.name}
            </CardTitle>
            {buyer.platform && (
              <div className="flex mt-1">
                <Badge variant="outline" className="text-xs">
                  {buyer.platform}
                </Badge>
              </div>
            )}
          </div>
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={() => setExpandedView(!expandedView)}
            >
              <Info className="h-4 w-4" />
              <span className="sr-only">{expandedView ? 'Collapse' : 'Expand'}</span>
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-4 w-4">
                    <path d="M3.625 7.5C3.625 8.12132 3.12132 8.625 2.5 8.625C1.87868 8.625 1.375 8.12132 1.375 7.5C1.375 6.87868 1.87868 6.375 2.5 6.375C3.12132 6.375 3.625 6.87868 3.625 7.5ZM8.625 7.5C8.625 8.12132 8.12132 8.625 7.5 8.625C6.87868 8.625 6.375 8.12132 6.375 7.5C6.375 6.87868 6.87868 6.375 7.5 6.375C8.12132 6.375 8.625 6.87868 8.625 7.5ZM13.625 7.5C13.625 8.12132 13.1213 8.625 12.5 8.625C11.8787 8.625 11.375 8.12132 11.375 7.5C11.375 6.87868 11.8787 6.375 12.5 6.375C13.1213 6.375 13.625 6.87868 13.625 7.5Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd"></path>
                  </svg>
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
                  Manage Tort Coverage
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
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        <div className="space-y-4">
          {/* Contact Information */}
          <div className="space-y-2">
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
          </div>

          {/* Coverage Stats */}
          {!isLoadingCoverage && (
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium flex items-center gap-1.5">
                  <Shield className="h-3.5 w-3.5 text-primary" />
                  Coverage Summary
                </h4>
                <Badge variant="outline" className="text-xs font-normal">
                  {coverages.length} tort{coverages.length !== 1 ? 's' : ''}
                </Badge>
              </div>
              
              {coverages.length > 0 ? (
                <div className="grid grid-cols-2 gap-2">
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Avg. Payout</span>
                    <span className="font-semibold text-sm">
                      {formatCurrency(averagePayoutAmount)}
                    </span>
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-muted-foreground">Total Value</span>
                    <span className="font-semibold text-sm">
                      {formatCurrency(totalPayoutAmount)}
                    </span>
                  </div>
                </div>
              ) : (
                <p className="text-xs text-muted-foreground italic">
                  No tort coverage added yet
                </p>
              )}
              
              {/* Coverage Preview (in expanded view) */}
              {expandedView && coverages.length > 0 && (
                <div className="mt-2 space-y-2">
                  <h5 className="text-xs font-medium text-muted-foreground">
                    Tort Coverage Details
                  </h5>
                  <div className="grid gap-1">
                    {coverages.slice(0, 3).map((coverage) => (
                      <div 
                        key={coverage.id}
                        className="flex items-center justify-between p-1.5 bg-muted/30 rounded text-xs"
                      >
                        <span className="truncate max-w-[150px]">
                          {coverage.campaigns?.name || "Unknown Campaign"}
                        </span>
                        <div className="flex items-center">
                          <BadgeDollarSign className="h-3 w-3 text-primary mr-1" />
                          <span className="font-semibold">
                            {formatCurrency(coverage.payout_amount)}
                          </span>
                        </div>
                      </div>
                    ))}
                    {coverages.length > 3 && (
                      <div className="text-xs text-center text-muted-foreground">
                        + {coverages.length - 3} more torts
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Additional expanded view content */}
          {expandedView && (
            <div className="space-y-3 pt-2 border-t">
              {/* Notes Section */}
              {buyer.notes && (
                <div className="space-y-1">
                  <h4 className="text-sm font-medium">Notes</h4>
                  <p className="text-sm text-muted-foreground whitespace-pre-line">{buyer.notes}</p>
                </div>
              )}
              
              {/* Payout highlight */}
              {highestPayout > 0 && (
                <div className="flex items-center justify-between p-2 bg-primary/10 rounded-md">
                  <span className="text-sm font-medium">Highest Payout</span>
                  <div className="flex items-center">
                    <BadgeDollarSign className="h-4 w-4 text-primary mr-1" />
                    <span className="font-semibold">{formatCurrency(highestPayout)}</span>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      </CardContent>
      
      <CardFooter className="pt-0 flex justify-end gap-2">
        <Button
          variant="outline"
          size="sm"
          className="text-xs"
          onClick={onViewCoverage}
        >
          <Shield className="mr-1 h-3 w-3" />
          Coverage
        </Button>
        
        <Button
          variant="default"
          size="sm"
          className="text-xs"
          onClick={() => setShowEditDialog(true)}
        >
          <PencilLine className="mr-1 h-3 w-3" />
          Edit
        </Button>
      </CardFooter>

      {showEditDialog && (
        <BuyerEditDialog 
          buyer={buyer} 
          isOpen={showEditDialog}
          onClose={() => {
            setShowEditDialog(false);
            // Refresh coverage data when edit dialog closes
            fetchCoverageData();
          }}
        />
      )}
    </Card>
  );
}
