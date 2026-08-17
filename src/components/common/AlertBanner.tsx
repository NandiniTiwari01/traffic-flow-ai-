import React, { useState } from 'react';
import { Alert } from '../../types/traffic';
import { AlertTriangle, TrendingDown, Flame, CloudRain, X, Bell } from 'lucide-react';
import clsx from 'clsx';

interface AlertBannerProps {
  alerts: Alert[];
  onDismiss: (id: string) => void;
  onClearAll: () => void;
}

export const AlertBanner: React.FC<AlertBannerProps> = ({
  alerts,
  onDismiss,
  onClearAll
}) => {
  const [filter, setFilter] = useState<'ALL' | 'HIGH' | 'INCIDENT'>('ALL');

  if (alerts.length === 0) {
    return (
      <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 flex items-center justify-between text-xs text-emerald-800 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="font-semibold">All Nagpur corridors operating within safe AI traffic thresholds. Zero critical alerts.</span>
        </div>
        <span className="text-emerald-700 font-mono font-bold bg-emerald-100/70 px-2 py-0.5 rounded">SYSTEM NORMAL</span>
      </div>
    );
  }

  const filteredAlerts = alerts.filter(a => {
    if (filter === 'HIGH') return a.severity === 'high';
    if (filter === 'INCIDENT') return a.type === 'INCIDENT' || a.type === 'WEATHER';
    return true;
  });

  const getAlertIcon = (type: Alert['type']) => {
    switch (type) {
      case 'CONGESTION_PREDICTED':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'SPEED_DECREASING':
        return <TrendingDown className="w-4 h-4 text-amber-600" />;
      case 'JUNCTION_OVERLOADED':
        return <Flame className="w-4 h-4 text-rose-600" />;
      case 'WEATHER':
        return <CloudRain className="w-4 h-4 text-blue-600" />;
      case 'INCIDENT':
      default:
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
    }
  };

  return (
    <div className="rounded-2xl border border-slate-200/90 bg-white p-5 shadow-sm space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-xl bg-rose-50 text-rose-600 border border-rose-100">
            <Bell className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              Active Congestion Alerts
              <span className="px-2 py-0.5 rounded-full text-xs font-mono font-bold bg-rose-50 text-rose-700 border border-rose-200">
                {alerts.length}
              </span>
            </h3>
          </div>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 text-xs font-semibold">
            <button
              onClick={() => setFilter('ALL')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'ALL' ? 'bg-white text-slate-900 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              All ({alerts.length})
            </button>
            <button
              onClick={() => setFilter('HIGH')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'HIGH' ? 'bg-white text-rose-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              Critical ({alerts.filter(a => a.severity === 'high').length})
            </button>
            <button
              onClick={() => setFilter('INCIDENT')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition',
                filter === 'INCIDENT' ? 'bg-white text-amber-700 shadow-xs' : 'text-slate-500 hover:text-slate-800'
              )}
            >
              Incidents
            </button>
          </div>

          <button
            onClick={onClearAll}
            className="text-xs font-semibold text-slate-500 hover:text-slate-800 px-2.5 py-1.5 rounded-lg border border-slate-200 hover:bg-slate-50 transition"
          >
            Clear All
          </button>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2.5 max-h-64 overflow-y-auto pr-1">
        {filteredAlerts.map(alert => (
          <div
            key={alert.id}
            className={clsx(
              'p-3.5 rounded-xl border flex items-start justify-between gap-3 transition-all',
              alert.severity === 'high'
                ? 'bg-rose-50/50 border-rose-200 hover:border-rose-300'
                : alert.severity === 'medium'
                ? 'bg-amber-50/50 border-amber-200 hover:border-amber-300'
                : 'bg-slate-50 border-slate-200'
            )}
          >
            <div className="flex items-start gap-3">
              <div className="mt-0.5 p-2 rounded-xl bg-white border border-slate-200 shadow-xs">
                {getAlertIcon(alert.type)}
              </div>
              <div className="space-y-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-bold text-slate-900">
                    {alert.title}
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-white border border-slate-200 text-slate-700">
                    {alert.junctionName}
                  </span>
                  <span className="text-[10px] text-slate-400 font-mono">
                    {alert.timestamp}
                  </span>
                </div>
                <p className="text-xs text-slate-600 leading-normal">
                  {alert.message}
                </p>
                {alert.actionRequired && (
                  <div className="mt-1 flex items-center gap-1.5 text-[11px] text-blue-700 font-semibold bg-blue-50/80 px-2.5 py-1 rounded-lg border border-blue-100">
                    <span>Action:</span>
                    <span className="text-slate-800">{alert.actionRequired}</span>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={() => onDismiss(alert.id)}
              className="p-1 text-slate-400 hover:text-slate-700 hover:bg-white rounded-lg transition"
              title="Dismiss Alert"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
