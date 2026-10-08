import React, { useEffect, useRef, useState } from 'react';
import { X, Sparkles, SprayCan, RotateCcw, Check, Droplets, Type, Undo, Volume2 } from 'lucide-react';
import { AlleyTagWallDef } from '../types/game';
import { soundManager } from '../engine/SoundManager';

interface StreetArtModalProps {
  wall: AlleyTagWallDef | null;
  isOpen: boolean;
  onClose: () => void;
  onSprayTag: (dataUrl: string, sprayColor: string, crewTag: string) => void;
}

const PALETTE_COLORS = [
  { name: 'Neon Cyan', hex: '#00f0ff', glow: 'rgba(0, 240, 255, 0.6)' },
  { name: 'Electric Pink', hex: '#ff007f', glow: 'rgba(255, 0, 127, 0.6)' },
  { name: 'Poison Lime', hex: '#10b981', glow: 'rgba(16, 185, 129, 0.6)' },
  { name: 'Acid Yellow', hex: '#facc15', glow: 'rgba(250, 204, 21, 0.6)' },
  { name: 'Cyber Purple', hex: '#a855f7', glow: 'rgba(168, 85, 247, 0.6)' },
  { name: 'Blaze Orange', hex: '#f97316', glow: 'rgba(249, 115, 22, 0.6)' },
  { name: 'Blood Crimson', hex: '#ef4444', glow: 'rgba(239, 68, 68, 0.6)' },
  { name: 'Pure White', hex: '#ffffff', glow: 'rgba(255, 255, 255, 0.6)' },
  { name: 'Chrome Silver', hex: '#94a3b8', glow: 'rgba(148, 163, 184, 0.6)' },
  { name: 'Abyss Black', hex: '#09090b', glow: 'rgba(9, 9, 11, 0.8)' },
];

const CAP_TYPES = [
  { id: 'fat', name: 'Fat Cap', desc: 'Heavy aerosol coverage & soft overspray', defaultSize: 36, density: 30 },
  { id: 'skinny', name: 'Skinny Cap', desc: 'Crisp, razor sharp outlines', defaultSize: 12, density: 16 },
  { id: 'chisel', name: 'Chisel Tip', desc: 'Calligraphy tag stroke', defaultSize: 24, density: 24 },
  { id: 'splatter', name: 'Splatter Cap', desc: 'Chaotic spray flecks & droplets', defaultSize: 45, density: 40 },
];

const PRESET_STENCILS = [
  { id: 'agat_rebel', name: 'AGAT REBEL', tag: 'AGAT REBEL', icon: '⚡' },
  { id: 'cyber_punk', name: 'CYBER PUNK', tag: 'CYBER PUNK', icon: '🤖' },
  { id: 'no_cops', name: 'NO COPS', tag: 'NO COPS', icon: '🚫' },
  { id: 'crown', name: 'CROWN OF AGAT', tag: '👑 CROWN', icon: '👑' },
  { id: 'void_skull', name: 'VOID RUNNER', tag: 'VOID RUNNER', icon: '💀' },
  { id: 'viper', name: 'VIPER CREW', tag: 'VIPER', icon: '🐍' },
];

