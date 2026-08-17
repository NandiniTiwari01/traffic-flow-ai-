import React, { useState, useMemo } from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { 
  Leaf, 
  Fuel, 
  Timer, 
  IndianRupee, 
  TrendingUp, 
  Sliders, 
  Info, 
  BarChart3, 
  CheckCircle2,
  ArrowRight,
  Sparkles,
  HelpCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Legend, 
  CartesianGrid 
} from 'recharts';
import { 
  DEFAULT_ENVIRONMENTAL_ASSUMPTIONS, 
  calculateJunctionEnvironmentalMetrics, 
  calculateCityWideEnvironmentalSummary,
  EnvironmentalAssumptions
} from '../../config/environmentalConstants';
import clsx from 'clsx';

export const EnvironmentalImpactCard: React.FC = () => {
  const { junctions, selectedJunction, setSelectedJunction } = useTraffic();

  const [activeJunctionId, setActiveJunctionId] = useState<string>(
    selectedJunction?.id || junctions[0]?.id || 'nag-01'
  );

  const [showConfig, setShowConfig] = useState<boolean>(false);
  const [assumptions, setAssumptions] = useState<EnvironmentalAssumptions>(DEFAULT_ENVIRONMENTAL_ASSUMPTIONS);

  // Active junction data
  const currentJunction = junctions.find(j => j.id === activeJunctionId) || junctions[0];

  // Dynamic calculations
  const junctionMetrics = useMemo(() => {
    if (!currentJunction) return null;
    return calculateJunctionEnvironmentalMetrics(currentJunction, assumptions);
  }, [currentJunction, assumptions]);

  const citySummary = useMemo(() => {
    return calculateCityWideEnvironmentalSummary(junctions, assumptions);
  }, [junctions, assumptions]);

  // Comparison chart data (Before AI vs After AI)
  const comparisonChartData = junctionMetrics ? [
    {
      metric: 'Idle Queue Time (min)',
      'Before AI': junctionMetrics.beforeIdleTimeMin,
      'After AI (Simulated)': junctionMetrics.afterIdleTimeMin,
      unit: 'min',
    },
    {
      metric: 'Corridor Speed (km/h)',
      'Before AI': junctionMetrics.beforeSpeedKmh,
      'After AI (Simulated)': junctionMetrics.afterSpeedKmh,
      unit: 'km/h',
    },
    {
      metric: 'Fuel Consumption (L/day)',
      'Before AI': junctionMetrics.beforeFuelUsedLitersDay,
      'After AI (Simulated)': junctionMetrics.afterFuelUsedLitersDay,
      unit: 'L',
    },
  ] : [];

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 sm:p-6 space-y-6">
      {/* Header & Disclaimers */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-200 shadow-2xs">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                🌱 Environmental Impact & Fuel Abatement
              </h2>
              <span className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                AI Optimization
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Simulated reductions in vehicle idling delay, corridor fuel waste, CO₂ emissions, and commuter fuel expenditure.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowConfig(!showConfig)}
            className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
          >
            <Sliders className="w-3.5 h-3.5" />
            <span>{showConfig ? 'Hide Assumptions' : 'Assumptions'}</span>
          </button>

          <span className="text-[11px] font-medium text-slate-500 flex items-center gap-1 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            <Info className="w-3.5 h-3.5 text-slate-400" />
            Estimated values based on simulation.
          </span>
        </div>
      </div>

      {/* Assumptions Editor (Collapsible) */}
      {showConfig && (
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3 animate-in fade-in duration-150 text-xs">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-800 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-emerald-600" />
              Configurable Simulation Constants
            </span>
            <button
              onClick={() => setAssumptions(DEFAULT_ENVIRONMENTAL_ASSUMPTIONS)}
              className="text-[11px] text-blue-600 hover:underline font-semibold"
            >
              Reset to Defaults
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-[11px] text-slate-600 block">Fuel Price (₹ / Liter):</label>
              <input
                type="number"
                step="0.5"
                value={assumptions.fuelPriceInrPerLiter}
                onChange={(e) => setAssumptions({ ...assumptions, fuelPriceInrPerLiter: Number(e.target.value) || 100 })}
                className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-600 block">CO₂ Emission Factor (kg / Liter):</label>
              <input
                type="number"
                step="0.01"
                value={assumptions.co2EmissionFactorKgPerLiter}
                onChange={(e) => setAssumptions({ ...assumptions, co2EmissionFactorKgPerLiter: Number(e.target.value) || 2.31 })}
                className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold"
              />
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-600 block">Peak Operating Hours / Day:</label>
              <input
                type="number"
                step="0.5"
                value={assumptions.peakOperatingHoursPerDay}
                onChange={(e) => setAssumptions({ ...assumptions, peakOperatingHoursPerDay: Number(e.target.value) || 7 })}
                className="w-full bg-white px-2.5 py-1.5 rounded-lg border border-slate-300 font-mono text-xs font-bold"
              />
            </div>
          </div>
        </div>
      )}

      {/* SECTION 1: 4 Key Metric Cards (Dynamic City-Wide Aggregation) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* ⏱ Idle Time Reduced */}
        <div className="p-4 rounded-xl bg-blue-50/60 border border-blue-200 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-white text-blue-600 border border-blue-200 shadow-2xs flex-shrink-0">
            <Timer className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-blue-900 block">
              Idle Time Reduced
            </span>
            <div className="text-2xl font-black font-mono text-blue-700 mt-0.5">
              {citySummary.totalIdleTimeSavedMinVehicle} <span className="text-xs font-semibold text-blue-600">min/veh</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Faster signal clearance cycles
            </span>
          </div>
        </div>

        {/* ⛽ Fuel Saved */}
        <div className="p-4 rounded-xl bg-emerald-50/60 border border-emerald-200 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-white text-emerald-600 border border-emerald-200 shadow-2xs flex-shrink-0">
            <Fuel className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-900 block">
              Fuel Saved
            </span>
            <div className="text-2xl font-black font-mono text-emerald-700 mt-0.5">
              {citySummary.totalFuelSavedLitersDay} <span className="text-xs font-semibold text-emerald-600">L/day</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              From reduced bottleneck idling
            </span>
          </div>
        </div>

        {/* 🌱 CO2 Reduced */}
        <div className="p-4 rounded-xl bg-teal-50/60 border border-teal-200 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-white text-teal-600 border border-teal-200 shadow-2xs flex-shrink-0">
            <Leaf className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-teal-900 block">
              CO₂ Reduced
            </span>
            <div className="text-2xl font-black font-mono text-teal-700 mt-0.5">
              {citySummary.totalCo2ReducedKgDay} <span className="text-xs font-semibold text-teal-600">kg/day</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              Abated greenhouse emissions
            </span>
          </div>
        </div>

        {/* 💰 Estimated Savings */}
        <div className="p-4 rounded-xl bg-amber-50/60 border border-amber-200 flex items-center gap-3.5 shadow-2xs">
          <div className="p-3 rounded-xl bg-white text-amber-600 border border-amber-200 shadow-2xs flex-shrink-0">
            <IndianRupee className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] font-bold uppercase tracking-wider text-amber-900 block">
              Estimated Savings
            </span>
            <div className="text-2xl font-black font-mono text-amber-700 mt-0.5">
              ₹{citySummary.totalMonetarySavingsInrDay.toLocaleString()} <span className="text-xs font-semibold text-amber-600">/day</span>
            </div>
            <span className="text-[10px] text-slate-500 mt-0.5 block">
              At ₹{assumptions.fuelPriceInrPerLiter}/L average
            </span>
          </div>
        </div>
      </div>

      {/* SECTION 2: Junction-Level Selection & Before vs After Comparison */}
      <div className="space-y-4">
        {/* Junction Carousel Selector */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600 flex items-center gap-1.5">
            <BarChart3 className="w-4 h-4 text-emerald-600" />
            Junction-Level Environmental Diagnostics
          </h3>
          <span className="text-xs font-mono text-slate-500">
            Select junction to view before & after comparison
          </span>
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 scrollbar-none">
          {junctions.map(j => {
            const isActive = j.id === activeJunctionId;
            return (
              <button
                key={j.id}
                onClick={() => {
                  setActiveJunctionId(j.id);
                  setSelectedJunction(j);
                }}
                className={clsx(
                  'flex-shrink-0 px-3.5 py-1.5 rounded-xl text-xs font-bold transition border flex items-center gap-2',
                  isActive
                    ? 'bg-emerald-600 text-white border-emerald-600 shadow-2xs'
                    : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border-slate-200'
                )}
              >
                <span>{j.name}</span>
              </button>
            );
          })}
        </div>

        {/* Junction Before vs After Grid & Chart */}
        {junctionMetrics && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            {/* Left: Before vs After Telemetry Cards (6 Cols) */}
            <div className="lg:col-span-6 space-y-3.5">
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-3">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div>
                    <h4 className="text-sm font-bold text-slate-900">{junctionMetrics.junctionName}</h4>
                    <span className="text-[11px] text-slate-500">Telemetry comparison</span>
                  </div>
                  <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    +{(junctionMetrics.afterSpeedKmh - junctionMetrics.beforeSpeedKmh)} km/h Flow
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-3 text-xs">
                  {/* Before AI */}
                  <div className="p-3 rounded-lg bg-rose-50/50 border border-rose-200 space-y-2">
                    <span className="font-bold text-rose-800 block text-[11px] uppercase">🔴 Before AI (Baseline)</span>
                    <div className="space-y-1 font-medium text-slate-700">
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <strong className="font-mono text-slate-900">{junctionMetrics.beforeSpeedKmh} km/h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Vehicles:</span>
                        <strong className="font-mono text-slate-900">{junctionMetrics.beforeVehicleCount}</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Idle Waiting:</span>
                        <strong className="font-mono text-rose-700">{junctionMetrics.beforeIdleTimeMin} min</strong>
                      </div>
                    </div>
                  </div>

                  {/* After AI */}
                  <div className="p-3 rounded-lg bg-emerald-50/50 border border-emerald-200 space-y-2">
                    <span className="font-bold text-emerald-800 block text-[11px] uppercase">🟢 After AI (Optimized)</span>
                    <div className="space-y-1 font-medium text-slate-700">
                      <div className="flex justify-between">
                        <span>Speed:</span>
                        <strong className="font-mono text-emerald-700">{junctionMetrics.afterSpeedKmh} km/h</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Throughput:</span>
                        <strong className="font-mono text-slate-900">{junctionMetrics.afterVehicleCount} veh</strong>
                      </div>
                      <div className="flex justify-between">
                        <span>Idle Waiting:</span>
                        <strong className="font-mono text-emerald-700">{junctionMetrics.afterIdleTimeMin} min</strong>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Junction Specific Savings */}
                <div className="p-3 rounded-lg bg-white border border-slate-200 grid grid-cols-3 gap-2 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Fuel Saved</span>
                    <span className="text-sm font-extrabold font-mono text-emerald-700">{junctionMetrics.fuelSavedLitersDay} L/day</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">CO₂ Reduced</span>
                    <span className="text-sm font-extrabold font-mono text-teal-700">{junctionMetrics.co2ReducedKgDay} kg/day</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 uppercase font-bold block">Est. Savings</span>
                    <span className="text-sm font-extrabold font-mono text-amber-700">₹{junctionMetrics.monetarySavingsInrDay.toLocaleString()}/day</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Right: Comparison Bar Chart (6 Cols) */}
            <div className="lg:col-span-6 p-4 rounded-xl bg-slate-50 border border-slate-200 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-800">
                  Before AI vs After AI Optimization Chart
                </span>
                <span className="text-[10px] font-mono text-slate-500">
                  Idle Time • Speed • Fuel
                </span>
              </div>

              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={comparisonChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="metric" stroke="#64748b" fontSize={10} />
                    <YAxis stroke="#64748b" fontSize={10} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderRadius: '0.75rem', fontSize: '11px', boxShadow: '0 4px 12px rgba(0,0,0,0.08)' }}
                    />
                    <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }} />
                    <Bar dataKey="Before AI" fill="#ef4444" radius={[4, 4, 0, 0]} name="Before AI (Baseline)" />
                    <Bar dataKey="After AI (Simulated)" fill="#10b981" radius={[4, 4, 0, 0]} name="After AI (Simulated)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* SECTION 3: City-Wide Monitored Grid Aggregation Footer */}
      <div className="p-4 rounded-xl bg-gradient-to-r from-emerald-50/70 via-white to-teal-50/70 border border-emerald-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span className="font-bold text-slate-900">
            Nagpur Smart City Grid Summary (7 Monitored Squares):
          </span>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-xs font-mono">
          <div>
            <span className="text-slate-500">Total Fuel Saved: </span>
            <strong className="text-emerald-700">{citySummary.totalFuelSavedLitersDay} L/day</strong>
          </div>
          <div>
            <span className="text-slate-500">Total CO₂ Reduction: </span>
            <strong className="text-teal-700">{citySummary.totalCo2ReducedKgDay} kg/day</strong>
          </div>
          <div>
            <span className="text-slate-500">Monetary Value: </span>
            <strong className="text-amber-700">₹{citySummary.totalMonetarySavingsInrDay.toLocaleString()} / day</strong>
          </div>
        </div>
      </div>
    </div>
  );
};
