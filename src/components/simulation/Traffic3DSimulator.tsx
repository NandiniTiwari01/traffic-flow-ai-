import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { useTraffic } from '../../context/TrafficContext';
import { CongestionBadge } from '../common/CongestionBadge';
import { 
  Eye, 
  Maximize2, 
  Minimize2, 
  Layers, 
  Sparkles, 
  Activity,
  Car,
  Video,
  Radio,
  Zap,
  AlertTriangle,
  Flame,
  CloudRain,
  Sun,
  PartyPopper,
  Hammer,
  CheckCircle2,
  Clock,
  Gauge,
  Sliders,
  ShieldCheck,
  AlertOctagon,
  Volume2,
  UserCheck,
  Siren
} from 'lucide-react';
import clsx from 'clsx';
import confetti from 'canvas-confetti';

type CameraViewMode = 'isometric' | 'top_down' | 'cctv_north' | 'cctv_east';
type SimulationMode = 'before_ai' | 'after_ai';
type ScenarioType = 'Normal' | 'Peak' | 'Monsoon' | 'Festival';

interface Vehicle3D {
  mesh: THREE.Group;
  direction: 'N_to_S' | 'S_to_N' | 'E_to_W' | 'W_to_E';
  lane: number;
  speed: number;
  targetSpeed: number;
  stopped: boolean;
  type: 'car' | 'bus' | 'truck' | 'bike' | 'ambulance';
  length: number;
}

interface Pedestrian3D {
  mesh: THREE.Group;
  startX: number;
  targetX: number;
  zPos: number;
  speed: number;
  crossing: boolean;
}

