import React, { useState } from 'react';
import { Play, Save, RotateCcw, Map, Settings, Volume2, CloudRain, Sun, Home, Check } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { WeatherType } from '../types/game';

interface PauseMenuProps {
  engine: GameEngine | null;
  onResume: () => void;
  onOpenMap: () => void;
  onReturnMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({ engine, onResume, onOpenMap, onReturnMainMenu }) => {
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState(false);
  const [volume, setVolume] = useState(80);

  const handleSave = () => {
    if (engine) {
      const ok = engine.saveGame();
      if (ok) {
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2200);
      }
    }
  };

  const handleLoad = () => {
    if (engine) {
      const ok = engine.loadSavedGame();
      if (ok) {
        setLoadSuccess(true);
        setTimeout(() => setLoadSuccess(false), 2200);
      }
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-6 select-none">
      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="text-center pb-4 border-b border-slate-800">
          <div className="text-sky-400 font-mono text-xs font-bold tracking-widest uppercase mb-1">
            GAME PAUSED
          </div>
          <h2 className="text-3xl font-black text-white tracking-wider">AGAT</h2>
          <p className="text-xs text-slate-400 mt-1">AGAT City Metropolitan Simulation</p>
        </div>

        {/* Buttons */}
        <div className="space-y-2.5">
          <button
            onClick={onResume}
            className="w-full py-3 px-4 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
          >
            <Play className="w-4 h-4 fill-white" />
            <span>RESUME PLAY</span>
          </button>

          <button
            onClick={onOpenMap}
            className="w-full py-2.5 px-4 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Map className="w-4 h-4 text-sky-400" />
            <span>OPEN AGAT CITY MAP (M)</span>
          </button>

          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={handleSave}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {saveSuccess ? <Check className="w-4 h-4 text-emerald-400" /> : <Save className="w-4 h-4 text-emerald-400" />}
              <span>{saveSuccess ? 'GAME SAVED' : 'SAVE GAME'}</span>
            </button>

            <button
              onClick={handleLoad}
              className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
            >
              {loadSuccess ? <Check className="w-4 h-4 text-sky-400" /> : <RotateCcw className="w-4 h-4 text-sky-400" />}
              <span>{loadSuccess ? 'LOADED' : 'LOAD GAME'}</span>
            </button>
          </div>
        </div>

        {/* Quick Weather & Time Sliders */}
        {engine && (
          <div className="p-3 bg-slate-950/60 border border-slate-800/80 rounded-xl space-y-3">
            <div className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              Environment Override
            </div>

            <div className="grid grid-cols-4 gap-1.5">
              {(['clear', 'cloudy', 'rain', 'storm'] as WeatherType[]).map((w) => (
                <button
                  key={w}
                  onClick={() => engine.setWeather(w)}
                  className={`py-1.5 text-[10px] font-medium rounded uppercase cursor-pointer border ${
                    engine.weather === w
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  {w}
                </button>
              ))}
            </div>

            <div>
              <div className="flex justify-between text-[11px] text-slate-400 mb-1">
                <span>Time of Day</span>
                <span className="font-mono text-amber-400">{Math.floor(engine.timeOfDay)}:00</span>
              </div>
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
          </div>
        )}

        {/* Audio Volume */}
        <div>
          <div className="flex justify-between text-xs text-slate-300 mb-1">
            <span className="flex items-center gap-1.5">
              <Volume2 className="w-3.5 h-3.5 text-sky-400" /> Audio Volume
            </span>
            <span className="font-mono text-sky-400">{volume}%</span>
          </div>
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

        {/* Return to Main Menu */}
        <div className="pt-2 border-t border-slate-800">
          <button
            onClick={onReturnMainMenu}
            className="w-full py-2.5 text-xs text-slate-400 hover:text-rose-400 transition-colors flex items-center justify-center gap-2 cursor-pointer"
          >
            <Home className="w-3.5 h-3.5" />
            <span>Return to Main Menu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
