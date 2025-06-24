
import React from "react";
import { Link } from "react-router-dom";
import { PlusCircle, BarChart3, Calendar, Users, ExternalLink } from "lucide-react";
import { NavItem } from "@/types/navigation";

interface SidebarMenuProps {
  navItems: NavItem[];
  externalNavItems: NavItem[];
  isActive: (href: string) => boolean;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ navItems, externalNavItems, isActive }) => {
  return (
    <div className="space-y-4 py-4">
      {/* Main Navigation */}
      <div className="space-y-1">
        {navItems.map((item) => (
          <Link
            key={item.href}
            to={item.href}
            className={`flex items-center px-4 py-2 text-sm font-medium rounded-md transition-colors ${
              isActive(item.href)
                ? "bg-secondary text-secondary-foreground"
                : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </Link>
        ))}
      </div>

      {/* Cases & Revenue Entry */}
      <div className="space-y-1">
        <Link 
          to="/cases-revenue-entry" 
          className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
            isActive("/cases-revenue-entry") ? "bg-secondary font-medium" : ""
          }`}
        >
          <PlusCircle className="h-4 w-4 mr-2" />
          Cases & Revenue Entry
        </Link>
      </div>

      {/* Stats & Analytics */}
      <div className="space-y-1">
        <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Stats & Analytics
        </div>
        <Link 
          to="/bulk-stats" 
          className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
            isActive("/bulk-stats") ? "bg-secondary font-medium" : ""
          }`}
        >
          <BarChart3 className="h-4 w-4 mr-2" />
          Bulk Stats
        </Link>
        <Link 
          to="/daily-stats" 
          className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
            isActive("/daily-stats") ? "bg-secondary font-medium" : ""
          }`}
        >
          <Calendar className="h-4 w-4 mr-2" />
          Daily Stats
        </Link>
        <Link 
          to="/contractor-submissions" 
          className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
            isActive("/contractor-submissions") ? "bg-secondary font-medium" : ""
          }`}
        >
          <Users className="h-4 w-4 mr-2" />
          Contractor Submissions
        </Link>
      </div>

      {/* External Links */}
      {externalNavItems.length > 0 && (
        <div className="space-y-1">
          <div className="px-4 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            External Tools
          </div>
          {externalNavItems.map((item) => (
            <a
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 rounded-md hover:bg-secondary flex items-center text-muted-foreground hover:text-secondary-foreground"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {item.label}
            </a>
          ))}
        </div>
      )}
    </div>
  );
};
