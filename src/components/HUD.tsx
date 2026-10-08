import React from 'react';
import { Shield, DollarSign, Crosshair, Heart, Navigation, Gauge, CloudSun, CloudRain, ShoppingBag } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { MiniMap } from './MiniMap';
import { RadioPlayer } from './RadioPlayer';

interface HUDProps {
  engine: GameEngine | null;
  onOpenMap: () => void;
  onOpenPause: () => void;
  onOpenShop: () => void;
}

export const HUD: React.FC<HUDProps> = ({ engine, onOpenMap, onOpenPause, onOpenShop }) => {
  if (!engine) return null;

  const playerHealth = engine.playerHealth;
  const playerMoney = engine.playerMoney;
  const wantedLevel = engine.wantedLevel;

  // WeaponInventory & CombatController states
  const activeWeapon = engine.weaponInventory.getActiveWeapon();
  const isWeaponEquipped = engine.weaponInventory.isWeaponEquipped();
  const isAiming = engine.combatController.isAiming;
  const isReloading = engine.combatController.isReloading;
  const playerVehicle = engine.vehicleManager.playerVehicle;

  // Mission info
  const activeMission = engine.missionManager.activeMission;
  const currentStep = engine.missionManager.getCurrentStep();

  // Interaction check
  let interactionPrompt: string | null = null;
  if (playerVehicle) {
    interactionPrompt = 'Press [E] to Exit Vehicle';
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
          </div>
        </div>

        {/* Center: Active Mission Objective */}
        {activeMission && currentStep ? (
          <div className="bg-slate-950/85 backdrop-blur-md border border-amber-500/40 rounded-lg px-4 py-2.5 max-w-md shadow-xl text-center">
            <div className="text-[10px] font-bold text-amber-400 uppercase tracking-widest flex items-center justify-center gap-1">
              <span>MISSION: {activeMission.title}</span>
              <span>·</span>
              <span>REWARD ${activeMission.reward}</span>
            </div>
            <div className="text-sm font-semibold text-white mt-0.5">
              {currentStep.step.description}
            </div>
          </div>
        ) : (
          <div className="bg-slate-950/60 backdrop-blur-sm border border-slate-800/80 rounded-lg px-3 py-1.5 text-xs text-slate-300 flex items-center gap-2">
            <Navigation className="w-3.5 h-3.5 text-sky-400" />
            <span>FREE ROAM · EXPLORE AGAT CITY</span>
          </div>
        )}

        {/* Right Header: Wanted Level & Health */}
        <div className="flex flex-col items-end gap-2">
          {/* Wanted Level Shields */}
          <div className="flex items-center gap-1 bg-slate-950/80 px-2.5 py-1 rounded-md border border-slate-800">
            <span className="text-[10px] font-bold text-slate-400 mr-1 uppercase tracking-wider">WANTED</span>
            {[1, 2, 3].map((level) => {
              const active = wantedLevel >= level;
              return (
                <Shield
                  key={level}
                  className={`w-4 h-4 transition-all ${
                    active
                      ? 'text-rose-500 fill-rose-500 animate-pulse'
                      : 'text-slate-700'
                  }`}
                />
              );
            })}
          </div>

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

      {/* CENTER INTERACTION PROMPT */}
      <div className="flex flex-col items-center justify-center my-auto">
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
          {playerVehicle && (
            <RadioPlayer
              currentStation={soundManager.getRadioStation()}
              onStationChange={(s) => soundManager.setRadioStation(s)}
            />
          )}

          <div className="flex items-center gap-2">
            <MiniMap engine={engine} onOpenFullMap={onOpenMap} />
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
