import React, { useState } from 'react';
import { useTraffic } from '../context/TrafficContext';
import { CongestionBadge } from '../components/common/CongestionBadge';
import { Traffic3DSimulator } from '../components/simulation/Traffic3DSimulator';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Sliders, 
  CloudRain, 
  Sun, 
  PartyPopper, 
  Hammer, 
  AlertOctagon, 
  Activity, 
  Gauge, 
  CheckCircle2,
  FastForward,
  Car,
  Terminal,
  ChevronDown,
  ChevronUp,
  Box
} from 'lucide-react';
import clsx from 'clsx';

export const Simulation: React.FC = () => {
  const { 
    junctions, 
    selectedJunction,
    setSelectedJunction,
    simulationControls, 
    toggleSimulation, 
    resetSimulation, 
    setSimulationSpeed, 
    setTrafficVolume, 
    setWeatherCondition,
    injectIncident,
    resolveIncident,
    tickCount,
    lastUpdated
  } = useTraffic();

  const { isRunning, simulationSpeed, baseTrafficVolume, weather, activeIncident } = simulationControls;
  const [showDebugPanel, setShowDebugPanel] = useState<boolean>(true);

  // Focus junction for debug panel
  const focusedJunction = selectedJunction || junctions[0] || null;

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Simulation Dashboard Header */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <Sliders className="w-5 h-5 text-blue-600" />
              TrafficFlow AI Simulation & 3D Visualizer
            </h1>
            <span className={clsx(
              'px-2.5 py-0.5 rounded-full text-xs font-mono font-bold border',
              isRunning 
                ? 'bg-emerald-50 text-emerald-700 border-emerald-200' 
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              {isRunning ? 'SIMULATOR ACTIVE (1s Ticks)' : 'PAUSED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Real-time microscopic & 3D intersection physics simulator. Dynamically inject traffic surges, monsoon weather, and incident gridlocks.
          </p>
        </div>

        {/* Live Ticks & Latency */}
        <div className="flex items-center gap-3 text-xs font-mono">
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-sans font-medium">Simulation Ticks</span>
            <span className="text-blue-700 font-bold">#{tickCount}</span>
          </div>
          <div className="p-2 rounded-xl bg-slate-50 border border-slate-200 text-center">
            <span className="text-[10px] text-slate-500 block font-sans font-medium">Last State Update</span>
            <span className="text-emerald-700 font-bold">{lastUpdated}</span>
          </div>
        </div>
      </div>

      {/* 🚀 3D INTERACTIVE INTERSECTION DIGITAL TWIN */}
      <Traffic3DSimulator />

      {/* Control Room Master Sliders & Buttons */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Primary Simulator Controls (7 Cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-white border border-slate-200 space-y-5 shadow-sm">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Activity className="w-4 h-4 text-blue-600" />
            Master Simulation Controls
          </h2>

          {/* Primary Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={toggleSimulation}
              className={clsx(
                'flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white shadow-sm transition',
                isRunning
                  ? 'bg-amber-600 hover:bg-amber-700'
                  : 'bg-blue-600 hover:bg-blue-700'
              )}
            >
              {isRunning ? (
                <>
                  <Pause className="w-4 h-4" /> Pause Simulation
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" /> Start Simulation
                </>
              )}
            </button>

            <button
              onClick={resetSimulation}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
            >
              <RotateCcw className="w-4 h-4" /> Reset Baseline
            </button>
          </div>

          {/* Slider 1: Traffic Volume Multiplier */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-800 font-bold flex items-center gap-1.5">
                <Car className="w-4 h-4 text-blue-600" />
                City Traffic Volume Demand Multiplier
              </span>
              <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {baseTrafficVolume}% Demand
              </span>
            </div>
            <input
              type="range"
              min="50"
              max="200"
              step="5"
              value={baseTrafficVolume}
              onChange={(e) => setTrafficVolume(Number(e.target.value))}
              className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-blue-600"
            />
            <div className="flex justify-between text-[10px] font-medium text-slate-500">
              <span>50% (Late Night / Low Flow)</span>
              <span>100% (Standard Flow)</span>
              <span>150% (Peak Rush)</span>
              <span>200% (Critical Gridlock)</span>
            </div>
          </div>

          {/* Slider 2: Simulation Speed Multiplier */}
          <div className="space-y-2 p-4 rounded-xl bg-slate-50 border border-slate-200">
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-800 font-bold flex items-center gap-1.5">
                <FastForward className="w-4 h-4 text-blue-600" />
                Simulation Clock Acceleration
              </span>
              <span className="font-mono font-bold text-blue-700 text-sm bg-blue-50 px-2.5 py-0.5 rounded border border-blue-200">
                {simulationSpeed}x Speed
              </span>
            </div>
            <div className="flex items-center gap-2 pt-1">
              {[0.5, 1, 2, 5].map(speed => (
                <button
                  key={speed}
                  onClick={() => setSimulationSpeed(speed)}
                  className={clsx(
                    'flex-1 py-1.5 rounded-lg text-xs font-mono font-bold transition border',
                    simulationSpeed === speed
                      ? 'bg-blue-600 text-white border-blue-600 shadow-xs'
                      : 'bg-white text-slate-600 hover:text-slate-900 border-slate-200'
                  )}
                >
                  {speed}x
                </button>
              ))}
            </div>
          </div>

          {/* Weather & Event Modifiers */}
          <div className="space-y-2">
            <span className="text-xs font-bold text-slate-700 block">Weather & City Event Scenario:</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              <button
                onClick={() => setWeatherCondition('Clear')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition',
                  weather === 'Clear'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <Sun className="w-4 h-4 text-amber-500" />
                Clear Day (1.0x)
              </button>

              <button
                onClick={() => setWeatherCondition('Rain')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition',
                  weather === 'Rain'
                    ? 'bg-blue-50 border-blue-500 text-blue-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <CloudRain className="w-4 h-4 text-blue-600" />
                Monsoon Rain (+35%)
              </button>

              <button
                onClick={() => setWeatherCondition('Festival')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition',
                  weather === 'Festival'
                    ? 'bg-purple-50 border-purple-500 text-purple-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <PartyPopper className="w-4 h-4 text-pink-600" />
                Festival Rush (+25%)
              </button>

              <button
                onClick={() => setWeatherCondition('Construction')}
                className={clsx(
                  'p-3 rounded-xl border text-xs font-bold flex flex-col items-center gap-1.5 transition',
                  weather === 'Construction'
                    ? 'bg-amber-50 border-amber-500 text-amber-800 shadow-xs'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                )}
              >
                <Hammer className="w-4 h-4 text-amber-600" />
                Metro Work (+15%)
              </button>
            </div>
          </div>
        </div>

        {/* Right Column: Incident Injector Panel (5 Cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <AlertOctagon className="w-4 h-4 text-rose-600" />
              Live Incident Injector
            </h2>
            {activeIncident && (
              <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 animate-pulse">
                INCIDENT ACTIVE
              </span>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Trigger simulated emergency scenarios to test real-time AI signal rerouting & green extension.
          </p>

          {activeIncident ? (
            <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 space-y-3">
              <div className="flex items-center gap-2 text-rose-800 font-bold text-xs">
                <AlertOctagon className="w-4 h-4 text-rose-600" />
                <span>Active Blockage: {activeIncident}</span>
              </div>
              <p className="text-xs text-slate-600">
                Corridor density surged to 98%. Adaptive emergency timing cycle generated.
              </p>
              <button
                onClick={resolveIncident}
                className="w-full py-2 rounded-lg text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 transition shadow-sm flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Clear & Resolve Incident
              </button>
            </div>
          ) : (
            <div className="space-y-2.5">
              <button
                onClick={() => injectIncident('nag-01', 'Multi-vehicle collision on Sitabuldi Flyover')}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                    Accident at Sitabuldi Interchange
                  </div>
                  <div className="text-[11px] text-slate-500">2 lanes blocked on North-South flyover</div>
                </div>
                <span className="text-xs text-rose-600 font-bold opacity-80 group-hover:opacity-100">
                  Inject &rarr;
                </span>
              </button>

              <button
                onClick={() => injectIncident('nag-04', 'Broken Down Bus on Chhatrapati Square')}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-rose-50 border border-slate-200 hover:border-rose-300 transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-rose-700">
                    Broken Down Bus at Chhatrapati Sq
                  </div>
                  <div className="text-[11px] text-slate-500">Wardha Rd airport route bottleneck</div>
                </div>
                <span className="text-xs text-rose-600 font-bold opacity-80 group-hover:opacity-100">
                  Inject &rarr;
                </span>
              </button>

              <button
                onClick={() => injectIncident('nag-05', 'Ambulance Priority Corridor at Medical Sq')}
                className="w-full text-left p-3 rounded-xl bg-slate-50 hover:bg-amber-50 border border-slate-200 hover:border-amber-300 transition flex items-center justify-between group"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900 group-hover:text-amber-700">
                    Ambulance Convoy at Medical Square
                  </div>
                  <div className="text-[11px] text-slate-500">High priority emergency clearance</div>
                </div>
                <span className="text-xs text-amber-600 font-bold opacity-80 group-hover:opacity-100">
                  Inject &rarr;
                </span>
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Dynamic Junction Telemetry Stream Grid */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Gauge className="w-4 h-4 text-blue-600" />
            Live Monitored Nodes Telemetry Stream
          </h2>
          <span className="text-xs text-slate-500 font-mono font-medium">
            {junctions.length} Active Nodes
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {junctions.map(j => (
            <div
              key={j.id}
              onClick={() => setSelectedJunction(j)}
              className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition cursor-pointer shadow-sm relative overflow-hidden"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900">{j.name}</h3>
                  <p className="text-[11px] text-slate-500">{j.area}</p>
                </div>
                <CongestionBadge level={j.status} size="sm" />
              </div>

              {/* Real-time Dynamic Gauge Stats */}
              <div className="mt-3.5 space-y-2">
                <div>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="text-slate-500 font-medium">Traffic Density:</span>
                    <span className="font-mono font-bold text-slate-900">{j.density}%</span>
                  </div>
                  <div className="w-full bg-slate-100 h-2 rounded-full overflow-hidden">
                    <div
                      className={clsx(
                        'h-full rounded-full transition-all duration-300',
                        j.density > 75 ? 'bg-rose-500' : j.density > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                      )}
                      style={{ width: `${j.density}%` }}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Vehicle Count</span>
                    <span className="font-mono font-bold text-slate-900">{j.vehicleCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Average Velocity</span>
                    <span className="font-mono font-bold text-emerald-600">{j.averageSpeed} km/h</span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* DEVELOPER / DEBUG TELEMETRY PANEL */}
      <div className="p-4 sm:p-5 rounded-2xl bg-slate-900 text-white border border-slate-800 shadow-md space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200">
              Live Simulation Debug Telemetry Panel (Central Store State)
            </h3>
            <span className="px-2 py-0.2 rounded-full text-[10px] font-mono bg-emerald-950 text-emerald-400 border border-emerald-800">
              LIVE TICK: #{tickCount}
            </span>
          </div>

          <button
            onClick={() => setShowDebugPanel(!showDebugPanel)}
            className="text-xs text-slate-400 hover:text-white flex items-center gap-1"
          >
            <span>{showDebugPanel ? 'Hide Panel' : 'Show Panel'}</span>
            {showDebugPanel ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
          </button>
        </div>

        {showDebugPanel && focusedJunction && (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 pt-2 text-xs font-mono">
            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Traffic Volume:</span>
              <strong className="text-blue-400 text-sm">{baseTrafficVolume}%</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Vehicles ({focusedJunction.name.split(' ')[0]}):</span>
              <strong className="text-white text-sm">{focusedJunction.vehicleCount} veh</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Speed:</span>
              <strong className="text-emerald-400 text-sm">{focusedJunction.averageSpeed} km/h</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Density:</span>
              <strong className="text-amber-400 text-sm">{focusedJunction.density}%</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">Queue Length:</span>
              <strong className="text-purple-400 text-sm">{focusedJunction.queueLength} m</strong>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
              <span className="text-[10px] text-slate-400 block font-sans">10m Congestion Prob:</span>
              <strong className="text-rose-400 text-sm">
                {focusedJunction.predictions.minutes10.congestionProbability}% ({focusedJunction.predictions.minutes10.congestionLevel})
              </strong>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
