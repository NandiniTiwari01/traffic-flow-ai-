import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Junction } from '../../types/traffic';
import { NAGPUR_MAP_CENTER } from '../../data/nagpurJunctions';
import { Layers, Compass } from 'lucide-react';

interface NagpurMapProps {
  junctions: Junction[];
  selectedJunction: Junction | null;
  onSelectJunction: (junction: Junction) => void;
  height?: string;
  showControls?: boolean;
}

export const NagpurMap: React.FC<NagpurMapProps> = ({
  junctions,
  selectedJunction,
  onSelectJunction,
  height = '520px',
  showControls = true,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [id: string]: L.Marker }>({});
  const linesRef = useRef<L.Polyline[]>([]);

  // Initialize Map
  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      const map = L.map(mapContainerRef.current, {
        center: NAGPUR_MAP_CENTER,
        zoom: 13,
        minZoom: 11,
        maxZoom: 18,
        zoomControl: false,
      });

      // CartoDB Voyager tile layer for crisp clean light Smart City theme
      L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png', {
        attribution: '&copy; <a href="https://carto.com/">CARTO</a> &copy; OpenStreetMap contributors',
        subdomains: 'abcd',
        maxZoom: 19,
      }).addTo(map);

      // Add zoom control top right
      L.control.zoom({ position: 'topright' }).addTo(map);

      mapInstanceRef.current = map;
    }

    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []);

  // Update Markers and Arterial Corridor Lines when junctions update
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Clear existing markers
    Object.values(markersRef.current).forEach(marker => marker.remove());
    markersRef.current = {};

    // Clear existing lines
    linesRef.current.forEach(line => line.remove());
    linesRef.current = [];

    // Draw connecting arterial road polylines
    // Corridor 1: Wardha Road (Sitabuldi -> Lokmat -> Chhatrapati)
    const wardhaCoords: [number, number][] = [
      [21.1468, 79.0838], // Sitabuldi
      [21.1368, 79.0812], // Lokmat
      [21.1124, 79.0712], // Chhatrapati
    ];
    // Corridor 2: WHC Rd / West (Shankar Nagar -> Dharampeth -> Sadar RBI)
    const westCoords: [number, number][] = [
      [21.1356, 79.0637], // Shankar Nagar
      [21.1432, 79.0621], // Dharampeth
      [21.1592, 79.0845], // RBI
    ];
    // Corridor 3: Great Nag Rd (Medical Square -> Sitabuldi)
    const medicalCoords: [number, number][] = [
      [21.1328, 79.1022], // Medical Square
      [21.1468, 79.0838], // Sitabuldi
    ];

    const corridors = [
      { coords: wardhaCoords, color: '#ef4444', name: 'Wardha Road Corridor' },
      { coords: westCoords, color: '#f59e0b', name: 'WHC Road Corridor' },
      { coords: medicalCoords, color: '#10b981', name: 'Great Nag Road Arterial' },
    ];

    corridors.forEach(c => {
      const polyline = L.polyline(c.coords, {
        color: c.color,
        weight: 4,
        opacity: 0.8,
        dashArray: '6, 8',
      }).addTo(map);
      polyline.bindTooltip(c.name, { sticky: true, className: 'leaflet-custom-tooltip' });
      linesRef.current.push(polyline);
    });

    // Add Markers for each Junction
    junctions.forEach(junction => {
      const isSelected = selectedJunction?.id === junction.id;
      const statusBgColor = 
        junction.status === 'High' ? '#dc2626' :
        junction.status === 'Medium' ? '#d97706' : '#16a34a';

      const pulseColorClass = 
        junction.status === 'High' ? 'bg-rose-400' :
        junction.status === 'Medium' ? 'bg-amber-400' : 'bg-emerald-400';

      const customIcon = L.divIcon({
        className: 'custom-traffic-pin',
        html: `
          <div class="relative flex items-center justify-center cursor-pointer group">
            <div class="absolute w-8 h-8 rounded-full ${pulseColorClass} opacity-30 animate-ping"></div>
            <div class="relative z-10 w-9 h-9 rounded-2xl flex flex-col items-center justify-center shadow-lg transition-transform transform group-hover:scale-115 ${
              isSelected ? 'ring-4 ring-blue-500 scale-110' : ''
            }" style="background-color: ${statusBgColor}; border: 2px solid #ffffff;">
              <span class="text-[10px] font-extrabold font-mono text-white leading-none">${junction.vehicleCount}</span>
              <span class="text-[7px] font-bold text-white/90 leading-none mt-0.5">veh</span>
            </div>
            <div class="absolute -bottom-5 whitespace-nowrap px-2 py-0.5 rounded-md bg-white/95 border border-slate-200 text-[10px] font-bold text-slate-800 shadow-sm pointer-events-none">
              ${junction.name.split(' ')[0]}
            </div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      const marker = L.marker(junction.coordinates, { icon: customIcon }).addTo(map);

      // Tooltip popup
      marker.bindTooltip(`
        <div class="p-3 min-w-[200px] bg-white text-slate-900 rounded-xl text-xs font-sans shadow-lg">
          <div class="font-extrabold text-slate-900 text-sm mb-0.5">${junction.name}</div>
          <div class="text-[11px] text-slate-500 mb-2">${junction.area}</div>
          <div class="grid grid-cols-2 gap-1.5 pt-1.5 border-t border-slate-100 text-[11px]">
            <div>Status: <span class="font-bold" style="color: ${statusBgColor}">${junction.status}</span></div>
            <div>Speed: <span class="font-bold text-slate-900">${junction.averageSpeed} km/h</span></div>
            <div>Density: <span class="font-bold text-slate-900">${junction.density}%</span></div>
            <div>Queue: <span class="font-bold text-slate-900">${junction.queueLength}m</span></div>
          </div>
          <div class="mt-2 text-[10px] font-bold text-blue-600">Click marker to inspect AI telematics</div>
        </div>
      `, { direction: 'top', offset: [0, -15], className: 'leaflet-custom-tooltip' });

      marker.on('click', () => {
        onSelectJunction(junction);
        map.flyTo(junction.coordinates, 15, { duration: 1 });
      });

      markersRef.current[junction.id] = marker;
    });
  }, [junctions, selectedJunction, onSelectJunction]);

  // Center map on Nagpur
  const handleResetView = () => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.flyTo(NAGPUR_MAP_CENTER, 13, { duration: 1 });
    }
  };

  return (
    <div className="relative w-full rounded-2xl overflow-hidden border border-slate-200/90 bg-white shadow-sm">
      {/* Map Element */}
      <div ref={mapContainerRef} style={{ height }} className="w-full z-0" />

      {/* Floating Legend / Quick Status Overlay */}
      {showControls && (
        <div className="absolute top-4 left-4 z-[400] flex flex-col gap-2">
          {/* Legend */}
          <div className="bg-white/95 backdrop-blur-md p-3.5 rounded-xl border border-slate-200 shadow-md text-xs">
            <div className="flex items-center gap-1.5 mb-2 font-bold text-slate-900 text-xs">
              <Layers className="w-3.5 h-3.5 text-blue-600" />
              <span>Nagpur Live Traffic Overlay</span>
            </div>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shadow-xs" />
                <span className="text-slate-700 font-medium">Low Traffic (&lt; 45%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shadow-xs" />
                <span className="text-slate-700 font-medium">Medium Traffic (45–75%)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-rose-500 shadow-xs animate-pulse" />
                <span className="text-slate-700 font-medium">High Traffic (&gt; 75%)</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Floating Quick Reset Control */}
      <div className="absolute bottom-4 right-4 z-[400] flex items-center gap-2">
        <button
          onClick={handleResetView}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-bold shadow-md transition"
        >
          <Compass className="w-3.5 h-3.5 text-blue-600" />
          Nagpur Center
        </button>
      </div>
    </div>
  );
};