export const Traffic3DSimulator: React.FC = () => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { 
    selectedJunction, 
    junctions, 
    simulationControls, 
    setTrafficVolume, 
    setWeatherCondition,
    injectIncident,
    resolveIncident,
    acceptRecommendation
  } = useTraffic();

  const activeJunction = selectedJunction || junctions[0] || null;

  // Local 3D state
  const [cameraMode, setCameraMode] = useState<CameraViewMode>('isometric');
  const [simMode, setSimMode] = useState<SimulationMode>(activeJunction?.isAutoOptimized ? 'after_ai' : 'before_ai');
  const [selectedScenario, setSelectedScenario] = useState<ScenarioType>('Normal');
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [live3DVehiclesCount, setLive3DVehiclesCount] = useState<number>(0);
  const [cctvTime, setCctvTime] = useState<string>('');
  const [isPedestrianWalkPhase, setIsPedestrianWalkPhase] = useState<boolean>(false);
  const [isAmbulanceActive, setIsAmbulanceActive] = useState<boolean>(false);

  // Three.js Engine References
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const vehiclesRef = useRef<Vehicle3D[]>([]);
  const pedestriansRef = useRef<Pedestrian3D[]>([]);
  const signalsRef = useRef<Record<string, { red: THREE.Mesh; yellow: THREE.Mesh; green: THREE.Mesh }>>({});
  const rainParticlesRef = useRef<THREE.Points | null>(null);
  const incidentMeshRef = useRef<THREE.Group | null>(null);
  const ambulanceMeshRef = useRef<THREE.Group | null>(null);
  const animationFrameIdRef = useRef<number | null>(null);

  // Live OSD Clock
  useEffect(() => {
    const updateCctvClock = () => {
      const now = new Date();
      const ms = String(now.getMilliseconds()).padStart(3, '0').slice(0, 2);
      setCctvTime(now.toLocaleTimeString('en-IN', { hour12: false }) + '.' + ms);
    };
    updateCctvClock();
    const interval = setInterval(updateCctvClock, 80);
    return () => clearInterval(interval);
  }, []);

  // Sync simMode if junction is auto-optimized
  useEffect(() => {
    if (activeJunction?.isAutoOptimized) {
      setSimMode('after_ai');
    }
  }, [activeJunction?.isAutoOptimized]);

  // ---------------------------------------------------------------------------
  // 1. Three.js Scene Setup & Initialization
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!containerRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = isExpanded ? 580 : 420;

    // Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0f172a);
    scene.fog = new THREE.FogExp2(0x0f172a, 0.0075);
    sceneRef.current = scene;

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 600);
    camera.position.set(45, 42, 45);
    camera.lookAt(0, 0, 0);
    cameraRef.current = camera;

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    containerRef.current.innerHTML = '';
    containerRef.current.appendChild(renderer.domElement);

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.7);
    scene.add(ambientLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(50, 90, 45);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 1024;
    dirLight.shadow.mapSize.height = 1024;
    dirLight.shadow.camera.near = 10;
    dirLight.shadow.camera.far = 250;
    dirLight.shadow.camera.left = -50;
    dirLight.shadow.camera.right = 50;
    dirLight.shadow.camera.top = 50;
    dirLight.shadow.camera.bottom = -50;
    scene.add(dirLight);

    // Environment & Dual 4-Lane Intersection
    createGroundAndRoads(scene);

    // Traffic Signal Posts
    createTrafficSignals(scene, signalsRef.current);

    // Rain Particle System
    const rain = createRainSystem(scene);
    rainParticlesRef.current = rain;

    // Incident Marker Group
    const incGroup = new THREE.Group();
    scene.add(incGroup);
    incidentMeshRef.current = incGroup;

    // Spawn 3D Animated Pedestrians on Zebra Crossings
    spawnPedestrians(scene, pedestriansRef.current);

    // Initial Vehicles Spawn
    spawnInitialVehicles(scene, vehiclesRef.current);

    // Animation & Render Loop
    let lastTime = performance.now();
    const animate = (currentTime: number) => {
      const delta = Math.min((currentTime - lastTime) / 1000, 0.1);
      lastTime = currentTime;

      // Update Rain if weather is Rain
      if (rainParticlesRef.current) {
        rainParticlesRef.current.visible = simulationControls.weather === 'Rain';
        if (rainParticlesRef.current.visible) {
          const positions = rainParticlesRef.current.geometry.attributes.position.array as Float32Array;
          for (let i = 1; i < positions.length; i += 3) {
            positions[i] -= 85 * delta;
            if (positions[i] < 0) positions[i] = 45;
          }
          rainParticlesRef.current.geometry.attributes.position.needsUpdate = true;
        }
      }

      // Update Pedestrian Walk Animations on Zebra Crossings
      updatePedestrians(pedestriansRef.current, delta, isPedestrianWalkPhase);

      // Update 3D Vehicles with Physical Queuing & Spacing
      updateVehiclesWithQueuing(
        scene,
        vehiclesRef.current,
        delta,
        isPedestrianWalkPhase ? 'Pedestrian' : (activeJunction?.signalPhase || 'North-South'),
        activeJunction?.averageSpeed || 28,
        simulationControls.isRunning,
        simulationControls.simulationSpeed,
        Boolean(simulationControls.activeIncident),
        simMode,
        isPedestrianWalkPhase,
        isAmbulanceActive
      );

      setLive3DVehiclesCount(vehiclesRef.current.length);

      // Render Scene
      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }

      animationFrameIdRef.current = requestAnimationFrame(animate);
    };

    animationFrameIdRef.current = requestAnimationFrame(animate);

    // Resize Handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = isExpanded ? 580 : 420;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(w, h);
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (animationFrameIdRef.current) {
        cancelAnimationFrame(animationFrameIdRef.current);
      }
      renderer.dispose();
    };
  }, [isExpanded, isPedestrianWalkPhase, isAmbulanceActive]);

  // ---------------------------------------------------------------------------
  // 2. Camera Angles
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!cameraRef.current) return;
    const cam = cameraRef.current;

    switch (cameraMode) {
      case 'isometric':
        cam.position.set(45, 42, 45);
        cam.lookAt(0, 0, 0);
        break;
      case 'top_down':
        cam.position.set(0, 72, 0.1);
        cam.lookAt(0, 0, 0);
        break;
      case 'cctv_north':
        cam.position.set(0, 16, 40);
        cam.lookAt(0, 2, -15);
        break;
      case 'cctv_east':
        cam.position.set(40, 16, 0);
        cam.lookAt(-15, 2, 0);
        break;
    }
  }, [cameraMode]);

  // ---------------------------------------------------------------------------
  // 3. Traffic Light Signal Glowing Bulbs Sync
  // ---------------------------------------------------------------------------
  useEffect(() => {
    const isNSGreen = !isPedestrianWalkPhase && (activeJunction?.signalPhase === 'North-South' || isAmbulanceActive);
    const isEWGreen = !isPedestrianWalkPhase && !isAmbulanceActive && activeJunction?.signalPhase === 'East-West';
    const sigs = signalsRef.current;

    const setSignalState = (sig: { red: THREE.Mesh; yellow: THREE.Mesh; green: THREE.Mesh }, isGreen: boolean) => {
      const redMat = sig.red.material as THREE.MeshStandardMaterial;
      const greenMat = sig.green.material as THREE.MeshStandardMaterial;

      if (isGreen) {
        greenMat.emissive.setHex(0x22c55e);
        greenMat.emissiveIntensity = 2.4;
        redMat.emissive.setHex(0x0f172a);
        redMat.emissiveIntensity = 0.1;
      } else {
        redMat.emissive.setHex(0xef4444);
        redMat.emissiveIntensity = 2.4;
        greenMat.emissive.setHex(0x0f172a);
        greenMat.emissiveIntensity = 0.1;
      }
    };

    if (sigs.north) setSignalState(sigs.north, isNSGreen);
    if (sigs.south) setSignalState(sigs.south, isNSGreen);
    if (sigs.east) setSignalState(sigs.east, isEWGreen);
    if (sigs.west) setSignalState(sigs.west, isEWGreen);
  }, [activeJunction?.signalPhase, activeJunction?.currentGreenTime, isPedestrianWalkPhase, isAmbulanceActive]);

  // ---------------------------------------------------------------------------
  // 4. Update 3D Incident Mesh Visuals
  // ---------------------------------------------------------------------------
  useEffect(() => {
    if (!incidentMeshRef.current) return;
    const group = incidentMeshRef.current;
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }

    if (simulationControls.activeIncident) {
      for (let i = -2; i <= 2; i += 2) {
        const cone = new THREE.Mesh(
          new THREE.ConeGeometry(0.6, 1.6, 16),
          new THREE.MeshStandardMaterial({ color: 0xf97316, emissive: 0xf97316, emissiveIntensity: 0.6 })
        );
        cone.position.set(-6.5, 0.8, -16 + i * 2.5);
        cone.castShadow = true;
        group.add(cone);
      }

      const beacon = new THREE.Mesh(
        new THREE.SphereGeometry(0.7, 16, 16),
        new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.5 })
      );
      beacon.position.set(-6.5, 2.2, -16);
      group.add(beacon);
    }
  }, [simulationControls.activeIncident]);

  // Apply AI Signal Recommendation Callback
  const handleApplyAIRecommendation = () => {
    if (activeJunction?.recommendation) {
      acceptRecommendation(activeJunction.recommendation.id);
      setSimMode('after_ai');
      try {
        confetti({ particleCount: 55, spread: 60, origin: { y: 0.75 } });
      } catch {}
    }
  };

  // Toggle Ambulance Green Corridor Priority
  const handleToggleAmbulance = () => {
    setIsAmbulanceActive(!isAmbulanceActive);
    if (!isAmbulanceActive) {
      if ('speechSynthesis' in window) {
        const speech = new SpeechSynthesisUtterance("Emergency Green Corridor Dispatched. Priority Clearance on Wardha Road.");
        speech.rate = 1.0;
        window.speechSynthesis.speak(speech);
      }
    }
  };

  // Scenario Change Handler
  const handleScenarioChange = (scenario: ScenarioType) => {
    setSelectedScenario(scenario);
    if (scenario === 'Normal') {
      setTrafficVolume(100);
      setWeatherCondition('Clear');
    } else if (scenario === 'Peak') {
      setTrafficVolume(160);
      setWeatherCondition('Clear');
    } else if (scenario === 'Monsoon') {
      setTrafficVolume(120);
      setWeatherCondition('Rain');
    } else if (scenario === 'Festival') {
      setTrafficVolume(140);
      setWeatherCondition('Festival');
    }
  };

  return (
    <div className="rounded-2xl bg-white border border-slate-200 shadow-sm overflow-hidden space-y-0">
      {/* Top 3D Digital Twin Master Header Bar */}
      <div className="p-4 bg-slate-900 text-white flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center text-white shadow-md font-bold">
            <Radio className="w-5 h-5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-black uppercase tracking-wider text-slate-100 flex items-center gap-1.5">
                AI Digital Twin Intersection Simulator
              </h3>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-400/30">
                LIVE 3D WEBGL
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-0.5">
              Active Junction: <strong className="text-white">{activeJunction?.name || 'Sitabuldi Interchange'}</strong> • 4 Approaches (N, S, E, W)
            </p>
          </div>
        </div>

        {/* Camera Views & Expand Controls */}
        <div className="flex flex-wrap items-center gap-2 text-xs">
          {/* Camera Perspective Selector */}
          <div className="flex items-center bg-slate-800 p-1 rounded-xl border border-slate-700 font-medium">
            <button
              onClick={() => setCameraMode('isometric')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                cameraMode === 'isometric' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              <Eye className="w-3.5 h-3.5" /> 3D Orbit
            </button>
            <button
              onClick={() => setCameraMode('top_down')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                cameraMode === 'top_down' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              <Layers className="w-3.5 h-3.5" /> Drone (2D)
            </button>
            <button
              onClick={() => setCameraMode('cctv_north')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                cameraMode === 'cctv_north' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              <Video className="w-3.5 h-3.5" /> CCTV-1
            </button>
            <button
              onClick={() => setCameraMode('cctv_east')}
              className={clsx(
                'px-2.5 py-1 rounded-lg transition flex items-center gap-1.5',
                cameraMode === 'cctv_east' ? 'bg-blue-600 text-white font-bold' : 'text-slate-400 hover:text-white'
              )}
            >
              <Video className="w-3.5 h-3.5" /> CCTV-2
            </button>
          </div>

          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition"
            title={isExpanded ? 'Collapse 3D View' : 'Expand 3D View'}
          >
            {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* 3D Action Toolbar: Smart Pedestrian Crosswalk & Ambulance Priority Modes */}
      <div className="p-3 bg-slate-800 text-slate-200 border-b border-slate-700 flex flex-wrap items-center justify-between gap-3 text-xs">
        {/* Left: Mode Switcher (Before AI vs After AI) */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] uppercase font-bold text-slate-400">Mode:</span>
          <div className="flex items-center bg-slate-900 p-0.5 rounded-lg border border-slate-700 font-bold">
            <button
              onClick={() => setSimMode('before_ai')}
              className={clsx(
                'px-2.5 py-1 rounded-md transition text-xs',
                simMode === 'before_ai' ? 'bg-amber-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              Before AI (Fixed 40s)
            </button>
            <button
              onClick={() => setSimMode('after_ai')}
              className={clsx(
                'px-2.5 py-1 rounded-md transition text-xs flex items-center gap-1',
                simMode === 'after_ai' ? 'bg-emerald-600 text-white' : 'text-slate-400 hover:text-white'
              )}
            >
              <Sparkles className="w-3 h-3" /> After AI (Adaptive +20s)
            </button>
          </div>
        </div>

        {/* Center: Smart Zebra Crossing & Ambulance Priority Toggles */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsPedestrianWalkPhase(!isPedestrianWalkPhase)}
            className={clsx(
              'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border shadow-xs',
              isPedestrianWalkPhase
                ? 'bg-emerald-600 text-white border-emerald-500 animate-pulse'
                : 'bg-slate-900/80 text-emerald-300 border-slate-700 hover:bg-slate-700'
            )}
            title="Toggle Smart Zebra Crossing Walk Phase"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>🚶 Zebra Walk Phase {isPedestrianWalkPhase ? '(Active)' : ''}</span>
          </button>

          <button
            onClick={handleToggleAmbulance}
            className={clsx(
              'px-3 py-1.5 rounded-xl font-bold text-xs flex items-center gap-1.5 transition border shadow-xs',
              isAmbulanceActive
                ? 'bg-rose-600 text-white border-rose-500 animate-bounce'
                : 'bg-slate-900/80 text-rose-300 border-slate-700 hover:bg-slate-700'
            )}
            title="Dispatch Emergency Ambulance Priority Green Corridor"
          >
            <Siren className="w-3.5 h-3.5" />
            <span>🚑 Ambulance Corridor {isAmbulanceActive ? '(Active)' : ''}</span>
          </button>
        </div>

        {/* Right: Apply AI Recommendation Action Button */}
        <div className="flex items-center gap-2">
          {activeJunction?.recommendation?.status === 'PENDING' ? (
            <button
              onClick={handleApplyAIRecommendation}
              className="px-3.5 py-1.5 rounded-xl font-extrabold text-xs text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-500 hover:to-indigo-500 shadow-md flex items-center gap-1.5 animate-pulse"
            >
              <Zap className="w-3.5 h-3.5 text-amber-300 fill-amber-300" />
              Apply AI Recommendation (+{activeJunction.recommendation.difference}s)
            </button>
          ) : (
            <span className="px-3 py-1 rounded-xl text-xs font-bold bg-emerald-950 text-emerald-300 border border-emerald-800 flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" /> AI Optimized Flow Active
            </span>
          )}
        </div>
      </div>

      {/* Main 3D WebGL Canvas Screen with OSD Overlays */}
      <div className="relative w-full bg-slate-950 overflow-hidden select-none">
        <div ref={containerRef} className="w-full" style={{ height: isExpanded ? '580px' : '420px' }} />

        {/* 1. PROFESSIONAL CCTV OSD OVERLAY (Visible on CCTV-1 and CCTV-2) */}
        {(cameraMode === 'cctv_north' || cameraMode === 'cctv_east') && (
          <div className="absolute inset-0 pointer-events-none p-4 flex flex-col justify-between text-white font-mono z-10">
            {/* Top OSD Bar */}
            <div className="flex items-start justify-between bg-black/60 backdrop-blur-xs p-2.5 rounded-lg border border-white/20 text-xs">
              <div>
                <div className="flex items-center gap-2 text-emerald-400 font-bold">
                  <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping inline-block" />
                  <span>🔴 REC [LIVE HD]</span>
                  <span className="text-white">| {cameraMode === 'cctv_north' ? 'CAM-01 (NORTH APPROACH)' : 'CAM-02 (EAST APPROACH)'}</span>
                </div>
                <div className="text-[11px] text-slate-300 mt-0.5">
                  LOCATION: {activeJunction?.name?.toUpperCase() || 'SITABULDI INTERCHANGE'} • NAGPUR SMART CITY
                </div>
              </div>

              <div className="text-right">
                <div className="text-amber-400 font-bold">{cctvTime}</div>
                <div className="text-[10px] text-slate-400">OPTICAL SENSOR: 1080P @ 30FPS</div>
              </div>
            </div>

            {/* Center Crosshair Grid Overlay */}
            <div className="self-center text-center opacity-40">
              <div className="w-16 h-16 border border-emerald-400/80 rounded-full flex items-center justify-center">
                <div className="w-2 h-2 bg-emerald-400 rounded-full" />
              </div>
              <span className="text-[10px] tracking-widest block mt-1 text-emerald-300">YOLO AI VEHICLE & PEDESTRIAN TRACKING</span>
            </div>

            {/* Bottom OSD Bar */}
            <div className="flex items-center justify-between bg-black/60 backdrop-blur-xs px-3 py-1.5 rounded-lg border border-white/20 text-[11px]">
              <div className="flex items-center gap-3">
                <span>VEHICLES DETECTED: <strong className="text-emerald-400">{live3DVehiclesCount}</strong></span>
                <span>SPEED: <strong className="text-blue-400">{activeJunction?.averageSpeed || 28} km/h</strong></span>
                <span>DENSITY: <strong className="text-amber-400">{activeJunction?.density || 60}%</strong></span>
              </div>
              <span className="text-slate-400 text-[10px]">ENCRYPTION: TLS-256 (SECURE FEED)</span>
            </div>
          </div>
        )}

        {/* 2. AI PREDICTION & TELEMETRY HUD OVERLAY (Top-Left) */}
        <div className="absolute top-3 left-3 bg-slate-900/90 backdrop-blur-md text-white p-3.5 rounded-2xl border border-slate-700/80 text-xs shadow-xl space-y-2 font-mono max-w-xs z-10 pointer-events-auto">
          <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-1.5">
            <span className="text-[10px] text-slate-400 uppercase font-sans font-bold flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-blue-400" />
              AI Prediction Matrix
            </span>
            <CongestionBadge level={activeJunction?.status || 'Medium'} size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block font-sans">Current Density:</span>
              <strong className="text-amber-400 text-sm">{activeJunction?.density}%</strong>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block font-sans">Current Speed:</span>
              <strong className="text-emerald-400 text-sm">{activeJunction?.averageSpeed} km/h</strong>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block font-sans">10m Predicted:</span>
              <strong className="text-blue-400 text-sm">
                {activeJunction?.predictions?.minutes10?.predictedDensity || 72}%
              </strong>
            </div>

            <div className="p-1.5 rounded-lg bg-slate-800/80 border border-slate-700/80">
              <span className="text-[10px] text-slate-400 block font-sans">Queue Length:</span>
              <strong className="text-purple-400 text-sm">{activeJunction?.queueLength} m</strong>
            </div>
          </div>

          <div className="flex items-center justify-between text-[11px] pt-1 border-t border-slate-800">
            <span className="text-slate-400">Signal State:</span>
            <span className="font-bold text-emerald-400">
              {isPedestrianWalkPhase ? '🚶 Pedestrian Walk (All Stop)' : isAmbulanceActive ? '🚑 Priority Green Wave' : `${activeJunction?.signalPhase} (${activeJunction?.currentGreenTime}s)`}
            </span>
          </div>
        </div>

        {/* 3. 3D QUICK INCIDENT INJECTION CONTROL OVERLAY (Bottom-Left) */}
        <div className="absolute bottom-3 left-3 bg-slate-900/85 backdrop-blur-md text-white p-2.5 rounded-xl border border-slate-700/80 text-xs shadow-lg space-y-1.5 z-10">
          <div className="flex items-center justify-between gap-3 text-[10px] font-bold text-slate-400 uppercase">
            <span>3D Incident Trigger:</span>
            {simulationControls.activeIncident && (
              <button 
                onClick={resolveIncident} 
                className="text-emerald-400 hover:text-emerald-300 font-bold underline"
              >
                Clear
              </button>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => injectIncident(activeJunction?.id || 'nag-01', 'Multi-vehicle collision on North Flyover')}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-semibold border transition',
                simulationControls.activeIncident?.includes('collision')
                  ? 'bg-rose-600 text-white border-rose-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              )}
            >
              🚨 Accident
            </button>
            <button
              onClick={() => injectIncident(activeJunction?.id || 'nag-01', 'Metro Work Outer Lane Barricade')}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-semibold border transition',
                simulationControls.activeIncident?.includes('Barricade')
                  ? 'bg-amber-600 text-white border-amber-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              )}
            >
              🚧 Blockage
            </button>
            <button
              onClick={() => injectIncident(activeJunction?.id || 'nag-01', 'VIP Convoy Security Clearance')}
              className={clsx(
                'px-2 py-1 rounded text-[11px] font-semibold border transition',
                simulationControls.activeIncident?.includes('VIP')
                  ? 'bg-purple-600 text-white border-purple-500'
                  : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
              )}
            >
              🚔 VIP Convoy
            </button>
          </div>
        </div>

        {/* 4. 3D LEGEND (Bottom-Right) */}
        <div className="absolute bottom-3 right-3 bg-slate-900/80 backdrop-blur-sm text-white px-3 py-1.5 rounded-xl border border-slate-700 text-[10px] font-mono flex items-center gap-3 z-10">
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-500" /> Cars
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-amber-500" /> Buses/Trucks
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500" /> Bikes
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-pink-400" /> 🚶 Pedestrians
          </span>
        </div>
      </div>
    </div>
  );
};

// -----------------------------------------------------------------------------
// 3D GEOMETRY & PHYSICS HELPER FUNCTIONS
// -----------------------------------------------------------------------------

function createGroundAndRoads(scene: THREE.Scene) {
  // Ground
  const groundGeo = new THREE.PlaneGeometry(180, 180);
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 });
  const ground = new THREE.Mesh(groundGeo, groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.receiveShadow = true;
  scene.add(ground);

  // Dual 4-Lane Asphalt Crossing
  const roadWidth = 18;
  const roadLength = 180;
  const roadMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.75 });

  // North-South Road
  const roadNS = new THREE.Mesh(new THREE.PlaneGeometry(roadWidth, roadLength), roadMat);
  roadNS.rotation.x = -Math.PI / 2;
  roadNS.position.y = 0.05;
  roadNS.receiveShadow = true;
  scene.add(roadNS);

  // East-West Road
  const roadEW = new THREE.Mesh(new THREE.PlaneGeometry(roadLength, roadWidth), roadMat);
  roadEW.rotation.x = -Math.PI / 2;
  roadEW.position.y = 0.06;
  roadEW.receiveShadow = true;
  scene.add(roadEW);

  // White Markings & Zebra Crossings
  const lineMat = new THREE.MeshBasicMaterial({ color: 0xffffff });

  // Zebra Crossings (4 Approaches)
  [-11, 11].forEach(zPos => {
    for (let i = -7; i <= 7; i += 2) {
      const zebra = new THREE.Mesh(new THREE.PlaneGeometry(1.2, 3.2), lineMat);
      zebra.rotation.x = -Math.PI / 2;
      zebra.position.set(i, 0.08, zPos > 0 ? 11 : -11);
      scene.add(zebra);
    }
  });

  [-11, 11].forEach(xPos => {
    for (let i = -7; i <= 7; i += 2) {
      const zebra = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 1.2), lineMat);
      zebra.rotation.x = -Math.PI / 2;
      zebra.position.set(xPos > 0 ? 11 : -11, 0.08, i);
      scene.add(zebra);
    }
  });

  // Corner Sidewalk Curbs
  const curbMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.7 });
  const cornerPositions = [
    { x: 20, z: 20 },
    { x: -20, z: 20 },
    { x: 20, z: -20 },
    { x: -20, z: -20 },
  ];

  cornerPositions.forEach(pos => {
    const curb = new THREE.Mesh(new THREE.BoxGeometry(22, 0.6, 22), curbMat);
    curb.position.set(pos.x, 0.3, pos.z);
    curb.receiveShadow = true;
    curb.castShadow = true;
    scene.add(curb);
  });
}

