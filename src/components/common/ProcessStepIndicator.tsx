import React, { useState } from 'react';
import { 
  Radio, 
  Cpu, 
  Sparkles, 
  Zap, 
  Video, 
  Sliders, 
  Smartphone, 
  Car, 
  Gauge, 
  Activity, 
  TrendingUp, 
  Clock, 
  CheckCircle2, 
  XCircle, 
  ArrowRight, 
  ShieldAlert, 
  Navigation,
  Layers
} from 'lucide-react';
import { Junction, SignalRecommendation } from '../../types/traffic';
import clsx from 'clsx';

interface ProcessStepIndicatorProps {
  currentJunction: Junction | null;
  onAcceptRecommendation: (id: string) => void;
  onRejectRecommendation: (id: string) => void;
}

export const ProcessStepIndicator: React.FC<ProcessStepIndicatorProps> = ({
  currentJunction,
  onAcceptRecommendation,
  onRejectRecommendation,
}) => {
  const [activeStep, setActiveStep] = useState<number>(3); // Default to Step 3 (Congestion Prediction - most important)

  const steps = [
    {
      num: 1,
      title: 'TRAFFIC DATA',
      subtitle: 'Multi-source Sensing',
      icon: Radio,
      badge: 'Step 1',
    },
    {
      num: 2,
      title: 'AI ANALYSIS',
      subtitle: 'Pattern & Density Extraction',
      icon: Cpu,
      badge: 'Step 2',
    },
    {
      num: 3,
      title: 'CONGESTION PREDICTION',
      subtitle: '5–30 Min Early Forecast',
      icon: Sparkles,
      badge: 'Step 3 (Core)',
    },
    {
      num: 4,
      title: 'PREVENTIVE ACTION',
      subtitle: 'Signal & Route Optimization',
      icon: Zap,
      badge: 'Step 4',
    },
  ];

  const junc = currentJunction;
  const p10 = junc?.predictions?.minutes10;
  const rec = junc?.recommendation;

  return (
    <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm p-5 space-y-5">
      {/* Header & Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-blue-600 bg-blue-50 px-2.5 py-1 rounded-full border border-blue-100">
              System Pipeline
            </span>
            <h2 className="text-base font-bold text-slate-900">
              4-Step Traffic Intelligence Architecture
            </h2>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            End-to-end autonomous flow: Real-time sensing → Neural feature extraction → Predictive forecasting → Signal action.
          </p>
        </div>

        <div className="text-xs text-slate-500 font-medium">
          Monitoring: <strong className="text-slate-800">{junc ? junc.name : 'Nagpur Corridor'}</strong>
        </div>
      </div>

      {/* Horizontal Step Navigation Indicator */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {steps.map((step) => {
          const Icon = step.icon;
          const isActive = activeStep === step.num;
          return (
            <button
              key={step.num}
              onClick={() => setActiveStep(step.num)}
              className={clsx(
                'p-3.5 rounded-xl border text-left transition-all relative overflow-hidden flex flex-col justify-between group',
                isActive
                  ? 'bg-blue-50/80 border-blue-500 text-blue-900 shadow-sm ring-2 ring-blue-500/20'
                  : 'bg-slate-50/80 hover:bg-slate-100/80 border-slate-200/80 text-slate-700'
              )}
            >
              <div className="flex items-center justify-between mb-2">
                <span className={clsx(
                  'text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border',
                  isActive 
                    ? 'bg-blue-600 text-white border-blue-600' 
                    : 'bg-white text-slate-600 border-slate-200'
                )}>
                  STEP {step.num}
                </span>
                <div className={clsx(
                  'p-1.5 rounded-lg transition-colors',
                  isActive ? 'bg-blue-600 text-white' : 'bg-white text-slate-500 border border-slate-200'
                )}>
                  <Icon className="w-4 h-4" />
                </div>
              </div>

              <div>
                <div className="text-xs font-extrabold tracking-tight">
                  {step.title}
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  {step.subtitle}
                </div>
              </div>
            </button>
          );
        })}
      </div>

      {/* Step Details View */}
      <div className="rounded-xl border border-slate-200 bg-slate-50/50 p-4 transition-all">
        {/* STEP 1: Traffic Data */}
        {activeStep === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Radio className="w-4 h-4 text-blue-600" />
                STEP 1: Multi-Source Traffic Data Ingestion
              </h3>
              <span className="text-xs font-medium text-slate-500">Live Ingestion Active</span>
            </div>

            {/* Ingestion Sources Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-50 text-blue-600 border border-blue-100">
                  <Video className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">📹 CCTV / Video</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Live optical feed & automated vehicle tracking (ID: {junc?.cctvId || 'CCTV-NAG-01'})</p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <Sliders className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">🎮 Simulation Grid</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Greenshields speed-density physics & Poisson arrival queuing</p>
                </div>
              </div>

              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-sm flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-50 text-purple-600 border border-purple-100">
                  <Radio className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-900">📡 IoT & Loop Detectors</h4>
                  <p className="text-[11px] text-slate-500 mt-0.5">Arterial induction loops & historical traffic time-series telemetry</p>
                </div>
              </div>
            </div>

            {/* Data Collected Metrics */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-2.5">
                Telemetry Captured for {junc?.name || 'Selected Junction'}
              </span>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5 text-center">
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Vehicle Count</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">{junc?.vehicleCount || 120}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Vehicle Types</span>
                  <span className="text-xs font-bold text-blue-600">2W, 4W, Bus, Auto</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Average Speed</span>
                  <span className="text-base font-extrabold font-mono text-emerald-600">{junc?.averageSpeed || 24} km/h</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <span className="text-[10px] text-slate-500 block">Traffic Density</span>
                  <span className="text-base font-extrabold font-mono text-amber-600">{junc?.density || 62}%</span>
                </div>
                <div className="p-2.5 rounded-lg bg-slate-50 border border-slate-100 col-span-2 sm:col-span-1">
                  <span className="text-[10px] text-slate-500 block">Queue Length</span>
                  <span className="text-base font-extrabold font-mono text-slate-900">{junc?.queueLength || 160} m</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: AI Analysis */}
        {activeStep === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-blue-600" />
                STEP 2: Machine Learning Feature Extraction & Analysis
              </h3>
              <span className="text-xs font-medium text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                Inference Latency: 18ms
              </span>
            </div>

            {/* Analysis Flow Pipeline */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
              <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500 block mb-3">
                Feature Processing Flow
              </span>
              <div className="flex flex-col sm:flex-row items-center justify-between gap-2 text-center text-xs font-bold">
                <div className="w-full sm:w-auto flex-1 p-2.5 rounded-xl bg-blue-50 text-blue-900 border border-blue-200">
                  📡 Raw Traffic Data
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0 flex-shrink-0" />
                <div className="w-full sm:w-auto flex-1 p-2.5 rounded-xl bg-indigo-50 text-indigo-900 border border-indigo-200">
                  🚗 Vehicle Detection
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0 flex-shrink-0" />
                <div className="w-full sm:w-auto flex-1 p-2.5 rounded-xl bg-teal-50 text-teal-900 border border-teal-200">
                  💨 Speed Estimation
                </div>
                <ArrowRight className="w-4 h-4 text-slate-400 rotate-90 sm:rotate-0 flex-shrink-0" />
                <div className="w-full sm:w-auto flex-1 p-2.5 rounded-xl bg-amber-50 text-amber-900 border border-amber-200">
                  📊 Density Analysis
                </div>
              </div>
            </div>

            {/* AI Capabilities 4-Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Car className="w-3.5 h-3.5 text-blue-600" />
                  Vehicle Classification
                </div>
                <p className="text-[11px] text-slate-500 mt-1">YOLOv8 deep learning separates 2W, 4W, buses and freight trucks.</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-3.5 h-3.5 text-emerald-600" />
                  Density Extraction
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Real-time corridor capacity saturation calculation.</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Gauge className="w-3.5 h-3.5 text-teal-600" />
                  Speed Estimation
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Calibrated pixel displacement with frame rate tracking.</p>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200">
                <div className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Cpu className="w-3.5 h-3.5 text-purple-600" />
                  Pattern Recognition
                </div>
                <p className="text-[11px] text-slate-500 mt-1">Learns historical rush hour & weather bottlenecks in Nagpur.</p>
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Congestion Prediction (Most Visually Important) */}
        {activeStep === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-600" />
                STEP 3: Multi-Horizon Congestion Prediction (5–30 min)
              </h3>
              <span className="text-xs font-mono font-bold text-blue-700 bg-blue-100/70 px-2.5 py-0.5 rounded-full">
                Core AI Model
              </span>
            </div>

            {/* 4 Multi-Horizon Forecast Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {/* 5 Min */}
              <div className={clsx(
                'p-4 rounded-xl border transition-all shadow-sm',
                junc?.predictions?.minutes5?.congestionLevel === 'High'
                  ? 'bg-rose-50/90 border-rose-300'
                  : junc?.predictions?.minutes5?.congestionLevel === 'Medium'
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-white border-slate-200'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800">🔮 5 Min Forecast</span>
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase',
                    junc?.predictions?.minutes5?.congestionLevel === 'High'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : junc?.predictions?.minutes5?.congestionLevel === 'Medium'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  )}>
                    {junc?.predictions?.minutes5?.congestionLevel || 'Low'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Probability:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes5?.congestionProbability || 40}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Vehicles:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes5?.predictedVehicleCount || 110}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Speed:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes5?.predictedSpeed || 32} km/h</strong>
                  </div>
                </div>
              </div>

              {/* 10 Min (Primary Focus Example) */}
              <div className={clsx(
                'p-4 rounded-xl border-2 transition-all shadow-md relative overflow-hidden',
                junc?.predictions?.minutes10?.congestionLevel === 'High'
                  ? 'bg-rose-50 border-rose-400 ring-2 ring-rose-300/40'
                  : junc?.predictions?.minutes10?.congestionLevel === 'Medium'
                  ? 'bg-amber-50 border-amber-400'
                  : 'bg-white border-blue-400'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-black text-slate-900">🔮 10 Min Forecast</span>
                  <span className={clsx(
                    'text-[10px] font-extrabold px-2 py-0.5 rounded-full border uppercase',
                    junc?.predictions?.minutes10?.congestionLevel === 'High'
                      ? 'bg-rose-600 text-white border-rose-600'
                      : junc?.predictions?.minutes10?.congestionLevel === 'Medium'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'bg-emerald-600 text-white border-emerald-600'
                  )}>
                    {junc?.predictions?.minutes10?.congestionLevel || 'Medium'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Probability:</span>
                    <strong className="font-mono font-bold text-rose-600 text-sm">
                      {junc?.predictions?.minutes10?.congestionProbability || 87}%
                    </strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Vehicles:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes10?.predictedVehicleCount || 145}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Speed:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes10?.predictedSpeed || 18} km/h</strong>
                  </div>
                </div>
              </div>

              {/* 15 Min */}
              <div className={clsx(
                'p-4 rounded-xl border transition-all shadow-sm',
                junc?.predictions?.minutes15?.congestionLevel === 'High'
                  ? 'bg-rose-50/90 border-rose-300'
                  : junc?.predictions?.minutes15?.congestionLevel === 'Medium'
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-white border-slate-200'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800">🔮 15 Min Forecast</span>
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase',
                    junc?.predictions?.minutes15?.congestionLevel === 'High'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : junc?.predictions?.minutes15?.congestionLevel === 'Medium'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  )}>
                    {junc?.predictions?.minutes15?.congestionLevel || 'Medium'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Probability:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes15?.congestionProbability || 76}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Vehicles:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes15?.predictedVehicleCount || 162}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Speed:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes15?.predictedSpeed || 21} km/h</strong>
                  </div>
                </div>
              </div>

              {/* 30 Min */}
              <div className={clsx(
                'p-4 rounded-xl border transition-all shadow-sm',
                junc?.predictions?.minutes30?.congestionLevel === 'High'
                  ? 'bg-rose-50/90 border-rose-300'
                  : junc?.predictions?.minutes30?.congestionLevel === 'Medium'
                  ? 'bg-amber-50/80 border-amber-300'
                  : 'bg-white border-slate-200'
              )}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold text-slate-800">🔮 30 Min Forecast</span>
                  <span className={clsx(
                    'text-[10px] font-bold px-2 py-0.5 rounded-full border uppercase',
                    junc?.predictions?.minutes30?.congestionLevel === 'High'
                      ? 'bg-rose-100 text-rose-800 border-rose-200'
                      : junc?.predictions?.minutes30?.congestionLevel === 'Medium'
                      ? 'bg-amber-100 text-amber-800 border-amber-200'
                      : 'bg-emerald-100 text-emerald-800 border-emerald-200'
                  )}>
                    {junc?.predictions?.minutes30?.congestionLevel || 'Low'}
                  </span>
                </div>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between text-slate-600">
                    <span>Probability:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes30?.congestionProbability || 52}%</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Vehicles:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes30?.predictedVehicleCount || 125}</strong>
                  </div>
                  <div className="flex justify-between text-slate-600">
                    <span>Expected Speed:</span>
                    <strong className="font-mono text-slate-900">{junc?.predictions?.minutes30?.predictedSpeed || 28} km/h</strong>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* STEP 4: Preventive Action */}
        {activeStep === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
                <Zap className="w-4 h-4 text-blue-600" />
                STEP 4: AI Preventive Signal Timing & Alternative Routing
              </h3>
              <span className="text-xs font-semibold text-blue-600">Action Center</span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Signal Recommendation Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    🚦 Signal Recommendation
                  </span>
                  {rec && (
                    <span className={clsx(
                      'text-[10px] font-bold px-2 py-0.5 rounded-full border',
                      rec.status === 'ACCEPTED' ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                      rec.status === 'REJECTED' ? 'bg-slate-100 text-slate-600 border-slate-200' :
                      'bg-amber-50 text-amber-700 border-amber-200 animate-pulse'
                    )}>
                      {rec.status}
                    </span>
                  )}
                </div>

                {/* Timing Metrics */}
                <div className="grid grid-cols-3 gap-2 text-center p-2.5 rounded-lg bg-slate-50 border border-slate-100">
                  <div>
                    <span className="text-[10px] text-slate-500 block">Current Green</span>
                    <span className="text-sm font-bold font-mono text-slate-800">{rec?.currentGreenTime || 40} sec</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Recommended</span>
                    <span className="text-sm font-bold font-mono text-blue-600">{rec?.recommendedGreenTime || 60} sec</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-500 block">Change</span>
                    <span className="text-sm font-bold font-mono text-emerald-600">+{rec?.difference || 20} sec</span>
                  </div>
                </div>

                <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
                  <strong>Reason: </strong>{rec?.reason || 'High congestion predicted in 10 minutes. Increase green time to dissipate inbound queue.'}
                </p>

                {/* Accept / Reject Buttons */}
                {rec && rec.status === 'PENDING' && (
                  <div className="flex items-center justify-end gap-2 pt-1">
                    <button
                      onClick={() => onRejectRecommendation(rec.id)}
                      className="px-3 py-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => onAcceptRecommendation(rec.id)}
                      className="px-3.5 py-1.5 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm transition flex items-center gap-1.5"
                    >
                      <CheckCircle2 className="w-3.5 h-3.5" /> Accept Recommendation
                    </button>
                  </div>
                )}
              </div>

              {/* Alternative Route Recommendation Card */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    🛣️ Alternative Route Recommendation
                  </span>
                  <span className="text-[10px] font-bold text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full border border-purple-200">
                    Dynamic Diversion
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-purple-50/60 border border-purple-100 space-y-1.5">
                  <div className="text-xs font-bold text-purple-950">
                    {rec?.alternativeRoute?.routeName || 'South Ambazari Road & Outer Ring Bypass'}
                  </div>
                  <p className="text-xs text-slate-600">
                    {rec?.alternativeRoute?.detourDesc || 'Divert southbound traffic via Ring Expressway to avoid Wardha Rd junction queue.'}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-slate-600 pt-1">
                  <span>Expected Commute Time Saved:</span>
                  <strong className="text-emerald-600 font-mono font-bold text-sm">
                    -{rec?.alternativeRoute?.expectedSavingsMin || 8.5} min
                  </strong>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
