import { StatHistoryEntry } from "@/types/campaign";

export interface OptimizationResult {
  optimalDailySpend: number;
  currentEfficiency: number;
  confidenceScore: number;
  recommendation: string;
  marginalLeadsPerDollar: number;
  projectedLeadIncrease: number;
  analysisType: 'advanced' | 'basic' | 'gathering' | 'insufficient_variation' | 'low_confidence';
}

export interface RegressionModel {
  type: 'logarithmic' | 'quadratic' | 'linear';
  coefficients: number[];
  rSquared: number;
  predict: (spend: number) => number;
}

export const calculateOptimalSpend = (statsHistory: StatHistoryEntry[]): OptimizationResult | null => {
  console.log(`Spend optimization: Processing ${statsHistory?.length || 0} data points`);
  
  // Filter data for last 60 days and ensure we have valid data
  const recentData = statsHistory
    ?.filter(entry => entry.adSpend && entry.adSpend > 0 && entry.leads >= 0)
    ?.slice(0, 60) || [];

  console.log(`Spend optimization: Filtered to ${recentData.length} valid data points`);

  // State 1: Gathering data (less than 5 data points)
  if (recentData.length < 5) {
    return {
      optimalDailySpend: 0,
      currentEfficiency: 0,
      confidenceScore: 0,
      recommendation: "Gathering performance data...",
      marginalLeadsPerDollar: 0,
      projectedLeadIncrease: 0,
      analysisType: 'gathering'
    };
  }

  // Check for spend variation
  const spends = recentData.map(d => d.adSpend || 0);
  const minSpend = Math.min(...spends);
  const maxSpend = Math.max(...spends);
  const avgSpend = spends.reduce((a, b) => a + b, 0) / spends.length;
  
  console.log(`Spend optimization: Min: $${minSpend}, Max: $${maxSpend}, Avg: $${avgSpend}`);

  // State 2: Insufficient spend variation
  if (maxSpend - minSpend < Math.max(minSpend * 0.15, 50)) {
    return createBasicAnalysis(recentData, 'insufficient_variation');
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

  console.log(`Spend optimization: Best model R-squared: ${bestModel.rSquared}`);

  // State 3: Low confidence model (R-squared 0.2-0.4)
  if (bestModel.rSquared >= 0.2 && bestModel.rSquared < 0.4) {
    return createAdvancedAnalysis(bestModel, recentData, 'low_confidence');
  }

  // State 4: Poor model fit - use basic analysis
  if (bestModel.rSquared < 0.2) {
    return createBasicAnalysis(recentData, 'basic');
  }

  // State 5: Good model - advanced analysis
  return createAdvancedAnalysis(bestModel, recentData, 'advanced');
};

const createBasicAnalysis = (data: StatHistoryEntry[], type: 'basic' | 'insufficient_variation'): OptimizationResult => {
  const currentAvgSpend = data.reduce((a, b) => a + (b.adSpend || 0), 0) / data.length;
  const currentAvgLeads = data.reduce((a, b) => a + b.leads, 0) / data.length;
  const currentCPL = currentAvgSpend > 0 ? currentAvgSpend / currentAvgLeads : 0;
  
  // Industry benchmark: typical CPL ranges from $50-200 depending on vertical
  const benchmarkCPL = 125; // Conservative middle ground
  const efficiency = currentCPL > 0 ? Math.min((benchmarkCPL / currentCPL) * 100, 100) : 50;
  
  let recommendation = "";
  let optimalSpend = currentAvgSpend;
  
  if (type === 'insufficient_variation') {
    recommendation = "Try varying spend by ±20% to optimize";
    optimalSpend = currentAvgSpend * 1.2; // Suggest modest increase
  } else if (currentCPL > benchmarkCPL * 1.2) {
    recommendation = "Reduce spend to improve efficiency";
    optimalSpend = currentAvgSpend * 0.8;
  } else if (currentCPL < benchmarkCPL * 0.8 && efficiency > 70) {
    recommendation = "Consider increasing spend";
    optimalSpend = currentAvgSpend * 1.3;
  } else {
    recommendation = "Current spend appears balanced";
  }

  return {
    optimalDailySpend: Math.round(optimalSpend),
    currentEfficiency: Math.round(efficiency),
    confidenceScore: type === 'insufficient_variation' ? 30 : 45,
    recommendation,
    marginalLeadsPerDollar: currentAvgLeads / currentAvgSpend || 0,
    projectedLeadIncrease: Math.round((optimalSpend - currentAvgSpend) * (currentAvgLeads / currentAvgSpend || 0)),
    analysisType: type
  };
};

const createAdvancedAnalysis = (model: RegressionModel, data: StatHistoryEntry[], type: 'advanced' | 'low_confidence'): OptimizationResult => {
  const spends = data.map(d => d.adSpend || 0);
  const minSpend = Math.min(...spends);
  const maxSpend = Math.max(...spends);
  
  // Find optimal spend point
  const optimalSpend = findOptimalSpend(model, minSpend, maxSpend);
  const currentAvgSpend = spends.reduce((a, b) => a + b, 0) / spends.length;
  const currentAvgLeads = data.reduce((a, b) => a + b.leads, 0) / data.length;
  
  // Calculate efficiency and recommendations
  const optimalLeads = model.predict(optimalSpend);
  const currentOptimalLeads = model.predict(currentAvgSpend);
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

  // Adjust confidence based on analysis type
  const baseConfidence = Math.round(model.rSquared * 100);
  const adjustedConfidence = type === 'low_confidence' ? Math.min(baseConfidence, 60) : baseConfidence;

  return {
    optimalDailySpend: Math.round(optimalSpend),
    currentEfficiency: Math.round(efficiency),
    confidenceScore: adjustedConfidence,
    recommendation,
    marginalLeadsPerDollar: calculateMarginalLeads(model, currentAvgSpend),
    projectedLeadIncrease: Math.round(leadIncrease),
    analysisType: type
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
