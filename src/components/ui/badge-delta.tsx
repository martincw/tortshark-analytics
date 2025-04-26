
import React from "react";
import { cn } from "@/lib/utils";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface BadgeDeltaProps {
  value: string | "increase" | "decrease" | "unchanged";
  text?: string;
  className?: string;
}

export const BadgeDelta: React.FC<BadgeDeltaProps> = ({ value, text, className }) => {
  // Determine the variant based on the delta direction
  let variant: "increase" | "decrease" | "unchanged";
  if (typeof value === "string") {
    if (["increase", "positive", "up"].includes(value.toLowerCase())) {
      variant = "increase";
    } else if (["decrease", "negative", "down"].includes(value.toLowerCase())) {
      variant = "decrease";
    } else {
      variant = "unchanged";
    }
  } else {
    variant = value;
  }

  // Choose color and icon based on variant
  const colorClass = variant === "increase" 
    ? "bg-success-DEFAULT/20 text-success-DEFAULT border-success-DEFAULT"
    : variant === "decrease" 
      ? "bg-error-DEFAULT/20 text-error-DEFAULT border-error-DEFAULT"
      : "bg-muted text-muted-foreground";

  const Icon = variant === "increase" 
    ? TrendingUp 
    : variant === "decrease" 
      ? TrendingDown
      : Minus;

  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 rounded-md border px-2 py-1 text-xs font-medium",
        colorClass,
        className
      )}
    >
      <Icon className="h-3 w-3" />
      {text || variant}
    </span>
  );
};
