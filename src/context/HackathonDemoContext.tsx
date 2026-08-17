import React, { createContext, useContext, useState, useEffect, useCallback, useRef } from 'react';
import { useTraffic } from './TrafficContext';
import confetti from 'canvas-confetti';

export type DemoPhaseNumber = 1 | 2 | 3 | 4 | 5 | 6 | 7;

export interface DemoPhaseInfo {
  phase: DemoPhaseNumber;
  title: string;
  stepName: 'Traffic Data' | 'AI Analysis' | 'Prediction' | 'Preventive Action' | 'Impact';
  durationSec: number;
  narrative: string;
  icon: string;
}

export const DEMO_PHASES: DemoPhaseInfo[] = [
  {
    phase: 1,
    title: 'Phase 1 — Normal Traffic',
    stepName: 'Traffic Data',
    durationSec: 18,
    narrative: 'Traffic conditions are normal. Flow velocity is stable across Sitabuldi & Wardha Road corridors.',
    icon: '🟢',
  },
  {
    phase: 2,
    title: 'Phase 2 — Traffic Volume Surging',
    stepName: 'Traffic Data',
    durationSec: 25,
    narrative: 'Traffic volume increasing rapidly… Confluence bottleneck forming on Sitabuldi Interchange approach.',
    icon: '🚗',
  },
  {
    phase: 3,
    title: 'Phase 3 — AI Predictive Forecast',
    stepName: 'Prediction',
    durationSec: 25,
    narrative: '🔮 CONGESTION PREDICTED: High congestion forecast in 10 minutes (92% probability, density > 90%).',
    icon: '🔮',
  },
  {
    phase: 4,
    title: 'Phase 4 — AI Signal Recommendation',
    stepName: 'Preventive Action',
    durationSec: 28,
    narrative: '🚦 AI SIGNAL RECOMMENDATION: Extend green phase from 40s to 60s (+20s) to clear pending surge.',
    icon: '🚦',
  },
  {
    phase: 5,
    title: 'Phase 5 — Preventive Action Applied',
    stepName: 'Preventive Action',
    durationSec: 25,
    narrative: '⚡ Preventive green wave applied. Signals synchronized to flush corridor queue before gridlock.',
    icon: '⚡',
  },
  {
    phase: 6,
    title: 'Phase 6 — Velocity & Delay Results',
    stepName: 'Impact',
    durationSec: 20,
    narrative: '✅ RESULT: Bottleneck cleared! Speed increased from 14 to 32 km/h; waiting time reduced by 55%.',
    icon: '📊',
  },
  {
    phase: 7,
    title: 'Phase 7 — Environmental & Fuel Savings',
    stepName: 'Impact',
    durationSec: 20,
    narrative: '🌱 SUSTAINABILITY: 18.4 L fuel saved, 42.5 kg CO₂ abated, and ₹1,905 commuter savings achieved.',
    icon: '🌱',
  },
];

interface HackathonDemoContextType {
  isDemoActive: boolean;
  currentPhase: DemoPhaseNumber;
  phaseTimeElapsed: number;
  totalTimeElapsed: number;
  phaseInfo: DemoPhaseInfo;
  startDemo: () => void;
  stopDemo: () => void;
  nextPhase: () => void;
  prevPhase: () => void;
  jumpToPhase: (phase: DemoPhaseNumber) => void;
}

const HackathonDemoContext = createContext<HackathonDemoContextType | undefined>(undefined);

