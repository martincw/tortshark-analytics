
import { Campaign, AccountConnection } from "../types/campaign";
import { v4 as uuidv4 } from "uuid";

// Generate a date string for the given number of days ago
const daysAgo = (days: number): string => {
  const date = new Date();
  date.setDate(date.getDate() - days);
  return date.toISOString().split("T")[0];
};

// Generate a campaign with mock data
const generateCampaign = (
  name: string,
  platform: "google" | "youtube",
  accountName: string,
  adSpendBase: number,
  daysOffset: number
): Campaign => {
  const adSpend = adSpendBase + Math.random() * 500;
  const impressions = Math.floor(adSpend * 100 + Math.random() * 5000);
  const clicks = Math.floor(impressions * (0.02 + Math.random() * 0.05));
  const cpc = adSpend / clicks;

  const leads = Math.floor(clicks * (0.05 + Math.random() * 0.15));
  const cases = Math.floor(leads * (0.1 + Math.random() * 0.2));
  const retainers = Math.floor(cases * (0.3 + Math.random() * 0.5));
  const revenue = retainers * (5000 + Math.random() * 3000);

  return {
    id: uuidv4(),
    name,
    platform,
    accountId: uuidv4(),
    accountName,
    stats: {
      adSpend,
      impressions,
      clicks,
      cpc,
      date: daysAgo(daysOffset),
    },
    manualStats: {
      leads,
      cases,
      retainers,
      revenue,
      date: daysAgo(daysOffset),
    },
  };
};

// Create mock campaigns with the specific campaign names
export const mockCampaigns: Campaign[] = [
  // Rideshare campaign with different dates
  generateCampaign("Rideshare - Search", "google", "Tort Masters LLC", 1200, 0),
  generateCampaign("Rideshare - Display", "google", "Injury Advocates", 850, 1),
  generateCampaign("Rideshare - Retargeting", "google", "LegalMaxPPC", 950, 3),
  
  // LDS campaign with different dates  
  generateCampaign("LDS - Search", "google", "Justice Seekers", 2200, 0),
  generateCampaign("LDS - Display", "google", "Tort Masters LLC", 1750, 2),
  
  // MD campaign with different dates
  generateCampaign("MD - Search", "google", "Legal Lead Gen", 900, 1),
  generateCampaign("MD - Video", "google", "Legal Lead Gen", 1350, 4),
  
  // Wildfire campaign with different dates
  generateCampaign("Wildfire - Search", "google", "Injury Advocates", 800, 0),
  generateCampaign("Wildfire - Display", "google", "Environmental Justice", 2500, 2),
  generateCampaign("Wildfire - Retargeting", "google", "Veterans Advocates", 1100, 5),
];

// Mock account connections
export const mockAccountConnections: AccountConnection[] = [
  {
    id: uuidv4(),
    name: "Tort Masters LLC",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "Injury Advocates",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "LegalMaxPPC",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "Justice Seekers",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "Legal Lead Gen",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "Environmental Justice",
    platform: "google",
    isConnected: false,
    lastSynced: null,
  },
  {
    id: uuidv4(),
    name: "Veterans Advocates",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
];
