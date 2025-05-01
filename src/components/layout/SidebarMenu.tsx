
import React from "react";
import { Link } from "react-router-dom";
import { ExternalLink, Table, LinkIcon, FileText } from "lucide-react";
import { useBuyers } from "@/hooks/useBuyers";
import { NavItem } from "@/types/navigation";

interface SidebarMenuProps {
  navItems: NavItem[];
  isActive: (href: string) => boolean;
}

export const SidebarMenu: React.FC<SidebarMenuProps> = ({ navItems, isActive }) => {
  const { buyers, loading } = useBuyers();

  return (
    <div className="grid gap-4 py-4">
      {navItems.map((item) => (
        item.external ? (
          <a 
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
              item.priority ? "text-primary font-medium" : ""
            }`}
          >
            {item.icon}
            {item.label}
            {item.priority && <span className="ml-2 text-xs px-2 py-0.5 bg-primary/10 rounded-full">New</span>}
          </a>
        ) : item.dropdown ? (
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
      
      <Link 
        to="/bulk-stats" 
        className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
          isActive("/bulk-stats") ? "bg-secondary font-medium" : ""
        }`}
      >
        <Table className="h-4 w-4 mr-2" />
        Bulk Stats
      </Link>
      <Link 
        to="/integrations" 
        className={`px-4 py-2 rounded-md hover:bg-secondary flex items-center ${
          isActive("/integrations") ? "bg-secondary font-medium" : ""
        }`}
      >
        <LinkIcon className="h-4 w-4 mr-2" />
        Integrations
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
    </div>
  );
};
