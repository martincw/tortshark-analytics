
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BuyerStack } from "@/components/buyers/BuyerStack";

interface BuyerStackSectionProps {
  campaignId?: string;
}

export const BuyerStackSection = ({ campaignId }: BuyerStackSectionProps) => {
  if (!campaignId) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Buyer Stack</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            You need to save the campaign first before you can add buyers to the stack.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Buyer Stack</CardTitle>
      </CardHeader>
      <CardContent>
        <BuyerStack campaignId={campaignId} />
      </CardContent>
    </Card>
  );
};
