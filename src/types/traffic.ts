export type CongestionLevel = 'Low' | 'Medium' | 'High';

export type TrafficDataSource = 'simulation' | 'cctv_video';

export interface VehicleBreakdown {
  twoWheelers: number;
  fourWheelers: number;
  busesTrucks: number;
  autoRickshaws: number;
}

export interface PredictionHorizon {
  minutes5: {
    predictedVehicleCount: number;
    predictedSpeed: number;
    predictedDensity: number;
    congestionLevel: CongestionLevel;
    congestionProbability: number; // 0-100%
  };
  minutes10: {
    predictedVehicleCount: number;
    predictedSpeed: number;
    predictedDensity: number;
    congestionLevel: CongestionLevel;
    congestionProbability: number;
  };
  minutes15: {
    predictedVehicleCount: number;
    predictedSpeed: number;
    predictedDensity: number;
    congestionLevel: CongestionLevel;
    congestionProbability: number;
  };
  minutes30: {
    predictedVehicleCount: number;
    predictedSpeed: number;
    predictedDensity: number;
    congestionLevel: CongestionLevel;
    congestionProbability: number;
  };
}

export interface AlternativeRoute {
  routeName: string;
  detourDesc: string;
  expectedSavingsMin: number;
}

export interface SignalRecommendation {
  id: string;
  junctionId: string;
  junctionName: string;
  currentGreenTime: number; // in seconds
  recommendedGreenTime: number; // in seconds
  difference: number; // recommended - current
  reason: string;
  horizonMinute: number;
  status: 'PENDING' | 'ACCEPTED' | 'REJECTED';
  timestamp: string;
  severity: 'moderate' | 'critical' | 'normal';
  alternativeRoute?: AlternativeRoute;
}

export interface Alert {
  id: string;
  junctionId: string;
  junctionName: string;
  type: 'CONGESTION_PREDICTED' | 'SPEED_DECREASING' | 'JUNCTION_OVERLOADED' | 'INCIDENT' | 'WEATHER';
  title: string;
  message: string;
  severity: 'high' | 'medium' | 'low';
  timestamp: string;
  dismissed: boolean;
  actionRequired?: string;
}

export interface Junction {
  id: string;
  name: string;
  marathiName?: string;
  area: string;
  coordinates: [number, number]; // [lat, lng]
  description: string;
  cctvId: string;
  lanes: number;
  capacity: number; // max vehicles per minute
  
  // Real-time dynamic simulation data
  vehicleCount: number;
  averageSpeed: number; // km/h
  density: number; // percentage 0-100
  status: CongestionLevel;
  queueLength: number; // meters
  throughput: number; // vehicles/hr
  vehicleBreakdown: VehicleBreakdown;
  
  // Signal State
  currentGreenTime: number;
  signalPhase: 'North-South' | 'East-West' | 'All-Pedestrian' | 'Left-Turn-Only';
  isAutoOptimized: boolean;

  // AI Predictions
  predictions: PredictionHorizon;
  recommendation?: SignalRecommendation;
}

export interface SimulationControls {
  isRunning: boolean;
  simulationSpeed: number; // 0.5, 1, 2, 5
  baseTrafficVolume: number; // 50 to 200 percentage
  weather: 'Clear' | 'Rain' | 'Festival' | 'Construction';
  timeOfDay: string; // e.g. "18:45"
  activeIncident: string | null;
}

export interface NetworkSummary {
  totalJunctions: number;
  highTrafficJunctions: number;
  mediumTrafficJunctions: number;
  lowTrafficJunctions: number;
  activeAlertsCount: number;
  predictedCongestionCount: number;
  averageSpeed: number;
  averageDensity: number;
  totalVehicles: number;
  signalsOptimizedCount: number;
}