function createTrafficSignals(
  scene: THREE.Scene, 
  signals: Record<string, { red: THREE.Mesh; yellow: THREE.Mesh; green: THREE.Mesh }>
) {
  const signalCorners = [
    { name: 'north', x: 10.5, z: 12, rotY: 0 },
    { name: 'south', x: -10.5, z: -12, rotY: Math.PI },
    { name: 'east', x: 12, z: -10.5, rotY: Math.PI / 2 },
    { name: 'west', x: -12, z: 10.5, rotY: -Math.PI / 2 },
  ];

  signalCorners.forEach(sc => {
    const group = new THREE.Group();
    group.position.set(sc.x, 0, sc.z);
    group.rotation.y = sc.rotY;

    // Pole
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.5 });
    const pole = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.28, 7.5, 16), poleMat);
    pole.position.y = 3.75;
    pole.castShadow = true;
    group.add(pole);

    // Arm
    const arm = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 4.5, 16), poleMat);
    arm.rotation.z = Math.PI / 2;
    arm.position.set(-2.2, 7.2, 0);
    group.add(arm);

    // Housing Box
    const boxMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const box = new THREE.Mesh(new THREE.BoxGeometry(1.2, 3.4, 0.8), boxMat);
    box.position.set(-4, 6.6, 0);
    box.castShadow = true;
    group.add(box);

    // Glowing Bulbs
    const redLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 2.2 })
    );
    redLight.position.set(-4, 7.7, 0.45);
    group.add(redLight);

    const yellowLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0x0f172a, emissiveIntensity: 0.1 })
    );
    yellowLight.position.set(-4, 6.6, 0.45);
    group.add(yellowLight);

    const greenLight = new THREE.Mesh(
      new THREE.SphereGeometry(0.38, 16, 16),
      new THREE.MeshStandardMaterial({ color: 0x22c55e, emissive: 0x0f172a, emissiveIntensity: 0.1 })
    );
    greenLight.position.set(-4, 5.5, 0.45);
    group.add(greenLight);

    scene.add(group);
    signals[sc.name] = { red: redLight, yellow: yellowLight, green: greenLight };
  });
}

