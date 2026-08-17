import React, { createContext, useContext, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Junction, 
  Alert, 
  SignalRecommendation, 
  SimulationControls, 
  NetworkSummary, 
  CongestionLevel,
  TrafficDataSource,
  VehicleBreakdown
} from '../types/traffic';
import { CCTVVideoAnalysisResponse } from '../services/api';
import { INITIAL_NAGPUR_JUNCTIONS } from '../data/nagpurJunctions';
import { 
  classifyCongestionLevel, 
  calculateCongestionProbability 
} from '../config/congestionThresholds';
import confetti from 'canvas-confetti';

interface TrafficContextType {
  junctions: Junction[];
  selectedJunction: Junction | null;
  setSelectedJunction: (junction: Junction | null) => void;
  dataSource: TrafficDataSource;
  setDataSource: (source: TrafficDataSource) => void;
  activeVideoAnalysis: CCTVVideoAnalysisResponse | null;
  applyVideoAnalysis: (analysis: CCTVVideoAnalysisResponse, targetJunctionId?: string) => void;
  clearVideoAnalysis: () => void;
  alerts: Alert[];
  dismissAlert: (id: string) => void;
  clearAllAlerts: () => void;
  recommendations: SignalRecommendation[];
  acceptRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  acceptAllRecommendations: () => void;
  simulationControls: SimulationControls;
  toggleSimulation: () => void;
  resetSimulation: () => void;
  setSimulationSpeed: (speed: number) => void;
  setTrafficVolume: (volume: number) => void;
  setWeatherCondition: (weather: SimulationControls['weather']) => void;
  injectIncident: (junctionId: string, incidentName: string) => void;
  resolveIncident: () => void;
  networkSummary: NetworkSummary;
  tickCount: number;
  lastUpdated: string;
}

const TrafficContext = createContext<TrafficContextType | undefined>(undefined);

// Network connections for downstream spillover (e.g. Sitabuldi -> Chhatrapati Sq & Lokmat Sq)
const JUNCTION_CONNECTIONS: Record<string, string[]> = {
  'nag-01': ['nag-04', 'nag-07', 'nag-02'], // Sitabuldi -> Chhatrapati, Lokmat, Dharampeth
  'nag-02': ['nag-03'],                    // Dharampeth -> Shankar Nagar
  'nag-03': ['nag-01', 'nag-06'],          // Shankar Nagar -> Sitabuldi, Sadar
  'nag-04': ['nag-05', 'nag-07'],          // Chhatrapati Sq -> Medical Sq, Lokmat Sq
  'nag-05': ['nag-01'],                    // Medical Sq -> Sitabuldi
  'nag-06': ['nag-01'],                    // Sadar -> Sitabuldi
  'nag-07': ['nag-01', 'nag-04'],          // Lokmat Sq -> Sitabuldi, Chhatrapati
};

