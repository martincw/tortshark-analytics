
import React from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import Google from "@/components/integrations/Google";
import LeadProsper from "@/components/integrations/LeadProsper";
import Hyros from "@/components/integrations/Hyros";

export default function IntegrationsPage() {
  return (
    <div className="container mx-auto py-6 space-y-8 max-w-5xl">
      <header>
        <h1 className="text-3xl font-bold">Integrations</h1>
        <p className="text-muted-foreground">Connect your external platforms</p>
      </header>

      <Tabs defaultValue="hyros" className="w-full">
        <TabsList className="mb-6">
          <TabsTrigger value="hyros">HYROS</TabsTrigger>
          <TabsTrigger value="google">Google Ads</TabsTrigger>
          <TabsTrigger value="leadprosper">Lead Prosper</TabsTrigger>
        </TabsList>
        <TabsContent value="hyros">
          <Hyros />
        </TabsContent>
        <TabsContent value="google">
          <Google />
        </TabsContent>
        <TabsContent value="leadprosper">
          <LeadProsper />
        </TabsContent>
      </Tabs>
    </div>
  );
}
