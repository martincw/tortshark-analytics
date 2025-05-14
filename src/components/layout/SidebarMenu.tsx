
import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Table, FileText } from "lucide-react";
import { useBuyers } from "@/hooks/useBuyers";
import { NavItem } from "@/types/navigation";

interface SidebarMenuProps {
  navItems: NavItem[];
  externalNavItems: NavItem[];
  isActive: (href: string) => boolean;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ navItems, externalNavItems, isActive }) => {
  const { buyers, loading } = useBuyers();

  return (
    <div className="grid gap-4 py-4">
      {/* Main Navigation Items */}
      {navItems.map((item) => (
        item.dropdown ? (
          <div key={item.href} className="px-4 py-2 rounded-md hover:bg-secondary">
            <Link to={item.href} className="font-medium">
              {item.label}
            </Link>
            <div className="mt-2 pl-4 space-y-1">
              {!loading && buyers.filter(buyer => buyer.url).map((buyer) => (
                <a 
                  key={buyer.id}
                  href={buyer.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-sm flex items-center py-1 hover:text-primary"
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  {buyer.name}
                </a>
              ))}
              {(!loading && buyers.filter(buyer => buyer.url).length === 0) && (
                <span className="text-xs text-muted-foreground">No buyer websites available</span>
              )}
            </div>
          </div>
        ) : (
          <Link 
            key={item.href} 
            to={item.href} 
            className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
              isActive(item.href) ? "bg-secondary font-medium" : ""
            } ${item.priority ? "text-primary font-medium" : ""}`}
          >
            {item.icon}
            {item.label}
            {item.priority && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 rounded-full">New</span>}
          </Link>
        )
      ))}
      
      {/* External Links */}
      <div className="px-4 py-2">
        <h3 className="text-sm font-medium mb-2">External Links</h3>
        <div className="space-y-1">
          {externalNavItems.map((item) => (
            <a 
              key={item.href}
              href={item.href}
              target="_blank"
              rel="noopener noreferrer"
              className="px-2 py-1 rounded-md hover:bg-secondary flex items-center"
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              {item.label}
            </a>
          ))}
        </div>
      </div>
      
      <Link 
        to="/bulk-stats" 
        className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
          isActive("/bulk-stats") ? "bg-secondary font-medium" : ""
        }`}
      >
        <Table className="h-4 w-4 mr-2" />
        Bulk Stats
      </Link>

      <a 
        href="https://tortshark-invoicing.lovable.app" 
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-md hover:bg-secondary flex items-center"
      >
        <FileText className="h-4 w-4 mr-2" />
        Invoicing
      </a>

      <a 
        href="https://app.diagrams.net/#G1yXi1A4e7ahlSvTaP58a0d_p_NV3_dgCn#%7B%22pageId%22%3A%22prtHgNgQTEPvFCAcTncT%22%7D" 
        target="_blank"
        rel="noopener noreferrer"
        className="px-4 py-2 rounded-md hover:bg-secondary flex items-center"
      >
        <Users className="h-4 w-4 mr-2" />
        Org Chart
      </a>
    </div>
  );
};
