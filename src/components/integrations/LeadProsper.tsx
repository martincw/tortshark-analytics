
import React from 'react';
import LeadProsperConnection from './LeadProsperConnection';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card } from '@/components/ui/card';

export function LeadProsper() {
  return (
    <Tabs defaultValue="connection">
      <TabsList className="mb-4">
        <TabsTrigger value="connection">Connection</TabsTrigger>
      </TabsList>
      <TabsContent value="connection" className="space-y-4">
        <LeadProsperConnection />
      </TabsContent>
    </Tabs>
  );
}

export default LeadProsper;
