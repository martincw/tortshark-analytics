
import { ReactNode } from "react";

export interface NavItem {
  href: string;
  label: string;
  icon?: ReactNode;
  priority?: boolean;
  external?: boolean;
  dropdown?: boolean;
  isProtected?: boolean;
}
