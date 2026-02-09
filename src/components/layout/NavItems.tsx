import {
  Home, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Users, 
  UserCheck, 
  Database,
  Link2,
  Workflow,
  FileText,
  LayoutDashboard,
  List,
  Wallet,
  History,
  Brain
} from "lucide-react";

export type NavItem = {
  icon: any;
  label: string;
  href: string;
};

export const getNavItems = (accountType?: 'member' | 'contractor'): NavItem[] => {
  // If contractor, only show daily stats
  if (accountType === 'contractor') {
    return [
      {
        icon: BarChart3,
        label: "Daily Stats",
        href: "/daily-stats",
      },
    ];
  }

  // For regular users (members), show all nav items
  return [
    {
      icon: Home,
      label: "Dashboard",
      href: "/",
    },
    {
      icon: Target,
      label: "Campaigns",
      href: "/campaigns",
    },
    {
      icon: List,
      label: "Campaign List",
      href: "/campaign-list",
    },
    {
      icon: BarChart3,
      label: "Daily Stats",
      href: "/daily-stats",
    },
    {
      icon: TrendingUp,
      label: "Bulk Stats",
      href: "/bulk-stats",
    },
    {
      icon: Workflow,
      label: "Stats Workflow",
      href: "/stats-workflow",
    },
    {
      icon: LayoutDashboard,
      label: "Buyer Dashboard",
      href: "/buyer-dashboard",
    },
    {
      icon: Users,
      label: "Buyers",
      href: "/buyers",
    },
    {
      icon: Wallet,
      label: "Budget Capacity",
      href: "/budget-capacity",
    },
    {
      icon: Database,
      label: "Data Sources",
      href: "/data-sources",
    },
    {
      icon: Link2,
      label: "LP Mapping",
      href: "/data-sources?source=leadprosper",
    },
    {
      icon: Brain,
      label: "AI Analyst",
      href: "/analysis",
    },
    {
      icon: History,
      label: "Changelog",
      href: "/changelog",
    },
    {
      icon: FileText,
      label: "Contractor Submissions",
      href: "/contractor-submissions",
    },
  ];
};
