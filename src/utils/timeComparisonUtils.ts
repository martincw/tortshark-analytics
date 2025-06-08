
import { Campaign } from "@/types/campaign";
import { getPeriodStats } from "./campaignUtils";
import { startOfWeek, endOfWeek, startOfMonth, endOfMonth, subWeeks, subMonths, format } from "date-fns";

export interface WeeklyData {
  period: string;
  startDate: string;
  endDate: string;
  adSpend: number;
  leads: number;
  cases: number;
  revenue: number;
  cpl: number;
  epl: number;
  profit: number;
  roi: number;
}

export interface MonthlyData {
  period: string;
  startDate: string;
  endDate: string;
  adSpend: number;
  leads: number;
  cases: number;
  revenue: number;
  cpl: number;
  epl: number;
  profit: number;
  roi: number;
}

export const getWeeklyComparison = (campaign: Campaign): WeeklyData[] => {
  const now = new Date();
  const weeks: WeeklyData[] = [];
  
  for (let i = 0; i < 4; i++) {
    const weekStart = startOfWeek(subWeeks(now, i), { weekStartsOn: 1 }); // Monday start
    const weekEnd = endOfWeek(subWeeks(now, i), { weekStartsOn: 1 });
    
    const stats = getPeriodStats(campaign, {
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0]
    });
    
    const cpl = stats.leads > 0 ? stats.adSpend / stats.leads : 0;
    const epl = stats.leads > 0 ? stats.revenue / stats.leads : 0;
    const profit = stats.revenue - stats.adSpend;
    const roi = stats.adSpend > 0 ? (profit / stats.adSpend) * 100 : 0;
    
    let periodName = "";
    if (i === 0) periodName = "This Week";
    else if (i === 1) periodName = "Last Week";
    else if (i === 2) periodName = "2 Weeks Ago";
    else periodName = "3 Weeks Ago";
    
    weeks.push({
      period: periodName,
      startDate: weekStart.toISOString().split('T')[0],
      endDate: weekEnd.toISOString().split('T')[0],
      adSpend: stats.adSpend,
      leads: stats.leads,
      cases: stats.cases,
      revenue: stats.revenue,
      cpl,
      epl,
      profit,
      roi
    });
  }
  
  return weeks;
};

export const getMonthlyComparison = (campaign: Campaign): MonthlyData[] => {
  const now = new Date();
  const months: MonthlyData[] = [];
  
  for (let i = 0; i < 3; i++) {
    const monthStart = startOfMonth(subMonths(now, i));
    const monthEnd = endOfMonth(subMonths(now, i));
    
    const stats = getPeriodStats(campaign, {
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0]
    });
    
    const cpl = stats.leads > 0 ? stats.adSpend / stats.leads : 0;
    const epl = stats.leads > 0 ? stats.revenue / stats.leads : 0;
    const profit = stats.revenue - stats.adSpend;
    const roi = stats.adSpend > 0 ? (profit / stats.adSpend) * 100 : 0;
    
    let periodName = "";
    if (i === 0) periodName = "This Month";
    else if (i === 1) periodName = "Last Month";
    else periodName = "2 Months Ago";
    
    months.push({
      period: periodName,
      startDate: monthStart.toISOString().split('T')[0],
      endDate: monthEnd.toISOString().split('T')[0],
      adSpend: stats.adSpend,
      leads: stats.leads,
      cases: stats.cases,
      revenue: stats.revenue,
      cpl,
      epl,
      profit,
      roi
    });
  }
  
  return months;
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