export const TrafficProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [junctions, setJunctions] = useState<Junction[]>(() => {
    return JSON.parse(JSON.stringify(INITIAL_NAGPUR_JUNCTIONS));
  });

  const [selectedJunctionId, setSelectedJunctionId] = useState<string | null>('nag-01');
  const [dataSource, setDataSource] = useState<TrafficDataSource>('simulation');
  const [activeVideoAnalysis, setActiveVideoAnalysis] = useState<CCTVVideoAnalysisResponse | null>(null);

  const [simulationControls, setSimulationControls] = useState<SimulationControls>({
    isRunning: true,
    simulationSpeed: 1,
    baseTrafficVolume: 100, // 50% to 200%
    weather: 'Clear',
    timeOfDay: '18:45',
    activeIncident: null,
  });

  const [alerts, setAlerts] = useState<Alert[]>([
    {
      id: 'alt-01',
      junctionId: 'nag-01',
      junctionName: 'Sitabuldi Interchange',
      type: 'CONGESTION_PREDICTED',
      title: 'High Congestion Predicted (+10 min)',
      message: 'AI models forecast heavy convergence on Wardha Rd. Projected density > 90%.',
      severity: 'high',
      timestamp: '1 min ago',
      dismissed: false,
      actionRequired: 'Extend North-South green phase by +20s'
    },
    {
      id: 'alt-02',
      junctionId: 'nag-04',
      junctionName: 'Chhatrapati Square',
      type: 'SPEED_DECREASING',
      title: 'Traffic Speed Decreasing',
      message: 'Average velocity dropping towards Ring Road confluence.',
      severity: 'medium',
      timestamp: '4 mins ago',
      dismissed: false,
      actionRequired: 'Synchronize green wave toward Ring Road'
    }
  ]);

  const [signalsOptimizedCount, setSignalsOptimizedCount] = useState<number>(4);
  const [tickCount, setTickCount] = useState<number>(0);
  const [lastUpdated, setLastUpdated] = useState<string>('Just now');

  // Track downstream spillover queue for connected junctions
  const spilloverQueueRef = useRef<Record<string, number>>({});

  // Apply CCTV Video Analysis Telemetry into Junction
  const applyVideoAnalysis = useCallback((analysis: CCTVVideoAnalysisResponse, targetJunctionId?: string) => {
    const targetId = targetJunctionId || selectedJunctionId || 'nag-01';
    setActiveVideoAnalysis(analysis);
    setDataSource('cctv_video');

    setJunctions(prev => prev.map(j => {
      if (j.id !== targetId) return j;

      const totalVeh = Math.max(1, analysis.total_vehicles);
      const density = analysis.traffic_density;
      const speed = analysis.average_speed_kmh;
      const statusLevel: CongestionLevel = classifyCongestionLevel(density, speed);

      let updatedPredictions = j.predictions;
      if (analysis.predictions) {
        const p = analysis.predictions;
        updatedPredictions = {
          minutes5: {
            predictedVehicleCount: p['5m'].predicted_vehicle_count,
            predictedSpeed: p['5m'].predicted_speed,
            predictedDensity: p['5m'].predicted_density,
            congestionLevel: (p['5m'].congestion_level as CongestionLevel) || 'Medium',
            congestionProbability: p['5m'].congestion_probability,
          },
          minutes10: {
            predictedVehicleCount: p['10m'].predicted_vehicle_count,
            predictedSpeed: p['10m'].predicted_speed,
            predictedDensity: p['10m'].predicted_density,
            congestionLevel: (p['10m'].congestion_level as CongestionLevel) || 'High',
            congestionProbability: p['10m'].congestion_probability,
          },
          minutes15: {
            predictedVehicleCount: p['15m'].predicted_vehicle_count,
            predictedSpeed: p['15m'].predicted_speed,
            predictedDensity: p['15m'].predicted_density,
            congestionLevel: (p['15m'].congestion_level as CongestionLevel) || 'High',
            congestionProbability: p['15m'].congestion_probability,
          },
          minutes30: {
            predictedVehicleCount: p['30m'].predicted_vehicle_count,
            predictedSpeed: p['30m'].predicted_speed,
            predictedDensity: p['30m'].predicted_density,
            congestionLevel: (p['30m'].congestion_level as CongestionLevel) || 'Medium',
            congestionProbability: p['30m'].congestion_probability,
          },
        };
      }

      let updatedRecommendation = j.recommendation;
      if (analysis.signal_recommendation) {
        const sig = analysis.signal_recommendation;
        updatedRecommendation = {
          id: `rec-cctv-${Date.now()}`,
          junctionId: j.id,
          junctionName: j.name,
          currentGreenTime: sig.current_green,
          recommendedGreenTime: sig.recommended_green,
          difference: sig.change_seconds,
          reason: sig.reason,
          horizonMinute: 10,
          status: 'PENDING',
          timestamp: 'Just now',
          severity: sig.change_seconds > 20 ? 'critical' : 'moderate',
          alternativeRoute: j.recommendation?.alternativeRoute
        };
      }

      return {
        ...j,
        vehicleCount: totalVeh,
        averageSpeed: speed,
        density: density,
        status: statusLevel,
        queueLength: analysis.queue_estimate_meters,
        vehicleBreakdown: {
          twoWheelers: analysis.vehicle_counts.motorcycle,
          fourWheelers: analysis.vehicle_counts.car,
          busesTrucks: analysis.vehicle_counts.bus + analysis.vehicle_counts.truck,
          autoRickshaws: Math.max(1, Math.round(analysis.vehicle_counts.car * 0.25)),
        },
        predictions: updatedPredictions,
        recommendation: updatedRecommendation,
      };
    }));

    try {
      confetti({ particleCount: 40, spread: 55, origin: { y: 0.75 } });
    } catch {}
  }, [selectedJunctionId]);

  const clearVideoAnalysis = useCallback(() => {
    setActiveVideoAnalysis(null);
    setDataSource('simulation');
  }, []);

  const recommendations = useMemo(() => {
    return junctions
      .map(j => j.recommendation)
      .filter((r): r is SignalRecommendation => Boolean(r));
  }, [junctions]);

  const selectedJunction = useMemo(() => {
    return junctions.find(j => j.id === selectedJunctionId) || junctions[0] || null;
  }, [junctions, selectedJunctionId]);

  const setSelectedJunction = (j: Junction | null) => {
    setSelectedJunctionId(j ? j.id : null);
  };

  const dismissAlert = useCallback((id: string) => {
    setAlerts(prev => prev.filter(a => a.id !== id));
  }, []);

  const clearAllAlerts = useCallback(() => {
    setAlerts([]);
  }, []);

  const acceptRecommendation = useCallback((recId: string) => {
    setJunctions(prev => prev.map(j => {
      if (j.recommendation && j.recommendation.id === recId) {
        const newGreen = j.recommendation.recommendedGreenTime;
        const speedBoost = Math.round(j.recommendation.difference * 0.4);
        const densityRelief = Math.round(j.recommendation.difference * 0.8);
        const newDensity = Math.max(15, j.density - Math.max(8, densityRelief));
        const newSpeed = Math.min(50, j.averageSpeed + Math.max(3, speedBoost));

        return {
          ...j,
          currentGreenTime: newGreen,
          averageSpeed: newSpeed,
          density: newDensity,
          status: classifyCongestionLevel(newDensity, newSpeed),
          queueLength: Math.max(10, j.queueLength - 40),
          isAutoOptimized: true,
          recommendation: {
            ...j.recommendation,
            status: 'ACCEPTED'
          }
        };
      }
      return j;
    }));

    setSignalsOptimizedCount(c => c + 1);

    try {
      confetti({ particleCount: 50, spread: 60, origin: { y: 0.8 } });
    } catch {}
  }, []);

  const rejectRecommendation = useCallback((recId: string) => {
    setJunctions(prev => prev.map(j => {
      if (j.recommendation && j.recommendation.id === recId) {
        return {
          ...j,
          recommendation: {
            ...j.recommendation,
            status: 'REJECTED'
          }
        };
      }
      return j;
    }));
  }, []);

  const acceptAllRecommendations = useCallback(() => {
    setJunctions(prev => prev.map(j => {
      if (j.recommendation && j.recommendation.status === 'PENDING') {
        const newGreen = j.recommendation.recommendedGreenTime;
        return {
          ...j,
          currentGreenTime: newGreen,
          averageSpeed: Math.min(50, j.averageSpeed + 5),
          density: Math.max(20, j.density - 15),
          status: 'Low',
          queueLength: Math.max(10, j.queueLength - 30),
          isAutoOptimized: true,
          recommendation: {
            ...j.recommendation,
            status: 'ACCEPTED'
          }
        };
      }
      return j;
    }));
    setSignalsOptimizedCount(c => c + recommendations.length);
  }, [recommendations.length]);

  const toggleSimulation = useCallback(() => {
    setSimulationControls(prev => ({ ...prev, isRunning: !prev.isRunning }));
  }, []);

  const resetSimulation = useCallback(() => {
    setJunctions(JSON.parse(JSON.stringify(INITIAL_NAGPUR_JUNCTIONS)));
    setSimulationControls({
      isRunning: true,
      simulationSpeed: 1,
      baseTrafficVolume: 100,
      weather: 'Clear',
      timeOfDay: '18:45',
      activeIncident: null,
    });
    setSignalsOptimizedCount(0);
    setTickCount(0);
    setDataSource('simulation');
    setActiveVideoAnalysis(null);
    spilloverQueueRef.current = {};
  }, []);

  const setSimulationSpeed = useCallback((speed: number) => {
    setSimulationControls(prev => ({ ...prev, simulationSpeed: speed }));
  }, []);

  const setTrafficVolume = useCallback((volume: number) => {
    setSimulationControls(prev => ({ ...prev, baseTrafficVolume: volume }));
  }, []);

  const setWeatherCondition = useCallback((weather: SimulationControls['weather']) => {
    setSimulationControls(prev => ({ ...prev, weather }));
  }, []);

  const injectIncident = useCallback((junctionId: string, incidentName: string) => {
    setSimulationControls(prev => ({ ...prev, activeIncident: incidentName }));
    setJunctions(prev => prev.map(j => {
      if (j.id === junctionId) {
        return {
          ...j,
          vehicleCount: Math.min(j.capacity * 2, j.vehicleCount + 75),
          averageSpeed: Math.max(6, Math.round(j.averageSpeed * 0.35)),
          density: 98,
          status: 'High',
          queueLength: j.queueLength + 150,
          recommendation: {
            id: 'rec-' + Date.now(),
            junctionId: j.id,
            junctionName: j.name,
            currentGreenTime: j.currentGreenTime,
            recommendedGreenTime: j.currentGreenTime + 30,
            difference: +30,
            reason: `EMERGENCY INCIDENT: ${incidentName}. Maximizing clearance green cycle to relieve acute gridlock.`,
            horizonMinute: 5,
            status: 'PENDING',
            timestamp: 'Just now',
            severity: 'critical',
            alternativeRoute: j.recommendation?.alternativeRoute
          }
        };
      }
      return j;
    }));

    setAlerts(prev => [
      {
        id: 'inc-alert-' + Date.now(),
        junctionId,
        junctionName: INITIAL_NAGPUR_JUNCTIONS.find(j => j.id === junctionId)?.name || 'Junction',
        type: 'INCIDENT',
        title: `CRITICAL INCIDENT: ${incidentName}`,
        message: `Corridor gridlock detected. Autonomous signal priority clearance dispatched.`,
        severity: 'high',
        timestamp: 'Just now',
        dismissed: false,
        actionRequired: 'Authorize +30s emergency green phase'
      },
      ...prev
    ]);
  }, []);

  const resolveIncident = useCallback(() => {
    setSimulationControls(prev => ({ ...prev, activeIncident: null }));
    setAlerts(prev => prev.filter(a => a.type !== 'INCIDENT'));
  }, []);

  // ---------------------------------------------------------------------------
  // 🔄 FULLY DYNAMIC, CONNECTED TRAFFIC SIMULATION LOOP (1 Second Interval)
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!simulationControls.isRunning) return;

    const intervalMs = Math.max(400, Math.round(1200 / simulationControls.simulationSpeed));

    const interval = setInterval(() => {
      setTickCount(t => t + 1);
      const now = new Date();
      setLastUpdated(now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }));

      // Process current spillovers
      const currentSpillovers = { ...spilloverQueueRef.current };
      const nextSpillovers: Record<string, number> = {};

      setJunctions(prevJunctions => {
        // Calculate new state for each junction
        const updated = prevJunctions.map(j => {
          // If CCTV video is overriding active junction, skip simulation tick for it
          if (dataSource === 'cctv_video' && j.id === (selectedJunctionId || 'nag-01') && activeVideoAnalysis) {
            return j;
          }

          // Weather modifiers
          let weatherSpeedFactor = 1.0;
          let weatherArrivalFactor = 1.0;
          if (simulationControls.weather === 'Rain') {
            weatherSpeedFactor = 0.72;
            weatherArrivalFactor = 1.25;
          } else if (simulationControls.weather === 'Festival') {
            weatherSpeedFactor = 0.85;
            weatherArrivalFactor = 1.45;
          } else if (simulationControls.weather === 'Construction') {
            weatherSpeedFactor = 0.78;
            weatherArrivalFactor = 1.15;
          }

          // Inflow calculation based on Volume Slider (50% - 200%)
          const volumeRatio = simulationControls.baseTrafficVolume / 100.0;
          
          // Target baseline vehicle volume for this junction given the slider
          const targetVehicles = Math.round(j.capacity * (0.25 + 0.65 * volumeRatio) * weatherArrivalFactor);
          
          // Inflow received from connected upstream junctions (spillover)
          const spilloverIn = currentSpillovers[j.id] || 0;

          // Arrival step towards target volume + natural variance
          const diffToTarget = targetVehicles - j.vehicleCount;
          const naturalFlowStep = Math.round(diffToTarget * 0.12) + Math.round((Math.random() - 0.48) * 4);
          const arrivalDelta = naturalFlowStep + spilloverIn;

          // Outflow clearance rate based on Green time & lanes
          const isGreenPhase = j.signalPhase === 'North-South' || j.signalPhase === 'East-West';
          const baseClearance = isGreenPhase ? (j.currentGreenTime / 60.0) * (j.lanes * 1.8) : (j.lanes * 0.8);
          const clearanceDelta = j.isAutoOptimized ? Math.round(baseClearance * 1.3) : Math.round(baseClearance);

          // Calculate new vehicle count
          const minPossible = Math.round(j.capacity * 0.18 * volumeRatio);
          const maxPossible = Math.round(j.capacity * 1.6 * volumeRatio);
          const newVehCount = Math.max(minPossible, Math.min(maxPossible, j.vehicleCount + arrivalDelta));

          // Forward a small portion of departed traffic to connected downstream junctions
          const connectedDownstream = JUNCTION_CONNECTIONS[j.id];
          if (connectedDownstream && connectedDownstream.length > 0 && newVehCount > j.capacity * 0.6) {
            const spilledVeh = Math.round(clearanceDelta * 0.35);
            connectedDownstream.forEach(downstreamId => {
              nextSpillovers[downstreamId] = (nextSpillovers[downstreamId] || 0) + Math.round(spilledVeh / connectedDownstream.length);
            });
          }

          // Density calculation: 0 - 100%
          const newDensity = Math.min(100, Math.max(10, Math.round((newVehCount / j.capacity) * 100)));

          // Speed calculation via Greenshields model: v = vf * (1 - k/kj)
          const freeFlowSpeed = 48.0;
          const rawSpeed = freeFlowSpeed * (1 - (newDensity / 115.0)) * weatherSpeedFactor;
          const newSpeed = Math.min(52, Math.max(6, Math.round(rawSpeed + (Math.random() - 0.5) * 2)));

          // Queue length in meters
          const newQueue = Math.max(5, Math.round((newVehCount * 2.8) * (newDensity / 100.0)));

          // Congestion Level classification
          const newStatus = classifyCongestionLevel(newDensity, newSpeed);

          // Vehicle breakdown dynamic percentages
          const vb: VehicleBreakdown = {
            twoWheelers: Math.round(newVehCount * 0.52),
            fourWheelers: Math.round(newVehCount * 0.28),
            autoRickshaws: Math.round(newVehCount * 0.12),
            busesTrucks: Math.max(1, Math.round(newVehCount * 0.08)),
          };

          // -------------------------------------------------------------------
          // DYNAMIC AI PREDICTION PROJECTIONS (5m, 10m, 15m, 30m)
          // -------------------------------------------------------------------
          const isSurging = volumeRatio >= 1.0;
          const g5 = isSurging ? 1.08 + (volumeRatio - 1) * 0.10 : 0.98;
          const g10 = isSurging ? 1.18 + (volumeRatio - 1) * 0.20 : 0.96;
          const g15 = isSurging ? 1.28 + (volumeRatio - 1) * 0.30 : 0.94;
          const g30 = isSurging ? 1.40 + (volumeRatio - 1) * 0.40 : 0.92;

          const p5_count = Math.round(newVehCount * g5);
          const p5_density = Math.min(100, Math.round(newDensity * g5));
          const p5_speed = Math.max(6, Math.round(newSpeed * (isSurging ? 0.94 : 1.04)));
          const p5_prob = calculateCongestionProbability(p5_density, p5_speed, simulationControls.baseTrafficVolume);

          const p10_count = Math.round(newVehCount * g10);
          const p10_density = Math.min(100, Math.round(newDensity * g10));
          const p10_speed = Math.max(5, Math.round(newSpeed * (isSurging ? 0.86 : 1.08)));
          const p10_prob = calculateCongestionProbability(p10_density, p10_speed, simulationControls.baseTrafficVolume);

          const p15_count = Math.round(newVehCount * g15);
          const p15_density = Math.min(100, Math.round(newDensity * g15));
          const p15_speed = Math.max(5, Math.round(newSpeed * (isSurging ? 0.78 : 1.12)));
          const p15_prob = calculateCongestionProbability(p15_density, p15_speed, simulationControls.baseTrafficVolume);

          const p30_count = Math.round(newVehCount * g30);
          const p30_density = Math.min(100, Math.round(newDensity * g30));
          const p30_speed = Math.max(5, Math.round(newSpeed * (isSurging ? 0.72 : 1.15)));
          const p30_prob = calculateCongestionProbability(p30_density, p30_speed, simulationControls.baseTrafficVolume);

          // -------------------------------------------------------------------
          // DYNAMIC SIGNAL RECOMMENDATION ENGINE
          // -------------------------------------------------------------------
          let updatedRecommendation = j.recommendation;
          const p10Status = classifyCongestionLevel(p10_density, p10_speed);

          if (p10Status === 'High' && (!j.recommendation || j.recommendation.status === 'REJECTED' || !j.isAutoOptimized)) {
            const recommendedDelta = p10_density > 85 ? +25 : +20;
            const recId = j.recommendation?.id || ('rec-' + j.id);
            updatedRecommendation = {
              id: recId,
              junctionId: j.id,
              junctionName: j.name,
              currentGreenTime: j.currentGreenTime,
              recommendedGreenTime: j.currentGreenTime + recommendedDelta,
              difference: recommendedDelta,
              reason: `High congestion predicted in 10 minutes (${p10_prob}% probability). High density (${p10_density}%) and low velocity (${p10_speed} km/h) detected on ${j.name}. Extend green phase by +${recommendedDelta}s.`,
              horizonMinute: 10,
              status: 'PENDING',
              timestamp: 'Just now',
              severity: 'critical',
              alternativeRoute: j.recommendation?.alternativeRoute
            };
          } else if (p10Status === 'Medium' && (!j.recommendation || j.recommendation.status === 'REJECTED')) {
            const recId = j.recommendation?.id || ('rec-' + j.id);
            updatedRecommendation = {
              id: recId,
              junctionId: j.id,
              junctionName: j.name,
              currentGreenTime: j.currentGreenTime,
              recommendedGreenTime: j.currentGreenTime + 15,
              difference: 15,
              reason: `Moderate congestion building (${p10_prob}% probability). Recommend +15s green extension to maintain equilibrium.`,
              horizonMinute: 10,
              status: 'PENDING',
              timestamp: 'Just now',
              severity: 'moderate',
              alternativeRoute: j.recommendation?.alternativeRoute
            };
          } else if (p10Status === 'Low' && j.recommendation?.status === 'PENDING') {
            updatedRecommendation = {
              ...j.recommendation,
              difference: 0,
              recommendedGreenTime: j.currentGreenTime,
              reason: 'Traffic flow is optimal. Current signal timing maintained.',
              severity: 'normal',
            };
          }

          return {
            ...j,
            vehicleCount: newVehCount,
            averageSpeed: newSpeed,
            density: newDensity,
            status: newStatus,
            queueLength: newQueue,
            vehicleBreakdown: vb,
            recommendation: updatedRecommendation,
            predictions: {
              minutes5: {
                predictedVehicleCount: p5_count,
                predictedSpeed: p5_speed,
                predictedDensity: p5_density,
                congestionLevel: classifyCongestionLevel(p5_density, p5_speed),
                congestionProbability: p5_prob,
              },
              minutes10: {
                predictedVehicleCount: p10_count,
                predictedSpeed: p10_speed,
                predictedDensity: p10_density,
                congestionLevel: p10Status,
                congestionProbability: p10_prob,
              },
              minutes15: {
                predictedVehicleCount: p15_count,
                predictedSpeed: p15_speed,
                predictedDensity: p15_density,
                congestionLevel: classifyCongestionLevel(p15_density, p15_speed),
                congestionProbability: p15_prob,
              },
              minutes30: {
                predictedVehicleCount: p30_count,
                predictedSpeed: p30_speed,
                predictedDensity: p30_density,
                congestionLevel: classifyCongestionLevel(p30_density, p30_speed),
                congestionProbability: p30_prob,
              }
            }
          };
        });

        spilloverQueueRef.current = nextSpillovers;
        return updated;
      });
    }, intervalMs);

    return () => clearInterval(interval);
  }, [
    simulationControls.isRunning, 
    simulationControls.simulationSpeed, 
    simulationControls.baseTrafficVolume, 
    simulationControls.weather, 
    dataSource, 
    selectedJunctionId, 
    activeVideoAnalysis
  ]);

  // Aggregate Network Summary
  const networkSummary: NetworkSummary = useMemo(() => {
    const totalJunctions = junctions.length;
    const highTrafficJunctions = junctions.filter(j => j.status === 'High').length;
    const mediumTrafficJunctions = junctions.filter(j => j.status === 'Medium').length;
    const lowTrafficJunctions = junctions.filter(j => j.status === 'Low').length;
    const activeAlertsCount = alerts.filter(a => !a.dismissed).length;
    const predictedCongestionCount = junctions.filter(
      j => j.predictions.minutes10.congestionLevel === 'High' || j.predictions.minutes15.congestionLevel === 'High'
    ).length;

    const totalVehicles = junctions.reduce((acc, j) => acc + j.vehicleCount, 0);
    const averageSpeed = totalJunctions > 0
      ? Math.round(junctions.reduce((acc, j) => acc + j.averageSpeed, 0) / totalJunctions)
      : 28;
    const averageDensity = totalJunctions > 0
      ? Math.round(junctions.reduce((acc, j) => acc + j.density, 0) / totalJunctions)
      : 55;

    return {
      totalJunctions,
      highTrafficJunctions,
      mediumTrafficJunctions,
      lowTrafficJunctions,
      activeAlertsCount,
      predictedCongestionCount,
      averageSpeed,
      averageDensity,
      totalVehicles,
      signalsOptimizedCount,
    };
  }, [junctions, alerts, signalsOptimizedCount]);

  return (
    <TrafficContext.Provider
      value={{
        junctions,
        selectedJunction,
        setSelectedJunction,
        dataSource,
        setDataSource,
        activeVideoAnalysis,
        applyVideoAnalysis,
        clearVideoAnalysis,
        alerts,
        dismissAlert,
        clearAllAlerts,
        recommendations,
        acceptRecommendation,
        rejectRecommendation,
        acceptAllRecommendations,
        simulationControls,
        toggleSimulation,
        resetSimulation,
        setSimulationSpeed,
        setTrafficVolume,
        setWeatherCondition,
        injectIncident,
        resolveIncident,
        networkSummary,
        tickCount,
        lastUpdated,
      }}
    >
      {children}
    </TrafficContext.Provider>
  );
};

export const useTraffic = (): TrafficContextType => {
  const context = useContext(TrafficContext);
  if (!context) {
    throw new Error('useTraffic must be used within a TrafficProvider');
  }
  return context;
};
