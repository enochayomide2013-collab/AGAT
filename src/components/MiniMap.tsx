import React, { useEffect, useRef, useState } from 'react';
import { Compass, ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { INTERIOR_LOCATIONS } from '../engine/InteriorManager';
import { ALLEY_TAG_WALLS } from '../engine/StreetArtManager';

interface MiniMapProps {
  engine: GameEngine | null;
  onOpenFullMap: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine, onOpenFullMap }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isRotatingMode, setIsRotatingMode] = useState<boolean>(true); // Rotating vs North-Up
  const [zoomLevel, setZoomLevel] = useState<number>(0.55); // pixels per world meter

  useEffect(() => {
    let animId: number;

    const renderRadar = () => {
      animId = requestAnimationFrame(renderRadar);
      const canvas = canvasRef.current;
      if (!canvas || !engine) return;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const size = canvas.width;
      const half = size / 2;
      const radius = half - 4;
      const scale = zoomLevel;

      const px = engine.playerPos.x;
      const pz = engine.playerPos.z;
      const pHeading = engine.playerHeading;

      // Rotation angle: in rotating mode, rotate scene so player points up (heading = 0)
      const mapAngle = isRotatingMode ? -pHeading : 0;

      // Clear Canvas
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      // Clip to circular radar boundary
      ctx.beginPath();
      ctx.arc(half, half, radius, 0, Math.PI * 2);
      ctx.clip();

      // Background - Dark Cyber Oceanic base
      ctx.fillStyle = '#070b12';
      ctx.fillRect(0, 0, size, size);

      // Radar Concentric Range Rings
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      [radius * 0.35, radius * 0.65, radius * 0.95].forEach((r) => {
        ctx.beginPath();
        ctx.arc(half, half, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // Crosshairs
      ctx.strokeStyle = '#0f172a';
      ctx.beginPath();
      ctx.moveTo(half, 0);
      ctx.lineTo(half, size);
      ctx.moveTo(0, half);
      ctx.lineTo(size, half);
      ctx.stroke();

      // Begin Transformed World Space (Centered at Player)
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(mapAngle);

      // Helper to transform world coords relative to player
      const toRelX = (wx: number) => (wx - px) * scale;
      const toRelY = (wz: number) => (wz - pz) * scale;

      // 1. Draw City Water / Ocean (West Harbor: x < -190)
      const waterRelX = toRelX(-190);
      if (waterRelX > -half * 3 && waterRelX < half * 3) {
        ctx.fillStyle = '#0c4a6e';
        ctx.fillRect(waterRelX - 500, -500, 500, 1000);
      }

      // 2. Draw Building Footprints / Blocks
      // Approximate building blocks from WorldBuilder
      const buildingBlocks = [
        // Downtown Skyscrapers
        { x: -70, z: -70, w: 26, h: 26 },
        { x: -30, z: -70, w: 28, h: 28 },
        { x: 20, z: -70, w: 28, h: 28 },
        { x: 70, z: -70, w: 28, h: 28 },
        { x: -70, z: -20, w: 26, h: 26 },
        { x: -30, z: -20, w: 28, h: 28 },
        { x: 20, z: -20, w: 28, h: 28 },
        { x: 70, z: -20, w: 28, h: 28 },
        // Mid-city Commercial & Residential
        { x: -70, z: 30, w: 26, h: 26 },
        { x: -30, z: 30, w: 28, h: 28 },
        { x: 20, z: 30, w: 28, h: 28 },
        { x: 70, z: 30, w: 28, h: 28 },
        { x: -70, z: 80, w: 26, h: 26 },
        { x: -30, z: 80, w: 28, h: 28 },
        { x: 20, z: 80, w: 28, h: 28 },
        { x: 70, z: 80, w: 28, h: 28 },
      ];

      ctx.fillStyle = '#1e293b';
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 1;
      buildingBlocks.forEach((b) => {
        const bx = toRelX(b.x - b.w / 2);
        const by = toRelY(b.z - b.h / 2);
        const bw = b.w * scale;
        const bh = b.h * scale;

        // Skip if outside view
        if (Math.hypot(bx, by) > radius * 2.5) return;

        ctx.fillRect(bx, by, bw, bh);
        ctx.strokeRect(bx, by, bw, bh);
      });

      // 3. Draw Roads (Asphalt & Markings)
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = Math.max(5, 12 * scale);
      ctx.lineCap = 'round';

      engine.worldBuilder.roadSegments.forEach((seg) => {
        const x1 = toRelX(seg.start.x);
        const y1 = toRelY(seg.start.z);
        const x2 = toRelX(seg.end.x);
        const y2 = toRelY(seg.end.z);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Road Centerline Dash
      ctx.strokeStyle = '#64748b';
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);
      engine.worldBuilder.roadSegments.forEach((seg) => {
        const x1 = toRelX(seg.start.x);
        const y1 = toRelY(seg.start.z);
        const x2 = toRelX(seg.end.x);
        const y2 = toRelY(seg.end.z);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });
      ctx.setLineDash([]); // reset dash

      // 4. Draw Interactive Building Interior Entrances
      INTERIOR_LOCATIONS.forEach((loc) => {
        const ix = toRelX(loc.exteriorPos.x);
        const iy = toRelY(loc.exteriorPos.z);
        if (Math.hypot(ix, iy) < radius) {
          ctx.beginPath();
          ctx.arc(ix, iy, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = loc.color;
          ctx.fill();
          ctx.strokeStyle = '#ffffff';
          ctx.lineWidth = 1.2;
          ctx.stroke();
        }
      });

      // 5. Draw Key Locations
      engine.worldBuilder.keyLocations.forEach((loc) => {
        const kx = toRelX(loc.x);
        const ky = toRelY(loc.z);
        if (Math.hypot(kx, ky) < radius) {
          ctx.beginPath();
          ctx.arc(kx, ky, 3.5, 0, Math.PI * 2);
          if (loc.type === 'safehouse') ctx.fillStyle = '#06b6d4';
          else if (loc.type === 'bank') ctx.fillStyle = '#eab308';
          else if (loc.type === 'police') ctx.fillStyle = '#3b82f6';
          else if (loc.type === 'hospital') ctx.fillStyle = '#ef4444';
          else ctx.fillStyle = '#a855f7';
          ctx.fill();
        }
      });

      // 5b. Draw Alley Street Art Tag Spots
      ALLEY_TAG_WALLS.forEach((tagWall) => {
        const tx = toRelX(tagWall.pos.x);
        const ty = toRelY(tagWall.pos.z);
        if (Math.hypot(tx, ty) < radius) {
          const isTagged = engine.streetArtManager.savedTags.has(tagWall.id);
          ctx.save();
          ctx.translate(tx, ty);

          // Pulsing glow for unclaimed walls
          ctx.beginPath();
          ctx.arc(0, 0, 4.5, 0, Math.PI * 2);
          ctx.fillStyle = isTagged ? '#ff007f' : '#00f0ff';
          ctx.shadowColor = isTagged ? '#ff007f' : '#00f0ff';
          ctx.shadowBlur = 8;
          ctx.fill();

          // Center pip
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fillStyle = '#ffffff';
          ctx.fill();

          ctx.restore();
        }
      });

      // 6. Draw Weapon Pickups in World
      engine.worldBuilder.weaponPickups.forEach((wp) => {
        if (wp.collected) return;
        const wx = toRelX(wp.pos.x);
        const wy = toRelY(wp.pos.z);
        if (Math.hypot(wx, wy) < radius) {
          ctx.fillStyle = '#fb923c';
          ctx.beginPath();
          ctx.arc(wx, wy, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // 7. Draw NPCs Blips
      engine.npcManager.npcs.forEach((npc) => {
        if (npc.data.state === 'defeated') return;
        const nx = toRelX(npc.data.x);
        const ny = toRelY(npc.data.z);
        if (Math.hypot(nx, ny) < radius) {
          ctx.beginPath();
          ctx.arc(nx, ny, 2.0, 0, Math.PI * 2);
          if (npc.data.type === 'police') ctx.fillStyle = '#38bdf8';
          else if (npc.data.type === 'hostile') ctx.fillStyle = '#f43f5e';
          else ctx.fillStyle = '#94a3b8';
          ctx.fill();
        }
      });

      // 8. Draw Vehicles
      engine.vehicleManager.vehicles.forEach((v) => {
        if (v.isPlayerInside) return;
        const vx = toRelX(v.mesh.position.x);
        const vy = toRelY(v.mesh.position.z);
        if (Math.hypot(vx, vy) < radius) {
          ctx.save();
          ctx.translate(vx, vy);
          ctx.rotate(v.mesh.rotation.y);
          ctx.fillStyle = v.def.isPolice ? '#38bdf8' : '#cbd5e1';
          ctx.fillRect(-2, -3.5, 4, 7);
          ctx.restore();
        }
      });

      // Restore World Space Transform
      ctx.restore();

      // 9. Draw Vision Flashlight FOV Cone from Player
      const pRot = isRotatingMode ? 0 : pHeading;
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(pRot);

      const coneGrad = ctx.createRadialGradient(0, 0, 4, 0, 0, 45);
      coneGrad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
      coneGrad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
      ctx.fillStyle = coneGrad;
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.arc(0, 0, 45, -Math.PI / 2 - 0.4, -Math.PI / 2 + 0.4);
      ctx.closePath();
      ctx.fill();

      // 10. Draw Player Marker (Arrow / Chevron)
      ctx.fillStyle = '#00f2fe';
      ctx.shadowColor = '#00f2fe';
      ctx.shadowBlur = 6;
      ctx.beginPath();
      ctx.moveTo(0, -8);
      ctx.lineTo(6, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-6, 6);
      ctx.closePath();
      ctx.fill();
      ctx.shadowBlur = 0; // reset glow
      ctx.restore();

      // 11. Draw Mission Objective Blip (clamped to perimeter if offscreen)
      const activeStep = engine.missionManager.getCurrentStep();
      if (activeStep && activeStep.step.targetPos) {
        const target = activeStep.step.targetPos;
        // Transform target relative to player
        const dx = (target.x - px) * scale;
        const dy = (target.z - pz) * scale;

        // Apply rotation if rotating mode
        const rotX = isRotatingMode ? dx * Math.cos(mapAngle) - dy * Math.sin(mapAngle) : dx;
        const rotY = isRotatingMode ? dx * Math.sin(mapAngle) + dy * Math.cos(mapAngle) : dy;

        const dist = Math.hypot(rotX, rotY);
        const maxDist = radius - 10;

        let finalX = half + rotX;
        let finalY = half + rotY;

        if (dist > maxDist) {
          const angle = Math.atan2(rotY, rotX);
          finalX = half + Math.cos(angle) * maxDist;
          finalY = half + Math.sin(angle) * maxDist;
        }

        // Pulsing yellow beacon
        const pulse = 1 + Math.sin(Date.now() * 0.008) * 0.2;
        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(finalX, finalY, 5 * pulse, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();

        // Distance text badge
        const realDistMeters = Math.round(Math.hypot(target.x - px, target.z - pz));
        ctx.fillStyle = '#ffffff';
        ctx.font = 'bold 9px monospace';
        ctx.fillText(`${realDistMeters}m`, finalX - 10, finalY - 8);
      }

      // 12. Draw Custom Waypoint (if set)
      if (engine.customWaypoint) {
        const dx = (engine.customWaypoint.x - px) * scale;
        const dy = (engine.customWaypoint.z - pz) * scale;
        const rotX = isRotatingMode ? dx * Math.cos(mapAngle) - dy * Math.sin(mapAngle) : dx;
        const rotY = isRotatingMode ? dx * Math.sin(mapAngle) + dy * Math.cos(mapAngle) : dy;
        const dist = Math.hypot(rotX, rotY);
        const maxDist = radius - 10;

        let fx = half + rotX;
        let fy = half + rotY;
        if (dist > maxDist) {
          const angle = Math.atan2(rotY, rotX);
          fx = half + Math.cos(angle) * maxDist;
          fy = half + Math.sin(angle) * maxDist;
        }

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(fx, fy, 4.5, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.2;
        ctx.stroke();
      }

      ctx.restore(); // restore clip

      // 13. High-Tech Cyber Outer Ring & Compass Cardinal Marks
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(half, half, radius, 0, Math.PI * 2);
      ctx.stroke();

      // Cardinal Directions (N, E, S, W)
      ctx.font = 'bold 9px monospace';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';

      const cardinalAngleOffset = isRotatingMode ? mapAngle : 0;
      const cardinals = [
        { label: 'N', angle: -Math.PI / 2 + cardinalAngleOffset, color: '#ef4444' },
        { label: 'E', angle: 0 + cardinalAngleOffset, color: '#94a3b8' },
        { label: 'S', angle: Math.PI / 2 + cardinalAngleOffset, color: '#94a3b8' },
        { label: 'W', angle: Math.PI + cardinalAngleOffset, color: '#94a3b8' },
      ];

      cardinals.forEach((c) => {
        const cx = half + Math.cos(c.angle) * (radius - 8);
        const cy = half + Math.sin(c.angle) * (radius - 8);
        ctx.fillStyle = c.color;
        ctx.fillText(c.label, cx, cy);
      });
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [engine, isRotatingMode, zoomLevel]);

  return (
    <div className="relative group">
      {/* 2D Canvas Radar */}
      <div
        className="relative cursor-pointer rounded-full overflow-hidden shadow-2xl bg-slate-950/90 border border-slate-700/80 hover:border-sky-400 transition-colors"
        onClick={onOpenFullMap}
        title="Click to open Full AGAT City Map (M)"
      >
        <canvas ref={canvasRef} width={180} height={180} className="w-[180px] h-[180px] block" />
      </div>

      {/* Quick Controls overlay on hover */}
      <div className="absolute top-1 right-[-32px] flex flex-col gap-1 z-10">
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomLevel((z) => Math.min(0.9, z + 0.15));
          }}
          title="Zoom In"
          className="p-1 rounded bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700 shadow cursor-pointer"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setZoomLevel((z) => Math.max(0.3, z - 0.15));
          }}
          title="Zoom Out"
          className="p-1 rounded bg-slate-900/90 hover:bg-slate-800 text-sky-400 border border-slate-700 shadow cursor-pointer"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            setIsRotatingMode((r) => !r);
          }}
          title={isRotatingMode ? 'Switch to North-Up' : 'Switch to Rotating Radar'}
          className="p-1 rounded bg-slate-900/90 hover:bg-slate-800 text-amber-400 border border-slate-700 shadow cursor-pointer"
        >
          <Compass className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Bottom City Map Badge */}
      <div
        onClick={onOpenFullMap}
        className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/95 text-[10px] px-2 py-0.5 rounded text-sky-400 font-mono border border-slate-700 hover:text-white hover:border-sky-400 cursor-pointer flex items-center gap-1 shadow-lg"
      >
        <Maximize2 className="w-2.5 h-2.5" />
        <span>[M] CITY MAP</span>
      </div>
    </div>
  );
};
