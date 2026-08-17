import React, { useState, useEffect } from 'react';
import { 
  Clock, 
  Bell, 
  Play, 
  Pause, 
  RotateCcw, 
  Search, 
  Activity,
  Radio,
  ShieldCheck
} from 'lucide-react';
import { Junction } from '../../types/traffic';
import { DataSourceSelector } from '../common/DataSourceSelector';
import clsx from 'clsx';

interface HeaderProps {
  isRunning: boolean;
  onToggleSimulation: () => void;
  onResetSimulation: () => void;
  onAcceptAllRecommendations: () => void;
  pendingCount: number;
  activeAlertsCount: number;
  onOpenAlerts?: () => void;
  junctions: Junction[];
  onSelectJunction: (j: Junction) => void;
  weather: string;
}

export const Header: React.FC<HeaderProps> = ({
  isRunning,
  onToggleSimulation,
  onResetSimulation,
  onAcceptAllRecommendations,
  pendingCount,
  activeAlertsCount,
  onOpenAlerts,
  junctions,
  onSelectJunction,
  weather,
}) => {
  const [time, setTime] = useState<string>('');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setTime(now.toLocaleTimeString('en-IN', {
        timeZone: 'Asia/Kolkata',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: true
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  const filteredJunctions = junctions.filter(j => 
    j.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    j.area.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <header className="min-h-[5rem] sm:min-h-[5.25rem] py-3 sm:py-3.5 px-4 sm:px-7 bg-white border-b border-slate-200/90 flex flex-col md:flex-row md:items-center justify-between sticky top-0 z-30 shadow-sm gap-3 transition-all">
      {/* Left: Prominent Branding (Larger Traffic Icon, Bold Title & Clear Subtitle) */}
      <div className="flex items-center justify-between md:justify-start gap-3 sm:gap-4 flex-shrink-0">
        <div className="flex items-center gap-3 sm:gap-3.5">
          {/* Larger Traffic Light Icon Box */}
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-blue-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 text-2xl flex-shrink-0 select-none">
            🚦
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base sm:text-xl md:text-2xl font-black text-slate-900 tracking-tight leading-tight">
                TrafficFlow AI
              </h1>
              <span className="hidden xl:inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                Command Center
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 tracking-normal mt-0.5">
              Predict • Prevent • Optimize
            </p>
          </div>
        </div>

        {/* Mobile-only Quick Status */}
        <div className="md:hidden flex items-center gap-1.5">
          <div className="flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-bold">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            <span>Online</span>
          </div>
        </div>
      </div>

      {/* Center: Traffic Data Source Selector & Search */}
      <div className="flex flex-wrap items-center gap-2.5 sm:gap-3 justify-center">
        <DataSourceSelector />

        {/* Quick Junction Search (Desktop) */}
        <div className="hidden 2xl:block relative">
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100 px-3.5 py-2 rounded-xl border border-slate-200 focus-within:border-blue-500 focus-within:bg-white transition w-60">
            <Search className="w-4 h-4 text-slate-400" />
            <input
              type="text"
              placeholder="Search junction..."
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setIsSearchOpen(true);
              }}
              onFocus={() => setIsSearchOpen(true)}
              className="bg-transparent text-xs font-medium text-slate-900 placeholder:text-slate-400 focus:outline-none w-full"
            />
          </div>

          {isSearchOpen && searchQuery && (
            <div className="absolute top-full left-0 mt-1.5 w-80 bg-white border border-slate-200 rounded-xl shadow-xl overflow-hidden z-50 max-h-60 overflow-y-auto">
              {filteredJunctions.length > 0 ? (
                filteredJunctions.map(j => (
                  <button
                    key={j.id}
                    onClick={() => {
                      onSelectJunction(j);
                      setIsSearchOpen(false);
                      setSearchQuery('');
                    }}
                    className="w-full text-left px-3.5 py-2.5 text-xs hover:bg-slate-50 border-b border-slate-100 flex items-center justify-between transition"
                  >
                    <div>
                      <div className="font-bold text-slate-900">{j.name}</div>
                      <div className="text-[11px] text-slate-500">{j.area}</div>
                    </div>
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      j.status === 'High' ? 'bg-rose-50 text-rose-700 border-rose-200' :
                      j.status === 'Medium' ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                      'bg-emerald-50 text-emerald-700 border-emerald-200'
                    )}>
                      {j.status}
                    </span>
                  </button>
                ))
              ) : (
                <div className="p-3 text-xs text-slate-500 text-center">No matching Nagpur junctions found</div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Side Controls (Larger & Clearer: AI Online, Alerts, Traffic Control & Clock) */}
      <div className="flex items-center gap-2.5 sm:gap-3.5 justify-end flex-shrink-0">
        {/* 🟢 AI System Online */}
        <div className="hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs sm:text-sm font-bold shadow-2xs">
          <span className="relative flex h-2.5 w-2.5">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-emerald-500"></span>
          </span>
          <span>AI System Online</span>
        </div>

        {/* 🔔 Alerts Button */}
        <button
          onClick={onOpenAlerts}
          className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition flex items-center justify-center shadow-2xs"
          title="Active System Alerts"
        >
          <Bell className="w-4 h-4 sm:w-5 sm:h-5" />
          {activeAlertsCount > 0 && (
            <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-rose-500 text-white font-mono text-[10px] font-extrabold flex items-center justify-center ring-2 ring-white animate-pulse">
              {activeAlertsCount}
            </span>
          )}
        </button>

        {/* Traffic Control status & simulation toggle */}
        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200 gap-1 shadow-2xs">
          <button
            onClick={onToggleSimulation}
            className={clsx(
              'flex items-center gap-1.5 px-3 sm:px-3.5 py-1.5 rounded-lg text-xs sm:text-sm font-bold transition shadow-xs',
              isRunning
                ? 'bg-blue-600 text-white hover:bg-blue-700'
                : 'bg-amber-500 text-white hover:bg-amber-600'
            )}
            title="Traffic Control State"
          >
            {isRunning ? (
              <>
                <Pause className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Traffic Control</span>
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                <span>Resume Control</span>
              </>
            )}
          </button>

          <button
            onClick={onResetSimulation}
            className="p-1.5 text-slate-500 hover:text-slate-800 hover:bg-white rounded-lg transition"
            title="Reset Simulation State"
          >
            <RotateCcw className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
          </button>
        </div>

        {/* Live Clock */}
        <div className="hidden lg:flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200 text-xs sm:text-sm font-mono font-bold text-slate-800 shadow-2xs">
          <Clock className="w-4 h-4 text-blue-600" />
          <span>{time || '18:45:00 IST'}</span>
        </div>
      </div>
    </header>
  );
};
