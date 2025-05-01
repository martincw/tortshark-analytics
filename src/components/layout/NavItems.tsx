
import React from "react";
import { Link } from "react-router-dom";
import { NavItem } from "@/types/navigation";

interface NavItemsProps {
  items: NavItem[];
  isActive: (href: string) => boolean;
  priority?: boolean;
}

export const NavItems: React.FC<NavItemsProps> = ({ items, isActive, priority }) => {
  const filteredItems = priority 
    ? items.filter(item => item.priority)
    : items.filter(item => !item.priority);

  return (
    <>
      {filteredItems.map((item) => (
        item.external ? (
          <a
            key={item.href}
            href={item.href}
            target="_blank"
            rel="noopener noreferrer"
            className={`text-sm ${priority ? "font-medium" : ""} transition-colors hover:text-primary flex items-center ${
              priority ? "px-3 py-1.5 rounded-md" : "text-muted-foreground"
            }`}
          >
            {item.icon}
            {item.label}
          </a>
        ) : (
          <Link 
            key={item.href} 
            to={item.href} 
            className={`text-sm transition-colors hover:text-primary flex items-center ${
              isActive(item.href) 
                ? priority 
                  ? "bg-primary/10 text-primary font-medium" 
                  : "font-medium text-primary" 
                : priority 
                  ? "font-medium" 
                  : "text-muted-foreground"
            } ${priority ? "px-3 py-1.5 rounded-md" : ""}`}
          >
            {item.icon}
            {item.label}
          </Link>
        )
      ))}
    </>
  );
};
