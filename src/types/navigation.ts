
import { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  priority?: boolean;
  external?: boolean;
  dropdown?: boolean;
  isProtected?: boolean;
  children?: NavItem[];
}

export interface IntegrationTab {
  id: string;
  label: string;
  icon?: ReactNode;
}

export interface DataSourceTab {
  id: string;
  label: string;
  icon?: ReactNode;
}
