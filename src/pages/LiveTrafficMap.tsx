import React, { useState } from 'react';
import { useTraffic } from '../context/TrafficContext';
import { NagpurMap } from '../components/map/NagpurMap';
import { JunctionDrawer } from '../components/map/JunctionDrawer';
import { CongestionBadge } from '../components/common/CongestionBadge';
import { 
  MapPin, 
  Filter, 
  Sparkles, 
  Activity, 
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export const LiveTrafficMap: React.FC = () => {
  const { 
    junctions, 
    selectedJunction, 
    setSelectedJunction,
    acceptRecommendation,
    rejectRecommendation,
  } = useTraffic();

  const [filter, setFilter] = useState<'ALL' | 'High' | 'Medium' | 'Low'>('ALL');

  const filteredJunctions = junctions.filter(j => {
    if (filter === 'ALL') return true;
    return j.status === filter;
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-200">
      {/* Top Controls & Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black text-slate-900 tracking-tight flex items-center gap-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              Nagpur Live Traffic GIS Map
            </h1>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
              7 SENSORS ACTIVE
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centering on Nagpur (21.1458° N, 79.0882° E) • Click any junction pin for telemetry & AI predictive control.
          </p>
        </div>

        {/* Filter Buttons */}
        <div className="flex items-center gap-2">
          <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilter('ALL')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              All ({junctions.length})
            </button>
            <button
              onClick={() => setFilter('High')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'High' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              High ({junctions.filter(j => j.status === 'High').length})
            </button>
            <button
              onClick={() => setFilter('Medium')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'Medium' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Medium ({junctions.filter(j => j.status === 'Medium').length})
            </button>
            <button
              onClick={() => setFilter('Low')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'Low' ? 'bg-white text-emerald-700 shadow-xs' : 'text-slate-500 hover:text-slate-900'
              )}
            >
              Low ({junctions.filter(j => j.status === 'Low').length})
            </button>
          </div>
        </div>
      </div>

      {/* Main Full-Size Map */}
      <NagpurMap
        junctions={filteredJunctions}
        selectedJunction={selectedJunction}
        onSelectJunction={setSelectedJunction}
        height="580px"
      />

      {/* Junction Telemetry Cards Grid Below Map */}
      <div>
        <h2 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
          <Activity className="w-4 h-4 text-blue-600" />
          Nagpur Monitored Intersections ({filteredJunctions.length})
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredJunctions.map(j => {
            const isSelected = selectedJunction?.id === j.id;
            return (
              <div
                key={j.id}
                onClick={() => setSelectedJunction(j)}
                className={clsx(
                  'p-4 rounded-2xl bg-white border transition-all cursor-pointer shadow-sm hover:shadow-md relative overflow-hidden group',
                  isSelected 
                    ? 'border-blue-500 ring-2 ring-blue-500/20' 
                    : 'border-slate-200 hover:border-slate-300'
                )}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition">
                      {j.name}
                    </h3>
                    <p className="text-[11px] text-slate-500">{j.area}</p>
                  </div>
                  <CongestionBadge level={j.status} size="sm" />
                </div>

                {/* Metrics Grid */}
                <div className="mt-3 grid grid-cols-3 gap-2 p-2 rounded-xl bg-slate-50 border border-slate-100 text-center">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Vehicles</span>
                    <span className="text-xs font-mono font-bold text-slate-900">{j.vehicleCount}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Speed</span>
                    <span className="text-xs font-mono font-bold text-emerald-600">{j.averageSpeed} km/h</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Density</span>
                    <span className="text-xs font-mono font-bold text-amber-600">{j.density}%</span>
                  </div>
                </div>

                {/* AI Forecast Mini Tag */}
                <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-100">
                  <span className="flex items-center gap-1 text-[11px] font-semibold text-blue-600">
                    <Sparkles className="w-3 h-3 text-blue-600" />
                    +10m Forecast:
                  </span>
                  <span className={clsx(
                    'font-bold text-[11px] px-1.5 py-0.5 rounded border uppercase',
                    j.predictions.minutes10.congestionLevel === 'High' ? 'text-rose-700 bg-rose-50 border-rose-200' :
                    j.predictions.minutes10.congestionLevel === 'Medium' ? 'text-amber-700 bg-amber-50 border-amber-200' : 'text-emerald-700 bg-emerald-50 border-emerald-200'
                  )}>
                    {j.predictions.minutes10.congestionLevel} ({j.predictions.minutes10.congestionProbability}%)
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Slide-in Details Drawer */}
      <JunctionDrawer
        junction={selectedJunction}
        onClose={() => setSelectedJunction(null)}
        onAcceptRecommendation={acceptRecommendation}
        onRejectRecommendation={rejectRecommendation}
      />
    </div>
  );
};
