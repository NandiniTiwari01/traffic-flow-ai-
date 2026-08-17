import React from 'react';
import { useHackathonDemo, DEMO_PHASES, DemoPhaseNumber } from '../../context/HackathonDemoContext';
import { 
  Play, 
  Square, 
  ChevronRight, 
  ChevronLeft, 
  Sparkles, 
  Radio, 
  Cpu, 
  Zap, 
  Leaf, 
  Timer, 
  Clock,
  CheckCircle2,
  AlertTriangle,
  ArrowRight
} from 'lucide-react';
import clsx from 'clsx';

export const HackathonDemoBanner: React.FC = () => {
  const { 
    isDemoActive, 
    currentPhase, 
    phaseTimeElapsed, 
    totalTimeElapsed, 
    phaseInfo, 
    startDemo, 
    stopDemo, 
    nextPhase, 
    prevPhase,
    jumpToPhase
  } = useHackathonDemo();

  const stepList: Array<{ id: string; label: string; icon: any; phases: DemoPhaseNumber[] }> = [
    { id: 'step-1', label: '1. Traffic Data', icon: Radio, phases: [1, 2] },
    { id: 'step-2', label: '2. AI Analysis', icon: Cpu, phases: [2, 3] },
    { id: 'step-3', label: '3. Prediction', icon: Sparkles, phases: [3] },
    { id: 'step-4', label: '4. Preventive Action', icon: Zap, phases: [4, 5] },
    { id: 'step-5', label: '5. Impact', icon: Leaf, phases: [6, 7] },
  ];

  if (!isDemoActive) {
    return (
      <div className="p-4 sm:p-5 rounded-2xl bg-gradient-to-r from-blue-600 via-indigo-600 to-blue-700 text-white shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3.5">
          <div className="w-12 h-12 rounded-2xl bg-white/15 backdrop-blur-md flex items-center justify-center text-2xl flex-shrink-0 shadow-inner">
            🎬
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-extrabold tracking-tight text-white">
                Hackathon Automated 7-Phase Demo Mode
              </h3>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-amber-400 text-slate-950">
                2-3 MIN WALKTHROUGH
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5 max-w-xl">
              Showcases the end-to-end intelligent pipeline: Normal Flow → Bottleneck Surge → AI 10m Prediction → Adaptive Signal Extension → Bottleneck Dissipation → CO₂ & Fuel Savings.
            </p>
          </div>
        </div>

        {/* Start Button */}
        <button
          onClick={startDemo}
          className="flex items-center justify-center gap-2 px-5 py-3 rounded-xl font-black text-xs bg-white text-blue-700 hover:bg-blue-50 shadow-md hover:shadow-lg transition-all transform active:scale-95 flex-shrink-0"
        >
          <Play className="w-4 h-4 fill-blue-700 text-blue-700" />
          <span>▶ Start Hackathon Demo</span>
        </button>
      </div>
    );
  }

  // Active Demo Dashboard Banner
  return (
    <div className="p-5 rounded-2xl bg-slate-900 text-white border-2 border-blue-500 shadow-xl space-y-4 animate-in slide-in-from-top duration-300">
      {/* Header & Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
        <div className="flex items-center gap-2.5">
          <span className="text-2xl">{phaseInfo.icon}</span>
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider bg-blue-600 text-white">
                DEMO ACTIVE • PHASE {currentPhase} / 7
              </span>
              <h3 className="text-base font-black text-white">{phaseInfo.title}</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              Total Time: {Math.floor(totalTimeElapsed / 60)}:{(totalTimeElapsed % 60).toString().padStart(2, '0')} • Phase Time: {phaseTimeElapsed}s / {phaseInfo.durationSec}s
            </span>
          </div>
        </div>

        {/* Phase Step Navigation Controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={prevPhase}
            disabled={currentPhase === 1}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 disabled:opacity-40 transition"
            title="Previous Phase"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <button
            onClick={nextPhase}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold transition shadow-xs"
          >
            <span>{currentPhase === 7 ? 'Finish Demo' : 'Next Phase'}</span>
            <ChevronRight className="w-4 h-4" />
          </button>

          <button
            onClick={stopDemo}
            className="flex items-center gap-1 px-3 py-2 rounded-xl bg-rose-600/90 hover:bg-rose-600 text-white text-xs font-bold transition ml-1"
            title="Stop Demo"
          >
            <Square className="w-3.5 h-3.5 fill-white" />
            <span>Stop Demo</span>
          </button>
        </div>
      </div>

      {/* 5-Step Process Progress Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
        {stepList.map((step, idx) => {
          const Icon = step.icon;
          const isCurrentStep = step.phases.includes(currentPhase);
          const isCompletedStep = Math.max(...step.phases) < currentPhase;

          return (
            <div
              key={step.id}
              onClick={() => jumpToPhase(step.phases[0])}
              className={clsx(
                'p-2.5 rounded-xl border text-xs font-bold flex items-center gap-2 cursor-pointer transition select-none',
                isCurrentStep
                  ? 'bg-blue-600 border-blue-400 text-white shadow-md ring-2 ring-blue-400/50'
                  : isCompletedStep
                  ? 'bg-slate-800/80 border-slate-700 text-emerald-400'
                  : 'bg-slate-800/40 border-slate-800 text-slate-500'
              )}
            >
              <Icon className="w-4 h-4 flex-shrink-0" />
              <span className="truncate">{step.label}</span>
              {isCompletedStep && <CheckCircle2 className="w-3.5 h-3.5 ml-auto text-emerald-400 flex-shrink-0" />}
            </div>
          );
        })}
      </div>

      {/* Narrative Scenario Box */}
      <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700 flex items-start gap-3 text-xs leading-relaxed">
        <div className="p-2 rounded-lg bg-blue-500/20 text-blue-400 flex-shrink-0 mt-0.5">
          <Sparkles className="w-4 h-4" />
        </div>
        <div className="space-y-1">
          <div className="font-bold text-slate-200">Narrator Context:</div>
          <p className="text-slate-300 font-medium">{phaseInfo.narrative}</p>
        </div>
      </div>
    </div>
  );
};
