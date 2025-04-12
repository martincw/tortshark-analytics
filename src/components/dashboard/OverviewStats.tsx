
import React from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { useCampaign } from "@/contexts/CampaignContext";

interface ProgressBarProps {
  label: string;
  value: number;
  maxValue: number;
  color: "blue" | "green" | "amber" | "indigo" | "violet";
}

const colorClasses = {
  blue: "text-blue-500",
  green: "text-green-500",
  amber: "text-amber-500",
  indigo: "text-indigo-500",
  violet: "text-violet-500",
};

const CustomProgressBar: React.FC<ProgressBarProps> = ({ label, value, maxValue, color }) => {
  const progressColor = colorClasses[color] || "text-gray-500";

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium">{label}</span>
        <span className={`text-sm font-medium ${progressColor}`}>{value}%</span>
      </div>
      <Progress value={value} max={maxValue} className="h-2" />
    </div>
  );
};

export function OverviewStats() {
  const { dashboardData } = useCampaign();

  if (!dashboardData) {
    return <p>Loading dashboard data...</p>;
  }

  const {
    conversionRate,
    costEfficiency,
    cpaScore,
    roasScore,
    budgetUtilization,
  } = dashboardData;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Campaign Performance Overview</CardTitle>
        <CardDescription>Key metrics for your campaigns</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <CustomProgressBar label="Lead-to-Case Conversion"
                           value={Number(conversionRate)}
                           maxValue={100}
                           color="blue" />

        <CustomProgressBar label="Cost Efficiency"
                           value={Number(costEfficiency)}
                           maxValue={100}
                           color="green" />

        <CustomProgressBar label="Cost per Acquisition"
                           value={Number(cpaScore)}
                           maxValue={100}
                           color="amber" />

        <CustomProgressBar label="Return on Ad Spend"
                           value={Number(roasScore)}
                           maxValue={100}
                           color="indigo" />

        <CustomProgressBar label="Campaign Budget Utilization"
                           value={Number(budgetUtilization)}
                           maxValue={100}
                           color="violet" />
      </CardContent>
    </Card>
  );
}