function createRainSystem(scene: THREE.Scene): THREE.Points {
  const rainCount = 1400;
  const rainGeo = new THREE.BufferGeometry();
  const rainPositions = new Float32Array(rainCount * 3);

  for (let i = 0; i < rainCount * 3; i += 3) {
    rainPositions[i] = (Math.random() - 0.5) * 160;
    rainPositions[i + 1] = Math.random() * 45;
    rainPositions[i + 2] = (Math.random() - 0.5) * 160;
  }

  rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
  const rainMat = new THREE.PointsMaterial({
    color: 0x93c5fd,
    size: 0.35,
    transparent: true,
    opacity: 0.65
  });

  const rain = new THREE.Points(rainGeo, rainMat);
  rain.visible = false;
  scene.add(rain);
  return rain;
}

// -----------------------------------------------------------------------------
// 3D Animated Pedestrians on Zebra Crossings
// -----------------------------------------------------------------------------
function spawnPedestrians(scene: THREE.Scene, pedestrians: Pedestrian3D[]) {
  const crossingZPositions = [-11, 11];

  crossingZPositions.forEach(zPos => {
    for (let i = 0; i < 3; i++) {
      const pGroup = new THREE.Group();

      // Head
      const head = new THREE.Mesh(
        new THREE.SphereGeometry(0.32, 12, 12),
        new THREE.MeshStandardMaterial({ color: 0xfde047, roughness: 0.5 })
      );
      head.position.y = 1.6;
      pGroup.add(head);

      // Torso / Shirt
      const shirtColors = [0xec4899, 0x3b82f6, 0x10b981, 0x8b5cf6];
      const shirtColor = shirtColors[Math.floor(Math.random() * shirtColors.length)];
      const torso = new THREE.Mesh(
        new THREE.CylinderGeometry(0.25, 0.28, 0.7, 12),
        new THREE.MeshStandardMaterial({ color: shirtColor, roughness: 0.5 })
      );
      torso.position.y = 1.05;
      pGroup.add(torso);

      // Legs
      const legMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5 });
      [-0.12, 0.12].forEach(lx => {
        const leg = new THREE.Mesh(new THREE.CylinderGeometry(0.08, 0.08, 0.7, 8), legMat);
        leg.position.set(lx, 0.35, 0);
        pGroup.add(leg);
      });

      const startX = -8.5 + i * 4;
      pGroup.position.set(startX, 0, zPos);
      pGroup.castShadow = true;
      scene.add(pGroup);

      pedestrians.push({
        mesh: pGroup,
        startX: startX,
        targetX: 8.5,
        zPos: zPos,
        speed: 2.2 + Math.random() * 0.8,
        crossing: true,
      });
    }
  });
}

