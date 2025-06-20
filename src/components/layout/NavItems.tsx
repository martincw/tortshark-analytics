import {
  BarChart3,
  FileText,
  Gauge,
  LayoutDashboard,
  ListChecks,
  LucideIcon,
  Settings,
  User2,
  Users,
} from "lucide-react";

type Route = {
  icon: LucideIcon;
  name: string;
  href: string;
  description: string;
};

export const navItems = [
  {
    name: "Dashboard",
    href: "/",
    icon: LayoutDashboard,
    description: "At a glance overview of your workspace",
  },
  {
    name: "Campaign Grid",
    href: "/campaign-grid",
    icon: BarChart3,
    description: "All campaigns in a sortable, filterable grid",
  },
  {
    name: "Campaigns",
    href: "/campaigns",
    icon: ListChecks,
    description: "Create and manage campaigns",
  },
  {
    name: "Buyers",
    href: "/buyers",
    icon: Users,
    description: "Manage your buyers",
  },
  {
    name: "Workspaces",
    href: "/workspaces",
    icon: Gauge,
    description: "Manage your workspaces",
  },
  {
    name: "Settings",
    href: "/settings",
    icon: Settings,
    description: "Configure your account and preferences",
  },
  {
    name: "Contractor Workflow",
    href: "/contractor-workflow",
    icon: FileText,
    description: "Streamlined daily stats entry process"
  }
];
