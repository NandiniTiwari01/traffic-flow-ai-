/**
 * Environmental Impact & Economic Calculation Assumptions
 * Configurable parameters for estimating fuel, CO2, idle time, and monetary savings
 * across Nagpur Smart City corridors.
 */

export interface EnvironmentalAssumptions {
  // Fuel consumption during vehicle idling (Liters per hour)
  idleFuelConsumptionLitersPerHour: {
    twoWheelers: number;
    fourWheelers: number;
    autoRickshaws: number;
    busesTrucks: number;
  };
  
  // Weighted composite average fuel idling rate (Liters per minute per vehicle)
  weightedCompositeFuelPerMin: number;
  
  // Fuel price in INR per liter (Nagpur retail average)
  fuelPriceInrPerLiter: number;
  
  // CO2 emission factor (kg CO2 per Liter of fuel consumed)
  co2EmissionFactorKgPerLiter: number;
  
  // Peak rush hours per operating day
  peakOperatingHoursPerDay: number;
}

export const DEFAULT_ENVIRONMENTAL_ASSUMPTIONS: EnvironmentalAssumptions = {
  idleFuelConsumptionLitersPerHour: {
    twoWheelers: 0.30,   // ~0.005 L/min
    fourWheelers: 1.15,  // ~0.019 L/min
    autoRickshaws: 0.65, // ~0.011 L/min
    busesTrucks: 2.75,   // ~0.045 L/min
  },
  weightedCompositeFuelPerMin: 0.0185, // ~1.11 L/hr composite vehicle
  fuelPriceInrPerLiter: 103.50,        // ₹103.50 / Liter in Maharashtra
  co2EmissionFactorKgPerLiter: 2.31,   // 2.31 kg CO2 / Liter
  peakOperatingHoursPerDay: 7.0,       // 7 peak hours daily
};

export interface JunctionEnvironmentalMetrics {
  junctionId: string;
  junctionName: string;
  
  // Before AI (Baseline)
  beforeSpeedKmh: number;
  beforeVehicleCount: number;
  beforeIdleTimeMin: number;
  beforeFuelUsedLitersDay: number;
  
  // After AI (Optimized)
  afterSpeedKmh: number;
  afterVehicleCount: number;
  afterIdleTimeMin: number;
  afterFuelUsedLitersDay: number;
  
  // Reductions & Savings
  idleTimeReducedMin: number;
  fuelSavedLitersDay: number;
  co2ReducedKgDay: number;
  monetarySavingsInrDay: number;
}

export interface CityEnvironmentalSummary {
  totalIdleTimeSavedMinVehicle: number;
  totalFuelSavedLitersDay: number;
  totalCo2ReducedKgDay: number;
  totalMonetarySavingsInrDay: number;
  averageSpeedBoostKmh: number;
  junctionBreakdown: JunctionEnvironmentalMetrics[];
}

/**
 * Calculates dynamic before/after environmental metrics for a given junction.
 */
