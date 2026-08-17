import React from 'react';
import { 
  LayoutDashboard, 
  MapPin, 
  Sparkles, 
  Sliders, 
  BarChart3, 
  Activity,
  Video,
} from 'lucide-react';
import clsx from 'clsx';

export type PageTab = 'dashboard' | 'map' | 'predictions' | 'simulation' | 'video' | 'analytics';

interface SidebarProps {
  activeTab: PageTab;
  onTabChange: (tab: PageTab) => void;
  activeAlertsCount: number;
  pendingRecommendationsCount: number;
  isSimulating: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onTabChange,
  pendingRecommendationsCount,
  isSimulating
}) => {
  const navItems: { id: PageTab; label: string; icon: React.ElementType; badge?: number | string; badgeColor?: string }[] = [
    {
      id: 'dashboard',
      label: 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'map',
      label: 'Live Traffic Map',
      icon: MapPin,
      badge: 'Nagpur',
      badgeColor: 'text-blue-700 bg-blue-50 border-blue-200'
    },
    {
      id: 'predictions',
      label: 'AI Prediction',
      icon: Sparkles,
      badge: '5-30m',
      badgeColor: 'text-purple-700 bg-purple-50 border-purple-200'
    },
    {
      id: 'simulation',
      label: 'Simulation',
      icon: Sliders,
      badge: isSimulating ? 'LIVE' : 'PAUSED',
      badgeColor: isSimulating ? 'text-emerald-700 bg-emerald-50 border-emerald-200' : 'text-slate-600 bg-slate-100'
    },
    {
      id: 'video',
      label: 'CCTV Video Analysis',
      icon: Video,
      badge: 'YOLO',
      badgeColor: 'text-amber-700 bg-amber-50 border-amber-200'
    },
    {
      id: 'analytics',
      label: 'Analytics & Impact',
      icon: BarChart3,
    },
  ];

  return (
    <aside className="w-64 bg-white border-r border-slate-200 flex flex-col justify-between flex-shrink-0 z-40 hidden md:flex shadow-xs">
      {/* Brand Header */}
      <div>
        <div className="h-16 px-5 flex items-center gap-3 border-b border-slate-200">
          <div className="w-9 h-9 rounded-xl bg-blue-600 text-white flex items-center justify-center font-black text-base shadow-sm">
            🚦
          </div>
          <div>
            <div className="font-extrabold text-sm text-slate-900 tracking-tight">TrafficFlow AI</div>
            <div className="text-[10px] font-semibold text-blue-600 uppercase tracking-wider">Smart Mobility Grid</div>
          </div>
        </div>

        {/* Navigation List */}
        <nav className="p-3.5 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activeTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => onTabChange(item.id)}
                className={clsx(
                  'w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all group text-left',
                  isActive
                    ? 'bg-blue-50 text-blue-700 border border-blue-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                )}
              >
                <div className="flex items-center gap-2.5">
                  <Icon className={clsx(
                    'w-4 h-4 transition-colors',
                    isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                  )} />
                  <span>{item.label}</span>
                </div>

                {item.badge && (
                  <span className={clsx(
                    'px-2 py-0.5 rounded-full text-[10px] font-bold border font-mono',
                    item.badgeColor || 'bg-slate-100 text-slate-600 border-slate-200'
                  )}>
                    {item.badge}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Bottom Corridor & System Telemetry Pill */}
      <div className="p-4 border-t border-slate-200 space-y-2.5 bg-slate-50/50">
        <div className="p-3 rounded-xl bg-white border border-slate-200/90 shadow-xs">
          <div className="flex items-center justify-between text-xs font-bold text-slate-800">
            <span className="flex items-center gap-1.5">
              <Activity className="w-3.5 h-3.5 text-blue-600" />
              Active Signal Actions
            </span>
            <span className="font-mono text-blue-600">{pendingRecommendationsCount}</span>
          </div>
          <div className="text-[11px] text-slate-500 mt-1">
            {pendingRecommendationsCount > 0 
              ? `${pendingRecommendationsCount} automated green cycle optimizations available.`
              : 'All corridor signals operating at optimal equilibrium.'}
          </div>
        </div>

        <div className="text-[10px] text-slate-400 text-center font-medium">
          Nagpur Smart City Mission • v1.2
        </div>
      </div>
    </aside>
  );
};
