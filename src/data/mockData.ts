
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
  adSpendBase: number
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
      date: daysAgo(0),
    },
    manualStats: {
      leads,
      cases,
      retainers,
      revenue,
      date: daysAgo(0),
    },
  };
};

// Create mock campaigns
export const mockCampaigns: Campaign[] = [
  generateCampaign("Personal Injury - Search", "google", "Tort Masters LLC", 1200),
  generateCampaign("Medical Device - Display", "google", "Injury Advocates", 850),
  generateCampaign("Class Action - Search", "google", "LegalMaxPPC", 1500),
  generateCampaign("Medical Malpractice - Video", "youtube", "Justice Seekers", 2200),
  generateCampaign("Pharmaceutical", "google", "Tort Masters LLC", 1750),
  generateCampaign("Product Liability - Search", "google", "Legal Lead Gen", 900),
  generateCampaign("Product Liability - Video", "youtube", "Legal Lead Gen", 1350),
  generateCampaign("Workplace Injury", "google", "Injury Advocates", 800),
  generateCampaign("PFAS Contamination", "youtube", "Environmental Justice", 2500),
  generateCampaign("Camp Lejeune", "google", "Veterans Advocates", 3000),
  generateCampaign("Cancer Litigation", "youtube", "Medical Justice", 2800),
  generateCampaign("Roundup", "google", "Agricultural Claims", 1600),
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
    platform: "youtube",
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
    platform: "youtube",
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
  {
    id: uuidv4(),
    name: "Medical Justice",
    platform: "youtube",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
  {
    id: uuidv4(),
    name: "Agricultural Claims",
    platform: "google",
    isConnected: true,
    lastSynced: daysAgo(0),
  },
];
