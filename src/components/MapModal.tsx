import React, { useRef, useEffect, useState } from 'react';
import { X, Navigation, MapPin, Building, Shield, HeartPulse, Landmark, Home, Trees, Package, Timer, Play, CheckCircle2, Crosshair, Gauge, Coffee, ShoppingBag, Scissors, SprayCan } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { INTERIOR_LOCATIONS } from '../engine/InteriorManager';
import { ALLEY_TAG_WALLS } from '../engine/StreetArtManager';

interface MapModalProps {
  engine: GameEngine | null;
  onClose: () => void;
}

export const MapModal: React.FC<MapModalProps> = ({ engine, onClose }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [activeTab, setActiveTab] = useState<'districts' | 'missions' | 'streetart'>('districts');

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

    // Interactive Building Interiors (Diner, Shop, Apartment, Barbershop)
    INTERIOR_LOCATIONS.forEach((loc) => {
      const ix = toScreenX(loc.exteriorPos.x);
      const iy = toScreenY(loc.exteriorPos.z);

      ctx.beginPath();
      ctx.arc(ix, iy, 9, 0, Math.PI * 2);
      ctx.fillStyle = loc.color;
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2.5;
      ctx.stroke();

      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 11px sans-serif';
      ctx.fillText(`★ ${loc.name}`, ix + 12, iy + 4);
    });

    // Alley Street Art Tag Spots
    ALLEY_TAG_WALLS.forEach((tagWall) => {
      const tx = toScreenX(tagWall.pos.x);
      const ty = toScreenY(tagWall.pos.z);
      const isTagged = engine.streetArtManager.savedTags.has(tagWall.id);

      ctx.beginPath();
      ctx.arc(tx, ty, 8, 0, Math.PI * 2);
      ctx.fillStyle = isTagged ? '#ff007f' : '#00f0ff';
      ctx.fill();
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = isTagged ? '#f472b6' : '#38bdf8';
      ctx.font = 'bold 10px sans-serif';
      ctx.fillText(`🎨 ${tagWall.name}`, tx + 11, ty + 3);
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
          <div className="w-80 border-l border-slate-800 bg-slate-900/90 p-4 overflow-y-auto flex flex-col gap-3">
            {/* Tabs */}
            <div className="grid grid-cols-3 gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
              <button
                onClick={() => setActiveTab('districts')}
                className={`py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'districts'
                    ? 'bg-sky-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Landmarks
              </button>
              <button
                onClick={() => setActiveTab('missions')}
                className={`py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer ${
                  activeTab === 'missions'
                    ? 'bg-amber-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Missions
              </button>
              <button
                onClick={() => setActiveTab('streetart')}
                className={`py-1.5 text-[11px] font-semibold rounded-md transition-all cursor-pointer flex items-center justify-center gap-1 ${
                  activeTab === 'streetart'
                    ? 'bg-fuchsia-600 text-white shadow'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <SprayCan className="w-3 h-3" />
                <span>Street Art</span>
              </button>
            </div>

            {activeTab === 'districts' ? (
              <div className="space-y-3">
                {/* Enterable Building Interiors */}
                <div>
                  <h3 className="text-[11px] font-semibold text-sky-400 uppercase tracking-wider mb-1.5 flex items-center gap-1.5">
                    <span>★ Enterable Interiors</span>
                  </h3>
                  <div className="space-y-1.5">
                    {INTERIOR_LOCATIONS.map((loc) => (
                      <div
                        key={loc.id}
                        onClick={() => {
                          engine?.setWaypoint(loc.exteriorPos.x, loc.exteriorPos.z);
                          drawMap();
                        }}
                        className="p-2 rounded-lg border border-slate-800 hover:border-sky-400/60 bg-slate-950/70 hover:bg-slate-800/80 transition-all cursor-pointer"
                      >
                        <div className="flex items-center justify-between text-xs font-semibold text-white">
                          <div className="flex items-center gap-2">
                            {loc.id === 'diner' && <Coffee className="w-3.5 h-3.5 text-amber-400" />}
                            {loc.id === 'shop' && <ShoppingBag className="w-3.5 h-3.5 text-emerald-400" />}
                            {loc.id === 'apartment' && <Home className="w-3.5 h-3.5 text-sky-400" />}
                            {loc.id === 'barbershop' && <Scissors className="w-3.5 h-3.5 text-purple-400" />}
                            <span>{loc.name}</span>
                          </div>
                          <span className="text-[9px] font-mono px-1 rounded bg-slate-800 text-sky-300">ENTERABLE</span>
                        </div>
                        <p className="text-[10px] text-slate-400 mt-0.5">{loc.description}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="pt-2 border-t border-slate-800">
                  <h3 className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-1.5">Districts & Landmarks</h3>
                  <div className="space-y-1.5">
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
                </div>
              </div>
            ) : activeTab === 'missions' ? (
              <div className="space-y-2.5">
                <h3 className="text-[11px] font-semibold text-amber-400 uppercase tracking-wider flex items-center justify-between">
                  <span>Contracts & Trials</span>
                  <span className="font-mono text-[10px] text-slate-400">
                    {engine?.missionManager.completedMissionIds.size} / {engine?.missionManager.missions.length} Done
                  </span>
                </h3>

                {engine?.missionManager.missions.map((m) => {
                  const isCurrent = engine.missionManager.activeMission?.id === m.id;
                  const isCompleted = engine.missionManager.completedMissionIds.has(m.id);

                  return (
                    <div
                      key={m.id}
                      className={`p-3 rounded-lg border transition-all ${
                        isCurrent
                          ? 'border-amber-500 bg-amber-950/20 shadow-md'
                          : isCompleted
                          ? 'border-emerald-800/60 bg-emerald-950/10 opacity-75'
                          : 'border-slate-800 bg-slate-950/60 hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-1">
                        <div>
                          <div className="flex items-center gap-1.5">
                            {m.type === 'Race' ? (
                              <Gauge className="w-3.5 h-3.5 text-sky-400" />
                            ) : m.type === 'Delivery' ? (
                              <Package className="w-3.5 h-3.5 text-amber-400" />
                            ) : m.type === 'Assault' ? (
                              <Crosshair className="w-3.5 h-3.5 text-rose-400" />
                            ) : (
                              <Landmark className="w-3.5 h-3.5 text-yellow-400" />
                            )}
                            <h4 className="text-xs font-bold text-white">{m.title}</h4>
                          </div>
                          <span className="text-[10px] text-slate-400 block mt-0.5">{m.subtitle}</span>
                        </div>

                        <span className="text-xs font-mono font-bold text-emerald-400">
                          +${m.reward}
                        </span>
                      </div>

                      {/* Timed Mission Badge */}
                      {m.timeLimit && (
                        <div className="flex items-center gap-1 mt-1.5 text-[10px] font-mono text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/40 w-fit">
                          <Timer className="w-3 h-3 text-amber-400" />
                          <span>Limit: {Math.floor(m.timeLimit / 60)}m {m.timeLimit % 60 ? `${m.timeLimit % 60}s` : ''}</span>
                        </div>
                      )}

                      <p className="text-[11px] text-slate-300 mt-1.5 line-clamp-2 leading-relaxed">
                        {m.briefing}
                      </p>

                      {/* Actions */}
                      <div className="mt-2.5 pt-2 border-t border-slate-800/80 flex items-center justify-between">
                        {isCompleted ? (
                          <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" /> COMPLETED
                          </span>
                        ) : isCurrent ? (
                          <div className="flex items-center justify-between w-full">
                            <span className="text-[10px] font-bold text-amber-400 flex items-center gap-1 animate-pulse">
                              <Play className="w-3 h-3 fill-amber-400" /> IN PROGRESS
                            </span>
                            {m.timeRemaining !== undefined && (
                              <span className="text-[11px] font-mono font-bold text-amber-300">
                                {Math.floor(m.timeRemaining / 60)}:{String(Math.floor(m.timeRemaining % 60)).padStart(2, '0')}
                              </span>
                            )}
                          </div>
                        ) : (
                          <button
                            onClick={() => {
                              engine.missionManager.startMission(m.id);
                              drawMap();
                            }}
                            className="px-2.5 py-1 bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] rounded transition-colors cursor-pointer flex items-center gap-1"
                          >
                            <Play className="w-3 h-3 fill-slate-950" />
                            <span>Start Mission</span>
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              /* Street Art Alley Walls Directory */
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="text-[11px] font-semibold text-fuchsia-400 uppercase tracking-wider flex items-center gap-1.5">
                    <SprayCan className="w-3.5 h-3.5 text-fuchsia-400" />
                    <span>Alley Street Art Walls</span>
                  </h3>
                  <span className="text-[10px] font-mono font-bold text-amber-300 bg-slate-950 px-1.5 py-0.5 rounded border border-slate-800">
                    {engine?.streetArtManager.getTaggedCount() || 0}/{ALLEY_TAG_WALLS.length} CLAIMED
                  </span>
                </div>

                <div className="space-y-2">
                  {ALLEY_TAG_WALLS.map((w) => {
                    const isTagged = engine?.streetArtManager.savedTags.has(w.id);
                    return (
                      <div
                        key={w.id}
                        className={`p-2.5 rounded-lg border transition-all ${
                          isTagged
                            ? 'border-fuchsia-500/40 bg-fuchsia-950/20'
                            : 'border-slate-800 bg-slate-950/70 hover:border-sky-500/50'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div>
                            <div className="text-xs font-bold text-white flex items-center gap-1.5">
                              <span>{w.name}</span>
                            </div>
                            <div className="text-[10px] font-mono text-slate-400 mt-0.5">
                              {w.district} · {w.wallType.toUpperCase()}
                            </div>
                          </div>

                          <span
                            className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-bold ${
                              isTagged
                                ? 'bg-fuchsia-500/20 text-fuchsia-300 border border-fuchsia-500/30'
                                : 'bg-sky-500/20 text-sky-300 border border-sky-500/30'
                            }`}
                          >
                            {isTagged ? 'CLAIMED' : `+$${w.reward}`}
                          </span>
                        </div>

                        <p className="text-[10px] text-slate-300 mt-1 line-clamp-2">
                          {w.description}
                        </p>

                        <div className="mt-2 flex items-center justify-between pt-1.5 border-t border-slate-800/80">
                          <button
                            onClick={() => {
                              engine?.setWaypoint(w.standPos.x, w.standPos.z);
                              drawMap();
                            }}
                            className="text-[10px] font-semibold text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                          >
                            <Navigation className="w-3 h-3" />
                            <span>Navigate Here (GPS)</span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-auto pt-3 border-t border-slate-800 text-[11px] text-slate-400 space-y-1">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" />
                <span>Player Position</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400" />
                <span>Active Objective</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-fuchsia-400" />
                <span>Alley Street Art Walls</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-400" />
                <span>Custom GPS Waypoint</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
