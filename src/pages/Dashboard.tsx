import React from 'react';
import { useTraffic } from '../context/TrafficContext';
import { MetricCard } from '../components/common/MetricCard';
import { AlertBanner } from '../components/common/AlertBanner';
import { SignalRecommendationCard } from '../components/common/SignalRecommendationCard';
import { CongestionBadge } from '../components/common/CongestionBadge';
import { ProcessStepIndicator } from '../components/common/ProcessStepIndicator';
import { EnvironmentalImpactCard } from '../components/common/EnvironmentalImpactCard';
import { NagpurMap } from '../components/map/NagpurMap';
import { HOURLY_TRAFFIC_FLOW } from '../data/mockTrafficHistory';
import { 
  Building2, 
  Flame, 
  ShieldAlert, 
  Gauge, 
  Activity, 
  TrendingUp, 
  ArrowRight,
  Zap,
  Sliders,
  CheckCircle2,
  Video,
  Radio,
  Layers
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  CartesianGrid 
} from 'recharts';

interface DashboardProps {
  onNavigateToMap: () => void;
  onNavigateToSimulation: () => void;
  onNavigateToPredictions: () => void;
}

export const Dashboard: React.FC<DashboardProps> = ({
  onNavigateToMap,
  onNavigateToSimulation,
  onNavigateToPredictions
}) => {
  const { 
    junctions, 
    networkSummary, 
    alerts, 
    dismissAlert, 
    clearAllAlerts, 
    recommendations,
    acceptRecommendation,
    rejectRecommendation,
    selectedJunction,
    setSelectedJunction,
    simulationControls,
  } = useTraffic();

  const pendingRecommendations = recommendations.filter(r => r.status === 'PENDING');

  // Currently focused junction for Step details (default to Sitabuldi if none selected)
  const currentActiveJunction = selectedJunction || junctions[0] || null;

  // Dynamic 24-hour flow data dynamically scaled by simulation volume
  const dynamicHourlyFlow = React.useMemo(() => {
    const volMultiplier = simulationControls.baseTrafficVolume / 100.0;
    return HOURLY_TRAFFIC_FLOW.map(d => ({
      ...d,
      actualVehicles: Math.round(d.actualVehicles * volMultiplier),
      aiOptimizedVehicles: Math.round(d.aiOptimizedVehicles * volMultiplier),
    }));
  }, [simulationControls.baseTrafficVolume]);

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* 1. 4-STEP PROCESS SECTION */}
      <ProcessStepIndicator
        currentJunction={currentActiveJunction}
        onAcceptRecommendation={acceptRecommendation}
        onRejectRecommendation={rejectRecommendation}
      />

      {/* Traffic Data Sources Multi-Modal Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
            <Layers className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-800">
              Traffic Data Sources
            </h3>
            <p className="text-[11px] text-slate-500">Multi-modal telemetry feeding real-time AI predictive algorithms</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 text-xs font-mono font-bold">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-emerald-50 text-emerald-800 border border-emerald-200">
            <Video className="w-3.5 h-3.5 text-emerald-600" />
            <span>CCTV: Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-blue-50 text-blue-800 border border-blue-200">
            <Sliders className="w-3.5 h-3.5 text-blue-600" />
            <span>Simulation: Active</span>
          </div>
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-purple-50 text-purple-800 border border-purple-200">
            <Radio className="w-3.5 h-3.5 text-purple-600" />
            <span>IoT Sensors: 7 Nodes</span>
          </div>
        </div>
      </div>

      {/* 2. KEY METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricCard
          title="Total Junctions"
          value={networkSummary.totalJunctions}
          unit="Sensors Active"
          subtitle="Sitabuldi, Dharampeth, Sadar..."
          icon={Building2}
          variant="blue"
          onClick={onNavigateToMap}
        />

        <MetricCard
          title="High Traffic"
          value={networkSummary.highTrafficJunctions}
          unit="Hotspots"
          subtitle="Requiring attention"
          icon={Flame}
          variant={networkSummary.highTrafficJunctions > 0 ? "rose" : "emerald"}
          trend={{
            value: networkSummary.highTrafficJunctions > 0 ? 'High' : 'Normal',
            isPositive: networkSummary.highTrafficJunctions === 0
          }}
        />

        <MetricCard
          title="Average Speed"
          value={networkSummary.averageSpeed}
          unit="km/h"
          subtitle="Across Nagpur arterial grid"
          icon={Gauge}
          variant="emerald"
          trend={{
            value: networkSummary.averageSpeed > 25 ? '+4 km/h' : '-5 km/h',
            isPositive: networkSummary.averageSpeed > 25
          }}
        />

        <MetricCard
          title="Active Alerts"
          value={networkSummary.activeAlertsCount}
          unit="Live Triggers"
          subtitle="Speed drops & queue overflows"
          icon={ShieldAlert}
          variant={networkSummary.activeAlertsCount > 0 ? "amber" : "emerald"}
        />
      </div>

      {/* 3. LIVE TRAFFIC MAP & HOTSPOTS */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Activity className="w-4 h-4 text-blue-600" />
              Live Traffic Map — Nagpur Arterial Network
            </h2>
            <p className="text-xs text-slate-500">Real-time GPS coordinates, vehicle density and arterial corridor speeds.</p>
          </div>
          <button
            onClick={onNavigateToMap}
            className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 group"
          >
            Full Map View <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-1" />
          </button>
        </div>

        <NagpurMap
          junctions={junctions}
          selectedJunction={selectedJunction}
          onSelectJunction={setSelectedJunction}
          height="420px"
        />

        {/* Junction Congestion Telemetry Overview */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm">
          <div className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2.5">
            Key Monitored Corridors & Squares
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2.5">
            {junctions.slice(0, 4).map(j => (
              <div
                key={j.id}
                onClick={() => setSelectedJunction(j)}
                className="p-3 rounded-xl bg-slate-50 hover:bg-slate-100 border border-slate-200 cursor-pointer transition flex items-center justify-between"
              >
                <div>
                  <div className="text-xs font-bold text-slate-900">{j.name}</div>
                  <div className="text-[11px] text-slate-500">{j.averageSpeed} km/h • {j.vehicleCount} veh</div>
                </div>
                <CongestionBadge level={j.status} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* 4. CURRENT VS PREDICTED TRAFFIC CHART */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Current vs Predicted Traffic Flow (24-Hour Comparison)
            </h3>
            <p className="text-xs text-slate-500 mt-0.5">
              Historical baseline congestion vs AI predictive signal optimization throughput.
            </p>
          </div>
          <div className="flex items-center gap-4 text-xs font-semibold">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-rose-500" />
              <span className="text-slate-600">Baseline Congestion</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-full bg-blue-600" />
              <span className="text-blue-700 font-bold">AI Optimized Flow</span>
            </div>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={dynamicHourlyFlow} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorActual" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorAi" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563eb" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#2563eb" stopOpacity={0.02}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
              <XAxis dataKey="time" stroke="#64748b" fontSize={11} />
              <YAxis stroke="#64748b" fontSize={11} />
              <Tooltip 
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                labelStyle={{ color: '#0f172a', fontWeight: 'bold' }}
              />
              <Area type="monotone" dataKey="actualVehicles" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorActual)" name="Unmanaged Baseline" />
              <Area type="monotone" dataKey="aiOptimizedVehicles" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorAi)" name="AI Optimized Throughput" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* 5. CONGESTION ALERTS */}
      <AlertBanner
        alerts={alerts}
        onDismiss={dismissAlert}
        onClearAll={clearAllAlerts}
      />

      {/* 6. SIGNAL RECOMMENDATION */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Zap className="w-4 h-4 text-blue-600" />
              Active Signal Timing Recommendations
            </h3>
            <p className="text-xs text-slate-500">Autonomous green phase adjustments to clear projected bottlenecks.</p>
          </div>
          <span className="text-xs font-mono font-bold text-blue-700 bg-blue-50 px-2.5 py-0.5 rounded-full border border-blue-200">
            {pendingRecommendations.length} Pending
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {pendingRecommendations.length > 0 ? (
            pendingRecommendations.map(rec => (
              <SignalRecommendationCard
                key={rec.id}
                recommendation={rec}
                onAccept={acceptRecommendation}
                onReject={rejectRecommendation}
              />
            ))
          ) : (
            <div className="col-span-2 p-8 rounded-2xl bg-white border border-slate-200 text-center space-y-2 shadow-sm">
              <CheckCircle2 className="w-8 h-8 text-emerald-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-900">All Signal Timings Optimal</h4>
              <p className="text-xs text-slate-500 max-w-md mx-auto">
                AI algorithms are monitoring real-time flow. Adaptive green recommendations will appear automatically when congestion is detected.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 7. ENVIRONMENTAL IMPACT */}
      <EnvironmentalImpactCard />
    </div>
  );
};
