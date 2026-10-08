import React, { useEffect, useRef, useState } from 'react';
import { Shield, DollarSign, Crosshair, Heart, Navigation, Gauge, CloudSun, CloudRain, ShoppingBag, Timer, Star, Siren, Building2, Sparkles, SprayCan, CheckCircle2, AlertTriangle, Info } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { Minimap } from './Minimap';
import { RadioPlayer } from './RadioPlayer';

interface HUDProps {
  engine: GameEngine | null;
  onOpenMap: () => void;
  onOpenPause: () => void;
  onOpenShop: () => void;
}

export const HUD: React.FC<HUDProps> = ({ engine, onOpenMap, onOpenPause, onOpenShop }) => {
  if (!engine) return null;

  const [notification, setNotification] = useState<{
    id: number;
    title: string;
    subtitle: string;
    type: 'success' | 'warning' | 'info';
  } | null>(null);

  useEffect(() => {
    if (!engine) return;
    engine.onNotification = (title, subtitle, type) => {
      setNotification({
        id: Date.now(),
        title,
        subtitle,
        type,
      });
      setTimeout(() => {
        setNotification((prev) => (prev?.title === title ? null : prev));
      }, 3500);
    };
  }, [engine]);

  const playerHealth = engine.playerHealth;
  const playerMoney = engine.playerMoney;
  const wantedLevel = engine.wantedLevelSystem.getStars();
  const wantedStatus = engine.wantedLevelSystem.getStatus();
  const wantedHeat = engine.wantedLevelSystem.getHeatPercent();
  const evasionSeconds = Math.ceil(engine.wantedLevelSystem.evasionTimer);

  // Play sound when wanted level increases
  const prevWantedRef = useRef<number>(wantedLevel);
  useEffect(() => {
    if (wantedLevel > prevWantedRef.current && wantedLevel > 0) {
      soundManager.playHorn(); // sudden alert tone
    }
    prevWantedRef.current = wantedLevel;
  }, [wantedLevel]);

  // WeaponInventory & CombatController states
  const activeWeapon = engine.weaponInventory.getActiveWeapon();
  const isWeaponEquipped = engine.weaponInventory.isWeaponEquipped();
  const isAiming = engine.combatController.isAiming;
  const isReloading = engine.combatController.isReloading;
  const playerVehicle = engine.vehicleManager.playerVehicle;

  // Mission info
  const activeMission = engine.missionManager.activeMission;
  const currentStep = engine.missionManager.getCurrentStep();

  // Interior info
  const currentInterior = engine.interiorManager.currentInterior;
  const activeInteractable = engine.interiorManager.activeInteractable;
  const nearEntrance = engine.interiorManager.nearExteriorEntrance;

  // Street Art Tagging info
  const nearTagWall = engine.streetArtManager.activeNearWall;
  const isSprayingAnimation = engine.streetArtManager.isAnimatingSpray;
  const taggedCount = engine.streetArtManager.getTaggedCount();
  const totalWallsCount = engine.streetArtManager.getTotalWallsCount();

  // Interaction check
  let interactionPrompt: string | null = null;
  if (isSprayingAnimation) {
    interactionPrompt = null;
  } else if (playerVehicle) {
    interactionPrompt = 'Press [E] to Exit Vehicle';
  } else if (currentInterior && activeInteractable) {
    interactionPrompt = `Press [E] to ${activeInteractable.actionText}`;
  } else if (!currentInterior && nearTagWall) {
    interactionPrompt = `Press [E] to Spray Tag Wall: ${nearTagWall.name} (+$${nearTagWall.reward})`;
  } else if (!currentInterior && nearEntrance) {
    interactionPrompt = `Press [E] to Enter ${nearEntrance.name}`;
  } else {
    // Check nearest weapon pickup in world first
    const nearPickup = engine.worldBuilder.getNearestPickup(engine.playerPos, 3.2);
    if (nearPickup) {
      interactionPrompt = `Press [E] to Pick Up: ${nearPickup.weapon.name}`;
    } else {
      const nearV = engine.vehicleManager.getNearestVehicle(engine.playerPos, 3.8);
      if (nearV) {
        interactionPrompt = `Press [E] to Enter ${nearV.def.name}`;
      } else {
        // Near mission start?
        for (const m of engine.missionManager.missions) {
          if (m.status === 'available') {
            const step1 = m.steps[0];
            if (step1 && step1.targetPos) {
              const dist = Math.hypot(engine.playerPos.x - step1.targetPos.x, engine.playerPos.z - step1.targetPos.z);
              if (dist < 10) {
                interactionPrompt = `Press [E] to Start Mission: ${m.title}`;
                break;
              }
            }
          }
        }
      }
    }
  }

  // Format time of day
  const hours = Math.floor(engine.timeOfDay);
  const minutes = Math.floor((engine.timeOfDay - hours) * 60);
  const timeStr = `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;

  return (
    <div className="absolute inset-0 pointer-events-none select-none overflow-hidden flex flex-col justify-between p-5">
      {/* Dynamic Reticle / Crosshair */}
      {!playerVehicle && isWeaponEquipped && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          {isAiming ? (
            /* Precise Aiming Crosshair */
            <div className="relative flex items-center justify-center animate-in fade-in duration-150">
              {/* Outer ring */}
              <div className="w-9 h-9 rounded-full border border-sky-400/90 flex items-center justify-center shadow-[0_0_12px_rgba(56,189,248,0.4)]">
                {/* Center pip */}
                <div className="w-1.5 h-1.5 rounded-full bg-sky-300 shadow-[0_0_6px_#38bdf8]" />
              </div>

              {/* Crosshair ticks */}
              <div className="absolute top-1/2 left-[-12px] w-3 h-[1.5px] bg-sky-400 -translate-y-1/2" />
              <div className="absolute top-1/2 right-[-12px] w-3 h-[1.5px] bg-sky-400 -translate-y-1/2" />
              <div className="absolute left-1/2 top-[-12px] h-3 w-[1.5px] bg-sky-400 -translate-x-1/2" />
              <div className="absolute left-1/2 bottom-[-12px] h-3 w-[1.5px] bg-sky-400 -translate-x-1/2" />
            </div>
          ) : (
            /* Hip-fire / Ready Crosshair (when weapon is equipped) */
            <div className="relative flex items-center justify-center">
              <div className="w-2 h-2 rounded-full bg-sky-400 shadow-[0_0_4px_#38bdf8]" />
              <div className="absolute top-1/2 left-[-8px] w-2 h-[1px] bg-white/70 -translate-y-1/2" />
              <div className="absolute top-1/2 right-[-8px] w-2 h-[1px] bg-white/70 -translate-y-1/2" />
              <div className="absolute left-1/2 top-[-8px] h-2 w-[1px] bg-white/70 -translate-x-1/2" />
              <div className="absolute left-1/2 bottom-[-8px] h-2 w-[1px] bg-white/70 -translate-x-1/2" />
            </div>
          )}
        </div>
      )}

      {/* TOP BAR */}
      <div className="flex items-start justify-between w-full">
        {/* Left Header: AGAT Brand, Cash & Shop Shortcut */}
        <div className="flex flex-col gap-2 pointer-events-auto">
          <div className="flex items-center gap-3">
            <div className="px-3 py-1 bg-gradient-to-r from-sky-600 to-blue-700 text-white font-black tracking-widest text-lg rounded shadow-lg border border-sky-400/30">
              AGAT
            </div>
            <div className="text-xs font-semibold tracking-wider text-slate-300 drop-shadow">
              AGAT CITY
            </div>
            <div className="text-xs font-mono text-sky-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800 flex items-center gap-1">
              {engine.weather === 'clear' ? <CloudSun className="w-3.5 h-3.5 text-amber-400" /> : <CloudRain className="w-3.5 h-3.5 text-blue-400" />}
              <span>{timeStr}</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Cash balance */}
            <div className="flex items-center gap-1.5 text-emerald-400 font-bold text-xl font-mono drop-shadow bg-slate-950/80 px-3 py-1 rounded-md border border-emerald-500/30 w-fit">
              <DollarSign className="w-5 h-5 text-emerald-400" />
              <span>{playerMoney.toLocaleString()}</span>
            </div>

            {/* Shop button */}
            <button
              onClick={onOpenShop}
              className="flex items-center gap-1.5 bg-slate-950/80 hover:bg-slate-900 border border-slate-800 hover:border-sky-500/40 text-sky-400 px-3 py-1.5 rounded-md text-xs font-bold transition-all shadow cursor-pointer"
            >
              <ShoppingBag className="w-4 h-4 text-sky-400" />
              <span>[B] MARKET</span>
            </button>

            {/* Street Art Tags Claimed Counter */}
            <div className="flex items-center gap-1.5 bg-slate-950/80 border border-slate-800 text-amber-300 px-2.5 py-1.5 rounded-md text-xs font-mono font-bold shadow">
              <SprayCan className="w-3.5 h-3.5 text-amber-400" />
              <span>TAGS {taggedCount}/{totalWallsCount}</span>
            </div>
          </div>
        </div>

        {/* Center: Active Mission Objective OR Interior Location */}
        {currentInterior ? (
          <div className="bg-slate-950/90 backdrop-blur-md border border-sky-400/50 px-4 py-2 rounded-xl shadow-2xl flex items-center gap-2.5 animate-in fade-in duration-200">
            <Building2 className="w-4 h-4 text-sky-400" />
            <div>
              <div className="text-xs font-bold text-white tracking-wide">{currentInterior.name}</div>
              <div className="text-[10px] font-mono text-sky-400">{currentInterior.district} · INDOORS</div>
            </div>
          </div>
        ) : activeMission && currentStep ? (
          <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-lg px-4 py-2.5 max-w-md shadow-xl text-center">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1.5 flex-wrap">
              {activeMission.type && (
                <span className="bg-amber-500/20 text-amber-300 border border-amber-500/40 px-1.5 py-0.2 rounded text-[9px] font-mono">
                  {activeMission.type.toUpperCase()}
                </span>
              )}
              <span>MISSION: {activeMission.title}</span>
              <span>·</span>
              <span>REWARD ${activeMission.reward}</span>

              {/* Countdown timer for timed missions (Deliveries, Races, etc.) */}
              {activeMission.timeRemaining !== undefined && (
                <div
                  className={`flex items-center gap-1 px-2 py-0.5 rounded font-mono font-bold text-xs ml-1 ${
                    activeMission.timeRemaining < 20
                      ? 'bg-rose-500/30 text-rose-300 border border-rose-500/60 animate-pulse'
                      : 'bg-amber-500/30 text-amber-300 border border-amber-500/60'
                  }`}
                >
                  <Timer className="w-3 h-3" />
                  <span>
                    {Math.floor(activeMission.timeRemaining / 60)}:
                    {String(Math.floor(activeMission.timeRemaining % 60)).padStart(2, '0')}
                  </span>
                </div>
              )}
            </div>
            <div className="text-sm font-semibold text-white mt-1">
              {currentStep.step.description}
            </div>
            {activeMission.elapsedTime !== undefined && activeMission.timeRemaining === undefined && (
              <div className="text-[10px] font-mono text-slate-400 mt-0.5 flex items-center justify-center gap-1">
                <Timer className="w-2.5 h-2.5 text-slate-400" />
                <span>Time: {Math.floor(activeMission.elapsedTime)}s</span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>FREE ROAM · EXPLORE AGAT CITY</span>
          </div>
        )}

        {/* Right Header: Dynamic 1-5 Stars Wanted Level & Health */}
        <div className="flex flex-col items-end gap-2">
          {/* Dynamic Wanted Level 1-5 Stars UI */}
          {wantedLevel > 0 ? (
            <div className="flex flex-col items-end gap-1 animate-in fade-in zoom-in-95 duration-200">
              <div
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg border backdrop-blur-md shadow-xl transition-all duration-300 ${
                  wantedStatus === 'pursuit'
                    ? 'bg-red-950/90 border-red-500/80 shadow-red-500/20 animate-pulse'
                    : 'bg-amber-950/85 border-amber-500/70 shadow-amber-500/20'
                }`}
              >
                {/* Status Indicator Icon */}
                {wantedStatus === 'pursuit' ? (
                  <Siren className="w-4 h-4 text-red-400 animate-spin-slow shrink-0" />
                ) : (
                  <Shield className="w-4 h-4 text-amber-400 shrink-0" />
                )}

                <span
                  className={`text-[10px] font-mono font-extrabold tracking-wider uppercase ${
                    wantedStatus === 'pursuit' ? 'text-red-400' : 'text-amber-400'
                  }`}
                >
                  {wantedStatus === 'pursuit' ? 'PURSUIT' : `EVADING ${evasionSeconds}s`}
                </span>

                {/* 1-5 Animated Stars */}
                <div className="flex items-center gap-1 ml-1">
                  {[1, 2, 3, 4, 5].map((starIdx) => {
                    const isActive = wantedLevel >= starIdx;
                    return (
                      <div
                        key={starIdx}
                        className={`transition-all duration-300 transform ${
                          isActive
                            ? 'scale-110 opacity-100 rotate-0'
                            : 'scale-75 opacity-20 -rotate-12'
                        }`}
                      >
                        <Star
                          className={`w-4 h-4 transition-colors ${
                            isActive
                              ? wantedStatus === 'pursuit'
                                ? 'text-red-400 fill-red-400 drop-shadow-[0_0_6px_rgba(248,113,113,0.8)]'
                                : 'text-amber-300 fill-amber-300 drop-shadow-[0_0_6px_rgba(252,211,77,0.8)] animate-pulse'
                              : 'text-slate-600'
                          }`}
                        />
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Threat Tier Label */}
              <div className="text-[9px] font-mono font-bold tracking-widest text-slate-400 bg-slate-950/80 px-2 py-0.5 rounded border border-slate-800">
                {wantedLevel === 1 && 'THREAT TIER 1 · LOCAL PATROL DISPATCH'}
                {wantedLevel === 2 && 'THREAT TIER 2 · SQUAD INTERCEPT PURSUIT'}
                {wantedLevel === 3 && 'THREAT TIER 3 · TACTICAL ARMED PURSUIT'}
                {wantedLevel === 4 && 'THREAT TIER 4 · SWAT HEAVY DEPLOYMENT'}
                {wantedLevel === 5 && 'THREAT TIER 5 · MAXIMUM CITYWIDE LOCKDOWN'}
              </div>
            </div>
          ) : (
            /* Idle Clean State when wanted is 0 */
            <div className="flex items-center gap-1.5 bg-slate-950/70 px-2.5 py-1 rounded-md border border-slate-800/80 text-[10px] font-mono text-slate-500">
              <Shield className="w-3.5 h-3.5 text-slate-600" />
              <span>RECORD CLEAN · 0 STARS</span>
            </div>
          )}

          {/* Health Bar */}
          <div className="bg-slate-950/80 border border-slate-800 p-2 rounded-lg flex items-center gap-2.5 min-w-[190px]">
            <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
            <div className="flex-1">
              <div className="flex justify-between text-[11px] font-mono text-slate-300 mb-1">
                <span>HEALTH</span>
                <span className="font-bold">{Math.round(playerHealth)}%</span>
              </div>
              <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                <div
                  className={`h-full transition-all duration-200 ${
                    playerHealth > 50
                      ? 'bg-emerald-500'
                      : playerHealth > 25
                      ? 'bg-amber-500'
                      : 'bg-rose-500 animate-pulse'
                  }`}
                  style={{ width: `${Math.max(0, Math.min(100, playerHealth))}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FLOATING ACTION NOTIFICATION TOAST */}
      {notification && (
        <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 pointer-events-none animate-in fade-in slide-in-from-top-4 duration-300">
          <div
            className={`flex items-center gap-3 px-5 py-3 rounded-xl border backdrop-blur-md shadow-2xl ${
              notification.type === 'success'
                ? 'bg-emerald-950/90 border-emerald-500/70 shadow-emerald-500/20 text-emerald-300'
                : notification.type === 'warning'
                ? 'bg-amber-950/90 border-amber-500/70 shadow-amber-500/20 text-amber-300'
                : 'bg-sky-950/90 border-sky-500/70 shadow-sky-500/20 text-sky-300'
            }`}
          >
            {notification.type === 'success' && <CheckCircle2 className="w-6 h-6 text-emerald-400 shrink-0 animate-bounce" />}
            {notification.type === 'warning' && <AlertTriangle className="w-6 h-6 text-amber-400 shrink-0 animate-pulse" />}
            {notification.type === 'info' && <Sparkles className="w-6 h-6 text-sky-400 shrink-0" />}

            <div>
              <div className="text-xs font-black tracking-widest uppercase text-white font-mono">
                {notification.title}
              </div>
              <div className="text-[11px] font-sans font-medium opacity-90">
                {notification.subtitle}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* CENTER INTERACTION PROMPT */}
      <div className="flex flex-col items-center justify-center my-auto">
        {isSprayingAnimation && (
          <div className="bg-slate-950/95 border-2 border-sky-400 px-6 py-4 rounded-xl shadow-[0_0_40px_rgba(0,240,255,0.4)] backdrop-blur-md flex items-center gap-3.5 animate-pulse">
            <SprayCan className="w-7 h-7 text-sky-400 animate-bounce shrink-0" />
            <div>
              <div className="text-sm font-black text-white tracking-widest uppercase">
                SPRAYING ALLEY STREET ART...
              </div>
              <div className="text-[11px] font-mono text-sky-300">
                AEROSOL CAN IN ACTION · COATING WALL SURFACE
              </div>
            </div>
          </div>
        )}

        {interactionPrompt && (
          <div className="bg-slate-950/90 border border-sky-400/60 px-5 py-2.5 rounded-lg shadow-2xl backdrop-blur-md animate-bounce text-sm font-semibold text-white tracking-wide">
            {interactionPrompt}
          </div>
        )}

        {isReloading && (
          <div className="mt-2 text-xs font-mono font-bold tracking-widest text-amber-400 bg-slate-950/80 px-3 py-1 rounded border border-amber-500/40">
            RELOADING...
          </div>
        )}
      </div>

      {/* BOTTOM BAR */}
      <div className="flex items-end justify-between w-full">
        {/* Bottom-Left: MiniMap & Radio */}
        <div className="flex flex-col gap-3 pointer-events-auto">
          {playerVehicle && <RadioPlayer />}

          <div className="flex items-center gap-2">
            <Minimap engine={engine} onOpenFullMap={onOpenMap} />
          </div>
        </div>

        {/* Center Quick Controls Bar */}
        <div className="hidden lg:flex items-center gap-2 text-[11px] font-mono text-slate-400 bg-slate-950/70 border border-slate-800 px-4 py-1.5 rounded-full mb-1">
          <span>[WASD] Move</span>
          <span>·</span>
          <span>[SHIFT] Sprint</span>
          <span>·</span>
          <span>[SPACE] Jump</span>
          <span>·</span>
          <span>[E] Interact</span>
          <span>·</span>
          <span>[RMB] Aim</span>
          <span>·</span>
          <span>[LMB] Fire</span>
          <span>·</span>
          <span>[R] Reload</span>
          <span>·</span>
          <span>[B] Market</span>
          <span>·</span>
          <span>[M] Map</span>
        </div>

        {/* Bottom-Right: Vehicle Telemetry OR Active Weapon HUD */}
        <div className="flex flex-col items-end gap-3 pointer-events-auto">
          {playerVehicle ? (
            /* Vehicle HUD */
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3.5 rounded-xl shadow-2xl min-w-[220px]">
              <div className="flex items-center justify-between text-xs font-bold text-sky-400 mb-1">
                <span>{playerVehicle.def.name.toUpperCase()}</span>
                <span className="text-[10px] text-slate-400 uppercase">{playerVehicle.def.category}</span>
              </div>

              <div className="flex items-baseline gap-2 font-mono my-1">
                <span className="text-3xl font-extrabold text-white">
                  {Math.round(Math.abs(playerVehicle.speed) * 3.6)}
                </span>
                <span className="text-xs text-slate-400 font-sans">KM/H</span>
              </div>

              {/* Vehicle Health */}
              <div className="mt-2">
                <div className="flex justify-between text-[10px] font-mono text-slate-400 mb-0.5">
                  <span>DURABILITY</span>
                  <span>{Math.round(playerVehicle.health)}%</span>
                </div>
                <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-sky-400 transition-all"
                    style={{ width: `${Math.max(0, Math.min(100, playerVehicle.health))}%` }}
                  />
                </div>
              </div>

              <div className="mt-2 text-[10px] text-slate-400 flex justify-between">
                <span>[H] Horn</span>
                <span>[SPACE] Handbrake</span>
              </div>
            </div>
          ) : (
            /* Active Weapon & Ammunition HUD */
            <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 p-3.5 rounded-xl shadow-2xl min-w-[230px]">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1">
                <div className="flex items-center gap-1.5">
                  <Crosshair className="w-3.5 h-3.5 text-sky-400" />
                  <span className="font-bold">
                    {activeWeapon ? activeWeapon.name : 'HOLSTERED / UNARMED'}
                  </span>
                </div>
                {activeWeapon && (
                  <span className="text-[10px] font-mono text-emerald-400">
                    {activeWeapon.condition || 100}% COND
                  </span>
                )}
              </div>

              {/* Ammo Counts */}
              {activeWeapon ? (
                <div className="flex items-baseline gap-2 font-mono mt-1">
                  <span
                    className={`text-3xl font-black ${
                      activeWeapon.currentAmmo === 0 ? 'text-rose-500 animate-pulse' : 'text-white'
                    }`}
                  >
                    {activeWeapon.currentAmmo}
                  </span>
                  <span className="text-slate-500 font-normal text-lg">/</span>
                  <span className="text-sm font-semibold text-slate-400">{activeWeapon.reserveAmmo}</span>
                  <span className="text-[10px] text-sky-400 uppercase ml-auto font-sans font-bold">
                    {isAiming ? 'AIMING' : 'READY'}
                  </span>
                </div>
              ) : (
                <div className="font-mono text-xs text-slate-400 py-1">
                  Press [1-5] or click below to draw weapon
                </div>
              )}

              {/* Weapon Slot Selector Buttons (up to 5 slots) */}
              <div className="grid grid-cols-5 gap-1 mt-2.5 pt-2 border-t border-slate-800/80">
                {engine.weaponInventory.weapons.map((w, idx) => {
                  const isCurrent = engine.weaponInventory.equippedIndex === idx && !engine.weaponInventory.isHolstered;
                  return (
                    <button
                      key={w.id}
                      onClick={() => engine.weaponInventory.equip(idx)}
                      title={`${w.name} (${w.currentAmmo}/${w.reserveAmmo})`}
                      className={`py-1 text-[10px] font-mono font-semibold rounded text-center transition-colors cursor-pointer ${
                        isCurrent
                          ? 'bg-sky-500 text-white shadow-sm'
                          : 'bg-slate-900 text-slate-400 hover:text-white hover:bg-slate-800'
                      }`}
                    >
                      {idx + 1}
                    </button>
                  );
                })}
              </div>

              {/* Holster Toggle */}
              <button
                onClick={() => engine.weaponInventory.toggleHolster()}
                className="w-full mt-2 text-[10px] text-center font-mono text-slate-400 hover:text-sky-300 transition-colors cursor-pointer"
              >
                [X] {engine.weaponInventory.isHolstered ? 'DRAW WEAPON' : 'HOLSTER WEAPON'}
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
