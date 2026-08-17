import React from 'react';
import { LucideIcon } from 'lucide-react';
import clsx from 'clsx';

interface MetricCardProps {
  title: string;
  value: string | number;
  unit?: string;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
    label?: string;
  };
  variant?: 'default' | 'emerald' | 'amber' | 'rose' | 'cyan' | 'indigo' | 'blue';
  onClick?: () => void;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  subtitle,
  icon: Icon,
  trend,
  variant = 'default',
  onClick
}) => {
  const iconColors = {
    default: 'bg-blue-50 text-blue-600 border-blue-200',
    blue: 'bg-blue-50 text-blue-600 border-blue-200',
    emerald: 'bg-emerald-50 text-emerald-600 border-emerald-200',
    amber: 'bg-amber-50 text-amber-600 border-amber-200',
    rose: 'bg-rose-50 text-rose-600 border-rose-200',
    cyan: 'bg-cyan-50 text-cyan-600 border-cyan-200',
    indigo: 'bg-indigo-50 text-indigo-600 border-indigo-200',
  };

  return (
    <div 
      onClick={onClick}
      className={clsx(
        'relative overflow-hidden rounded-2xl bg-white p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all duration-200',
        onClick && 'cursor-pointer hover:border-blue-400'
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
            {title}
          </p>
          <div className="mt-2 flex items-baseline gap-1.5">
            <span className="text-3xl font-extrabold text-slate-900 tracking-tight font-mono">
              {value}
            </span>
            {unit && (
              <span className="text-sm font-semibold text-slate-500">
                {unit}
              </span>
            )}
          </div>
          {subtitle && (
            <p className="mt-1 text-xs text-slate-500 font-medium">
              {subtitle}
            </p>
          )}
        </div>
        <div className={clsx('p-3 rounded-xl border shadow-xs', iconColors[variant] || iconColors.default)}>
          <Icon className="w-5 h-5" />
        </div>
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-2 text-xs">
          <span
            className={clsx(
              'font-bold px-1.5 py-0.5 rounded border',
              trend.isPositive 
                ? 'text-emerald-700 bg-emerald-50 border-emerald-200' 
                : 'text-rose-700 bg-rose-50 border-rose-200'
            )}
          >
            {trend.value}
          </span>
          <span className="text-slate-500 font-medium">{trend.label || 'vs last 15 min'}</span>
        </div>
      )}
    </div>
  );
};
