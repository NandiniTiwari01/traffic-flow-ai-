import React from 'react';
import { useTraffic } from '../../context/TrafficContext';
import { TrafficDataSource } from '../../types/traffic';
import { Radio, Video, Sliders, CheckCircle2 } from 'lucide-react';
import clsx from 'clsx';

interface DataSourceSelectorProps {
  compact?: boolean;
}

export const DataSourceSelector: React.FC<DataSourceSelectorProps> = ({ compact }) => {
  const { dataSource, setDataSource, activeVideoAnalysis } = useTraffic();

  return (
    <div className={clsx(
      'flex items-center gap-3 p-1.5 rounded-xl border transition-all',
      dataSource === 'cctv_video'
        ? 'bg-emerald-50/70 border-emerald-200'
        : 'bg-slate-100/90 border-slate-200'
    )}>
      <span className="text-[11px] font-bold text-slate-600 pl-2 hidden sm:inline">
        Traffic Data Source:
      </span>

      <div className="flex items-center gap-1.5">
        {/* Simulation Option */}
        <button
          onClick={() => setDataSource('simulation')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition shadow-xs',
            dataSource === 'simulation'
              ? 'bg-white text-blue-700 shadow-xs border border-blue-200'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <span className="w-2 h-2 rounded-full bg-blue-600" />
          <Sliders className="w-3.5 h-3.5" />
          <span>Simulation</span>
        </button>

        {/* CCTV Video Option */}
        <button
          onClick={() => setDataSource('cctv_video')}
          className={clsx(
            'flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-bold transition',
            dataSource === 'cctv_video'
              ? 'bg-white text-emerald-700 shadow-xs border border-emerald-300'
              : 'text-slate-600 hover:text-slate-900'
          )}
        >
          <span className={clsx(
            'w-2 h-2 rounded-full',
            activeVideoAnalysis ? 'bg-emerald-600 animate-pulse' : 'bg-slate-400'
          )} />
          <Video className="w-3.5 h-3.5" />
          <span>CCTV Video {activeVideoAnalysis && '(Active)'}</span>
        </button>
      </div>

      {/* Mode Status Pill */}
      <span className={clsx(
        'text-[10px] font-mono font-bold px-2 py-0.5 rounded-full border hidden md:inline-flex items-center gap-1',
        dataSource === 'cctv_video'
          ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
          : 'bg-blue-100 text-blue-800 border-blue-200'
      )}>
        {dataSource === 'cctv_video' ? (
          <>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-ping" />
            🟢 CCTV Video Active
          </>
        ) : (
          <>
            🔵 Simulation Mode
          </>
        )}
      </span>
    </div>
  );
};
