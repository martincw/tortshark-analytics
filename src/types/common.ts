
export interface DateRange {
  startDate: string | null;
  endDate: string | null;
}

export interface ExternalPlatformConnection {
  id: string;
  name: string;
  platform: string;
  isConnected: boolean;
  lastSynced: string | null;
  customerId?: string;
}
