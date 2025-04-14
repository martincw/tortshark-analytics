import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Campaign } from "@/types/campaign";
import {
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import { useCampaign } from "@/contexts/CampaignContext";
import { format } from 'date-fns';
import { Calendar } from "@/components/ui/calendar";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { CalendarIcon } from "lucide-react";

interface BulkStatsFormProps {
  children: React.ReactNode;
}

export function BulkStatsForm({ children }: BulkStatsFormProps) {
  const [open, setOpen] = useState(false);
  const [leads, setLeads] = useState("");
  const [cases, setCases] = useState("");
  const [retainers, setRetainers] = useState("");
  const [revenue, setRevenue] = useState("");
  const [selectedCampaigns, setSelectedCampaigns] = useState<string[]>([]);
  const [date, setDate] = React.useState<Date>();
  const { toast } = useToast();
  const { campaigns, updateCampaign } = useCampaign();

  const handleCheckboxChange = (campaignId: string) => {
    setSelectedCampaigns((prevSelected) =>
      prevSelected.includes(campaignId)
        ? prevSelected.filter((id) => id !== campaignId)
        : [...prevSelected, campaignId]
    );
  };

  const handleSubmit = async () => {
    if (selectedCampaigns.length === 0) {
      toast({
        title: "Error",
        description: "Please select at least one campaign.",
        variant: "destructive",
      });
      return;
    }

    const leadsValue = parseInt(leads, 10) || 0;
    const casesValue = parseInt(cases, 10) || 0;
    const retainersValue = parseInt(retainers, 10) || 0;
    const revenueValue = parseFloat(revenue) || 0;

    if (isNaN(leadsValue) || isNaN(casesValue) || isNaN(retainersValue) || isNaN(revenueValue)) {
      toast({
        title: "Error",
        description: "Please enter valid numeric values for all fields.",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Error",
        description: "Please select a date.",
        variant: "destructive",
      });
      return;
    }

    const isoDate = date.toISOString();

    selectedCampaigns.forEach(async (campaignId) => {
      const campaignToUpdate = campaigns.find((campaign) => campaign.id === campaignId);

      if (campaignToUpdate) {
        const updatedManualStats = {
          ...campaignToUpdate.manualStats,
          leads: (campaignToUpdate.manualStats.leads || 0) + leadsValue,
          cases: (campaignToUpdate.manualStats.cases || 0) + casesValue,
          retainers: (campaignToUpdate.manualStats.retainers || 0) + retainersValue,
          revenue: (campaignToUpdate.manualStats.revenue || 0) + revenueValue,
          history: [
            ...(campaignToUpdate.manualStats.history || []),
            {
              date: isoDate,
              leads: leadsValue,
              cases: casesValue,
              retainers: retainersValue,
              revenue: revenueValue,
            },
          ],
        };

        await updateCampaign({
          ...campaignToUpdate,
          manualStats: updatedManualStats,
        });
      }
    });

    toast({
      title: "Success",
      description: "Campaigns updated successfully.",
    });
    setOpen(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[825px]">
        <DialogHeader>
          <DialogTitle>Update Campaign Stats</DialogTitle>
          <DialogDescription>
            Add leads, cases, retainers, and revenue to selected campaigns.
          </DialogDescription>
        </DialogHeader>
        <div className="grid gap-4 py-4">
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="leads" className="text-right">
              Leads
            </Label>
            <Input
              type="number"
              id="leads"
              value={leads}
              onChange={(e) => setLeads(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="cases" className="text-right">
              Cases
            </Label>
            <Input
              type="number"
              id="cases"
              value={cases}
              onChange={(e) => setCases(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="retainers" className="text-right">
              Retainers
            </Label>
            <Input
              type="number"
              id="retainers"
              value={retainers}
              onChange={(e) => setRetainers(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="revenue" className="text-right">
              Revenue
            </Label>
            <Input
              type="number"
              id="revenue"
              value={revenue}
              onChange={(e) => setRevenue(e.target.value)}
              className="col-span-3"
            />
          </div>
          <div className="grid grid-cols-4 items-center gap-4">
            <Label htmlFor="date" className="text-right">
              Date
            </Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  variant={"outline"}
                  className={cn(
                    "w-[240px] justify-start text-left font-normal",
                    !date && "text-muted-foreground"
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {date ? format(date, "PPP") : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={setDate}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="relative overflow-x-auto shadow-md sm:rounded-lg">
          <Table>
            <TableCaption>Select campaigns to update.</TableCaption>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">Select</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {campaigns.map((campaign) => (
                <TableRow key={campaign.id}>
                  <TableCell className="font-medium">
                    <Checkbox
                      id={campaign.id}
                      checked={selectedCampaigns.includes(campaign.id)}
                      onCheckedChange={() => handleCheckboxChange(campaign.id)}
                      selected={selectedCampaigns.includes(campaign.id) === true}
                    />
                  </TableCell>
                  <TableCell>
                    <Label htmlFor={campaign.id}>{campaign.name}</Label>
                  </TableCell>
                  <TableCell>{campaign.accountName}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <Button type="submit" onClick={handleSubmit}>
          Update Campaigns
        </Button>
      </DialogContent>
    </Dialog>
  );
}
