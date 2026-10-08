import React, { useEffect, useRef } from 'react';
import { GameEngine } from '../engine/GameEngine';

interface MiniMapProps {
  engine: GameEngine | null;
  onOpenFullMap: () => void;
}

export const MiniMap: React.FC<MiniMapProps> = ({ engine, onOpenFullMap }) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

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
      const scale = 0.55; // pixels per world meter

      const px = engine.playerPos.x;
      const pz = engine.playerPos.z;
      const pHeading = engine.playerHeading;

      // Clear & Draw Radar Disk
      ctx.clearRect(0, 0, size, size);

      ctx.save();
      // Clip circular radar
      ctx.beginPath();
      ctx.arc(half, half, half - 3, 0, Math.PI * 2);
      ctx.clip();

      // Background
      ctx.fillStyle = '#0a0e17';
      ctx.fillRect(0, 0, size, size);

      // Radar scan grid circles
      ctx.strokeStyle = '#1e293b';
      ctx.lineWidth = 1;
      [30, 60, 85].forEach((r) => {
        ctx.beginPath();
        ctx.arc(half, half, r, 0, Math.PI * 2);
        ctx.stroke();
      });

      // World to radar coordinate transformation
      const toRadarX = (wx: number) => half + (wx - px) * scale;
      const toRadarY = (wz: number) => half + (wz - pz) * scale;

      // Draw Roads
      ctx.strokeStyle = '#334155';
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      engine.worldBuilder.roadSegments.forEach((seg) => {
        const x1 = toRadarX(seg.start.x);
        const y1 = toRadarY(seg.start.z);
        const x2 = toRadarX(seg.end.x);
        const y2 = toRadarY(seg.end.z);

        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
      });

      // Draw Key Location Blips
      engine.worldBuilder.keyLocations.forEach((loc) => {
        const rx = toRadarX(loc.x);
        const ry = toRadarY(loc.z);

        // Check if inside circle
        const dist = Math.hypot(rx - half, ry - half);
        if (dist < half - 8) {
          ctx.beginPath();
          ctx.arc(rx, ry, 4, 0, Math.PI * 2);
          if (loc.type === 'safehouse') ctx.fillStyle = '#38bdf8';
          else if (loc.type === 'bank') ctx.fillStyle = '#facc15';
          else if (loc.type === 'police') ctx.fillStyle = '#3b82f6';
          else if (loc.type === 'hospital') ctx.fillStyle = '#ef4444';
          else ctx.fillStyle = '#a855f7';
          ctx.fill();
        }
      });

      // Draw Vehicles Blips
      engine.vehicleManager.vehicles.forEach((v) => {
        if (v.isPlayerInside) return;
        const rx = toRadarX(v.mesh.position.x);
        const ry = toRadarY(v.mesh.position.z);
        if (Math.hypot(rx - half, ry - half) < half - 6) {
          ctx.fillStyle = v.def.isPolice ? '#38bdf8' : '#94a3b8';
          ctx.beginPath();
          ctx.arc(rx, ry, 2.5, 0, Math.PI * 2);
          ctx.fill();
        }
      });

      // Draw Mission Objective Blip
      const activeStep = engine.missionManager.getCurrentStep();
      if (activeStep && activeStep.step.targetPos) {
        const target = activeStep.step.targetPos;
        const rx = toRadarX(target.x);
        const ry = toRadarY(target.z);
        const dist = Math.hypot(rx - half, ry - half);

        // Clamp to perimeter if out of view
        const clampedAngle = Math.atan2(ry - half, rx - half);
        const finalX = dist > half - 10 ? half + Math.cos(clampedAngle) * (half - 12) : rx;
        const finalY = dist > half - 10 ? half + Math.sin(clampedAngle) * (half - 12) : ry;

        ctx.fillStyle = '#f59e0b';
        ctx.beginPath();
        ctx.arc(finalX, finalY, 5, 0, Math.PI * 2);
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1.5;
        ctx.stroke();
      }

      // Draw Custom Waypoint
      if (engine.customWaypoint) {
        const rx = toRadarX(engine.customWaypoint.x);
        const ry = toRadarY(engine.customWaypoint.z);
        const dist = Math.hypot(rx - half, ry - half);
        const angle = Math.atan2(ry - half, rx - half);
        const fx = dist > half - 10 ? half + Math.cos(angle) * (half - 12) : rx;
        const fy = dist > half - 10 ? half + Math.sin(angle) * (half - 12) : ry;

        ctx.fillStyle = '#06b6d4';
        ctx.beginPath();
        ctx.arc(fx, fy, 5, 0, Math.PI * 2);
        ctx.fill();
      }

      // Draw Player Arrow at Center
      ctx.save();
      ctx.translate(half, half);
      ctx.rotate(pHeading);

      ctx.fillStyle = '#00f2fe';
      ctx.beginPath();
      ctx.moveTo(0, -7);
      ctx.lineTo(5, 6);
      ctx.lineTo(0, 3);
      ctx.lineTo(-5, 6);
      ctx.closePath();
      ctx.fill();
      ctx.restore();

      ctx.restore();

      // Border Ring
      ctx.strokeStyle = '#38bdf8';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(half, half, half - 3, 0, Math.PI * 2);
      ctx.stroke();

      // North Indicator
      ctx.fillStyle = '#ef4444';
      ctx.font = 'bold 10px monospace';
      ctx.fillText('N', half - 4, 14);
    };

    animId = requestAnimationFrame(renderRadar);
    return () => cancelAnimationFrame(animId);
  }, [engine]);

  return (
    <div className="relative group cursor-pointer" onClick={onOpenFullMap} title="Click to open Full AGAT City Map (M)">
      <canvas
        ref={canvasRef}
        width={180}
        height={180}
        className="w-[180px] h-[180px] rounded-full shadow-2xl bg-slate-950/90"
      />
      <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-slate-900/90 text-[10px] px-2 py-0.5 rounded text-sky-400 font-mono border border-slate-700">
        [M] CITY MAP
      </div>
    </div>
  );
};
