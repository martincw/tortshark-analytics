import React, { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useCampaign } from "@/contexts/CampaignContext";
import { Campaign, StatHistoryEntry } from "@/types/campaign";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { format, parseISO } from 'date-fns';
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { CalendarDays, PlusCircle, Trash2, Edit, Save, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const CampaignDetail = () => {
  const { campaignId } = useParams<{ campaignId: string }>();
  const {
    campaigns,
    updateCampaign,
    deleteCampaign,
    addStatHistoryEntry,
    updateStatHistoryEntry,
    deleteStatHistoryEntry,
  } = useCampaign();
  const navigate = useNavigate();

  const [selectedCampaign, setSelectedCampaign] = useState<Campaign | undefined>(undefined);
  const [isEditMode, setIsEditMode] = useState(false);
  const [campaignName, setCampaignName] = useState("");
  const [showManualStatsForm, setShowManualStatsForm] = useState(false);
  const [manualStats, setManualStats] = useState({
    leads: "0",
    cases: "0",
    retainers: "0",
    revenue: "0",
    adSpend: "0",
  });
  const [manualStatsDate, setManualStatsDate] = useState<Date>(new Date());
  const [calendarOpen, setCalendarOpen] = useState(false);
  const [editingEntryId, setEditingEntryId] = useState<string | null>(null);
  const [editedEntry, setEditedEntry] = useState<Omit<StatHistoryEntry, "createdAt"> | null>(null);
  const [isDeleteConfirmationOpen, setIsDeleteConfirmationOpen] = useState(false);
  const [entryToDeleteId, setEntryToDeleteId] = useState<string | null>(null);

  useEffect(() => {
    if (campaignId) {
      const campaign = campaigns.find((c) => c.id === campaignId);
      setSelectedCampaign(campaign);
      setCampaignName(campaign?.name || "");
    }
  }, [campaignId, campaigns]);

  const handleEditClick = () => {
    setIsEditMode(true);
  };

  const handleSaveClick = () => {
    if (selectedCampaign) {
      updateCampaign(selectedCampaign.id, { name: campaignName });
      setIsEditMode(false);
      toast.success("Campaign name updated successfully");
    }
  };

  const handleDeleteClick = () => {
    if (selectedCampaign) {
      deleteCampaign(selectedCampaign.id);
      navigate("/");
      toast.success("Campaign deleted successfully");
    }
  };

  const handleCancelClick = () => {
    setIsEditMode(false);
    setCampaignName(selectedCampaign?.name || "");
  };

  const toggleManualStatsForm = () => {
    setShowManualStatsForm(!showManualStatsForm);
  };

  const handleManualStatsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setManualStats({ ...manualStats, [name]: value });
  };

  const addManualStats = () => {
    if (!selectedCampaign) return;

    const newLeads = parseFloat(manualStats.leads) || 0;
    const newCases = parseFloat(manualStats.cases) || 0;
    const newRetainers = parseFloat(manualStats.retainers) || 0;
    const newRevenue = parseFloat(manualStats.revenue) || 0;
    const newAdSpend = parseFloat(manualStats.adSpend) || 0;

    if (newLeads === 0 && newCases === 0 && newRetainers === 0 && newRevenue === 0 && newAdSpend === 0) {
      toast.error("Please enter at least one value");
      return;
    }
    
    const formattedDate = format(manualStatsDate, "yyyy-MM-dd");
    
    console.log("Adding manual stats:", {
      campaignId: selectedCampaign.id,
      date: formattedDate,
      leads: newLeads,
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
    });

    addStatHistoryEntry(selectedCampaign.id, {
      date: formattedDate,
      leads: newLeads,
      cases: newCases,
      retainers: newRetainers,
      revenue: newRevenue,
      adSpend: newAdSpend
      // createdAt will be added automatically in the context
    });

    setManualStats({
      leads: "0",
      cases: "0",
      retainers: "0",
      revenue: "0",
      adSpend: "0",
    });
    setShowManualStatsForm(false);
  };

  const onCalendarSelect = (date: Date | undefined) => {
    if (date) {
      setManualStatsDate(date);
      setCalendarOpen(false);
    }
  };

  const handleEditEntry = (entry: StatHistoryEntry) => {
    setEditingEntryId(entry.id);
    setEditedEntry({
      id: entry.id,
      date: entry.date,
      leads: entry.leads,
      cases: entry.cases,
      retainers: entry.retainers,
      revenue: entry.revenue,
      adSpend: entry.adSpend,
    });
  };

  const handleEditedEntryChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    if (editedEntry) {
      setEditedEntry({ ...editedEntry, [name]: parseFloat(value) });
    }
  };

  const handleSaveEntry = () => {
    if (!selectedCampaign || !editedEntry) return;

    updateStatHistoryEntry(selectedCampaign.id, {
      ...editedEntry,
      createdAt: new Date().toISOString(), // Ensure createdAt is included
    });
    setEditingEntryId(null);
    setEditedEntry(null);
    toast.success("Stats history updated successfully");
  };

  const handleCancelEdit = () => {
    setEditingEntryId(null);
    setEditedEntry(null);
  };

  const handleDeleteEntry = (entryId: string) => {
    setEntryToDeleteId(entryId);
    setIsDeleteConfirmationOpen(true);
  };

  const confirmDeleteEntry = async () => {
    if (!selectedCampaign || !entryToDeleteId) return;

    try {
      await deleteStatHistoryEntry(selectedCampaign.id, entryToDeleteId);
      toast.success("Stats history entry deleted successfully");
    } catch (error) {
      console.error("Error deleting stats history entry:", error);
      toast.error("Failed to delete stats history entry");
    } finally {
      setIsDeleteConfirmationOpen(false);
      setEntryToDeleteId(null);
    }
  };

  const cancelDeleteEntry = () => {
    setIsDeleteConfirmationOpen(false);
    setEntryToDeleteId(null);
  };

  if (!selectedCampaign) {
    return <div>Campaign not found</div>;
  }

  return (
    <div className="container mx-auto py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">
            {isEditMode ? (
              <Input
                type="text"
                value={campaignName}
                onChange={(e) => setCampaignName(e.target.value)}
                className="text-3xl font-bold"
              />
            ) : (
              campaignName
            )}
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage and monitor your campaign details
          </p>
        </div>
        <div>
          {isEditMode ? (
            <>
              <Button variant="secondary" onClick={handleSaveClick}>
                Save
              </Button>
              <Button variant="ghost" onClick={handleCancelClick}>
                Cancel
              </Button>
            </>
          ) : (
            <>
              <Button onClick={handleEditClick} className="mr-2">
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="destructive" onClick={handleDeleteClick}>
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Manual Statistics</CardTitle>
        </CardHeader>
        <CardContent>
          <Button onClick={toggleManualStatsForm}>
            {showManualStatsForm ? "Hide Form" : "Add Manual Stats"}
            <PlusCircle className="ml-2 h-4 w-4" />
          </Button>

          {showManualStatsForm && (
            <div className="mt-4 grid gap-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="date-picker" className="text-right">
                  Date
                </Label>
                <div className="col-span-3">
                  <Popover open={calendarOpen} onOpenChange={setCalendarOpen}>
                    <PopoverTrigger asChild>
                      <Button
                        id="date-picker"
                        variant={"outline"}
                        className={cn(
                          "w-full justify-start text-left",
                          !manualStatsDate && "text-muted-foreground"
                        )}
                      >
                        <CalendarDays className="mr-2 h-4 w-4" />
                        {manualStatsDate ? (
                          format(manualStatsDate, "PPP")
                        ) : (
                          <span>Select date</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <CalendarComponent
                        mode="single"
                        selected={manualStatsDate}
                        onSelect={onCalendarSelect}
                        initialFocus
                        className="pointer-events-auto"
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="leads" className="text-right">
                  Leads
                </Label>
                <Input
                  type="number"
                  id="leads"
                  name="leads"
                  value={manualStats.leads}
                  onChange={handleManualStatsChange}
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
                  name="cases"
                  value={manualStats.cases}
                  onChange={handleManualStatsChange}
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
                  name="retainers"
                  value={manualStats.retainers}
                  onChange={handleManualStatsChange}
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
                  name="revenue"
                  value={manualStats.revenue}
                  onChange={handleManualStatsChange}
                  className="col-span-3"
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="adSpend" className="text-right">
                  Ad Spend
                </Label>
                <Input
                  type="number"
                  id="adSpend"
                  name="adSpend"
                  value={manualStats.adSpend}
                  onChange={handleManualStatsChange}
                  className="col-span-3"
                />
              </div>
              <Button onClick={addManualStats}>Add Stats</Button>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Statistics History</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px] w-full">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[100px]">Date</TableHead>
                  <TableHead>Leads</TableHead>
                  <TableHead>Cases</TableHead>
                  <TableHead>Retainers</TableHead>
                  <TableHead>Revenue</TableHead>
                  <TableHead>Ad Spend</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {selectedCampaign.statsHistory.map((entry) => (
                  <TableRow key={entry.id}>
                    <TableCell className="font-medium">{format(parseISO(entry.date), 'MMM d, yyyy')}</TableCell>
                    <TableCell>{entry.leads}</TableCell>
                    <TableCell>{entry.cases}</TableCell>
                    <TableCell>{entry.retainers}</TableCell>
                    <TableCell>{entry.revenue}</TableCell>
                    <TableCell>{entry.adSpend}</TableCell>
                    <TableCell className="text-right">
                      {editingEntryId === entry.id ? (
                        <div className="flex justify-end gap-2">
                          <Button variant="secondary" size="sm" onClick={handleSaveEntry}>
                            <Save className="mr-2 h-4 w-4" />
                            Save
                          </Button>
                          <Button variant="ghost" size="sm" onClick={handleCancelEdit}>
                            <XCircle className="mr-2 h-4 w-4" />
                            Cancel
                          </Button>
                        </div>
                      ) : (
                        <div className="flex justify-end gap-2">
                          <Button variant="outline" size="sm" onClick={() => handleEditEntry(entry)}>
                            <Edit className="mr-2 h-4 w-4" />
                            Edit
                          </Button>
                          <Button variant="destructive" size="sm" onClick={() => handleDeleteEntry(entry.id)}>
                            <Trash2 className="mr-2 h-4 w-4" />
                            Delete
                          </Button>
                        </div>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>
      </Card>

      {editingEntryId && editedEntry && (
        <div className="fixed inset-0 z-50 overflow-auto bg-black/50">
          <div className="relative m-auto mt-20 flex max-w-md flex-col rounded-md bg-white p-6 shadow-lg">
            <h2 className="mb-4 text-lg font-semibold">Edit Statistics Entry</h2>
            <div className="grid gap-4">
              <div>
                <Label htmlFor="leads">Leads</Label>
                <Input
                  type="number"
                  id="leads"
                  name="leads"
                  value={editedEntry?.leads || 0}
                  onChange={handleEditedEntryChange}
                />
              </div>
              <div>
                <Label htmlFor="cases">Cases</Label>
                <Input
                  type="number"
                  id="cases"
                  name="cases"
                  value={editedEntry?.cases || 0}
                  onChange={handleEditedEntryChange}
                />
              </div>
              <div>
                <Label htmlFor="retainers">Retainers</Label>
                <Input
                  type="number"
                  id="retainers"
                  name="retainers"
                  value={editedEntry?.retainers || 0}
                  onChange={handleEditedEntryChange}
                />
              </div>
              <div>
                <Label htmlFor="revenue">Revenue</Label>
                <Input
                  type="number"
                  id="revenue"
                  name="revenue"
                  value={editedEntry?.revenue || 0}
                  onChange={handleEditedEntryChange}
                />
              </div>
              <div>
                <Label htmlFor="adSpend">Ad Spend</Label>
                <Input
                  type="number"
                  id="adSpend"
                  name="adSpend"
                  value={editedEntry?.adSpend || 0}
                  onChange={handleEditedEntryChange}
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <Button variant="secondary" onClick={handleSaveEntry}>
                <Save className="mr-2 h-4 w-4" />
                Save
              </Button>
              <Button variant="ghost" onClick={handleCancelEdit}>
                <XCircle className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </div>
        </div>
      )}

      <Dialog open={isDeleteConfirmationOpen} onOpenChange={setIsDeleteConfirmationOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Confirm Deletion</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this entry? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="ghost" onClick={cancelDeleteEntry}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDeleteEntry}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CampaignDetail;
