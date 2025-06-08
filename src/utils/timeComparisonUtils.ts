
import { Campaign } from "@/types/campaign";
import { getPeriodStats } from "./campaignUtils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format, subDays, startOfDay, endOfDay } from "date-fns";

export interface ComparisonPeriod {
  label: string;
  startDate: string;
  endDate: string;
}

export interface ComparisonData {
  basePeriod: ComparisonPeriod;
  comparePeriod: ComparisonPeriod;
  baseStats: {
    adSpend: number;
    leads: number;
    cases: number;
    revenue: number;
    cpl: number;
    epl: number;
    profit: number;
    roi: number;
  };
  compareStats: {
    adSpend: number;
    leads: number;
    cases: number;
    revenue: number;
    cpl: number;
    epl: number;
    profit: number;
    roi: number;
  };
  changes: {
    adSpend: number;
    leads: number;
    cases: number;
    revenue: number;
    cpl: number;
    epl: number;
    profit: number;
    roi: number;
  };
}

export const getPeriodPresets = (): ComparisonPeriod[] => {
  const now = new Date();
  
  return [
    {
      label: "This Week",
      startDate: startOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0],
      endDate: endOfWeek(now, { weekStartsOn: 1 }).toISOString().split('T')[0]
    },
    {
      label: "Last Week",
      startDate: startOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString().split('T')[0],
      endDate: endOfWeek(subWeeks(now, 1), { weekStartsOn: 1 }).toISOString().split('T')[0]
    },
    {
      label: "2 Weeks Ago",
      startDate: startOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }).toISOString().split('T')[0],
      endDate: endOfWeek(subWeeks(now, 2), { weekStartsOn: 1 }).toISOString().split('T')[0]
    },
    {
      label: "3 Weeks Ago",
      startDate: startOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }).toISOString().split('T')[0],
      endDate: endOfWeek(subWeeks(now, 3), { weekStartsOn: 1 }).toISOString().split('T')[0]
    },
    {
      label: "This Month",
      startDate: startOfMonth(now).toISOString().split('T')[0],
      endDate: endOfMonth(now).toISOString().split('T')[0]
    },
    {
      label: "Last Month",
      startDate: startOfMonth(subMonths(now, 1)).toISOString().split('T')[0],
      endDate: endOfMonth(subMonths(now, 1)).toISOString().split('T')[0]
    },
    {
      label: "2 Months Ago",
      startDate: startOfMonth(subMonths(now, 2)).toISOString().split('T')[0],
      endDate: endOfMonth(subMonths(now, 2)).toISOString().split('T')[0]
    },
    {
      label: "Last 7 Days",
      startDate: subDays(now, 6).toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    },
    {
      label: "Last 30 Days",
      startDate: subDays(now, 29).toISOString().split('T')[0],
      endDate: now.toISOString().split('T')[0]
    }
  ];
};

export const getComparisonData = (campaign: Campaign, basePeriod: ComparisonPeriod, comparePeriod: ComparisonPeriod): ComparisonData => {
  const baseStats = getPeriodStats(campaign, {
    startDate: basePeriod.startDate,
    endDate: basePeriod.endDate
  });
  
  const compareStats = getPeriodStats(campaign, {
    startDate: comparePeriod.startDate,
    endDate: comparePeriod.endDate
  });
  
  // Calculate derived metrics for base period
  const baseCpl = baseStats.leads > 0 ? baseStats.adSpend / baseStats.leads : 0;
  const baseEpl = baseStats.leads > 0 ? baseStats.revenue / baseStats.leads : 0;
  const baseProfit = baseStats.revenue - baseStats.adSpend;
  const baseRoi = baseStats.adSpend > 0 ? (baseProfit / baseStats.adSpend) * 100 : 0;
  
  // Calculate derived metrics for compare period
  const compareCpl = compareStats.leads > 0 ? compareStats.adSpend / compareStats.leads : 0;
  const compareEpl = compareStats.leads > 0 ? compareStats.revenue / compareStats.leads : 0;
  const compareProfit = compareStats.revenue - compareStats.adSpend;
  const compareRoi = compareStats.adSpend > 0 ? (compareProfit / compareStats.adSpend) * 100 : 0;
  
  return {
    basePeriod,
    comparePeriod,
    baseStats: {
      ...baseStats,
      cpl: baseCpl,
      epl: baseEpl,
      profit: baseProfit,
      roi: baseRoi
    },
    compareStats: {
      ...compareStats,
      cpl: compareCpl,
      epl: compareEpl,
      profit: compareProfit,
      roi: compareRoi
    },
    changes: {
      adSpend: calculatePercentageChange(baseStats.adSpend, compareStats.adSpend),
      leads: calculatePercentageChange(baseStats.leads, compareStats.leads),
      cases: calculatePercentageChange(baseStats.cases, compareStats.cases),
      revenue: calculatePercentageChange(baseStats.revenue, compareStats.revenue),
      cpl: calculatePercentageChange(baseCpl, compareCpl),
      epl: calculatePercentageChange(baseEpl, compareEpl),
      profit: calculatePercentageChange(baseProfit, compareProfit),
      roi: calculatePercentageChange(baseRoi, compareRoi)
    }
  };
};

export const calculatePercentageChange = (current: number, previous: number): number => {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
};

export const getTrendColor = (change: number): string => {
  if (change > 0) return "text-success-DEFAULT";
  if (change < 0) return "text-error-DEFAULT";
  return "text-muted-foreground";
};

export const getTrendIcon = (change: number) => {
  if (change > 5) return "↗";
  if (change < -5) return "↘";
  return "→";
};
