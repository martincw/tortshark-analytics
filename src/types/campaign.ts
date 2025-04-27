
export interface CaseBuyer {
  id: string;
  name: string;
  url?: string;  // Make url optional to maintain backwards compatibility
  created_at?: string;
}
