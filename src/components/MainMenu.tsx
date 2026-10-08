import React, { useState, useEffect } from 'react';
import {
  Play,
  RotateCcw,
  Compass,
  Settings,
  Keyboard,
  CheckCircle2,
  Volume2,
  VolumeX,
  CloudRain,
  Sun,
  CloudSun,
  Moon,
  Monitor,
  Scissors,
  Radio,
  Music,
  Sliders,
  Eye,
  Gauge,
} from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { soundManager } from '../engine/SoundManager';
import { WeatherType } from '../types/game';

interface MainMenuProps {
  onStartGame: () => void;
  hasSavedGame: boolean;
  engine: GameEngine | null;
  onOpenCustomization?: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  onStartGame,
  hasSavedGame,
  engine,
  onOpenCustomization,
}) => {
  const [tab, setTab] = useState<'main' | 'controls' | 'settings' | 'missions'>('main');
  const [settingsCategory, setSettingsCategory] = useState<'audio' | 'environment'>('audio');

  // Ambient Landing Music State
  const [isLandingMusicOn, setIsLandingMusicOn] = useState(true);
  const [ambientVolume, setAmbientVolume] = useState(60);

  // Audio Settings State
  const [masterVolume, setMasterVolume] = useState(engine?.audioSettings.masterVolume ?? 80);
  const [musicVolume, setMusicVolume] = useState(engine?.audioSettings.musicVolume ?? 75);
  const [sfxVolume, setSfxVolume] = useState(engine?.audioSettings.sfxVolume ?? 85);
  const [engineVolume, setEngineVolume] = useState(engine?.audioSettings.engineVolume ?? 80);
  const [weatherVolume, setWeatherVolume] = useState(engine?.audioSettings.weatherVolume ?? 75);
  const [isMuted, setIsMuted] = useState(engine?.audioSettings.isMuted ?? false);

  // Environment Settings State
  const [selectedWeather, setSelectedWeather] = useState<WeatherType>(engine?.environmentSettings.weather ?? 'clear');
  const [timeOfDay, setTimeOfDay] = useState<number>(engine?.environmentSettings.timeOfDay ?? 14.0);
  const [timeProgression, setTimeProgression] = useState<boolean>(engine?.environmentSettings.timeProgression ?? true);
  const [fogDensity, setFogDensity] = useState<'off' | 'low' | 'medium' | 'high'>(engine?.environmentSettings.fogDensity ?? 'medium');
  const [shadowQuality, setShadowQuality] = useState<'off' | 'medium' | 'high'>(engine?.environmentSettings.shadows ?? 'medium');

  // Start landing ambient music on mount & listen for first user click if browser policy blocks autoplay
  useEffect(() => {
    // Attempt auto-start
    soundManager.init();
    soundManager.setMusicVolume(ambientVolume / 100);
    soundManager.playLandingMusic();

    const handleFirstGesture = () => {
      soundManager.resume();
      if (isLandingMusicOn && !soundManager.isLandingMusicPlaying) {
        soundManager.playLandingMusic();
      }
    };

    window.addEventListener('click', handleFirstGesture, { once: true });
    window.addEventListener('keydown', handleFirstGesture, { once: true });

    return () => {
      window.removeEventListener('click', handleFirstGesture);
      window.removeEventListener('keydown', handleFirstGesture);
    };
  }, []);

  const handleToggleLandingMusic = () => {
    soundManager.resume();
    const nextState = !isLandingMusicOn;
    setIsLandingMusicOn(nextState);
    if (nextState) {
      soundManager.playLandingMusic();
    } else {
      soundManager.stopLandingMusic(0.5);
    }
    soundManager.playUIClick();
  };

  const handleAmbientVolumeChange = (vol: number) => {
    setAmbientVolume(vol);
    soundManager.setMusicVolume(vol / 100);
  };

  const handlePlay = () => {
    soundManager.stopLandingMusic(1.2);
    soundManager.init();
    soundManager.resume();
    if (engine) {
      engine.audioController.resume();
    }
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

  // Live Audio Settings Handlers
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

  // Live Environment Settings Handlers
  const handleWeatherChange = (w: WeatherType) => {
    setSelectedWeather(w);
    engine?.applyEnvironmentSettings({ weather: w });
    soundManager.playUIClick();
  };
  const handleTimeChange = (hour: number) => {
    setTimeOfDay(hour);
    engine?.applyEnvironmentSettings({ timeOfDay: hour });
  };
  const handleTimeProgressionToggle = () => {
    const next = !timeProgression;
    setTimeProgression(next);
    engine?.applyEnvironmentSettings({ timeProgression: next });
    soundManager.playUIClick();
  };
  const handleFogChange = (density: 'off' | 'low' | 'medium' | 'high') => {
    setFogDensity(density);
    engine?.applyEnvironmentSettings({ fogDensity: density });
    soundManager.playUIClick();
  };
  const handleShadowChange = (quality: 'off' | 'medium' | 'high') => {
    setShadowQuality(quality);
    engine?.applyEnvironmentSettings({ shadows: quality });
    soundManager.playUIClick();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex items-center justify-center p-4 sm:p-6 select-none bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-slate-900 via-slate-950 to-black">
      <div className="max-w-5xl w-full h-[90vh] bg-slate-900/85 border border-slate-800 rounded-2xl p-6 sm:p-8 backdrop-blur-xl shadow-2xl flex flex-col md:flex-row gap-8 overflow-hidden">
        {/* Left Side: Game Branding, Ambient Soundtrack & Features */}
        <div className="md:w-5/12 flex flex-col justify-between border-b md:border-b-0 md:border-r border-slate-800 pb-6 md:pb-0 md:pr-8 overflow-y-auto">
          <div>
            <div className="inline-block px-3 py-1 bg-sky-500/10 border border-sky-500/30 rounded text-sky-400 font-mono text-xs font-semibold tracking-widest uppercase mb-3">
              Open-World 4D Metropolis
            </div>

            <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-br from-white via-slate-200 to-sky-400 tracking-wider">
              AGAT
            </h1>
            <p className="text-sm text-slate-400 mt-2 font-medium leading-relaxed">
              A seamless living cyberpunk simulation. Roam AGAT City on foot, race high-velocity vehicles, claim alley street art, and undertake high-stakes contracts.
            </p>

            {/* Landing Page Ambient Music Player Widget */}
            <div className="mt-5 p-3.5 bg-slate-950/80 border border-sky-500/30 rounded-xl shadow-lg">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg ${isLandingMusicOn ? 'bg-sky-500/20 text-sky-400 animate-pulse' : 'bg-slate-800 text-slate-500'}`}>
                    <Music className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="text-[11px] font-bold text-white tracking-wide">
                      NEO-NOIR LOUNGE
                    </div>
                    <div className="text-[9px] font-mono text-sky-400">
                      {isLandingMusicOn ? '♪ Playing · Low Ambient Synth' : 'Muted'}
                    </div>
                  </div>
                </div>

                <button
                  onClick={handleToggleLandingMusic}
                  className={`px-2.5 py-1 text-[10px] font-mono font-bold rounded-lg transition-colors cursor-pointer border ${
                    isLandingMusicOn
                      ? 'bg-sky-500/20 border-sky-400 text-sky-300 hover:bg-sky-500/30'
                      : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                  }`}
                >
                  {isLandingMusicOn ? 'PAUSE' : 'PLAY'}
                </button>
              </div>

              {isLandingMusicOn && (
                <div className="flex items-center gap-2 pt-1 border-t border-slate-800/80">
                  <span className="text-[10px] text-slate-400 font-mono">Volume</span>
                  <input
                    type="range"
                    min="5"
                    max="100"
                    value={ambientVolume}
                    onChange={(e) => handleAmbientVolumeChange(Number(e.target.value))}
                    className="flex-1 accent-sky-500 h-1 cursor-pointer"
                  />
                  <span className="text-[10px] font-mono text-sky-400 w-7 text-right">
                    {ambientVolume}%
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="my-6 space-y-2 text-xs text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
              <span>Full Character Stylist & Expressive Face Customizer</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0" />
              <span>Dynamic Day/Night Lighting & Weather Physics</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400 shrink-0" />
              <span>3D Spatialized Engines & In-Vehicle Radio Stations</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-fuchsia-400 shrink-0" />
              <span>Interactive Alley Spray Paint Art & Turf System</span>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 font-mono">
            AGAT ENGINE v2.5 · REAL-TIME METROPOLIS
          </div>
        </div>

        {/* Right Side: Main Navigation Tabs & Panels */}
        <div className="md:w-7/12 flex flex-col justify-between overflow-hidden">
          {/* Main Action Menu */}
          {tab === 'main' && (
            <div className="flex flex-col justify-center h-full space-y-3 my-auto overflow-y-auto pr-1">
              <button
                onClick={handlePlay}
                className="w-full py-4 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-lg rounded-xl shadow-lg shadow-sky-500/25 transition-all flex items-center justify-between group cursor-pointer"
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
                  onClick={() => {
                    soundManager.playUIClick();
                    onOpenCustomization();
                  }}
                  className="w-full py-3 px-5 bg-slate-800/80 hover:bg-slate-800 text-sky-300 border border-sky-500/30 hover:border-sky-400 font-semibold text-sm rounded-xl transition-colors flex items-center justify-between cursor-pointer group shadow"
                >
                  <div className="flex items-center gap-3">
                    <Scissors className="w-4 h-4 text-sky-400" />
                    <span>CHARACTER CREATOR & STYLIST</span>
                  </div>
                  <span className="text-[10px] font-mono text-sky-400/80 group-hover:translate-x-0.5 transition-transform">
                    CUSTOMIZE →
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.playUIClick();
                  setTab('missions');
                }}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Compass className="w-4 h-4 text-amber-400" />
                <span>MISSION DIRECTORY</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playUIClick();
                  setTab('controls');
                }}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Keyboard className="w-4 h-4 text-sky-400" />
                <span>CONTROLS & KEYMAP</span>
              </button>

              <button
                onClick={() => {
                  soundManager.playUIClick();
                  setTab('settings');
                }}
                className="w-full py-3 px-5 bg-slate-800/60 hover:bg-slate-800 text-slate-300 font-semibold text-sm rounded-xl transition-colors flex items-center gap-3 cursor-pointer"
              >
                <Settings className="w-4 h-4 text-purple-400" />
                <span>ENVIRONMENT & AUDIO SETTINGS</span>
              </button>
            </div>
          )}

          {/* Controls Screen */}
          {tab === 'controls' && (
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Keymap & Control Scheme</h3>
                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs font-mono overflow-y-auto pr-1">
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
                  <span className="text-white">Interact / Tag / Enter Car</span>
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
                  <span className="text-slate-400">1 - 5</span>
                  <span className="text-white">Switch Weapon</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">X</span>
                  <span className="text-white">Holster / Draw</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">M</span>
                  <span className="text-white">City Map / GPS</span>
                </div>
                <div className="bg-slate-950/60 p-2.5 rounded border border-slate-800 flex justify-between">
                  <span className="text-slate-400">B</span>
                  <span className="text-white">Market Shop</span>
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
            <div className="space-y-4 flex flex-col h-full">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <h3 className="font-bold text-white text-base">Contracts & Missions</h3>
                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              <div className="space-y-2.5 overflow-y-auto pr-1 flex-1">
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
                        {m.type && (
                          <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-slate-800 text-sky-300">
                            {m.type}
                          </span>
                        )}
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

          {/* Fully Functional Settings & Simulation Panel */}
          {tab === 'settings' && (
            <div className="space-y-4 flex flex-col h-full overflow-hidden">
              <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                <div className="flex items-center gap-2">
                  <h3 className="font-bold text-white text-base">Game Settings</h3>
                  <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
                    <button
                      onClick={() => setSettingsCategory('audio')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                        settingsCategory === 'audio'
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Audio</span>
                    </button>
                    <button
                      onClick={() => setSettingsCategory('environment')}
                      className={`px-2.5 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer flex items-center gap-1 ${
                        settingsCategory === 'environment'
                          ? 'bg-sky-500 text-white'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      <CloudSun className="w-3.5 h-3.5" />
                      <span>Environment</span>
                    </button>
                  </div>
                </div>

                <button
                  onClick={() => setTab('main')}
                  className="text-xs text-sky-400 hover:underline cursor-pointer"
                >
                  ← Back to Menu
                </button>
              </div>

              {/* Audio Settings Category */}
              {settingsCategory === 'audio' && (
                <div className="space-y-4 overflow-y-auto pr-2 flex-1 animate-in fade-in duration-150">
                  <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <div className="flex items-center gap-2">
                      {isMuted ? <VolumeX className="w-4 h-4 text-rose-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                      <span className="text-xs font-bold text-white">Mute All Audio</span>
                    </div>
                    <button
                      onClick={handleMuteToggle}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                        isMuted ? 'bg-rose-500 text-white' : 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                      }`}
                    >
                      {isMuted ? 'MUTED' : 'ACTIVE'}
                    </button>
                  </div>

                  {/* Master Volume */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Master Volume</span>
                      <span className="font-mono text-sky-400">{masterVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={masterVolume}
                      onChange={(e) => handleMasterVolume(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Radio / Music Volume */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Vehicle Radio & In-Game Music</span>
                      <span className="font-mono text-sky-400">{musicVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={musicVolume}
                      onChange={(e) => handleMusicVolume(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* SFX / Weapons Volume */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Sound Effects & Weaponry</span>
                      <span className="font-mono text-sky-400">{sfxVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={sfxVolume}
                      onChange={(e) => handleSfxVolume(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Vehicle Engine Volume */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Vehicle Engines & Exhaust Acoustics</span>
                      <span className="font-mono text-sky-400">{engineVolume}%</span>
                    </label>
                    <input
                      type="range"
                      min="0"
                      max="100"
                      value={engineVolume}
                      onChange={(e) => handleEngineVolume(Number(e.target.value))}
                      className="w-full accent-sky-500 cursor-pointer"
                    />
                  </div>

                  {/* Ambient Weather Volume */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 flex items-center justify-between mb-1.5">
                      <span>Rain, Thunder & Ambient Street Chatter</span>
                      <span className="font-mono text-sky-400">{weatherVolume}%</span>
                    </label>
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

              {/* Environment Settings Category */}
              {settingsCategory === 'environment' && (
                <div className="space-y-4 overflow-y-auto pr-2 flex-1 animate-in fade-in duration-150">
                  {/* Weather preset */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Simulated Weather Conditions
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['clear', 'cloudy', 'rain', 'storm'] as WeatherType[]).map((w) => (
                        <button
                          key={w}
                          onClick={() => handleWeatherChange(w)}
                          className={`py-2 text-xs font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                            selectedWeather === w
                              ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {w}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Time of Day */}
                  <div>
                    <div className="flex items-center justify-between text-xs font-semibold text-slate-300 mb-1.5">
                      <span>Time of Day (Sun & Night Horizon)</span>
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
                      onChange={(e) => handleTimeChange(Number(e.target.value))}
                      className="w-full accent-amber-500 cursor-pointer"
                    />

                    {/* Quick Presets */}
                    <div className="grid grid-cols-4 gap-1.5 mt-2">
                      <button
                        onClick={() => handleTimeChange(6.0)}
                        className="py-1 px-2 text-[10px] font-mono bg-slate-950/80 border border-slate-800 text-amber-300 hover:bg-slate-800 rounded transition-colors"
                      >
                        DAWN 06:00
                      </button>
                      <button
                        onClick={() => handleTimeChange(12.0)}
                        className="py-1 px-2 text-[10px] font-mono bg-slate-950/80 border border-slate-800 text-amber-300 hover:bg-slate-800 rounded transition-colors"
                      >
                        NOON 12:00
                      </button>
                      <button
                        onClick={() => handleTimeChange(18.5)}
                        className="py-1 px-2 text-[10px] font-mono bg-slate-950/80 border border-slate-800 text-amber-300 hover:bg-slate-800 rounded transition-colors"
                      >
                        DUSK 18:30
                      </button>
                      <button
                        onClick={() => handleTimeChange(0.0)}
                        className="py-1 px-2 text-[10px] font-mono bg-slate-950/80 border border-slate-800 text-amber-300 hover:bg-slate-800 rounded transition-colors"
                      >
                        NIGHT 00:00
                      </button>
                    </div>
                  </div>

                  {/* Day/Night Progression Toggle */}
                  <div className="flex items-center justify-between p-3 bg-slate-950/70 border border-slate-800 rounded-xl">
                    <div>
                      <div className="text-xs font-bold text-white">Dynamic Day/Night Cycle</div>
                      <div className="text-[10px] text-slate-400">Continuous progression of hours</div>
                    </div>
                    <button
                      onClick={handleTimeProgressionToggle}
                      className={`px-3 py-1 text-xs font-mono font-bold rounded-lg transition-colors cursor-pointer ${
                        timeProgression ? 'bg-sky-500 text-white' : 'bg-slate-800 text-slate-400'
                      }`}
                    >
                      {timeProgression ? 'ENABLED' : 'FROZEN'}
                    </button>
                  </div>

                  {/* Visual Fog Density */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Atmospheric Fog Density
                    </label>
                    <div className="grid grid-cols-4 gap-2">
                      {(['off', 'low', 'medium', 'high'] as const).map((d) => (
                        <button
                          key={d}
                          onClick={() => handleFogChange(d)}
                          className={`py-1.5 text-xs font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                            fogDensity === d
                              ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-md'
                              : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {d}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Shadow Quality */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 mb-2 block">
                      Direct Shadow Resolution
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {(['off', 'medium', 'high'] as const).map((q) => (
                        <button
                          key={q}
                          onClick={() => handleShadowChange(q)}
                          className={`py-1.5 text-xs font-bold rounded-lg uppercase cursor-pointer border transition-all ${
                            shadowQuality === q
                              ? 'bg-sky-500/25 border-sky-400 text-sky-300 shadow-md'
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
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
