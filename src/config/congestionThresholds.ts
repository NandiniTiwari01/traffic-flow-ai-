import { CongestionLevel } from '../types/traffic';

/**
 * Configurable Congestion Thresholds & Classification Rules
 * Centralized logic used across Simulation, Dashboard, Map, Predictions, and Analytics.
 */

export interface CongestionThresholds {
  lowDensityMax: number;       // <= 45% is Low
  mediumDensityMax: number;    // 45% - 75% is Medium, > 75% is High
  highSpeedMin: number;        // >= 28 km/h is Low (good flow)
  mediumSpeedMin: number;      // 16 - 28 km/h is Medium, < 16 km/h is High
  criticalQueueMeters: number; // > 150m is High
}

export const DEFAULT_CONGESTION_THRESHOLDS: CongestionThresholds = {
  lowDensityMax: 45,
  mediumDensityMax: 75,
  highSpeedMin: 28.0,
  mediumSpeedMin: 16.0,
  criticalQueueMeters: 150,
};

/**
 * Classifies traffic conditions into Low, Medium, or High congestion.
 */
export function classifyCongestionLevel(
  density: number,
  speed: number,
  thresholds: CongestionThresholds = DEFAULT_CONGESTION_THRESHOLDS
): CongestionLevel {
  if (density > thresholds.mediumDensityMax || speed < thresholds.mediumSpeedMin) {
    return 'High';
  }
  if (density > thresholds.lowDensityMax || speed < thresholds.highSpeedMin) {
    return 'Medium';
  }
  return 'Low';
}

/**
 * Calculates dynamic congestion probability (0 to 100%) based on real-time features.
 */
export function calculateCongestionProbability(
  density: number,
  speed: number,
  baseVolumePct: number = 100,
  isRushHour: boolean = false
): number {
  const densityWeight = (density / 100.0) * 65.0; // Up to 65% from density
  const speedPenalty = Math.max(0, (35.0 - speed) / 35.0) * 25.0; // Up to 25% from speed drop
  const volumeBoost = Math.max(0, (baseVolumePct - 100) / 100.0) * 15.0; // Up to 15% from volume surge
  const rushHourBoost = isRushHour ? 8.0 : 0.0;

  const raw = densityWeight + speedPenalty + volumeBoost + rushHourBoost;
  return Math.min(99, Math.max(8, Math.round(raw)));
}