export const HackathonDemoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { 
    junctions, 
    setSelectedJunction, 
    acceptRecommendation,
    setWeatherCondition,
    setTrafficVolume
  } = useTraffic();

  const [isDemoActive, setIsDemoActive] = useState<boolean>(false);
  const [currentPhase, setCurrentPhase] = useState<DemoPhaseNumber>(1);
  const [phaseTimeElapsed, setPhaseTimeElapsed] = useState<number>(0);
  const [totalTimeElapsed, setTotalTimeElapsed] = useState<number>(0);

  const phaseInfo = DEMO_PHASES.find(p => p.phase === currentPhase) || DEMO_PHASES[0];

  // Target Demo Junction: Sitabuldi (nag-01)
  const targetJunctionId = 'nag-01';

  // Apply Phase Effects into the live simulation state
  const applyPhaseSimulationState = useCallback((phaseNum: DemoPhaseNumber) => {
    const sitabuldi = junctions.find(j => j.id === targetJunctionId);
    if (sitabuldi) {
      setSelectedJunction(sitabuldi);
    }

    if (phaseNum === 1) {
      // Normal Traffic
      if (sitabuldi) {
        sitabuldi.vehicleCount = 38;
        sitabuldi.averageSpeed = 44;
        sitabuldi.density = 28;
        sitabuldi.status = 'Low';
        sitabuldi.queueLength = 18;
      }
    } else if (phaseNum === 2) {
      // Traffic Increase Surge
      if (sitabuldi) {
        sitabuldi.vehicleCount = 112;
        sitabuldi.averageSpeed = 16;
        sitabuldi.density = 88;
        sitabuldi.status = 'High';
        sitabuldi.queueLength = 155;
      }
    } else if (phaseNum === 3) {
      // AI Prediction Triggered
      if (sitabuldi) {
        sitabuldi.predictions.minutes10 = {
          predictedVehicleCount: 148,
          predictedSpeed: 11,
          predictedDensity: 94,
          congestionLevel: 'High',
          congestionProbability: 92,
        };
      }
    } else if (phaseNum === 4) {
      // Signal Recommendation Active
      if (sitabuldi) {
        sitabuldi.recommendation = {
          id: 'demo-rec-01',
          junctionId: targetJunctionId,
          junctionName: 'Sitabuldi Interchange',
          currentGreenTime: 40,
          recommendedGreenTime: 60,
          difference: 20,
          reason: 'High traffic density (88%) and decreasing speed detected on Wardha Rd. Extending green phase by +20s.',
          horizonMinute: 10,
          status: 'PENDING',
          timestamp: 'Just now',
          severity: 'critical'
        };
      }
    } else if (phaseNum === 5) {
      // Recommendation Accepted & Applied
      acceptRecommendation('demo-rec-01');
      if (sitabuldi) {
        sitabuldi.currentGreenTime = 60;
        sitabuldi.averageSpeed = 29;
        sitabuldi.density = 48;
        sitabuldi.status = 'Medium';
        sitabuldi.queueLength = 45;
      }
      try {
        confetti({ particleCount: 50, spread: 70, origin: { y: 0.6 } });
      } catch {}
    } else if (phaseNum === 6) {
      // Results
      if (sitabuldi) {
        sitabuldi.averageSpeed = 34;
        sitabuldi.density = 36;
        sitabuldi.status = 'Low';
        sitabuldi.queueLength = 22;
      }
    } else if (phaseNum === 7) {
      // Environmental impact celebration
      try {
        confetti({ particleCount: 65, spread: 90, origin: { y: 0.65 } });
      } catch {}
    }
  }, [junctions, setSelectedJunction, acceptRecommendation]);

  // Start Demo
  const startDemo = useCallback(() => {
    setIsDemoActive(true);
    setCurrentPhase(1);
    setPhaseTimeElapsed(0);
    setTotalTimeElapsed(0);
    applyPhaseSimulationState(1);
  }, [applyPhaseSimulationState]);

  // Stop Demo
  const stopDemo = useCallback(() => {
    setIsDemoActive(false);
    setCurrentPhase(1);
    setPhaseTimeElapsed(0);
  }, []);

  // Jump to specific phase
  const jumpToPhase = useCallback((phaseNum: DemoPhaseNumber) => {
    setCurrentPhase(phaseNum);
    setPhaseTimeElapsed(0);
    applyPhaseSimulationState(phaseNum);
  }, [applyPhaseSimulationState]);

  const nextPhase = useCallback(() => {
    if (currentPhase < 7) {
      jumpToPhase((currentPhase + 1) as DemoPhaseNumber);
    } else {
      stopDemo();
    }
  }, [currentPhase, jumpToPhase, stopDemo]);

  const prevPhase = useCallback(() => {
    if (currentPhase > 1) {
      jumpToPhase((currentPhase - 1) as DemoPhaseNumber);
    }
  }, [currentPhase, jumpToPhase]);

  // Main Demo Timer Loop
  useEffect(() => {
    if (!isDemoActive) return;

    const timer = setInterval(() => {
      setTotalTimeElapsed(t => t + 1);
      setPhaseTimeElapsed(p => {
        const nextP = p + 1;
        if (nextP >= phaseInfo.durationSec) {
          // Auto advance to next phase
          if (currentPhase < 7) {
            const nextPhaseNum = (currentPhase + 1) as DemoPhaseNumber;
            setCurrentPhase(nextPhaseNum);
            applyPhaseSimulationState(nextPhaseNum);
            return 0;
          } else {
            // Finished full demo
            stopDemo();
            return 0;
          }
        }
        return nextP;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [isDemoActive, currentPhase, phaseInfo.durationSec, applyPhaseSimulationState, stopDemo]);

  return (
    <HackathonDemoContext.Provider
      value={{
        isDemoActive,
        currentPhase,
        phaseTimeElapsed,
        totalTimeElapsed,
        phaseInfo,
        startDemo,
        stopDemo,
        nextPhase,
        prevPhase,
        jumpToPhase,
      }}
    >
      {children}
    </HackathonDemoContext.Provider>
  );
};

export const useHackathonDemo = (): HackathonDemoContextType => {
  const context = useContext(HackathonDemoContext);
  if (!context) {
    throw new Error('useHackathonDemo must be used within a HackathonDemoProvider');
  }
  return context;
};
