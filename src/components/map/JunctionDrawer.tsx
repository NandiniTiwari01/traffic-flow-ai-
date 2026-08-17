import React from 'react';
import { Junction } from '../../types/traffic';
import { CongestionBadge } from '../common/CongestionBadge';
import { SignalRecommendationCard } from '../common/SignalRecommendationCard';
import { 
  X, 
  Activity, 
  Car, 
  Sparkles, 
  Video, 
  Zap,
  Navigation
} from 'lucide-react';
import clsx from 'clsx';

interface JunctionDrawerProps {
  junction: Junction | null;
  onClose: () => void;
  onAcceptRecommendation: (id: string) => void;
  onRejectRecommendation: (id: string) => void;
}

export const JunctionDrawer: React.FC<JunctionDrawerProps> = ({
  junction,
  onClose,
  onAcceptRecommendation,
  onRejectRecommendation,
}) => {
  if (!junction) return null;

  const { vehicleBreakdown, predictions } = junction;
  const totalVehicles = Math.max(1, junction.vehicleCount);

  return (
    <div className="fixed inset-y-0 right-0 z-50 w-full sm:max-w-md bg-white border-l border-slate-200 shadow-2xl flex flex-col transition-all duration-300 animate-in slide-in-from-right">
      {/* Header */}
      <div className="p-5 border-b border-slate-100 flex items-start justify-between bg-slate-50/70">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-extrabold text-slate-900 tracking-tight">
              {junction.name}
            </h2>
            {junction.marathiName && (
              <span className="text-xs font-medium text-slate-500">
                ({junction.marathiName})
              </span>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-0.5">{junction.area}</p>
          <div className="mt-2 flex items-center gap-2">
            <CongestionBadge level={junction.status} size="sm" />
            <span className="text-[11px] font-mono text-blue-700 bg-blue-50 px-2 py-0.5 rounded-full border border-blue-200 flex items-center gap-1">
              <Video className="w-3 h-3 text-blue-600" />
              {junction.cctvId}
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      {/* Content Scrollable */}
      <div className="flex-1 overflow-y-auto p-5 space-y-5">
        {/* Real-time Telemetry Metrics Grid */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2.5 flex items-center gap-1.5">
            <Activity className="w-3.5 h-3.5 text-blue-600" />
            Live Telemetry Metrics
          </h3>
          <div className="grid grid-cols-2 gap-2.5">
            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Vehicle Count</span>
              <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {junction.vehicleCount}
                <span className="text-xs font-normal text-slate-500 ml-1">/ {junction.capacity} cap</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Average Velocity</span>
              <div className="text-lg font-black font-mono text-emerald-600 mt-0.5">
                {junction.averageSpeed} <span className="text-xs font-normal text-slate-500">km/h</span>
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Traffic Density</span>
              <div className="text-lg font-black font-mono text-amber-600 mt-0.5">
                {junction.density}%
              </div>
              <div className="w-full bg-slate-200 h-1.5 rounded-full mt-1.5 overflow-hidden">
                <div 
                  className={clsx(
                    'h-full rounded-full transition-all duration-300',
                    junction.density > 75 ? 'bg-rose-500' : junction.density > 45 ? 'bg-amber-500' : 'bg-emerald-500'
                  )} 
                  style={{ width: `${junction.density}%` }}
                />
              </div>
            </div>

            <div className="p-3 rounded-xl bg-slate-50 border border-slate-200">
              <span className="text-[11px] text-slate-500 font-medium">Queue Length</span>
              <div className="text-lg font-black font-mono text-slate-900 mt-0.5">
                {junction.queueLength} <span className="text-xs font-normal text-slate-500">m</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signal State Information */}
        <div className="p-3.5 rounded-xl bg-blue-50/70 border border-blue-200/80">
          <div className="flex items-center justify-between">
            <div>
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900">Active Signal Phase</span>
              <div className="text-xs font-bold text-slate-900 mt-0.5">{junction.signalPhase}</div>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold tracking-wider text-blue-900">Current Green</span>
              <div className="text-sm font-extrabold font-mono text-blue-700">{junction.currentGreenTime}s</div>
            </div>
          </div>
        </div>

        {/* Vehicle Classification Breakdown */}
        <div>
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
            <Car className="w-3.5 h-3.5 text-blue-600" />
            Fleet Composition
          </h3>
          <div className="space-y-1.5 text-xs bg-slate-50 p-3 rounded-xl border border-slate-200">
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Two-Wheelers (Bikes/Scooters)</span>
              <span className="font-mono font-bold text-slate-900">{vehicleBreakdown.twoWheelers} ({Math.round(vehicleBreakdown.twoWheelers/totalVehicles*100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Four-Wheelers (Cars/SUVs)</span>
              <span className="font-mono font-bold text-slate-900">{vehicleBreakdown.fourWheelers} ({Math.round(vehicleBreakdown.fourWheelers/totalVehicles*100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Auto-Rickshaws</span>
              <span className="font-mono font-bold text-slate-900">{vehicleBreakdown.autoRickshaws} ({Math.round(vehicleBreakdown.autoRickshaws/totalVehicles*100)}%)</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-slate-600">Buses & Heavy Commercial</span>
              <span className="font-mono font-bold text-slate-900">{vehicleBreakdown.busesTrucks} ({Math.round(vehicleBreakdown.busesTrucks/totalVehicles*100)}%)</span>
            </div>
          </div>
        </div>

        {/* AI Multi-Horizon Predictions (5m, 10m, 15m, 30m) */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-blue-600" />
              AI Predictive Forecast (5–30m)
            </h3>
          </div>

          <div className="grid grid-cols-2 gap-2">
            {/* 5 Min */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">+5 min</span>
                <CongestionBadge level={predictions.minutes5.congestionLevel} size="sm" />
              </div>
              <div className="text-xs text-slate-500">
                Speed: <span className="text-slate-900 font-mono font-bold">{predictions.minutes5.predictedSpeed} km/h</span>
              </div>
            </div>

            {/* 10 Min */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">+10 min</span>
                <CongestionBadge level={predictions.minutes10.congestionLevel} size="sm" />
              </div>
              <div className="text-xs text-slate-500">
                Speed: <span className="text-slate-900 font-mono font-bold">{predictions.minutes10.predictedSpeed} km/h</span>
              </div>
            </div>

            {/* 15 Min */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">+15 min</span>
                <CongestionBadge level={predictions.minutes15.congestionLevel} size="sm" />
              </div>
              <div className="text-xs text-slate-500">
                Speed: <span className="text-slate-900 font-mono font-bold">{predictions.minutes15.predictedSpeed} km/h</span>
              </div>
            </div>

            {/* 30 Min */}
            <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-200">
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-bold text-slate-800">+30 min</span>
                <CongestionBadge level={predictions.minutes30.congestionLevel} size="sm" />
              </div>
              <div className="text-xs text-slate-500">
                Speed: <span className="text-slate-900 font-mono font-bold">{predictions.minutes30.predictedSpeed} km/h</span>
              </div>
            </div>
          </div>
        </div>

        {/* Signal Recommendation Card if available */}
        {junction.recommendation && (
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 mb-2 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-blue-600" />
              Adaptive Signal Recommendation
            </h3>
            <SignalRecommendationCard
              recommendation={junction.recommendation}
              onAccept={onAcceptRecommendation}
              onReject={onRejectRecommendation}
              compact
            />
          </div>
        )}
      </div>
    </div>
  );
};
