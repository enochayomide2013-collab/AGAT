import React, { useState } from 'react';
import { Play, RotateCcw, Compass, Settings, Keyboard, ShieldAlert, CheckCircle2, Volume2, CloudRain, Sun, Monitor, Scissors, Radio } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { WeatherType } from '../types/game';

interface MainMenuProps {
  onStartGame: () => void;
  hasSavedGame: boolean;
  engine: GameEngine | null;
  onOpenCustomization?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({ onStartGame, hasSavedGame, engine, onOpenCustomization }) => {
  const [tab, setTab] = useState<'main' | 'controls' | 'settings' | 'missions'>('main');
  const [volume, setVolume] = useState(80);
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>('clear');

  const handlePlay = () => {
    soundManager.init();
    soundManager.resume();
    onStartGame();
  };

  const handleNewGame = () => {
    localStorage.removeItem('agat_save_data');
    if (engine) {
      engine.playerPos.set(-120, 0, 18);
      engine.playerHealth = 100;
      engine.playerMoney = 500;
      engine.wantedLevel = 0;
      engine.weaponInventory.equippedIndex = 0;
      engine.weaponInventory.isHolstered = false;
      engine.missionManager.activeMission = null;
      engine.missionManager.completedMissionIds.clear();
      engine.missionManager.missions.forEach((m) => (m.status = 'available'));
    }
    handlePlay();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-6 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-4xl w-full bg-slate-900/80 border border-slate-800 rounded-2xl p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row gap-8">
        {/* Left Side: Game Branding & Logo */}
        <div className="md:w-5/12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8">
          <div>
            <div className="inline-block px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400 font-mono text-xs font-semibold tracking-widest uppercase mb-3">
              Open-World 4D Action
            </div>

            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-sky-400 tracking-wider">
              AGAT
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-medium">
              A seamless living metropolis. Explore AGAT City on foot or by vehicle, undertake high-stakes contracts, and navigate dynamic urban life.
            </p>
          </div>

          <div className="mt-8 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400" />
              <span>Real-time Dynamic Weather & Lighting</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400" />
              <span>Drivable Vehicles & AI Road Traffic</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400" />
              <span>Fictional Weaponry & Wanted Response</span>
            </div>
          </div>

          <div className="mt-6 pt-4 border-t border-slate-800/80 text-[11px] text-slate-400 font-mono">
            AGAT ENGINE v2.4 · 100% ORIGINAL ART DIRECTION
          </div>
        </div>

        {/* Right Side: Navigation Tabs & Actions */}
        <div className="md:w-7/12 flex flex-col justify-between">
          {/* Main Action Menu */}
          {tab === 'main' && (
            <div className="flex flex-col justify-center h-full space-y-3.5 my-auto">
              <button
                onClick={handlePlay}
                className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg transition-all flex items-center justify-between group cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <Play className="w-6 h-6 fill-white" />
                  <span>{hasSavedGame ? 'CONTINUE EXPEDITION' : 'ENTER AGAT CITY'}</span>
                </div>
                <span className="text-xs font-mono opacity-80 group-hover:translate-x-1 transition-transform">
                  LAUNCH →
                </span>
              </button>

              {hasSavedGame && (
                <button
                  onClick={handleNewGame}
                  className="w-full py-3 px-5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-sky-400" />
                  <span>START NEW GAME</span>
                </button>
              )}

              {onOpenCustomization && (
                <button
                  onClick={onOpenCustomization}
                  className="w-full py-3 px-5 bg-slate-800/80 hover:bg-slate-800 text-sky-300 border border-sky-500/30 hover:border-sky-400 font-semibold text-sm rounded-xl transition-colors flex items-center justify-between cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <Scissors className="w-4 h-4 text-sky-400" />
                    <span>CHARACTER CREATOR / STYLIST</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400/80 group-hover:translate-x-0.5 transition-transform">
                    CUSTOMIZE →
                  </span>
                </button>
              )}

              <button
                onClick={() => setTab('missions')}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>MISSION DIRECTORY</span>
              </button>

              <button
                onClick={() => setTab('controls')}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Keyboard className="w-4 h-4 text-sky-400" />
                <span>CONTROLS & KEYMAP</span>
              </button>

              <button
                onClick={() => setTab('settings')}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span>ENVIRONMENT & AUDIO SETTINGS</span>
              </button>
            </div>
          )}

          {/* Controls Screen */}
          {tab === 'controls' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Keymap & Control Scheme</h3>
                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">WASD / ARROWS</span>
                  <span className="text-white">Move / Drive</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">SHIFT</span>
                  <span className="text-white">Sprint</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">SPACE</span>
                  <span className="text-white">Jump / Handbrake</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">C</span>
                  <span className="text-white">Crouch</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">E</span>
                  <span className="text-white">Interact / Enter Car</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">RMB (HOLD)</span>
                  <span className="text-white">Aim Weapon</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">LMB</span>
                  <span className="text-white">Fire Projectile</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">R</span>
                  <span className="text-white">Reload Clip</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">1 - 4</span>
                  <span className="text-white">Switch Weapon</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">M</span>
                  <span className="text-white">Full City Map</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">H</span>
                  <span className="text-white">Vehicle Horn</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">ESC</span>
                  <span className="text-white">Pause Menu</span>
                </div>
              </div>
            </div>
          )}

          {/* Missions Screen */}
          {tab === 'missions' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Contracts & Missions</h3>
                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              <div className="space-y-2.5 max-h-72 overflow-y-auto pr-1">
                {engine?.missionManager.missions.map((m) => (
                  <div
                    key={m.id}
                    className="p-3 bg-slate-950/60 border border-slate-800 rounded-lg flex items-center justify-between"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs text-white">{m.title}</span>
                        <span className="text-[10px] text-amber-400 font-mono font-semibold">
                          ${m.reward}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 mt-0.5">{m.briefing}</p>
                    </div>
                    {engine.missionManager.completedMissionIds.has(m.id) ? (
                      <span className="text-[10px] font-mono text-emerald-400 flex items-center gap-1 font-bold">
                        <CheckCircle2 className="w-3.5 h-3.5" /> DONE
                      </span>
                    ) : (
                      <span className="text-[10px] font-mono text-slate-500">AVAILABLE</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Settings Screen */}
          {tab === 'settings' && (
            <div className="space-y-5">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Settings & Simulation</h3>
                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              {/* Master Volume */}
              <div>
                <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                  <span className="flex items-center gap-1.5">
                    <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Master Audio
                  </span>
                  <span className="font-mono text-sky-400">{volume}%</span>
                </label>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={volume}
                  onChange={(e) => {
                    const val = Number(e.target.value);
                    setVolume(val);
                    soundManager.setVolume(val / 100);
                  }}
                  className="w-full accent-sky-500 cursor-pointer"
                />
              </div>

              {/* Weather preset */}
              <div>
                <label className="text-xs font-semibold text-slate-300 mb-2 block">
                  Simulated Weather
                </label>
                <div className="grid grid-cols-4 gap-2">
                  {(['clear', 'cloudy', 'rain', 'storm'] as WeatherType[]).map((w) => (
                    <button
                      key={w}
                      onClick={() => {
                        setSelectedWeather(w);
                        if (engine) engine.setWeather(w);
                      }}
                      className={`py-2 text-xs font-medium rounded-lg uppercase cursor-pointer border ${
                        selectedWeather === w
                          ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                          : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {w}
                    </button>
                  ))}
                </div>
              </div>

              {/* Time of Day */}
              {engine && (
                <div>
                  <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-2">
                    <span>Time of Day</span>
                    <span className="font-mono text-amber-400">
                      {Math.floor(engine.timeOfDay)}:00
                    </span>
                  </label>
                  <input
                    type="range"
                    min="0"
                    max="24"
                    step="0.5"
                    value={engine.timeOfDay}
                    onChange={(e) => {
                      engine.timeOfDay = Number(e.target.value);
                    }}
                    className="w-full accent-amber-500 cursor-pointer"
                  />
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
