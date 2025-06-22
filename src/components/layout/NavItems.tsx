import { 
  Home, 
  Target, 
  TrendingUp, 
  BarChart3, 
  Settings, 
  Users, 
  UserCheck, 
  Database,
  Workflow,
  FileText
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
      icon: Users,
      label: "Buyers",
      href: "/buyers",
    },
    {
      icon: UserCheck,
      label: "Leads",
      href: "/leads",
    },
    {
      icon: Database,
      label: "Data Sources",
      href: "/data-sources",
    },
    {
      icon: FileText,
      label: "Contractor Submissions",
      href: "/contractor-submissions",
    },
  ];
};
