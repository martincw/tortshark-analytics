
export interface DateRange {
  startDate: string;
  endDate: string;
}

export interface ExternalPlatformConnection {
  id: string;
  name: string;
  platform: string;
  customerId?: string;
  lastSynced?: string;
  isConnected: boolean;
  credentials?: Record<string, any>;
}

export interface ApiErrorResponse {
  message: string;
  status: number;
  errors?: Record<string, string[]>; 
}
