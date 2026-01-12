import React, { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, History, Trash2, Pencil, Calendar, Tag } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface ChangelogEntry {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  change_type: "ad_creative" | "targeting";
  title: string;
  description: string | null;
  change_date: string;
  created_at: string;
}

const CHANGE_TYPE_OPTIONS = [
  { value: "ad_creative", label: "Ad/Creative Change", color: "bg-blue-500" },
  { value: "targeting", label: "Targeting Change", color: "bg-purple-500" },
];

const CampaignChangelog: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { campaigns } = useCampaign();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);

  // Sort campaigns alphabetically
  const sortedCampaigns = [...campaigns].sort((a, b) => a.name.localeCompare(b.name));

  // Form state
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formChangeType, setFormChangeType] = useState<"ad_creative" | "targeting">("ad_creative");
  const [formTitle, setFormTitle] = useState("");
  const [formDescription, setFormDescription] = useState("");
  const [formChangeDate, setFormChangeDate] = useState(format(new Date(), "yyyy-MM-dd"));

  const fetchEntries = async () => {
    if (!currentWorkspace?.id) return;
    
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("campaign_changelog")
        .select("*")
        .eq("workspace_id", currentWorkspace.id)
        .order("change_date", { ascending: false });

      if (error) throw error;
      
      // Map campaign names
      const entriesWithNames = (data || []).map(entry => ({
        ...entry,
        change_type: entry.change_type as "ad_creative" | "targeting",
        campaign_name: campaigns.find(c => c.id === entry.campaign_id)?.name || "Unknown Campaign"
      }));
      
      setEntries(entriesWithNames);
    } catch (error) {
      console.error("Error fetching changelog:", error);
      toast.error("Failed to load changelog");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchEntries();
  }, [currentWorkspace?.id, campaigns]);

  const resetForm = () => {
    setFormCampaignId("");
    setFormChangeType("ad_creative");
    setFormTitle("");
    setFormDescription("");
    setFormChangeDate(format(new Date(), "yyyy-MM-dd"));
    setEditingEntry(null);
  };

  const handleOpenDialog = (entry?: ChangelogEntry) => {
    if (entry) {
      setEditingEntry(entry);
      setFormCampaignId(entry.campaign_id);
      setFormChangeType(entry.change_type);
      setFormTitle(entry.title);
      setFormDescription(entry.description || "");
      setFormChangeDate(entry.change_date);
    } else {
      resetForm();
    }
    setIsDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!currentWorkspace?.id || !formCampaignId || !formTitle.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    try {
      if (editingEntry) {
        const { error } = await supabase
          .from("campaign_changelog")
          .update({
            campaign_id: formCampaignId,
            change_type: formChangeType,
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            change_date: formChangeDate,
          })
          .eq("id", editingEntry.id);

        if (error) throw error;
        toast.success("Change updated");
      } else {
        const { error } = await supabase
          .from("campaign_changelog")
          .insert({
            workspace_id: currentWorkspace.id,
            campaign_id: formCampaignId,
            change_type: formChangeType,
            title: formTitle.trim(),
            description: formDescription.trim() || null,
            change_date: formChangeDate,
          });

        if (error) throw error;
        toast.success("Change logged");
      }

      setIsDialogOpen(false);
      resetForm();
      fetchEntries();
    } catch (error) {
      console.error("Error saving changelog entry:", error);
      toast.error("Failed to save change");
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("campaign_changelog")
        .delete()
        .eq("id", id);

      if (error) throw error;
      toast.success("Change deleted");
      fetchEntries();
    } catch (error) {
      console.error("Error deleting changelog entry:", error);
      toast.error("Failed to delete change");
    }
  };

  const getChangeTypeBadge = (type: string) => {
    const option = CHANGE_TYPE_OPTIONS.find(o => o.value === type);
    return (
      <Badge variant="secondary" className={`${option?.color || "bg-gray-500"} text-white`}>
        {option?.label || type}
      </Badge>
    );
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-primary/10 rounded-lg">
            <History className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle>Campaign Changelog</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              Track ad/creative and targeting changes to analyze their impact
            </p>
          </div>
        </div>
        
        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={() => handleOpenDialog()} className="gap-2">
              <Plus className="h-4 w-4" />
              Log Change
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Change" : "Log a Change"}</DialogTitle>
            </DialogHeader>
            
            <div className="space-y-4 py-4">
              <div>
                <Label htmlFor="campaign">Campaign *</Label>
              <Select value={formCampaignId} onValueChange={setFormCampaignId}>
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select campaign" />
                  </SelectTrigger>
                  <SelectContent>
                    {sortedCampaigns.map(campaign => (
                      <SelectItem key={campaign.id} value={campaign.id}>
                        {campaign.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="change-type">Change Type *</Label>
                <Select value={formChangeType} onValueChange={(v) => setFormChangeType(v as "ad_creative" | "targeting")}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CHANGE_TYPE_OPTIONS.map(option => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <Label htmlFor="change-date">Change Date *</Label>
                <Input
                  id="change-date"
                  type="date"
                  value={formChangeDate}
                  onChange={(e) => setFormChangeDate(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="title">What Changed? *</Label>
                <Input
                  id="title"
                  placeholder="e.g., New video ad creative, Updated geo targeting"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  className="mt-1"
                />
              </div>
              
              <div>
                <Label htmlFor="description">Details (optional)</Label>
                <Textarea
                  id="description"
                  placeholder="Additional context about the change..."
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  className="mt-1"
                  rows={3}
                />
              </div>
            </div>
            
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="outline">Cancel</Button>
              </DialogClose>
              <Button onClick={handleSubmit}>
                {editingEntry ? "Update" : "Log Change"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      
      <CardContent>
        {isLoading ? (
          <div className="text-center py-8 text-muted-foreground">Loading changelog...</div>
        ) : entries.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <History className="h-12 w-12 mx-auto mb-3 opacity-20" />
            <p>No changes logged yet</p>
            <p className="text-sm mt-1">Click "Log Change" to track ad/creative or targeting changes</p>
          </div>
        ) : (
          <ScrollArea className="h-[300px]">
            <div className="space-y-3">
              {entries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                      {getChangeTypeBadge(entry.change_type)}
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(entry.change_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="font-medium truncate">{entry.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Tag className="h-3 w-3" />
                      {entry.campaign_name}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => handleOpenDialog(entry)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        )}
      </CardContent>
    </Card>
  );
};

export default CampaignChangelog;
