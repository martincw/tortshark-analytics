
import { StatHistoryEntry } from "@/types/campaign";

export interface OptimizationResult {
  optimalDailySpend: number;
  currentEfficiency: number;
  confidenceScore: number;
  recommendation: string;
  marginalLeadsPerDollar: number;
  projectedLeadIncrease: number;
}

export interface RegressionModel {
  type: 'logarithmic' | 'quadratic' | 'linear';
  coefficients: number[];
  rSquared: number;
  predict: (spend: number) => number;
}

export const calculateOptimalSpend = (statsHistory: StatHistoryEntry[]): OptimizationResult | null => {
  // Filter data for last 60 days and ensure we have spend variation
  const recentData = statsHistory
    .filter(entry => entry.adSpend && entry.adSpend > 0 && entry.leads >= 0)
    .slice(0, 60);

  if (recentData.length < 10) {
    return null; // Insufficient data
  }

  // Check for spend variation
  const spends = recentData.map(d => d.adSpend || 0);
  const minSpend = Math.min(...spends);
  const maxSpend = Math.max(...spends);
  
  if (maxSpend - minSpend < minSpend * 0.2) {
    return null; // Not enough spend variation
  }

  // Try different regression models
  const models = [
    fitLogarithmicModel(recentData),
    fitQuadraticModel(recentData),
    fitLinearModel(recentData)
  ];

  // Select best model based on R-squared
  const bestModel = models.reduce((best, current) => 
    current.rSquared > best.rSquared ? current : best
  );

  if (bestModel.rSquared < 0.4) {
    return null; // Poor model fit
  }

  // Find optimal spend point
  const optimalSpend = findOptimalSpend(bestModel, minSpend, maxSpend);
  const currentAvgSpend = spends.reduce((a, b) => a + b, 0) / spends.length;
  const currentAvgLeads = recentData.reduce((a, b) => a + b.leads, 0) / recentData.length;
  
  // Calculate efficiency and recommendations
  const optimalLeads = bestModel.predict(optimalSpend);
  const currentOptimalLeads = bestModel.predict(currentAvgSpend);
  const efficiency = Math.min((currentOptimalLeads / optimalLeads) * 100, 100);
  
  const spendDifference = optimalSpend - currentAvgSpend;
  const leadIncrease = optimalLeads - currentOptimalLeads;
  
  let recommendation = "";
  if (Math.abs(spendDifference) < currentAvgSpend * 0.1) {
    recommendation = "Optimal spend range";
  } else if (spendDifference > 0) {
    recommendation = `Increase by $${Math.round(spendDifference)}/day`;
  } else {
    recommendation = `Decrease by $${Math.round(Math.abs(spendDifference))}/day`;
  }

  return {
    optimalDailySpend: Math.round(optimalSpend),
    currentEfficiency: Math.round(efficiency),
    confidenceScore: Math.round(bestModel.rSquared * 100),
    recommendation,
    marginalLeadsPerDollar: calculateMarginalLeads(bestModel, currentAvgSpend),
    projectedLeadIncrease: Math.round(leadIncrease)
  };
};

const fitLogarithmicModel = (data: StatHistoryEntry[]): RegressionModel => {
  const points = data.map(d => ({ x: Math.log(d.adSpend || 1), y: d.leads }));
  const { slope, intercept, rSquared } = linearRegression(points);
  
  return {
    type: 'logarithmic',
    coefficients: [slope, intercept],
    rSquared,
    predict: (spend: number) => Math.max(0, slope * Math.log(spend) + intercept)
  };
};