function updatePedestrians(pedestrians: Pedestrian3D[], delta: number, isWalkPhase: boolean) {
  pedestrians.forEach(p => {
    if (isWalkPhase) {
      p.mesh.position.x += p.speed * delta;
      if (p.mesh.position.x > 8.5) {
        p.mesh.position.x = -8.5;
      }
      // Walking subtle bounce
      p.mesh.position.y = Math.abs(Math.sin(Date.now() * 0.008)) * 0.15;
    } else {
      p.mesh.position.y = 0;
    }
  });
}

function spawnInitialVehicles(scene: THREE.Scene, vehicles: Vehicle3D[]) {
  const directions: Vehicle3D['direction'][] = ['N_to_S', 'S_to_N', 'E_to_W', 'W_to_E'];
  const types: Vehicle3D['type'][] = ['car', 'car', 'bike', 'bus', 'truck', 'car', 'bike'];

  for (let i = 0; i < 18; i++) {
    const dir = directions[i % directions.length];
    const type = types[i % types.length];
    const laneOffset = (i % 2 === 0) ? -3.8 : -7.0;

    const vMesh = create3DVehicleMesh(type);
    let initPos = new THREE.Vector3(0, 0, 0);

    if (dir === 'N_to_S') {
      initPos.set(laneOffset, 0, -75 + i * 16);
      vMesh.rotation.y = 0;
    } else if (dir === 'S_to_N') {
      initPos.set(-laneOffset, 0, 75 - i * 16);
      vMesh.rotation.y = Math.PI;
    } else if (dir === 'E_to_W') {
      initPos.set(75 - i * 16, 0, laneOffset);
      vMesh.rotation.y = Math.PI / 2;
    } else if (dir === 'W_to_E') {
      initPos.set(-75 + i * 16, 0, -laneOffset);
      vMesh.rotation.y = -Math.PI / 2;
    }

    vMesh.position.copy(initPos);
    scene.add(vMesh);

    vehicles.push({
      mesh: vMesh,
      direction: dir,
      lane: laneOffset,
      speed: 14 + Math.random() * 8,
      targetSpeed: 20,
      stopped: false,
      type: type,
      length: type === 'bus' || type === 'truck' ? 7.5 : type === 'bike' ? 2.2 : 4.8,
    });
  }
}

