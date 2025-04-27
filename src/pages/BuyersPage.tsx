
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
    if (!name || !url) {
      return;
    }
    await addBuyer(name, url);
    setName("");
    setUrl("");
  };

  return (
    <div className="container py-6">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-4">Buyers</h1>
        <form onSubmit={handleSubmit} className="flex gap-4">
          <Input
            placeholder="Buyer name"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />
          <Input
            placeholder="Buyer URL"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <Button type="submit">Add Buyer</Button>
        </form>
      </div>
      
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {buyers.map((buyer) => (
          <BuyerCard
            key={buyer.id}
            buyer={buyer}
            onDelete={deleteBuyer}
          />
        ))}
      </div>
    </div>
  );
}