export function calculateJunctionEnvironmentalMetrics(
  junction: {
    id: string;
    name: string;
    vehicleCount: number;
    averageSpeed: number;
    density: number;
    recommendation?: { difference?: number; recommendedGreenTime?: number; currentGreenTime?: number };
    vehicleBreakdown?: { twoWheelers: number; fourWheelers: number; autoRickshaws: number; busesTrucks: number };
  },
  assumptions: EnvironmentalAssumptions = DEFAULT_ENVIRONMENTAL_ASSUMPTIONS
): JunctionEnvironmentalMetrics {
  const count = Math.max(1, junction.vehicleCount);
  const density = Math.max(10, junction.density);
  const currentSpeed = Math.max(5, junction.averageSpeed);

  // Calculate baseline idle queue waiting time (minutes per vehicle)
  // Higher density & low speed = higher idle waiting time
  const beforeIdleTimeMin = Number(Math.max(1.8, ((density / 100) * 8.5) + (35 / currentSpeed)).toFixed(1));

  // Determine post-AI optimization improvement
  const greenDiff = junction.recommendation?.difference ?? 15;
  const speedGain = Math.max(3, Math.round(greenDiff * 0.35));
  const afterSpeedKmh = Math.min(52, currentSpeed + speedGain);

  // Post-AI reduced idle time (saving 25-45% of idling)
  const idleReductionFactor = Math.min(0.55, 0.20 + (greenDiff / 60.0));
  const idleTimeReducedMin = Number((beforeIdleTimeMin * idleReductionFactor).toFixed(1));
  const afterIdleTimeMin = Number(Math.max(1.0, beforeIdleTimeMin - idleTimeReducedMin).toFixed(1));

  // Vehicle mix composite fuel rate
  const vb = junction.vehicleBreakdown;
  let compositeFuelRate = assumptions.weightedCompositeFuelPerMin;
  if (vb) {
    const totalV = Math.max(1, vb.twoWheelers + vb.fourWheelers + vb.autoRickshaws + vb.busesTrucks);
    const hourlyL = (
      (vb.twoWheelers * assumptions.idleFuelConsumptionLitersPerHour.twoWheelers) +
      (vb.fourWheelers * assumptions.idleFuelConsumptionLitersPerHour.fourWheelers) +
      (vb.autoRickshaws * assumptions.idleFuelConsumptionLitersPerHour.autoRickshaws) +
      (vb.busesTrucks * assumptions.idleFuelConsumptionLitersPerHour.busesTrucks)
    ) / totalV;
    compositeFuelRate = hourlyL / 60.0;
  }

  // Daily cycle calculations (peak hours scaling)
  // Daily vehicles serviced at junction = count * peak hours * flow turnover factor
  const dailyVehicleThroughput = count * assumptions.peakOperatingHoursPerDay * 4.2;

  // Daily fuel saved = (idle minutes saved / vehicle) * (composite fuel L/min) * daily vehicles
  const fuelSavedLitersDay = Number((idleTimeReducedMin * compositeFuelRate * dailyVehicleThroughput).toFixed(1));
  const beforeFuelUsedLitersDay = Number((beforeIdleTimeMin * compositeFuelRate * dailyVehicleThroughput).toFixed(1));
  const afterFuelUsedLitersDay = Number(Math.max(0, beforeFuelUsedLitersDay - fuelSavedLitersDay).toFixed(1));

  // CO2 Reduced (kg/day) = fuelSaved * 2.31
  const co2ReducedKgDay = Number((fuelSavedLitersDay * assumptions.co2EmissionFactorKgPerLiter).toFixed(1));

  // Monetary Savings (₹/day) = fuelSaved * fuelPrice
  const monetarySavingsInrDay = Math.round(fuelSavedLitersDay * assumptions.fuelPriceInrPerLiter);

  return {
    junctionId: junction.id,
    junctionName: junction.name,
    beforeSpeedKmh: currentSpeed,
    beforeVehicleCount: count,
    beforeIdleTimeMin,
    beforeFuelUsedLitersDay,
    afterSpeedKmh,
    afterVehicleCount: Math.round(count * 1.05), // Higher throughput cleared
    afterIdleTimeMin,
    afterFuelUsedLitersDay,
    idleTimeReducedMin,
    fuelSavedLitersDay,
    co2ReducedKgDay,
    monetarySavingsInrDay,
  };
}

/**
 * Aggregates environmental impact metrics across all junctions.
 */
export function calculateCityWideEnvironmentalSummary(
  junctions: Array<{
    id: string;
    name: string;
    vehicleCount: number;
    averageSpeed: number;
    density: number;
    recommendation?: { difference?: number; recommendedGreenTime?: number; currentGreenTime?: number };
    vehicleBreakdown?: { twoWheelers: number; fourWheelers: number; autoRickshaws: number; busesTrucks: number };
  }>,
  assumptions: EnvironmentalAssumptions = DEFAULT_ENVIRONMENTAL_ASSUMPTIONS
): CityEnvironmentalSummary {
  const breakdown = junctions.map(j => calculateJunctionEnvironmentalMetrics(j, assumptions));

  const totalFuelSavedLitersDay = Number(breakdown.reduce((acc, b) => acc + b.fuelSavedLitersDay, 0).toFixed(1));
  const totalCo2ReducedKgDay = Number(breakdown.reduce((acc, b) => acc + b.co2ReducedKgDay, 0).toFixed(1));
  const totalMonetarySavingsInrDay = breakdown.reduce((acc, b) => acc + b.monetarySavingsInrDay, 0);
  
  const avgIdleSaved = breakdown.length > 0
    ? Number((breakdown.reduce((acc, b) => acc + b.idleTimeReducedMin, 0) / breakdown.length).toFixed(1))
    : 3.0;

  const avgSpeedBoost = breakdown.length > 0
    ? Number((breakdown.reduce((acc, b) => acc + (b.afterSpeedKmh - b.beforeSpeedKmh), 0) / breakdown.length).toFixed(1))
    : 5.5;

  return {
    totalIdleTimeSavedMinVehicle: avgIdleSaved,
    totalFuelSavedLitersDay,
    totalCo2ReducedKgDay,
    totalMonetarySavingsInrDay,
    averageSpeedBoostKmh: avgSpeedBoost,
    junctionBreakdown: breakdown,
  };
}
