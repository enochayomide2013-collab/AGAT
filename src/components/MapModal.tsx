import React, { useRef, useEffect } from 'react';
import { X, Navigation, MapPin, Building, Shield, HeartPulse, Landmark, Home, Trees, Package } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';

interface MapModalProps {
  engine: GameEngine | null;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ engine, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyM' || e.code === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  useEffect(() => {
    drawMap();
  }, [engine]);

  const drawMap = () => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const width = canvas.width;
    const height = canvas.height;
    const center = width / 2;
    const scale = 1.35; // world meters to screen px

    // Coordinate conversion
    const toScreenX = (wx: number) => center + wx * scale;
    const toScreenY = (wz: number) => center + wz * scale;

    // Clear background (Land & Ocean)
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, width, height);

    // Ocean on South side (z > 160)
    const oceanY = toScreenY(165);
    ctx.fillStyle = '#0c4a6e';
    ctx.fillRect(0, oceanY, width, height - oceanY);

    // Beach strip
    const beachY = toScreenY(150);
    ctx.fillStyle = '#b49f78';
    ctx.fillRect(0, beachY, width, oceanY - beachY);

    // Civic Park Grass
    const parkX1 = toScreenX(-140);
    const parkY1 = toScreenY(-140);
    const parkX2 = toScreenX(-20);
    const parkY2 = toScreenY(-40);
    ctx.fillStyle = '#14532d';
    ctx.fillRect(parkX1, parkY1, parkX2 - parkX1, parkY2 - parkY1);

    // Park Lake
    ctx.fillStyle = '#0369a1';
    ctx.beginPath();
    ctx.arc(toScreenX(-80), toScreenY(-80), 22, 0, Math.PI * 2);
    ctx.fill();

    // Road Grid
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 14;
    ctx.lineCap = 'round';
    engine.worldBuilder.roadSegments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(toScreenX(seg.start.x), toScreenY(seg.start.z));
      ctx.lineTo(toScreenX(seg.end.x), toScreenY(seg.end.z));
      ctx.stroke();
    });

    // Yellow Centerlines
    ctx.strokeStyle = '#eab308';
    ctx.lineWidth = 1.5;
    ctx.setLineDash([6, 6]);
    engine.worldBuilder.roadSegments.forEach((seg) => {
      ctx.beginPath();
      ctx.moveTo(toScreenX(seg.start.x), toScreenY(seg.start.z));
      ctx.lineTo(toScreenX(seg.end.x), toScreenY(seg.end.z));
      ctx.stroke();
    });
    ctx.setLineDash([]);

    // District Labels
    ctx.fillStyle = '#64748b';
    ctx.font = 'bold 12px sans-serif';
    ctx.fillText('CIVIC GARDENS', toScreenX(-110), toScreenY(-105));
    ctx.fillText('DOWNTOWN METROPOLIS', toScreenX(30), toScreenY(-15));
    ctx.fillText('PORT LOGISTICS & DOCKS', toScreenX(-60), toScreenY(135));
    ctx.fillText('RESIDENTIAL HEIGHTS', toScreenX(-150), toScreenY(-15));

    // Key Locations
    engine.worldBuilder.keyLocations.forEach((loc) => {
      const sx = toScreenX(loc.x);
      const sy = toScreenY(loc.z);

      ctx.beginPath();
      ctx.arc(sx, sy, 8, 0, Math.PI * 2);
      if (loc.type === 'safehouse') ctx.fillStyle = '#38bdf8';
      else if (loc.type === 'bank') ctx.fillStyle = '#eab308';
      else if (loc.type === 'police') ctx.fillStyle = '#2563eb';
      else if (loc.type === 'hospital') ctx.fillStyle = '#ef4444';
      else ctx.fillStyle = '#f97316';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Location Name Text
      ctx.fillStyle = '#ffffff';
      ctx.font = '11px sans-serif';
      ctx.fillText(loc.name, sx + 12, sy + 4);
    });

    // Active Mission Objective Marker
    const currentStep = engine.missionManager.getCurrentStep();
    if (currentStep && currentStep.step.targetPos) {
      const mx = toScreenX(currentStep.step.targetPos.x);
      const my = toScreenY(currentStep.step.targetPos.z);

      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(mx, my, 11, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText('OBJECTIVE', mx - 25, my - 15);
    }

    // Custom Waypoint Marker
    if (engine.customWaypoint) {
      const wx = toScreenX(engine.customWaypoint.x);
      const wy = toScreenY(engine.customWaypoint.z);

      ctx.fillStyle = '#06b6d4';
      ctx.beginPath();
      ctx.arc(wx, wy, 10, 0, Math.PI * 2);
      ctx.fill();

      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = '#38bdf8';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText('GPS WAYPOINT', wx - 35, wy - 14);
    }

    // Player Marker
    const px = toScreenX(engine.playerPos.x);
    const py = toScreenY(engine.playerPos.z);

    ctx.save();
    ctx.translate(px, py);
    ctx.rotate(engine.playerHeading);

    ctx.fillStyle = '#00f2fe';
    ctx.beginPath();
    ctx.moveTo(0, -11);
    ctx.lineTo(8, 9);
    ctx.lineTo(0, 5);
    ctx.lineTo(-8, 9);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.5;
    ctx.stroke();
    ctx.restore();

    ctx.fillStyle = '#00f2fe';
    ctx.font = 'bold 11px sans-serif';
    ctx.fillText('YOU', px + 12, py + 4);
  };

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas || !engine) return;
    const rect = canvas.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const clickY = e.clientY - rect.top;

    const width = canvas.width;
    const center = width / 2;
    const scale = 1.35;

    // Convert screen px to world meters
    const wx = (clickX - center) / scale;
    const wz = (clickY - center) / scale;

    engine.setWaypoint(wx, wz);
    drawMap();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-800 rounded-xl max-w-5xl w-full h-[90vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
          <div className="flex items-center gap-3">
            <Navigation className="w-5 h-5 text-sky-400" />
            <div>
              <h2 className="text-lg font-bold text-white tracking-wide">AGAT CITY METROPOLITAN MAP</h2>
              <p className="text-xs text-slate-400">Click anywhere on the map to place a 3D GPS navigation waypoint</p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {engine?.customWaypoint && (
              <button
                onClick={() => {
                  engine.clearWaypoint();
                  drawMap();
                }}
                className="px-3 py-1.5 text-xs font-medium rounded-md bg-rose-950 text-rose-300 border border-rose-800 hover:bg-rose-900 transition-colors cursor-pointer"
              >
                Clear GPS Waypoint
              </button>
            )}

            <button
              onClick={onClose}
              className="p-2 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
              title="Close Map (M or Esc)"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 flex overflow-hidden">
          {/* Map Canvas */}
          <div className="flex-1 bg-slate-950 flex items-center justify-center p-2 overflow-auto">
            <canvas
              ref={canvasRef}
              width={700}
              height={700}
              onClick={handleCanvasClick}
              className="rounded-lg shadow-inner cursor-crosshair max-w-full max-h-full"
            />
          </div>

          {/* Sidebar Directory */}
          <div className="w-72 border-l border-slate-800 bg-slate-900/90 p-4 overflow-y-auto flex flex-col gap-4">
            <h3 className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Districts & Landmarks</h3>

            <div className="space-y-2">
              {engine?.worldBuilder.keyLocations.map((loc) => (
                <div
                  key={loc.id}
                  onClick={() => {
                    engine.setWaypoint(loc.x, loc.z);
                    drawMap();
                  }}
                  className="p-2.5 rounded-lg border border-slate-800 hover:border-sky-500/50 bg-slate-950/50 hover:bg-slate-800/60 transition-all cursor-pointer"
                >
                  <div className="flex items-center gap-2 font-medium text-xs text-white">
                    {loc.type === 'safehouse' && <Home className="w-3.5 h-3.5 text-sky-400" />}
                    {loc.type === 'bank' && <Landmark className="w-3.5 h-3.5 text-yellow-400" />}
                    {loc.type === 'police' && <Shield className="w-3.5 h-3.5 text-blue-400" />}
                    {loc.type === 'hospital' && <HeartPulse className="w-3.5 h-3.5 text-rose-400" />}
                    {loc.type === 'warehouse' && <Package className="w-3.5 h-3.5 text-amber-400" />}
                    {loc.type === 'dock' && <Building className="w-3.5 h-3.5 text-purple-400" />}
                    {loc.type === 'park' && <Trees className="w-3.5 h-3.5 text-emerald-400" />}
                    <span>{loc.name}</span>
                  </div>
                  <p className="text-[11px] text-slate-400 mt-1">{loc.description}</p>
                </div>
              ))}
            </div>

            <div className="mt-auto pt-4 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Player Position</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Active Objective</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Custom Waypoint</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
