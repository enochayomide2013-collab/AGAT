import React, { useState } from 'react';
import {
  Play,
  Save,
  RotateCcw,
  Map,
  Settings,
  Volume2,
  VolumeX,
  CloudRain,
  Sun,
  CloudSun,
  Home,
  Check,
  Sliders,
  Moon,
} from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { WeatherType } from '../types/game';

interface PauseMenuProps {
  engine: GameEngine | null;
  onResume: () => void;
  onOpenMap: () => void;
  onReturnMainMenu: () => void;
}

export const PauseMenu: React.FC<PauseMenuProps> = ({
  engine,
  onResume,
  onOpenMap,
  onReturnMainMenu,
}) => {
  const [activeTab, setActiveTab] = useState<'main' | 'audio' | 'environment'>('main');
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [loadSuccess, setLoadSuccess] = useState(false);

  // Audio State
  const [masterVolume, setMasterVolume] = useState(engine?.audioSettings.masterVolume ?? 80);
  const [musicVolume, setMusicVolume] = useState(engine?.audioSettings.musicVolume ?? 75);
  const [sfxVolume, setSfxVolume] = useState(engine?.audioSettings.sfxVolume ?? 85);
  const [engineVolume, setEngineVolume] = useState(engine?.audioSettings.engineVolume ?? 80);
  const [weatherVolume, setWeatherVolume] = useState(engine?.audioSettings.weatherVolume ?? 75);
  const [isMuted, setIsMuted] = useState(engine?.audioSettings.isMuted ?? false);

  // Environment State
  const [weather, setWeather] = useState<WeatherType>(engine?.environmentSettings.weather ?? 'clear');
  const [timeOfDay, setTimeOfDay] = useState<number>(engine?.environmentSettings.timeOfDay ?? 14.0);
  const [timeProgression, setTimeProgression] = useState<boolean>(engine?.environmentSettings.timeProgression ?? true);
  const [timeSpeedMultiplier, setTimeSpeedMultiplier] = useState<number>(engine?.environmentSettings.timeSpeedMultiplier ?? 1.0);
  const [fogDensity, setFogDensity] = useState<'off' | 'low' | 'medium' | 'high'>(engine?.environmentSettings.fogDensity ?? 'medium');
  const [shadowQuality, setShadowQuality] = useState<'off' | 'medium' | 'high'>(engine?.environmentSettings.shadows ?? 'medium');

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

  const handleMasterVolume = (val: number) => {
    setMasterVolume(val);
    engine?.applyAudioSettings({ masterVolume: val });
  };

  const handleMusicVolume = (val: number) => {
    setMusicVolume(val);
    engine?.applyAudioSettings({ musicVolume: val });
  };

  const handleSfxVolume = (val: number) => {
    setSfxVolume(val);
    engine?.applyAudioSettings({ sfxVolume: val });
  };

  const handleEngineVolume = (val: number) => {
    setEngineVolume(val);
    engine?.applyAudioSettings({ engineVolume: val });
  };

  const handleWeatherVolume = (val: number) => {
    setWeatherVolume(val);
    engine?.applyAudioSettings({ weatherVolume: val });
  };

  const handleMuteToggle = () => {
    const next = !isMuted;
    setIsMuted(next);
    engine?.applyAudioSettings({ isMuted: next });
    soundManager.playUIClick();
  };

  const handleWeather = (w: WeatherType) => {
    setWeather(w);
    engine?.applyEnvironmentSettings({ weather: w });
    soundManager.playUIClick();
  };

  const handleTimeOfDay = (h: number) => {
    setTimeOfDay(h);
    engine?.applyEnvironmentSettings({ timeOfDay: h });
  };

  const handleProgressionToggle = () => {
    const next = !timeProgression;
    setTimeProgression(next);
    engine?.applyEnvironmentSettings({ timeProgression: next });
    soundManager.playUIClick();
  };

  const handleTimeSpeed = (speed: number) => {
    setTimeSpeedMultiplier(speed);
    engine?.applyEnvironmentSettings({ timeSpeedMultiplier: speed });
  };

  const handleFog = (density: 'off' | 'low' | 'medium' | 'high') => {
    setFogDensity(density);
    engine?.applyEnvironmentSettings({ fogDensity: density });
    soundManager.playUIClick();
  };

  const handleShadows = (quality: 'off' | 'medium' | 'high') => {
    setShadowQuality(quality);
    engine?.applyEnvironmentSettings({ shadows: quality });
    soundManager.playUIClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md flex items-center justify-center p-4 sm:p-6 select-none animate-in fade-in duration-150">
      <div className="max-w-lg w-full bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-5">
        {/* Header */}
        <div className="text-center pb-3 border-b border-slate-800 flex items-center justify-between">
          <div className="text-left">
            <div className="text-sky-400 font-mono text-[10px] font-bold tracking-widest uppercase">
              GAME PAUSED
            </div>
            <h2 className="text-2xl font-black text-white tracking-wider">AGAT CITY</h2>
          </div>

          {/* Navigation Pills */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
            <button
              onClick={() => {
                setActiveTab('main');
                soundManager.playUIClick();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                activeTab === 'main' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Menu
            </button>
            <button
              onClick={() => {
                setActiveTab('audio');
                soundManager.playUIClick();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'audio' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Volume2 className="w-3 h-3" />
              <span>Audio</span>
            </button>
            <button
              onClick={() => {
                setActiveTab('environment');
                soundManager.playUIClick();
              }}
              className={`px-2.5 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer flex items-center gap-1 ${
                activeTab === 'environment' ? 'bg-sky-500 text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <CloudSun className="w-3 h-3" />
              <span>Environment</span>
            </button>
          </div>
        </div>

        {/* 1. MAIN PAUSE MENU TAB */}
        {activeTab === 'main' && (
          <div className="space-y-3 animate-in fade-in duration-150">
            <button
              onClick={onResume}
              className="w-full py-3.5 px-4 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-white" />
              <span>RESUME GAME</span>
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
                <span>{saveSuccess ? 'GAME SAVED' : 'SAVE PROGRESS'}</span>
              </button>

              <button
                onClick={handleLoad}
                className="py-2.5 px-3 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-colors flex items-center justify-center gap-2 cursor-pointer"
              >
                {loadSuccess ? <Check className="w-4 h-4 text-sky-400" /> : <RotateCcw className="w-4 h-4 text-sky-400" />}
                <span>{loadSuccess ? 'LOADED' : 'LOAD LAST SAVE'}</span>
              </button>
            </div>
          </div>
        )}

        {/* 2. AUDIO SETTINGS TAB */}
        {activeTab === 'audio' && (
          <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1 animate-in fade-in duration-150">
            <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div className="flex items-center gap-2">
                {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                <span className="text-xs font-bold text-white">Mute All Audio</span>
              </div>
              <button
                onClick={handleMuteToggle}
                className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300'
                }`}
              >
                {isMuted ? 'MUTED' : 'ACTIVE'}
              </button>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Master Volume</span>
                <span className="font-mono text-sky-400">{masterVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={masterVolume}
                onChange={(e) => handleMasterVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Vehicle Radio & Station Stream</span>
                <span className="font-mono text-sky-400">{musicVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={musicVolume}
                onChange={(e) => handleMusicVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>SFX & Combat Weapons</span>
                <span className="font-mono text-sky-400">{sfxVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={sfxVolume}
                onChange={(e) => handleSfxVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Vehicle Engines & Exhaust</span>
                <span className="font-mono text-sky-400">{engineVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={engineVolume}
                onChange={(e) => handleEngineVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Weather Rain & Street Chatter</span>
                <span className="font-mono text-sky-400">{weatherVolume}%</span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={weatherVolume}
                onChange={(e) => handleWeatherVolume(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
            </div>
          </div>
        )}

        {/* 3. ENVIRONMENT SETTINGS TAB */}
        {activeTab === 'environment' && (
          <div className="space-y-3.5 max-h-[55vh] overflow-y-auto pr-1 animate-in fade-in duration-150">
            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Weather Atmosphere</span>
                <span className="text-[10px] font-mono text-sky-400 capitalize">{weather}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['clear', 'cloudy', 'rain', 'storm'] as WeatherType[]).map((w) => (
                  <button
                    key={w}
                    onClick={() => handleWeather(w)}
                    className={`py-1.5 text-[11px] font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                      weather === w
                        ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {w}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Time of Day</span>
                <span className="font-mono text-amber-400 font-bold">
                  {Math.floor(timeOfDay)}:{String(Math.floor((timeOfDay % 1) * 60)).padStart(2, '0')}
                </span>
              </div>
              <input
                type="range"
                min="0"
                max="24"
                step="0.25"
                value={timeOfDay}
                onChange={(e) => handleTimeOfDay(Number(e.target.value))}
                className="w-full accent-amber-500 cursor-pointer"
              />

              <div className="grid grid-cols-4 gap-1 mt-1.5">
                <button
                  onClick={() => handleTimeOfDay(6.0)}
                  className="py-1 text-[9px] font-mono bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-amber-300 rounded cursor-pointer"
                >
                  06:00 Dawn
                </button>
                <button
                  onClick={() => handleTimeOfDay(12.0)}
                  className="py-1 text-[9px] font-mono bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-amber-300 rounded cursor-pointer"
                >
                  12:00 Noon
                </button>
                <button
                  onClick={() => handleTimeOfDay(18.5)}
                  className="py-1 text-[9px] font-mono bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-amber-300 rounded cursor-pointer"
                >
                  18:30 Dusk
                </button>
                <button
                  onClick={() => handleTimeOfDay(0.0)}
                  className="py-1 text-[9px] font-mono bg-slate-950 border border-slate-800 hover:border-amber-500/50 text-amber-300 rounded cursor-pointer"
                >
                  00:00 Night
                </button>
              </div>
            </div>

            {/* Time Scale Multiplier */}
            <div>
              <div className="flex justify-between text-xs text-slate-300 mb-1">
                <span>Time-of-Day Progression Scale</span>
                <span className="font-mono text-sky-400 font-bold">{timeSpeedMultiplier.toFixed(1)}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="10.0"
                step="0.5"
                value={timeSpeedMultiplier}
                onChange={(e) => handleTimeSpeed(Number(e.target.value))}
                className="w-full accent-sky-500 cursor-pointer"
              />
              <div className="flex justify-between text-[9px] font-mono text-slate-500 mt-0.5">
                <span>0.5x Realtime</span>
                <span>1.0x Normal</span>
                <span>5.0x Fast</span>
                <span>10.0x Warp</span>
              </div>
            </div>

            <div className="flex items-center justify-between p-2.5 bg-slate-950/70 border border-slate-800 rounded-xl">
              <div>
                <div className="text-xs font-bold text-white">Dynamic Day/Night Cycle</div>
                <div className="text-[10px] text-slate-400">Progression of sunlight hours</div>
              </div>
              <button
                onClick={handleProgressionToggle}
                className={`px-3 py-1 text-[11px] font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                  timeProgression ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                }`}
              >
                {timeProgression ? 'ENABLED' : 'PAUSED'}
              </button>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Atmospheric Fog & Haze</span>
                <span className="text-[10px] font-mono text-sky-400 uppercase">{fogDensity}</span>
              </div>
              <div className="grid grid-cols-4 gap-1.5">
                {(['off', 'low', 'medium', 'high'] as const).map((d) => (
                  <button
                    key={d}
                    onClick={() => handleFog(d)}
                    className={`py-1 text-xs font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                      fogDensity === d
                        ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {d}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="text-xs font-semibold text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Shadow Resolution</span>
                <span className="text-[10px] font-mono text-sky-400 uppercase">{shadowQuality}</span>
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(['off', 'medium', 'high'] as const).map((q) => (
                  <button
                    key={q}
                    onClick={() => handleShadows(q)}
                    className={`py-1 text-xs font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                      shadowQuality === q
                        ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow'
                        : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                    }`}
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

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