export const StreetArtModal: React.FC<StreetArtModalProps> = ({
  wall,
  isOpen,
  onClose,
  onSprayTag,
}) => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [selectedColor, setSelectedColor] = useState<string>('#00f0ff');
  const [selectedCap, setSelectedCap] = useState<string>('fat');
  const [brushSize, setBrushSize] = useState<number>(32);
  const [customText, setCustomText] = useState<string>('AGAT');
  const [isSpraying, setIsSpraying] = useState<boolean>(false);
  const [history, setHistory] = useState<ImageData[]>([]);

  // Track spray continuous animation loop
  const isMouseDownRef = useRef<boolean>(false);
  const lastMousePosRef = useRef<{ x: number; y: number } | null>(null);
  const sprayAnimIdRef = useRef<number | null>(null);

  // Initialize Canvas with alley wall texture
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset wall background
    initWallBackground(ctx, canvas.width, canvas.height, wall?.wallType || 'brick');
    saveToHistory();
  }, [isOpen, wall]);

  const initWallBackground = (
    ctx: CanvasRenderingContext2D,
    width: number,
    height: number,
    wallType: string
  ) => {
    // Base dark weathered wall
    let baseColor = '#1f1f26';
    if (wallType === 'brick') baseColor = '#2b1816';
    if (wallType === 'concrete') baseColor = '#222831';
    if (wallType === 'corrugated') baseColor = '#1e242d';

    ctx.fillStyle = baseColor;
    ctx.fillRect(0, 0, width, height);

    // Brick mortar lines or concrete seam lines
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 4;
    for (let y = 0; y < height; y += 45) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Staggered vertical joints
      const offset = (Math.floor(y / 45) % 2) * 50;
      for (let x = offset; x < width; x += 100) {
        ctx.beginPath();
        ctx.moveTo(x, y);
        ctx.lineTo(x, y + 45);
        ctx.stroke();
      }
    }

    // Weathered grunge spatter
    for (let i = 0; i < 350; i++) {
      const gx = Math.random() * width;
      const gy = Math.random() * height;
      const gRadius = Math.random() * 3 + 1;
      ctx.fillStyle = Math.random() > 0.5 ? 'rgba(0, 0, 0, 0.25)' : 'rgba(255, 255, 255, 0.04)';
      ctx.beginPath();
      ctx.arc(gx, gy, gRadius, 0, Math.PI * 2);
      ctx.fill();
    }

    // Stencil border frame guide
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 3;
    ctx.setLineDash([12, 8]);
    ctx.strokeRect(30, 30, width - 60, height - 60);
    ctx.setLineDash([]);
  };

  const saveToHistory = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const imgData = ctx.getImageData(0, 0, canvasRef.current.width, canvasRef.current.height);
    setHistory((prev) => [...prev.slice(-10), imgData]);
  };

  const handleUndo = () => {
    if (history.length <= 1 || !canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    const newHistory = [...history];
    newHistory.pop(); // remove current state
    const previous = newHistory[newHistory.length - 1];
    ctx.putImageData(previous, 0, 0);
    setHistory(newHistory);
    soundManager.playUIClick();
  };

  const handleClear = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    initWallBackground(ctx, canvasRef.current.width, canvasRef.current.height, wall?.wallType || 'brick');
    saveToHistory();
    soundManager.playUIClick();
  };

  const handleShakeCan = () => {
    soundManager.playSprayRattle();
  };

  // --- PROCEDURAL SPRAY MIST EMISSION ---
  const emitSprayAerosol = (x: number, y: number) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    const currentCap = CAP_TYPES.find((c) => c.id === selectedCap) || CAP_TYPES[0];
    const particleCount = currentCap.density;
    const radius = brushSize;

    ctx.save();
    ctx.fillStyle = selectedColor;

    for (let i = 0; i < particleCount; i++) {
      // Gaussian distribution around cursor
      const angle = Math.random() * Math.PI * 2;
      const dist = Math.pow(Math.random(), selectedCap === 'skinny' ? 2 : 0.8) * radius;
      const px = x + Math.cos(angle) * dist;
      const py = y + Math.sin(angle) * dist;
      const pSize = selectedCap === 'splatter' ? Math.random() * 4 + 1 : Math.random() * 2 + 0.8;

      // Alpha falloff from center
      const alpha = Math.max(0.1, 1 - dist / radius);
      ctx.globalAlpha = selectedCap === 'fat' ? alpha * 0.45 : alpha * 0.75;

      ctx.beginPath();
      ctx.arc(px, py, pSize, 0, Math.PI * 2);
      ctx.fill();
    }

    // Chisel stroke angle accent
    if (selectedCap === 'chisel') {
      ctx.strokeStyle = selectedColor;
      ctx.globalAlpha = 0.6;
      ctx.lineWidth = brushSize * 0.4;
      ctx.beginPath();
      ctx.moveTo(x - radius * 0.5, y + radius * 0.3);
      ctx.lineTo(x + radius * 0.5, y - radius * 0.3);
      ctx.stroke();
    }

    ctx.restore();
  };

  // Continuous spray tick while mouse is held
  const startSprayLoop = () => {
    if (sprayAnimIdRef.current) return;

    const tick = () => {
      if (isMouseDownRef.current && lastMousePosRef.current) {
        emitSprayAerosol(lastMousePosRef.current.x, lastMousePosRef.current.y);
      }
      sprayAnimIdRef.current = requestAnimationFrame(tick);
    };
    sprayAnimIdRef.current = requestAnimationFrame(tick);
  };

  const stopSprayLoop = () => {
    if (sprayAnimIdRef.current) {
      cancelAnimationFrame(sprayAnimIdRef.current);
      sprayAnimIdRef.current = null;
    }
  };

  // Canvas Mouse / Touch Handlers
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    isMouseDownRef.current = true;
    setIsSpraying(true);
    soundManager.startSprayHiss();

    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastMousePosRef.current = { x, y };

    emitSprayAerosol(x, y);
    startSprayLoop();
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!isMouseDownRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const scaleX = e.currentTarget.width / rect.width;
    const scaleY = e.currentTarget.height / rect.height;
    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;
    lastMousePosRef.current = { x, y };
  };

  const handlePointerUp = () => {
    if (!isMouseDownRef.current) return;
    isMouseDownRef.current = false;
    setIsSpraying(false);
    stopSprayLoop();
    soundManager.stopSprayHiss();
    saveToHistory();
  };

  // --- PROCEDURAL PAINT DRIPS ---
  const handleAddPaintDrips = () => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    soundManager.playSprayBurst(180);
    ctx.save();
    ctx.fillStyle = selectedColor;

    // Generate 6-10 realistic dripping streams
    const dripCount = Math.floor(Math.random() * 5) + 6;
    for (let i = 0; i < dripCount; i++) {
      const startX = 80 + Math.random() * (canvasRef.current.width - 160);
      const startY = 150 + Math.random() * 250;
      const dripLength = 40 + Math.random() * 120;
      let currX = startX;

      for (let y = 0; y < dripLength; y += 4) {
        currX += (Math.random() - 0.5) * 1.5;
        const width = Math.max(1, 4 * (1 - y / dripLength));
        ctx.globalAlpha = 0.85;
        ctx.beginPath();
        ctx.arc(currX, startY + y, width, 0, Math.PI * 2);
        ctx.fill();
      }

      // Bulbous teardrop droplet at bottom
      ctx.beginPath();
      ctx.arc(currX, startY + dripLength + 3, 3.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
    saveToHistory();
  };

  // --- STAMP STENCILS ---
  const handleStampStencil = (stencilText: string) => {
    if (!canvasRef.current) return;
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;

    soundManager.playSprayBurst(300);
    const width = canvasRef.current.width;
    const height = canvasRef.current.height;

    ctx.save();
    // Center graffiti stencil stamp
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.font = '900 72px Impact, sans-serif';

    // Spray overspray shadow
    ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
    ctx.shadowColor = selectedColor;
    ctx.shadowBlur = 25;
    ctx.fillText(stencilText, width / 2 + 4, height / 2 + 4);

    // Stencil paint coat
    ctx.fillStyle = selectedColor;
    ctx.fillText(stencilText, width / 2, height / 2);

    // Inner bright highlight
    ctx.font = '900 68px Impact, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 0.45;
    ctx.fillText(stencilText, width / 2, height / 2);

    ctx.restore();
    saveToHistory();
  };

  // --- CONFIRM AND SPRAY ON 3D ALLEY WALL ---
  const handleConfirmSpray = () => {
    if (!canvasRef.current) return;
    soundManager.playSprayRattle();
    const dataUrl = canvasRef.current.toDataURL('image/png');
    onSprayTag(dataUrl, selectedColor, customText);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-md p-4 animate-in fade-in duration-200">
      <div className="bg-slate-950 border border-sky-500/40 rounded-2xl max-w-5xl w-full flex flex-col max-h-[95vh] shadow-[0_0_50px_rgba(0,240,255,0.2)] overflow-hidden">
        {/* MODAL HEADER */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-sky-500/20 border border-sky-500/40 rounded-xl text-sky-400">
              <SprayCan className="w-6 h-6 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-black text-white tracking-wider">
                  ALLEY STREET ART STUDIO
                </h2>
                <span className="bg-emerald-500/20 text-emerald-400 text-xs font-mono font-bold px-2 py-0.5 rounded border border-emerald-500/30">
                  +${wall?.reward || 350} TURF REWARD
                </span>
              </div>
              <div className="text-xs text-slate-400 font-mono">
                {wall?.name} · {wall?.district} · {wall?.wallType.toUpperCase()} WALL
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleShakeCan}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-lg text-xs font-bold transition-colors cursor-pointer"
              title="Shake Spray Can for optimal pressure"
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>SHAKE CAN</span>
            </button>

            <button
              onClick={onClose}
              className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* WORKSPACE CONTENT */}
        <div className="grid grid-cols-1 lg:grid-cols-4 flex-1 overflow-y-auto">
          {/* LEFT CONTROLS: Palette & Nozzle Caps */}
          <div className="p-5 border-r border-slate-800 flex flex-col gap-5 bg-slate-950/80">
            {/* Color Palette */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2.5 flex items-center justify-between">
                <span>Spray Paint Color</span>
                <span className="font-mono text-sky-400 text-[11px]">{selectedColor}</span>
              </div>
              <div className="grid grid-cols-5 gap-2">
                {PALETTE_COLORS.map((c) => {
                  const isCurrent = selectedColor.toLowerCase() === c.hex.toLowerCase();
                  return (
                    <button
                      key={c.hex}
                      onClick={() => {
                        setSelectedColor(c.hex);
                        soundManager.playSprayBurst(100);
                      }}
                      title={c.name}
                      style={{ backgroundColor: c.hex }}
                      className={`w-9 h-9 rounded-lg border-2 transition-transform cursor-pointer relative ${
                        isCurrent
                          ? 'border-white scale-110 shadow-[0_0_12px_var(--glow)] ring-2 ring-sky-400'
                          : 'border-slate-700 hover:scale-105'
                      }`}
                    >
                      {isCurrent && (
                        <div className="absolute inset-0 flex items-center justify-center">
                          <div className="w-2 h-2 rounded-full bg-white shadow-sm" />
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Nozzle Cap Selection */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Spray Nozzle Cap
              </div>
              <div className="flex flex-col gap-1.5">
                {CAP_TYPES.map((cap) => {
                  const isCurrent = selectedCap === cap.id;
                  return (
                    <button
                      key={cap.id}
                      onClick={() => {
                        setSelectedCap(cap.id);
                        setBrushSize(cap.defaultSize);
                        soundManager.playUIClick();
                      }}
                      className={`text-left p-2.5 rounded-lg border text-xs transition-all cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-500/20 border-sky-400 text-white shadow-sm'
                          : 'bg-slate-900/60 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-200'
                      }`}
                    >
                      <div className="font-bold text-sky-300">{cap.name}</div>
                      <div className="text-[10px] text-slate-400 mt-0.5">{cap.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Spray Pressure / Size Slider */}
            <div>
              <div className="flex justify-between text-xs font-bold text-slate-300 mb-1">
                <span>Spray Radius</span>
                <span className="font-mono text-sky-400">{brushSize}px</span>
              </div>
              <input
                type="range"
                min="8"
                max="64"
                value={brushSize}
                onChange={(e) => setBrushSize(Number(e.target.value))}
                className="w-full accent-sky-400 cursor-pointer"
              />
            </div>

            {/* Organic Paint Drips Tool */}
            <button
              onClick={handleAddPaintDrips}
              className="flex items-center justify-center gap-2 py-2.5 px-3 bg-slate-900 hover:bg-slate-800 border border-slate-700 text-amber-300 rounded-lg text-xs font-bold transition-all cursor-pointer shadow"
            >
              <Droplets className="w-4 h-4 text-amber-400" />
              <span>ADD PROCEDURAL DRIPS</span>
            </button>
          </div>

          {/* CENTER: Interactive Wall Canvas */}
          <div className="lg:col-span-2 p-5 flex flex-col items-center justify-center bg-black/40">
            <div className="relative border-4 border-slate-800 rounded-xl overflow-hidden shadow-2xl bg-black w-full max-w-[680px] aspect-[3/2]">
              <canvas
                ref={canvasRef}
                width={1024}
                height={680}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="w-full h-full block cursor-crosshair touch-none"
              />

              {/* Live Spraying Visual Indicator */}
              {isSpraying && (
                <div className="absolute top-3 left-3 bg-red-950/80 border border-red-500/50 px-2.5 py-1 rounded text-[10px] font-mono text-red-400 flex items-center gap-1.5 animate-pulse">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span>SPRAYING CAN</span>
                </div>
              )}
            </div>

            <div className="flex items-center gap-3 mt-3 text-xs text-slate-400 font-mono">
              <span>Hold & drag left-click to spray paint</span>
              <span>·</span>
              <span>Multi-layer aerosol blend</span>
            </div>
          </div>

          {/* RIGHT: Stencils & Crew Stamps */}
          <div className="p-5 border-l border-slate-800 flex flex-col gap-4 bg-slate-950/80">
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-sky-400" />
                <span>Crew Stencils & Tags</span>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {PRESET_STENCILS.map((s) => (
                  <button
                    key={s.id}
                    onClick={() => handleStampStencil(s.tag)}
                    className="p-2.5 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-sky-500/50 rounded-lg text-left text-xs font-bold text-slate-200 transition-all cursor-pointer flex flex-col"
                  >
                    <span className="text-base mb-1">{s.icon}</span>
                    <span className="text-[11px] truncate">{s.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Text Stencil */}
            <div>
              <div className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <Type className="w-3.5 h-3.5 text-amber-400" />
                <span>Custom Crew Stencil</span>
              </div>
              <div className="flex gap-2">
                <input
                  type="text"
                  maxLength={12}
                  value={customText}
                  onChange={(e) => setCustomText(e.target.value.toUpperCase())}
                  placeholder="YOUR TAG"
                  className="flex-1 bg-slate-900 border border-slate-700 px-2.5 py-1.5 rounded-lg text-xs font-mono font-bold text-white uppercase focus:outline-none focus:border-sky-400"
                />
                <button
                  onClick={() => customText && handleStampStencil(customText)}
                  className="px-3 py-1.5 bg-amber-500 hover:bg-amber-400 text-black font-extrabold rounded-lg text-xs transition-colors cursor-pointer"
                >
                  STAMP
                </button>
              </div>
            </div>

            {/* Canvas Actions */}
            <div className="flex gap-2 mt-auto pt-4 border-t border-slate-800">
              <button
                onClick={handleUndo}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-slate-300 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <Undo className="w-3.5 h-3.5" />
                <span>Undo</span>
              </button>
              <button
                onClick={handleClear}
                className="flex-1 flex items-center justify-center gap-1.5 py-2 bg-slate-900 hover:bg-slate-800 border border-slate-800 text-rose-400 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>Clear Wall</span>
              </button>
            </div>
          </div>
        </div>

        {/* FOOTER ACTIONS */}
        <div className="flex items-center justify-between px-6 py-4 border-t border-slate-800 bg-slate-900/60">
          <button
            onClick={onClose}
            className="px-4 py-2 text-slate-400 hover:text-white text-xs font-bold transition-colors cursor-pointer"
          >
            CANCEL / WALK AWAY
          </button>

          <button
            onClick={handleConfirmSpray}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white rounded-xl font-black text-sm tracking-wider shadow-lg shadow-sky-500/25 transition-all cursor-pointer transform hover:scale-[1.02]"
          >
            <Check className="w-4 h-4" />
            <span>SPRAY TAG ON ALLEY WALL</span>
          </button>
        </div>
      </div>
    </div>
  );
};