const fitQuadraticModel = (data: StatHistoryEntry[]): RegressionModel => {
  const points = data.map(d => ({ x: d.adSpend || 0, y: d.leads }));
  
  // Simple quadratic fitting using matrix operations
  const n = points.length;
  let sumX = 0, sumY = 0, sumX2 = 0, sumX3 = 0, sumX4 = 0, sumXY = 0, sumX2Y = 0;
  
  for (const point of points) {
    const x = point.x;
    const y = point.y;
    sumX += x;
    sumY += y;
    sumX2 += x * x;
    sumX3 += x * x * x;
    sumX4 += x * x * x * x;
    sumXY += x * y;
    sumX2Y += x * x * y;
  }
  
  // Solve system of equations for ax² + bx + c
  const denominator = n * sumX2 * sumX4 - n * sumX3 * sumX3 - sumX * sumX * sumX4 + 2 * sumX * sumX2 * sumX3 - sumX2 * sumX2 * sumX2;
  
  if (Math.abs(denominator) < 1e-10) {
    return fitLinearModel(data); // Fall back to linear
  }
  
  const a = (n * sumX2 * sumX2Y - n * sumX3 * sumXY - sumX * sumX * sumX2Y + sumX * sumX2 * sumY + sumX2 * sumX * sumXY - sumX2 * sumX2 * sumY) / denominator;
  const b = (n * sumX4 * sumXY - n * sumX3 * sumX2Y - sumX * sumX2 * sumX2Y + sumX * sumX3 * sumY + sumX2 * sumX2 * sumXY - sumX2 * sumX4 * sumY) / denominator;
  const c = (sumX2 * sumX4 * sumY - sumX2 * sumX3 * sumXY - sumX3 * sumX2 * sumY + sumX3 * sumX3 * sumY + sumX4 * sumX * sumXY - sumX4 * sumX2 * sumY) / denominator;
  
  // Calculate R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const point of points) {
    const predicted = a * point.x * point.x + b * point.x + c;
    ssRes += Math.pow(point.y - predicted, 2);
    ssTot += Math.pow(point.y - yMean, 2);
  }
  const rSquared = 1 - (ssRes / ssTot);
  
  return {
    type: 'quadratic',
    coefficients: [a, b, c],
    rSquared: Math.max(0, rSquared),
    predict: (spend: number) => Math.max(0, a * spend * spend + b * spend + c)
  };
};

const fitLinearModel = (data: StatHistoryEntry[]): RegressionModel => {
  const points = data.map(d => ({ x: d.adSpend || 0, y: d.leads }));
  const { slope, intercept, rSquared } = linearRegression(points);
  
  return {
    type: 'linear',
    coefficients: [slope, intercept],
    rSquared,
    predict: (spend: number) => Math.max(0, slope * spend + intercept)
  };
};

const linearRegression = (points: { x: number; y: number }[]): { slope: number; intercept: number; rSquared: number } => {
  const n = points.length;
  const sumX = points.reduce((sum, p) => sum + p.x, 0);
  const sumY = points.reduce((sum, p) => sum + p.y, 0);
  const sumXY = points.reduce((sum, p) => sum + p.x * p.y, 0);
  const sumXX = points.reduce((sum, p) => sum + p.x * p.x, 0);
  
  const slope = (n * sumXY - sumX * sumY) / (n * sumXX - sumX * sumX);
  const intercept = (sumY - slope * sumX) / n;
  
  // Calculate R-squared
  const yMean = sumY / n;
  let ssRes = 0, ssTot = 0;
  for (const point of points) {
    const predicted = slope * point.x + intercept;
    ssRes += Math.pow(point.y - predicted, 2);
    ssTot += Math.pow(point.y - yMean, 2);
  }
  const rSquared = 1 - (ssRes / ssTot);
  
  return { slope, intercept, rSquared: Math.max(0, rSquared) };
};

const findOptimalSpend = (model: RegressionModel, minSpend: number, maxSpend: number): number => {
  if (model.type === 'quadratic') {
    // For quadratic ax² + bx + c, optimal is at -b/(2a)
    const [a, b] = model.coefficients;
    if (a < 0) { // Inverted parabola
      const optimal = -b / (2 * a);
      return Math.max(minSpend, Math.min(maxSpend, optimal));
    }
  }
  
  // For logarithmic or linear models, find diminishing returns point
  const testPoints = 20;
  const stepSize = (maxSpend - minSpend) / testPoints;
  let bestSpend = minSpend;
  let bestEfficiency = 0;
  
  for (let i = 0; i <= testPoints; i++) {
    const spend = minSpend + i * stepSize;
    const marginalLeads = calculateMarginalLeads(model, spend);
    const efficiency = marginalLeads / spend; // Leads per dollar
    
    if (efficiency > bestEfficiency) {
      bestEfficiency = efficiency;
      bestSpend = spend;
    }
  }
  
  return bestSpend;
};

const calculateMarginalLeads = (model: RegressionModel, spend: number): number => {
  const delta = spend * 0.01; // 1% increase
  const currentLeads = model.predict(spend);
  const increasedLeads = model.predict(spend + delta);
  return (increasedLeads - currentLeads) / delta;
};
