
import { Campaign } from './campaign';

// Extend existing Campaign interface with new workspace properties
declare module './campaign' {
  interface Campaign {
    workspace_id?: string;
  }
}
