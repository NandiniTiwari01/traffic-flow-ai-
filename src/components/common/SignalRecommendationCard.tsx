import React from 'react';
import { SignalRecommendation } from '../../types/traffic';
import { CheckCircle2, XCircle, Clock, Sparkles, Navigation, Cpu } from 'lucide-react';
import clsx from 'clsx';

interface SignalRecommendationCardProps {
  recommendation: SignalRecommendation;
  onAccept: (id: string) => void;
  onReject: (id: string) => void;
  compact?: boolean;
}

export const SignalRecommendationCard: React.FC<SignalRecommendationCardProps> = ({
  recommendation,
  onAccept,
  onReject,
  compact = false
}) => {
  const isAccepted = recommendation.status === 'ACCEPTED';
  const isRejected = recommendation.status === 'REJECTED';
  const isPending = recommendation.status === 'PENDING';

  return (
    <div 
      className={clsx(
        'rounded-2xl border transition-all duration-200 shadow-sm relative overflow-hidden bg-white',
        isPending && recommendation.severity === 'critical'
          ? 'border-rose-300 ring-2 ring-rose-500/10'
          : isPending
          ? 'border-amber-300'
          : isAccepted
          ? 'border-emerald-300 bg-emerald-50/20'
          : 'border-slate-200 opacity-80',
        compact ? 'p-4' : 'p-5'
      )}
    >
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <div className={clsx(
            'p-2 rounded-xl border shadow-xs',
            isAccepted ? 'bg-emerald-50 text-emerald-600 border-emerald-200' :
            isRejected ? 'bg-slate-100 text-slate-500 border-slate-200' :
            recommendation.severity === 'critical' ? 'bg-rose-50 text-rose-600 border-rose-200' : 'bg-amber-50 text-amber-600 border-amber-200'
          )}>
            <Cpu className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-slate-900 tracking-tight">
              {recommendation.junctionName}
            </h4>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="flex items-center gap-1 font-semibold text-blue-600">
                <Sparkles className="w-3 h-3 text-blue-600" />
                AI +{recommendation.horizonMinute}m Horizon
              </span>
              <span>•</span>
              <span className="flex items-center gap-1">
                <Clock className="w-3 h-3 text-slate-400" />
                {recommendation.timestamp}
              </span>
            </div>
          </div>
        </div>

        {/* Status Pill */}
        <div>
          {isAccepted && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
              <CheckCircle2 className="w-3.5 h-3.5" /> Applied
            </span>
          )}
          {isRejected && (
            <span className="inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full bg-slate-100 text-slate-600 border border-slate-200">
              <XCircle className="w-3.5 h-3.5" /> Dismissed
            </span>
          )}
          {isPending && (
            <span className={clsx(
              'inline-flex items-center gap-1 text-xs font-bold px-2.5 py-1 rounded-full border',
              recommendation.severity === 'critical'
                ? 'bg-rose-50 text-rose-700 border-rose-200'
                : 'bg-amber-50 text-amber-700 border-amber-200'
            )}>
              Action Needed
            </span>
          )}
        </div>
      </div>

      {/* Signal Timings Comparison */}
      <div className="mt-4 grid grid-cols-3 gap-2.5 p-3 rounded-xl bg-slate-50 border border-slate-100 text-center">
        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Current Green</span>
          <span className="text-base font-extrabold font-mono text-slate-800">
            {recommendation.currentGreenTime}s
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-blue-600 block">Recommended</span>
          <span className="text-base font-extrabold font-mono text-blue-700">
            {recommendation.recommendedGreenTime}s
          </span>
        </div>

        <div>
          <span className="text-[10px] uppercase font-bold tracking-wider text-slate-500 block">Change</span>
          <span className={clsx(
            'text-base font-extrabold font-mono',
            recommendation.difference > 0 ? 'text-emerald-600' : 'text-slate-600'
          )}>
            +{recommendation.difference}s
          </span>
        </div>
      </div>

      {/* Reasoning */}
      <div className="mt-3 text-xs text-slate-600 bg-slate-50/80 p-2.5 rounded-xl border border-slate-100 leading-relaxed">
        <strong className="text-slate-800">Reason: </strong>
        {recommendation.reason}
      </div>

      {/* Alternative Route Card (when available) */}
      {recommendation.alternativeRoute && (
        <div className="mt-3 p-2.5 rounded-xl bg-purple-50/60 border border-purple-100 flex items-start gap-2 text-xs">
          <Navigation className="w-4 h-4 text-purple-600 mt-0.5 flex-shrink-0" />
          <div className="space-y-0.5">
            <span className="font-bold text-purple-950">🛣️ Alternative Route: {recommendation.alternativeRoute.routeName}</span>
            <p className="text-[11px] text-slate-600">{recommendation.alternativeRoute.detourDesc}</p>
          </div>
        </div>
      )}

      {/* Action Buttons */}
      {isPending && (
        <div className="mt-4 flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => onReject(recommendation.id)}
            className="px-3.5 py-1.5 rounded-lg text-xs font-bold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 transition"
          >
            Reject
          </button>
          
          <button
            onClick={() => onAccept(recommendation.id)}
            className="px-4 py-1.5 rounded-lg text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 shadow-sm transition flex items-center gap-1.5"
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Accept Recommendation
          </button>
        </div>
      )}
    </div>
  );
};
