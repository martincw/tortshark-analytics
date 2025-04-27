
import { CaseBuyer } from "@/types/campaign";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, Trash } from "lucide-react";

interface BuyerCardProps {
  buyer: CaseBuyer;
  onDelete: (id: string) => Promise<void>;
}

export const BuyerCard = ({ buyer, onDelete }: BuyerCardProps) => {
  const hasValidUrl = buyer.url && buyer.url !== "#" && buyer.url !== "";
  
  return (
    <Card className="w-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">{buyer.name}</CardTitle>
        <div className="flex gap-2">
          {hasValidUrl && (
            <Button
              variant="outline"
              size="icon"
              asChild
            >
              <a href={buyer.url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-4 w-4" />
              </a>
            </Button>
          )}
          <Button
            variant="outline"
            size="icon"
            onClick={() => onDelete(buyer.id)}
          >
            <Trash className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {hasValidUrl ? (
          <p className="text-sm text-muted-foreground truncate">{buyer.url}</p>
        ) : (
          <p className="text-sm text-muted-foreground italic">No URL provided</p>
        )}
      </CardContent>
    </Card>
  );
};
