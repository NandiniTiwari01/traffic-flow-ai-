import React from 'react';
import { CongestionLevel } from '../../types/traffic';
import clsx from 'clsx';

interface CongestionBadgeProps {
  level: CongestionLevel;
  className?: string;
  showDot?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export const CongestionBadge: React.FC<CongestionBadgeProps> = ({ 
  level, 
  className,
  showDot = true,
  size = 'md'
}) => {
  const styles = {
    Low: 'bg-emerald-50 text-emerald-700 border-emerald-200',
    Medium: 'bg-amber-50 text-amber-700 border-amber-200',
    High: 'bg-rose-50 text-rose-700 border-rose-200',
  };

  const dotStyles = {
    Low: 'bg-emerald-500',
    Medium: 'bg-amber-500',
    High: 'bg-rose-500 animate-pulse',
  };

  const sizeStyles = {
    sm: 'text-[10px] font-bold px-2 py-0.5',
    md: 'text-xs font-bold px-2.5 py-1',
    lg: 'text-xs font-extrabold px-3 py-1.5',
  };

  return (
    <span 
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full border uppercase tracking-wider font-semibold transition-all',
        styles[level],
        sizeStyles[size],
        className
      )}
    >
      {showDot && (
        <span className={clsx('w-1.5 h-1.5 rounded-full flex-shrink-0', dotStyles[level])} />
      )}
      {level}
    </span>
  );
};
