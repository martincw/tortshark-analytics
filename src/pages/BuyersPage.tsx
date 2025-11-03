
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader,
  CardTitle 
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Sheet, 
  SheetContent, 
  SheetDescription, 
  SheetHeader, 
  SheetTitle 
} from "@/components/ui/sheet";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BuyerCard } from "@/components/buyers/BuyerCard";
import { BuyerListItem } from "@/components/buyers/BuyerListItem";
import { useBuyers } from "@/hooks/useBuyers";
import { Search, Plus, Filter, Shield, ChevronUp, ChevronDown, LayoutGrid, List } from "lucide-react";
import { BuyerRankingsTable } from "@/components/buyers/BuyerRankingsTable";
import { BuyerFilterMenu } from "@/components/buyers/BuyerFilterMenu";
import { BuyerDetailDialog } from "@/components/buyers/BuyerDetailDialog";

const PLATFORM_OPTIONS = [
  { value: "email", label: "Email" },
  { value: "sms", label: "SMS" },
  { value: "phone", label: "Phone" },
  { value: "telegram", label: "Telegram" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "signal", label: "Signal" },
  { value: "other", label: "Other" }
];

export default function BuyersPage() {
  const { buyers, loading, addBuyer, deleteBuyer } = useBuyers();
  const [isAddBuyerOpen, setIsAddBuyerOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [activeTab, setActiveTab] = useState("all");
  const [selectedBuyerId, setSelectedBuyerId] = useState<string | null>(null);
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");

  // Form state
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");
  const [url2, setUrl2] = useState("");
  const [contactName, setContactName] = useState("");
  const [email, setEmail] = useState("");
  const [platform, setPlatform] = useState("");
  const [notes, setNotes] = useState("");
  const [payoutTerms, setPayoutTerms] = useState("");
  const [showSecondaryUrl, setShowSecondaryUrl] = useState(false);

  const filteredBuyers = buyers.filter((buyer) => {
    if (searchQuery) {
      return buyer.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
             (buyer.contact_name && buyer.contact_name.toLowerCase().includes(searchQuery.toLowerCase())) ||
             (buyer.email && buyer.email.toLowerCase().includes(searchQuery.toLowerCase()));
    }
    return true;
  });

  // Sort buyers
  const sortedBuyers = [...filteredBuyers].sort((a, b) => {
    if (sortOrder === "asc") {
      return a.name.localeCompare(b.name);
    } else {
      return b.name.localeCompare(a.name);
    }
  });

  const toggleSortOrder = () => {
    setSortOrder(sortOrder === "asc" ? "desc" : "asc");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      return;
    }
    
    try {
      await addBuyer(
        name, 
        url, 
        contactName, 
        email, 
        platform, 
        notes, 
        payoutTerms,
        url2
      );
      resetForm();
      setIsAddBuyerOpen(false);
    } catch (error) {
      console.error("Error adding buyer:", error);
    }
  };

  const resetForm = () => {
    setName("");
    setUrl("");
    setUrl2("");
    setContactName("");
    setEmail("");
    setPlatform("");
    setNotes("");
    setPayoutTerms("");
    setShowSecondaryUrl(false);
  };

  const openBuyerDetail = (buyerId: string) => {
    setSelectedBuyerId(buyerId);
  };

  const handleDeleteBuyer = async (buyerId: string) => {
    await deleteBuyer(buyerId);
    if (selectedBuyerId === buyerId) {
      setSelectedBuyerId(null);
    }
  };

  return (
    <div className="container py-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Buyers Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your case buyers and their tort coverages
          </p>
        </div>
        <div className="flex gap-2">
          <Button onClick={() => setIsAddBuyerOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Buyer
          </Button>
        </div>
      </div>

      <div className="flex justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search buyers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={toggleSortOrder}
        >
          {sortOrder === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={() => setViewMode(viewMode === "grid" ? "list" : "grid")}
        >
          {viewMode === "grid" ? (
            <List className="h-4 w-4" />
          ) : (
            <LayoutGrid className="h-4 w-4" />
          )}
        </Button>
        <BuyerFilterMenu />
      </div>

      <Tabs 
        defaultValue="all" 
        value={activeTab}
        onValueChange={setActiveTab}
        className="w-full"
      >
        <TabsList className="grid grid-cols-3 w-full md:w-[400px]">
          <TabsTrigger value="all">All Buyers</TabsTrigger>
          <TabsTrigger value="rankings">Rankings</TabsTrigger>
          <TabsTrigger value="analytics">Analytics</TabsTrigger>
        </TabsList>
        
        <TabsContent value="all" className="mt-4">
          {loading ? (
            <div className="flex justify-center py-8">
              <div className="h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
            </div>
          ) : sortedBuyers.length === 0 ? (
            <Card className="bg-muted/50">
              <CardContent className="flex flex-col items-center justify-center py-8 text-center">
                <Shield className="h-12 w-12 text-muted-foreground/50 mb-3" />
                <p className="mb-4 text-muted-foreground">
                  {searchQuery ? "No buyers match your search" : "No buyers added yet"}
                </p>
                <Button onClick={() => setIsAddBuyerOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Your First Buyer
                </Button>
              </CardContent>
            </Card>
          ) : viewMode === "grid" ? (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {sortedBuyers.map((buyer) => (
                <BuyerCard
                  key={buyer.id}
                  buyer={buyer}
                  onViewDetail={openBuyerDetail}
                  onDelete={handleDeleteBuyer}
                />
              ))}
            </div>
          ) : (
            <div className="space-y-2">
              {sortedBuyers.map((buyer) => (
                <BuyerListItem
                  key={buyer.id}
                  buyer={buyer}
                  onViewDetail={openBuyerDetail}
                />
              ))}
            </div>
          )}
        </TabsContent>
        
        <TabsContent value="rankings">
          <BuyerRankingsTable />
        </TabsContent>
        
        <TabsContent value="analytics">
          <Card>
            <CardHeader>
              <CardTitle>Buyer Analytics</CardTitle>
              <CardDescription>
                Overview of buyer performance and insights
              </CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground">
                Analytics functionality coming soon
              </p>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Add Buyer Sheet */}
      <Sheet open={isAddBuyerOpen} onOpenChange={setIsAddBuyerOpen}>
        <SheetContent className="md:max-w-md overflow-y-auto">
          <SheetHeader>
            <SheetTitle>Add New Buyer</SheetTitle>
            <SheetDescription>
              Enter the buyer details below to add them to your roster
            </SheetDescription>
          </SheetHeader>
          <form onSubmit={handleSubmit} className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Company Name *</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Enter company name"
                required
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="url">Website URL</Label>
              <Input
                id="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://example.com"
              />
            </div>
            
            {showSecondaryUrl ? (
              <div className="space-y-2">
                <Label htmlFor="url2">Secondary URL</Label>
                <Input
                  id="url2"
                  value={url2}
                  onChange={(e) => setUrl2(e.target.value)}
                  placeholder="https://example.com/landing"
                />
              </div>
            ) : (
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={() => setShowSecondaryUrl(true)}
              >
                <Plus className="h-3.5 w-3.5 mr-1" />
                Add Secondary URL
              </Button>
            )}
            
            <div className="space-y-2">
              <Label htmlFor="contact-name">Contact Name</Label>
              <Input
                id="contact-name"
                value={contactName}
                onChange={(e) => setContactName(e.target.value)}
                placeholder="John Smith"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="contact@example.com"
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="platform">Platform</Label>
              <Select value={platform} onValueChange={setPlatform}>
                <SelectTrigger>
                  <SelectValue placeholder="Select platform" />
                </SelectTrigger>
                <SelectContent>
                  {PLATFORM_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">How cases are delivered to this buyer</p>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="payout-terms">Payout Terms</Label>
              <Input
                id="payout-terms"
                value={payoutTerms}
                onChange={(e) => setPayoutTerms(e.target.value)}
                placeholder="Net 30, etc."
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="Budget information and other notes"
                className="min-h-[100px]"
              />
            </div>
            
            <div className="flex justify-end gap-2 pt-4">
              <Button 
                type="button" 
                variant="outline"
                onClick={() => {
                  resetForm();
                  setIsAddBuyerOpen(false);
                }}
              >
                Cancel
              </Button>
              <Button type="submit">Add Buyer</Button>
            </div>
          </form>
        </SheetContent>
      </Sheet>
      
      {/* Buyer Detail Dialog */}
      {selectedBuyerId && (
        <BuyerDetailDialog 
          buyerId={selectedBuyerId} 
          isOpen={!!selectedBuyerId}
          onClose={() => setSelectedBuyerId(null)}
          onDelete={handleDeleteBuyer}
        />
      )}
    </div>
  );
}
