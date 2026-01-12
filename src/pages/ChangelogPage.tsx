import React, { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, History, Trash2, Pencil, Calendar, Tag, Filter } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useWorkspace } from "@/contexts/WorkspaceContext";
import { useCampaign } from "@/contexts/CampaignContext";
import { toast } from "sonner";
import { format, parseISO } from "date-fns";

interface ChangelogEntry {
  id: string;
  campaign_id: string;
  campaign_name?: string;
  change_type: "ad_creative" | "targeting" | "spend_increase" | "spend_decrease";
  title: string;
  description: string | null;
  change_date: string;
  created_at: string;
}

const CHANGE_TYPE_OPTIONS = [
  { value: "ad_creative", label: "Ad/Creative Change", color: "bg-blue-500" },
  { value: "targeting", label: "Targeting Change", color: "bg-purple-500" },
  { value: "spend_increase", label: "Ad Spend Increase", color: "bg-green-500" },
  { value: "spend_decrease", label: "Ad Spend Decrease", color: "bg-red-500" },
];

const ChangelogPage: React.FC = () => {
  const { currentWorkspace } = useWorkspace();
  const { campaigns } = useCampaign();
  const [entries, setEntries] = useState<ChangelogEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState<ChangelogEntry | null>(null);
  
  // Filter state
  const [filterCampaignId, setFilterCampaignId] = useState<string>("all");
  const [filterChangeType, setFilterChangeType] = useState<string>("all");

  // Sort campaigns alphabetically
  const sortedCampaigns = useMemo(() => 
    [...campaigns].sort((a, b) => a.name.localeCompare(b.name)),
    [campaigns]
  );

  // Form state
  const [formCampaignId, setFormCampaignId] = useState("");
  const [formChangeType, setFormChangeType] = useState<"ad_creative" | "targeting" | "spend_increase" | "spend_decrease">("ad_creative");
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
        change_type: entry.change_type as "ad_creative" | "targeting" | "spend_increase" | "spend_decrease",
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

  // Filter entries
  const filteredEntries = useMemo(() => {
    return entries.filter(entry => {
      if (filterCampaignId !== "all" && entry.campaign_id !== filterCampaignId) return false;
      if (filterChangeType !== "all" && entry.change_type !== filterChangeType) return false;
      return true;
    });
  }, [entries, filterCampaignId, filterChangeType]);

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
    <div className="container mx-auto py-6 space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Campaign Changelog</h1>
          <p className="text-muted-foreground mt-1">
            Track ad/creative and targeting changes to analyze their impact on performance
          </p>
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
                <Select value={formChangeType} onValueChange={(v) => setFormChangeType(v as "ad_creative" | "targeting" | "spend_increase" | "spend_decrease")}>
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
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <CardTitle className="text-base">Filters</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-4">
            <div className="min-w-[200px]">
              <Label className="text-sm">Campaign</Label>
              <Select value={filterCampaignId} onValueChange={setFilterCampaignId}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Campaigns</SelectItem>
                  {sortedCampaigns.map(campaign => (
                    <SelectItem key={campaign.id} value={campaign.id}>
                      {campaign.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="min-w-[200px]">
              <Label className="text-sm">Change Type</Label>
              <Select value={filterChangeType} onValueChange={setFilterChangeType}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  {CHANGE_TYPE_OPTIONS.map(option => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Changelog List */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 bg-primary/10 rounded-lg">
              <History className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Change History</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">
                {filteredEntries.length} {filteredEntries.length === 1 ? "entry" : "entries"}
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="text-center py-8 text-muted-foreground">Loading changelog...</div>
          ) : filteredEntries.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <History className="h-16 w-16 mx-auto mb-4 opacity-20" />
              <p className="text-lg">No changes logged yet</p>
              <p className="text-sm mt-1">Click "Log Change" to track ad/creative or targeting changes</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredEntries.map(entry => (
                <div
                  key={entry.id}
                  className="flex items-start justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-2">
                      {getChangeTypeBadge(entry.change_type)}
                      <span className="text-sm text-muted-foreground flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {format(parseISO(entry.change_date), "MMM d, yyyy")}
                      </span>
                    </div>
                    <p className="font-medium text-lg">{entry.title}</p>
                    <p className="text-sm text-muted-foreground flex items-center gap-1 mt-1">
                      <Tag className="h-3 w-3" />
                      {entry.campaign_name}
                    </p>
                    {entry.description && (
                      <p className="text-sm text-muted-foreground mt-2 bg-muted/50 p-2 rounded">
                        {entry.description}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center gap-1 ml-4">
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
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default ChangelogPage;
