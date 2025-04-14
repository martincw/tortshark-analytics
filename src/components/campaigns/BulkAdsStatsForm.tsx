import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign } from "@/types/campaign";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ScrollArea } from "@/components/ui/scroll-area";

const formSchema = z.object({
  leads: z.number().optional(),
  cases: z.number().optional(),
  retainers: z.number().optional(),
  revenue: z.number().optional(),
  campaignType: z.string().optional(),
});

interface BulkAdsStatsFormProps {
  children: React.ReactNode;
}

export function BulkAdsStatsForm({ children }: BulkAdsStatsFormProps) {
  const { toast } = useToast();
  const { campaigns, updateCampaign, campaignTypes } = useCampaign();
  const [open, setOpen] = React.useState(false);
  const [selectedCampaigns, setSelectedCampaigns] = React.useState<string[]>([]);

  const form = useForm<z.infer<typeof formSchema>>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      leads: undefined,
      cases: undefined,
      retainers: undefined,
      revenue: undefined,
      campaignType: undefined,
    },
  });

  function onSubmit(values: z.infer<typeof formSchema>) {
    const updates = {
      manualStats: {
        leads: values.leads,
        cases: values.cases,
        retainers: values.retainers,
        revenue: values.revenue,
      },
      campaignType: values.campaignType,
    };

    selectedCampaigns.forEach((campaignId) => {
      const campaign = campaigns.find((c) => c.id === campaignId);
      if (campaign) {
        const updatedCampaign = {
          ...campaign,
          manualStats: {
            leads: values.leads !== undefined ? values.leads : campaign.manualStats.leads,
            cases: values.cases !== undefined ? values.cases : campaign.manualStats.cases,
            retainers: values.retainers !== undefined ? values.retainers : campaign.manualStats.retainers,
            revenue: values.revenue !== undefined ? values.revenue : campaign.manualStats.revenue,
          },
          campaignType: values.campaignType || campaign.campaignType,
        };
        updateCampaign(updatedCampaign);
      }
    });

    toast({
      title: "Success",
      description: "Campaign stats updated successfully.",
    });
    setOpen(false);
  }

  const handleCampaignSelect = (campaignId: string) => {
    setSelectedCampaigns((prevSelected) =>
      prevSelected.includes(campaignId)
        ? prevSelected.filter((id) => id !== campaignId)
        : [...prevSelected, campaignId]
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="sm:max-w-[625px]">
        <DialogHeader>
          <DialogTitle>Update Stats in Bulk</DialogTitle>
          <DialogDescription>
            Update leads, cases, retainers, and revenue for multiple campaigns
            at once.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <FormField
                control={form.control}
                name="leads"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Leads</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Number of leads"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="cases"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Cases</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Number of cases"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="retainers"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Retainers</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Number of retainers"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="revenue"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Revenue</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Revenue amount"
                        {...field}
                        onChange={(e) =>
                          field.onChange(Number(e.target.value))
                        }
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <FormField
              control={form.control}
              name="campaignType"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Campaign Type</FormLabel>
                  <Select onValueChange={field.onChange} defaultValue={field.value}>
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="Select a campaign type" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {campaignTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-2">
              <FormLabel>Select Campaigns</FormLabel>
              <ScrollArea className="h-[200px] rounded-md border p-2">
                {campaigns.map((campaign) => (
                  <div key={campaign.id} className="flex items-center space-x-2">
                    <Checkbox
                      id={campaign.id}
                      checked={selectedCampaigns.includes(campaign.id)}
                      onCheckedChange={() => handleCampaignSelect(campaign.id)}
                      selected={selectedCampaigns.includes(campaign.id) === true}
                    />
                    <label
                      htmlFor={campaign.id}
                      className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
                    >
                      {campaign.name}
                    </label>
                  </div>
                ))}
              </ScrollArea>
            </div>

            <div className="flex justify-end">
              <Button type="submit">Update Stats</Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
