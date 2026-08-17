import React, { useState, useMemo } from 'react';
import { useTraffic } from '../context/TrafficContext';
import { CongestionBadge } from '../components/common/CongestionBadge';
import { 
  BarChart3, 
  TrendingUp, 
  Clock, 
  Fuel, 
  Leaf, 
  MapPin, 
  Download, 
  Filter, 
  Cpu, 
  CheckCircle2, 
  AlertTriangle,
  ArrowRight,
  Sparkles,
  Zap,
  Activity,
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
import { 
  DEFAULT_ENVIRONMENTAL_ASSUMPTIONS, 
  calculateCityWideEnvironmentalSummary 
} from '../config/environmentalConstants';
import { HOURLY_TRAFFIC_FLOW } from '../data/mockTrafficHistory';
import clsx from 'clsx';

type TimeRange = '1h' | '6h' | '24h';
type TrendMetric = 'vehicles' | 'speed' | 'density' | 'queue';
type DataSourceFilter = 'ALL' | 'cctv_video' | 'simulation';

export const Analytics: React.FC = () => {
  const { 
    junctions, 
    networkSummary, 
    selectedJunction,
    setSelectedJunction,
    simulationControls,
  } = useTraffic();

  // Filters State
  const [timeRange, setTimeRange] = useState<TimeRange>('24h');
  const [selectedMetric, setSelectedMetric] = useState<TrendMetric>('vehicles');
  const [filterJunctionId, setFilterJunctionId] = useState<string>('ALL');
  const [filterStatus, setFilterStatus] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');
  const [filterDataSource, setFilterDataSource] = useState<DataSourceFilter>('ALL');
  const [downloadSuccess, setDownloadSuccess] = useState<boolean>(false);

  // Environmental summary
  const cityEnvSummary = useMemo(() => {
    return calculateCityWideEnvironmentalSummary(junctions, DEFAULT_ENVIRONMENTAL_ASSUMPTIONS);
  }, [junctions]);

  // Filtered Junctions List
  const filteredJunctions = useMemo(() => {
    return junctions.filter(j => {
      if (filterJunctionId !== 'ALL' && j.id !== filterJunctionId) return false;
      if (filterStatus !== 'ALL' && j.status !== filterStatus) return false;
      return true;
    });
  }, [junctions, filterJunctionId, filterStatus]);

  // Dynamic Before vs After Aggregation
  const beforeAfterMetrics = useMemo(() => {
    const totalCount = junctions.reduce((acc, j) => acc + j.vehicleCount, 0);
    const avgSpeedBefore = networkSummary.averageSpeed;
    const avgSpeedAfter = Math.min(50, Math.round(avgSpeedBefore * 1.38));
    
    const avgDensityBefore = networkSummary.averageDensity;
    const avgDensityAfter = Math.max(20, Math.round(avgDensityBefore * 0.67));

    const avgWaitBefore = Number(((avgDensityBefore / 100) * 8.5 + (35 / Math.max(5, avgSpeedBefore))).toFixed(1));
    const avgWaitAfter = Number(Math.max(1.5, avgWaitBefore * 0.62).toFixed(1));

    const avgQueueBefore = Math.round(junctions.reduce((acc, j) => acc + j.queueLength, 0) / Math.max(1, junctions.length));
    const avgQueueAfter = Math.max(10, Math.round(avgQueueBefore * 0.58));

    const totalFuelBefore = Math.round(totalCount * 0.42);
    const totalFuelAfter = Math.max(10, totalFuelBefore - cityEnvSummary.totalFuelSavedLitersDay);

    return {
      speed: {
        before: avgSpeedBefore,
        after: avgSpeedAfter,
        change: `+${Math.round(((avgSpeedAfter - avgSpeedBefore) / avgSpeedBefore) * 100)}%`,
        isPositive: true,
      },
      waitTime: {
        before: avgWaitBefore,
        after: avgWaitAfter,
        change: `-${Math.round(((avgWaitBefore - avgWaitAfter) / avgWaitBefore) * 100)}%`,
        isPositive: true,
      },
      density: {
        before: avgDensityBefore,
        after: avgDensityAfter,
        change: `-${Math.round(((avgDensityBefore - avgDensityAfter) / avgDensityBefore) * 100)}%`,
        isPositive: true,
      },
      queue: {
        before: avgQueueBefore,
        after: avgQueueAfter,
        change: `-${Math.round(((avgQueueBefore - avgQueueAfter) / avgQueueBefore) * 100)}%`,
        isPositive: true,
      },
      fuel: {
        before: totalFuelBefore,
        after: totalFuelAfter,
        change: `-${Math.round(((totalFuelBefore - totalFuelAfter) / totalFuelBefore) * 100)}%`,
        isPositive: true,
      }
    };
  }, [junctions, networkSummary, cityEnvSummary]);

  // Time Series Trend Data Slice (Responsive to Simulation Volume)
  const trendChartData = useMemo(() => {
    let sliced = [...HOURLY_TRAFFIC_FLOW];
    if (timeRange === '1h') {
      sliced = sliced.slice(-4);
    } else if (timeRange === '6h') {
      sliced = sliced.slice(-8);
    }
    const volMultiplier = simulationControls.baseTrafficVolume / 100.0;
    return sliced.map(d => ({
      time: d.time,
      actualVehicles: Math.round(d.actualVehicles * volMultiplier),
      aiOptimizedVehicles: Math.round(d.aiOptimizedVehicles * volMultiplier),
      speed: Math.max(8, Math.round(d.averageSpeed * (volMultiplier > 1.2 ? 0.85 : volMultiplier < 0.8 ? 1.15 : 1.0))),
      aiOptimizedSpeed: Math.min(52, Math.round(d.averageSpeed * 1.35)),
      density: Math.min(100, Math.round(d.congestionIndex * volMultiplier)),
      aiOptimizedDensity: Math.max(15, Math.round(d.congestionIndex * volMultiplier * 0.65)),
      queue: Math.round(d.congestionIndex * volMultiplier * 1.6),
      aiOptimizedQueue: Math.round(d.congestionIndex * volMultiplier * 0.9),
    }));
  }, [timeRange, simulationControls.baseTrafficVolume]);

  // Congestion Event Metrics
  const congestionStats = useMemo(() => {
    const totalPredictedEvents = 18;
    const preventedEvents = 15;
    const avgWarningLookaheadMin = 12;
    const highRiskCount = junctions.filter(j => j.status === 'High').length;
    const preventionRate = Math.round((preventedEvents / totalPredictedEvents) * 100);

    return {
      totalPredictedEvents,
      preventedEvents,
      avgWarningLookaheadMin,
      highRiskCount,
      preventionRate,
    };
  }, [junctions]);

  // Synthetic Model Evaluation Performance Metrics
  const modelMetrics = {
    mae: '2.42 veh / 1.8 km/h',
    rmse: '3.18 veh / 2.4 km/h',
    accuracyR2: '94.2%',
    inferenceLatency: '14 ms',
  };

  // Export Comprehensive CSV Traffic Report
  const handleExportReport = () => {
    const dateStr = new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' });
    const headers = [
      'Report_Timestamp',
      'Junction_ID',
      'Junction_Name',
      'Area',
      'Current_Speed_kmh',
      'Vehicle_Count',
      'Density_Percent',
      'Status_Risk',
      'Queue_Meters',
      'Signal_Green_Sec',
      'Predicted_10m_Vehicles',
      'Predicted_10m_Speed',
      '10m_Risk_Level',
      'Est_Fuel_Saved_L_Day',
      'Est_CO2_Saved_kg_Day',
      'Est_Money_Saved_INR'
    ];

    const rows = junctions.map(j => {
      const p10 = j.predictions.minutes10;
      const env = cityEnvSummary.junctionBreakdown.find(b => b.junctionId === j.id);
      return [
        `"${dateStr}"`,
        j.id,
        `"${j.name}"`,
        `"${j.area}"`,
        j.averageSpeed,
        j.vehicleCount,
        j.density,
        j.status,
        j.queueLength,
        j.currentGreenTime,
        p10.predictedVehicleCount,
        p10.predictedSpeed,
        p10.congestionLevel,
        env?.fuelSavedLitersDay || 0,
        env?.co2ReducedKgDay || 0,
        env?.monetarySavingsInrDay || 0
      ].join(',');
    });

    const csvContent = 'data:text/csv;charset=utf-8,' + [headers.join(','), ...rows].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement('a');
    link.setAttribute('href', encodedUri);
    link.setAttribute('download', `nagpur_smart_city_traffic_ai_report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setDownloadSuccess(true);
    setTimeout(() => setDownloadSuccess(false), 3500);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Banner */}
      <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-blue-50 text-blue-600 border border-blue-200">
              <BarChart3 className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
                Nagpur AI Traffic Analytics & Mobility Impact
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Comprehensive Before vs After AI optimization telemetry, multi-horizon trend curves, and IPCC environmental abatement.
              </p>
            </div>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <button
            onClick={handleExportReport}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 transition shadow-sm"
          >
            {downloadSuccess ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                Report Downloaded!
              </>
            ) : (
              <>
                <Download className="w-4 h-4" />
                Generate Traffic Report (CSV)
              </>
            )}
          </button>
        </div>
      </div>

      {/* SECTION 1: PROMINENT BEFORE VS AFTER AI COMPARISON */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
                Core Value Proposition
              </span>
              <h2 className="text-base font-bold text-slate-900">
                Impact Validation: Before AI vs After AI Optimization
              </h2>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Comparative analysis of arterial traffic flow in Nagpur before and after AI-driven signal adaptation.
            </p>
          </div>
          <span className="text-[11px] font-mono font-medium text-slate-400 bg-slate-50 px-2.5 py-1 rounded-lg border border-slate-200">
            Prototype simulation results
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3.5">
          {/* Metric 1: Average Speed */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Average Velocity</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {beforeAfterMetrics.speed.change}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Before AI:</span>
                <span className="font-mono font-bold text-slate-700">{beforeAfterMetrics.speed.before} km/h</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>After AI:</span>
                <span className="font-mono text-emerald-600">{beforeAfterMetrics.speed.after} km/h</span>
              </div>
            </div>
          </div>

          {/* Metric 2: Waiting Time */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Average Delay</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {beforeAfterMetrics.waitTime.change}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Before AI:</span>
                <span className="font-mono font-bold text-slate-700">{beforeAfterMetrics.waitTime.before} min</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>After AI:</span>
                <span className="font-mono text-emerald-600">{beforeAfterMetrics.waitTime.after} min</span>
              </div>
            </div>
          </div>

          {/* Metric 3: Traffic Density */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Traffic Density</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {beforeAfterMetrics.density.change}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Before AI:</span>
                <span className="font-mono font-bold text-slate-700">{beforeAfterMetrics.density.before}%</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>After AI:</span>
                <span className="font-mono text-emerald-600">{beforeAfterMetrics.density.after}%</span>
              </div>
            </div>
          </div>

          {/* Metric 4: Queue Length */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Queue Length</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {beforeAfterMetrics.queue.change}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Before AI:</span>
                <span className="font-mono font-bold text-slate-700">{beforeAfterMetrics.queue.before} m</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>After AI:</span>
                <span className="font-mono text-emerald-600">{beforeAfterMetrics.queue.after} m</span>
              </div>
            </div>
          </div>

          {/* Metric 5: Fuel Consumption */}
          <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-700">Idling Fuel (Daily)</span>
              <span className="text-xs font-bold text-emerald-600 font-mono bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                {beforeAfterMetrics.fuel.change}
              </span>
            </div>
            <div className="space-y-1 pt-1 text-xs">
              <div className="flex justify-between text-slate-500">
                <span>Before AI:</span>
                <span className="font-mono font-bold text-slate-700">{beforeAfterMetrics.fuel.before} L</span>
              </div>
              <div className="flex justify-between text-slate-900 font-bold">
                <span>After AI:</span>
                <span className="font-mono text-emerald-600">{beforeAfterMetrics.fuel.after} L</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: INTERACTIVE TIME-SERIES TREND CHARTS */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              Multi-Horizon Traffic Trend Analytics
            </h3>
            <p className="text-xs text-slate-500">Continuous telemetry monitoring vs AI optimized equilibrium.</p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            {/* Metric Selector Buttons */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-semibold">
              {(['vehicles', 'speed', 'density', 'queue'] as TrendMetric[]).map(m => (
                <button
                  key={m}
                  onClick={() => setSelectedMetric(m)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg capitalize transition',
                    selectedMetric === m ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {m}
                </button>
              ))}
            </div>

            {/* Time Horizon Selector (1h, 6h, 24h) */}
            <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 font-bold font-mono">
              {(['1h', '6h', '24h'] as TimeRange[]).map(r => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={clsx(
                    'px-2.5 py-1 rounded-lg transition',
                    timeRange === r ? 'bg-blue-600 text-white shadow-xs' : 'text-slate-500 hover:text-slate-900'
                  )}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Dynamic Trend Area Chart */}
        <div className="h-72 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={trendChartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="colorBaseline" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#ef4444" stopOpacity={0.25}/>
                  <stop offset="95%" stopColor="#ef4444" stopOpacity={0.02}/>
                </linearGradient>
                <linearGradient id="colorOptimized" x1="0" y1="0" x2="0" y2="1">
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

              {selectedMetric === 'vehicles' && (
                <>
                  <Area type="monotone" dataKey="actualVehicles" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" name="Unmanaged Baseline Vehicles" />
                  <Area type="monotone" dataKey="aiOptimizedVehicles" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOptimized)" name="AI Optimized Vehicle Flow" />
                </>
              )}

              {selectedMetric === 'speed' && (
                <>
                  <Area type="monotone" dataKey="speed" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" name="Baseline Speed (km/h)" />
                  <Area type="monotone" dataKey="aiOptimizedSpeed" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOptimized)" name="AI Optimized Speed (km/h)" />
                </>
              )}

              {selectedMetric === 'density' && (
                <>
                  <Area type="monotone" dataKey="density" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" name="Baseline Density (%)" />
                  <Area type="monotone" dataKey="aiOptimizedDensity" stroke="#2563eb" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOptimized)" name="AI Optimized Density (%)" />
                </>
              )}

              {selectedMetric === 'queue' && (
                <>
                  <Area type="monotone" dataKey="queue" stroke="#ef4444" strokeWidth={2} fillOpacity={1} fill="url(#colorBaseline)" name="Baseline Queue Length (m)" />
                  <Area type="monotone" dataKey="aiOptimizedQueue" stroke="#16a34a" strokeWidth={2.5} fillOpacity={1} fill="url(#colorOptimized)" name="AI Optimized Queue (m)" />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* SECTION 3: JUNCTION COMPARISON TABLE */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-blue-600" />
              Nagpur Junction Performance & Risk Comparison
            </h3>
            <p className="text-xs text-slate-500">Live multi-junction telemetry across arterial squares.</p>
          </div>
          <span className="text-xs font-mono font-bold text-slate-600">
            {filteredJunctions.length} Junctions Listed
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-600 font-bold uppercase tracking-wider text-[10px] border-b border-slate-200">
                <th className="p-3">Junction</th>
                <th className="p-3">Area / Corridor</th>
                <th className="p-3">Traffic Status</th>
                <th className="p-3">Avg Speed</th>
                <th className="p-3">Density</th>
                <th className="p-3">Queue Length</th>
                <th className="p-3">10m Predicted Congestion</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredJunctions.map((j) => {
                const p10 = j.predictions.minutes10;
                return (
                  <tr key={j.id} className="hover:bg-slate-50/80 transition">
                    <td className="p-3 font-bold text-slate-900 flex items-center gap-2">
                      <div className={clsx(
                        'w-2 h-2 rounded-full',
                        j.status === 'High' ? 'bg-rose-500' : j.status === 'Medium' ? 'bg-amber-500' : 'bg-emerald-500'
                      )} />
                      <span>{j.name}</span>
                    </td>
                    <td className="p-3 text-slate-500">{j.area}</td>
                    <td className="p-3">
                      <span className={clsx(
                        'px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono',
                        j.status === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                        j.status === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' :
                        'bg-emerald-50 text-emerald-700 border-emerald-200'
                      )}>
                        {j.status.toUpperCase()}
                      </span>
                    </td>
                    <td className="p-3 font-mono font-bold text-slate-800">{j.averageSpeed} km/h</td>
                    <td className="p-3 font-mono text-slate-700">{j.density}%</td>
                    <td className="p-3 font-mono text-slate-700">{j.queueLength} m</td>
                    <td className="p-3 font-mono">
                      <span className={clsx(
                        'font-bold',
                        p10.congestionLevel === 'High' ? 'text-rose-700' : p10.congestionLevel === 'Medium' ? 'text-amber-700' : 'text-emerald-700'
                      )}>
                        {p10.predictedVehicleCount} veh ({p10.congestionProbability}%)
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 4 & 5: AI PREDICTION PERFORMANCE & CONGESTION EVENTS */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SECTION 4: AI Prediction Performance (6 Cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-purple-600" />
                AI Prediction Performance Metrics
              </h3>
              <p className="text-xs text-slate-500">Evaluation on historical test dataset</p>
            </div>
            <span className="text-[10px] font-medium text-slate-500 bg-slate-50 px-2 py-0.5 rounded border border-slate-200">
              Synthetic evaluation
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-900">Mean Absolute Error (MAE)</span>
              <div className="text-lg font-black font-mono text-purple-800">{modelMetrics.mae}</div>
              <span className="text-[10px] text-slate-500 block">Average prediction variance</span>
            </div>

            <div className="p-3.5 rounded-xl bg-purple-50/50 border border-purple-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-purple-900">Root Mean Squared Error (RMSE)</span>
              <div className="text-lg font-black font-mono text-purple-800">{modelMetrics.rmse}</div>
              <span className="text-[10px] text-slate-500 block">Penalizes large error spikes</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50/50 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-900">Prediction Accuracy (R²)</span>
              <div className="text-lg font-black font-mono text-emerald-800">{modelMetrics.accuracyR2}</div>
              <span className="text-[10px] text-slate-500 block">Across 5-30m lookaheads</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50/50 border border-blue-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-900">Inference Latency</span>
              <div className="text-lg font-black font-mono text-blue-800">{modelMetrics.inferenceLatency}</div>
              <span className="text-[10px] text-slate-500 block">FastAPI microservice inference</span>
            </div>
          </div>
          <p className="text-[11px] text-slate-400 italic">
            “Prototype model evaluation on synthetic data.”
          </p>
        </div>

        {/* SECTION 5: Congestion Events & Early Warnings (6 Cols) */}
        <div className="lg:col-span-6 p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
                Congestion Events & Preventative Actions
              </h3>
              <p className="text-xs text-slate-500">Autonomous incident avoidance telemetry</p>
            </div>
            <span className="text-xs font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
              {congestionStats.preventionRate}% Averted
            </span>
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-600">Total Predicted Events</span>
              <div className="text-xl font-black font-mono text-slate-900">{congestionStats.totalPredictedEvents}</div>
              <span className="text-[10px] text-slate-500 block">Identified by ML horizon models</span>
            </div>

            <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-emerald-900">Successfully Prevented</span>
              <div className="text-xl font-black font-mono text-emerald-700">{congestionStats.preventedEvents}</div>
              <span className="text-[10px] text-slate-500 block">Through green-wave adjustments</span>
            </div>

            <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-blue-900">Average Warning Time</span>
              <div className="text-xl font-black font-mono text-blue-700">{congestionStats.avgWarningLookaheadMin} min</div>
              <span className="text-[10px] text-slate-500 block">Proactive dispatcher lead time</span>
            </div>

            <div className="p-3.5 rounded-xl bg-rose-50 border border-rose-200 space-y-1">
              <span className="text-[10px] font-bold uppercase text-rose-900">Active High-Risk Junctions</span>
              <div className="text-xl font-black font-mono text-rose-700">{congestionStats.highRiskCount}</div>
              <span className="text-[10px] text-slate-500 block">Requiring immediate priority</span>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 6: INTEGRATED ENVIRONMENTAL IMPACT TELEMETRY */}
      <div className="p-5 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Leaf className="w-4 h-4 text-emerald-600" />
            Integrated Environmental Impact Telemetry (City-Wide)
          </h3>
          <span className="text-xs text-slate-500 font-mono">Simulated Savings</span>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="p-3.5 rounded-xl bg-emerald-50 border border-emerald-200 text-center">
            <span className="text-[10px] font-bold uppercase text-emerald-900 block">⛽ Fuel Saved</span>
            <div className="text-xl font-black font-mono text-emerald-700 mt-0.5">{cityEnvSummary.totalFuelSavedLitersDay} L/day</div>
            <span className="text-[10px] text-slate-500 block mt-1">Direct idling fuel reduction</span>
          </div>

          <div className="p-3.5 rounded-xl bg-teal-50 border border-teal-200 text-center">
            <span className="text-[10px] font-bold uppercase text-teal-900 block">🌱 CO₂ Reduced</span>
            <div className="text-xl font-black font-mono text-teal-700 mt-0.5">{cityEnvSummary.totalCo2ReducedKgDay} kg/day</div>
            <span className="text-[10px] text-slate-500 block mt-1">IPCC emission factor 2.31 kg/L</span>
          </div>

          <div className="p-3.5 rounded-xl bg-amber-50 border border-amber-200 text-center">
            <span className="text-[10px] font-bold uppercase text-amber-900 block">💰 Est. Savings</span>
            <div className="text-xl font-black font-mono text-amber-700 mt-0.5">₹{cityEnvSummary.totalMonetarySavingsInrDay.toLocaleString()}</div>
            <span className="text-[10px] text-slate-500 block mt-1">Commuter economic benefit</span>
          </div>

          <div className="p-3.5 rounded-xl bg-blue-50 border border-blue-200 text-center">
            <span className="text-[10px] font-bold uppercase text-blue-900 block">⏱ Idle Reduced</span>
            <div className="text-xl font-black font-mono text-blue-700 mt-0.5">{cityEnvSummary.totalIdleTimeSavedMinVehicle} min/veh</div>
            <span className="text-[10px] text-slate-500 block mt-1">Average wait time eliminated</span>
          </div>
        </div>
      </div>
    </div>
  );
};
