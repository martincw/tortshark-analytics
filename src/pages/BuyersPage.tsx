
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { BuyerCard } from "@/components/buyers/BuyerCard";
import { useBuyers } from "@/hooks/useBuyers";

export default function BuyersPage() {
  const { buyers, loading, addBuyer, deleteBuyer } = useBuyers();
  const [name, setName] = useState("");
  const [url, setUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) {
      return;
    }
    // Provide default URL if not specified
    const buyerUrl = url || "#";
    await addBuyer(name, buyerUrl);
    setName("");
    setUrl("");
  };

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Buyers</h1>
        <p className="text-muted-foreground mb-6">
          Create and manage case buyers that can be assigned to your campaigns.
        </p>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            placeholder="Buyer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Buyer URL (optional)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit">Add Buyer</Button>
        </form>
      </div>
      
      {loading ? (
        <div>Loading buyers...</div>
      ) : buyers.length === 0 ? (
        <div className="text-center p-8 border rounded-lg">
          <p className="text-muted-foreground">No buyers added yet.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {buyers.map((buyer) => (
            <BuyerCard
              key={buyer.id}
              buyer={buyer}
              onDelete={deleteBuyer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