function create3DVehicleMesh(type: 'car' | 'bus' | 'truck' | 'bike' | 'ambulance'): THREE.Group {
  const group = new THREE.Group();

  const carColors = [0x3b82f6, 0xef4444, 0xffffff, 0x10b981, 0xf59e0b, 0x64748b];
  const color = carColors[Math.floor(Math.random() * carColors.length)];

  if (type === 'ambulance') {
    // Ambulance Chassis (White with Red stripes)
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.0, 2.2, 6.2),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.2 })
    );
    body.position.y = 1.4;
    body.castShadow = true;
    group.add(body);

    // Flashing Siren Beacons
    const sirenRed = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xef4444, emissiveIntensity: 3.0 })
    );
    sirenRed.position.set(-0.6, 2.7, 0.5);
    group.add(sirenRed);

    const sirenBlue = new THREE.Mesh(
      new THREE.SphereGeometry(0.35, 12, 12),
      new THREE.MeshStandardMaterial({ color: 0x3b82f6, emissive: 0x3b82f6, emissiveIntensity: 3.0 })
    );
    sirenBlue.position.set(0.6, 2.7, 0.5);
    group.add(sirenBlue);
  } else if (type === 'bus') {
    // Bus Chassis
    const body = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.6, 7.8),
      new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.3 })
    );
    body.position.y = 1.7;
    body.castShadow = true;
    group.add(body);
  } else if (type === 'truck') {
    // Truck Cab & Trailer
    const cab = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 2.8, 3.2),
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.4 })
    );
    cab.position.set(0, 1.8, 2.2);
    cab.castShadow = true;
    group.add(cab);

    const cargo = new THREE.Mesh(
      new THREE.BoxGeometry(3.4, 3.4, 6.0),
      new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.6 })
    );
    cargo.position.set(0, 2.2, -2.0);
    cargo.castShadow = true;
    group.add(cargo);
  } else if (type === 'bike') {
    // Motorcycle
    const bike = new THREE.Mesh(
      new THREE.BoxGeometry(0.8, 1.2, 2.2),
      new THREE.MeshStandardMaterial({ color: 0x10b981, roughness: 0.3 })
    );
    bike.position.y = 0.7;
    bike.castShadow = true;
    group.add(bike);
  } else {
    // Car Sedan
    const lowerBody = new THREE.Mesh(
      new THREE.BoxGeometry(2.5, 1.1, 4.8),
      new THREE.MeshStandardMaterial({ color: color, roughness: 0.25, metalness: 0.2 })
    );
    lowerBody.position.y = 0.75;
    lowerBody.castShadow = true;
    group.add(lowerBody);

    const cabin = new THREE.Mesh(
      new THREE.BoxGeometry(2.2, 0.9, 2.7),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.1 })
    );
    cabin.position.set(0, 1.5, -0.2);
    cabin.castShadow = true;
    group.add(cabin);

    // Glowing Headlights
    const lightMat = new THREE.MeshBasicMaterial({ color: 0xffedd5 });
    [-0.85, 0.85].forEach(lx => {
      const hl = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.2, 0.1), lightMat);
      hl.position.set(lx, 0.8, 2.45);
      group.add(hl);
    });
  }

  return group;
}

// -----------------------------------------------------------------------------
// 3D Physical Vehicle Motion & Bumper-to-Bumper Queuing Algorithm
// -----------------------------------------------------------------------------
function updateVehiclesWithQueuing(
  scene: THREE.Scene,
  vehicles: Vehicle3D[],
  delta: number,
  signalPhase: string,
  cityAvgSpeed: number,
  isRunning: boolean,
  speedMultiplier: number,
  isIncidentActive: boolean,
  simMode: SimulationMode,
  isPedestrianWalk: boolean,
  isAmbulancePriority: boolean
) {
  if (!isRunning) return;

  const isNSGreen = !isPedestrianWalk && (signalPhase === 'North-South' || isAmbulancePriority);
  const isEWGreen = !isPedestrianWalk && !isAmbulancePriority && signalPhase === 'East-West';

  const aiSpeedFactor = simMode === 'after_ai' ? 1.35 : 0.85;
  const speedScale = (cityAvgSpeed / 28.0) * speedMultiplier * aiSpeedFactor;

  vehicles.forEach((v, index) => {
    let shouldStop = false;
    const pos = v.mesh.position;

    if (v.direction === 'N_to_S') {
      const isApproachingStopLine = pos.z < -13 && pos.z > -28;
      if (!isNSGreen && isApproachingStopLine) {
        shouldStop = true;
      }
      vehicles.forEach((other, oIdx) => {
        if (oIdx !== index && other.direction === v.direction && Math.abs(other.lane - v.lane) < 1.0) {
          const dist = other.mesh.position.z - pos.z;
          if (dist > 0 && dist < (other.length + 3.0)) {
            shouldStop = true;
          }
        }
      });

      if (isIncidentActive && v.lane < -5 && pos.z < -10 && pos.z > -30) {
        pos.x = -3.8;
      }

      if (!shouldStop) pos.z += v.speed * delta * speedScale;
      if (pos.z > 85) pos.z = -85;
    } else if (v.direction === 'S_to_N') {
      const isApproachingStopLine = pos.z > 13 && pos.z < 28;
      if (!isNSGreen && isApproachingStopLine) {
        shouldStop = true;
      }
      vehicles.forEach((other, oIdx) => {
        if (oIdx !== index && other.direction === v.direction && Math.abs(other.lane - v.lane) < 1.0) {
          const dist = pos.z - other.mesh.position.z;
          if (dist > 0 && dist < (other.length + 3.0)) {
            shouldStop = true;
          }
        }
      });

      if (!shouldStop) pos.z -= v.speed * delta * speedScale;
      if (pos.z < -85) pos.z = 85;
    } else if (v.direction === 'E_to_W') {
      const isApproachingStopLine = pos.x > 13 && pos.x < 28;
      if (!isEWGreen && isApproachingStopLine) {
        shouldStop = true;
      }
      vehicles.forEach((other, oIdx) => {
        if (oIdx !== index && other.direction === v.direction && Math.abs(other.lane - v.lane) < 1.0) {
          const dist = pos.x - other.mesh.position.x;
          if (dist > 0 && dist < (other.length + 3.0)) {
            shouldStop = true;
          }
        }
      });

      if (!shouldStop) pos.x -= v.speed * delta * speedScale;
      if (pos.x < -85) pos.x = 85;
    } else if (v.direction === 'W_to_E') {
      const isApproachingStopLine = pos.x < -13 && pos.x > -28;
      if (!isEWGreen && isApproachingStopLine) {
        shouldStop = true;
      }
      vehicles.forEach((other, oIdx) => {
        if (oIdx !== index && other.direction === v.direction && Math.abs(other.lane - v.lane) < 1.0) {
          const dist = other.mesh.position.x - pos.x;
          if (dist > 0 && dist < (other.length + 3.0)) {
            shouldStop = true;
          }
        }
      });

      if (!shouldStop) pos.x += v.speed * delta * speedScale;
      if (pos.x > 85) pos.x = -85;
    }

    v.stopped = shouldStop;
  });
}
