import React, { useEffect, useState } from 'react';
import { Radio, Volume2, VolumeX, ChevronRight, ChevronLeft, Mic } from 'lucide-react';
import { radioSystem, RADIO_STATIONS, RadioTalkSegment } from '../engine/RadioSystem';
import { RadioStationDef, RadioStationId } from '../types/game';

interface RadioPlayerProps {
  currentStation?: RadioStationId;
  onStationChange?: (station: RadioStationId) => void;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = () => {
  const [stationDef, setStationDef] = useState<RadioStationDef>(() => radioSystem.getCurrentStationDef());
  const [talkSegment, setTalkSegment] = useState<RadioTalkSegment | null>(radioSystem.onAirTalk);
  const [isMuted, setIsMuted] = useState<boolean>(radioSystem.isMuted);

  useEffect(() => {
    const handleStationChange = (st: RadioStationDef) => {
      setStationDef(st);
    };
    const handleTalk = (seg: RadioTalkSegment | null) => {
      setTalkSegment(seg);
    };

    radioSystem.onStationChangeListeners.push(handleStationChange);
    radioSystem.onTalkSegmentListeners.push(handleTalk);

    return () => {
      radioSystem.onStationChangeListeners = radioSystem.onStationChangeListeners.filter(
        (fn) => fn !== handleStationChange
      );
      radioSystem.onTalkSegmentListeners = radioSystem.onTalkSegmentListeners.filter((fn) => fn !== handleTalk);
    };
  }, []);

  const isOff = stationDef.id === 'off';

  return (
    <div className="bg-slate-950/90 backdrop-blur-md border border-slate-800 rounded-xl p-3 text-xs text-white shadow-2xl flex flex-col gap-2 min-w-[320px] max-w-sm">
      {/* Top Station Header & Frequency */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div
            className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-white shadow"
            style={{ backgroundColor: stationDef.color }}
          >
            <Radio className="w-4 h-4 text-white" />
          </div>
          <div>
            <div className="font-bold text-xs text-white flex items-center gap-1.5">
              <span>{stationDef.name}</span>
              <span className="text-[10px] font-mono px-1.5 py-0.2 bg-slate-800 rounded text-sky-400">
                {stationDef.frequency}
              </span>
            </div>
            <div className="text-[10px] text-slate-400">{stationDef.genre}</div>
          </div>
        </div>

        {/* Audio Spectrum Visualizer & Controls */}
        <div className="flex items-center gap-2">
          {!isOff && (
            <div className="flex items-end gap-0.5 h-4 px-1.5">
              {[0.4, 0.9, 0.6, 1.0, 0.7, 0.5].map((h, i) => (
                <div
                  key={i}
                  className="w-1 bg-sky-400 rounded-t animate-pulse"
                  style={{
                    height: `${h * 100}%`,
                    animationDuration: `${0.3 + i * 0.15}s`,
                  }}
                />
              ))}
            </div>
          )}

          <button
            onClick={() => {
              radioSystem.toggleMute();
              setIsMuted(radioSystem.isMuted);
            }}
            title={isMuted ? 'Unmute Radio' : 'Mute Radio'}
            className="p-1 rounded bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-400" /> : <Volume2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* On-Air DJ Talk / Station News Segment Ticker */}
      {talkSegment && !isOff && (
        <div className="bg-slate-900/90 border border-amber-500/40 rounded-lg p-2 text-[11px] flex items-start gap-2 shadow-inner">
          <Mic className="w-3.5 h-3.5 text-amber-400 shrink-0 mt-0.5 animate-pulse" />
          <div className="leading-snug">
            <span className="font-bold text-amber-400 font-mono text-[10px] uppercase block">
              ON AIR: {talkSegment.host}
            </span>
            <span className="text-slate-200 italic">"{talkSegment.text}"</span>
          </div>
        </div>
      )}

      {/* Station Selector Bar */}
      <div className="flex items-center gap-1 bg-slate-900/80 p-1 rounded-lg">
        <button
          onClick={() => radioSystem.cyclePrevStation()}
          title="Previous Station"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
        >
          <ChevronLeft className="w-3.5 h-3.5" />
        </button>

        <div className="flex-1 grid grid-cols-4 gap-1">
          {RADIO_STATIONS.filter((s) => s.id !== 'off').map((st) => {
            const isActive = stationDef.id === st.id;
            return (
              <button
                key={st.id}
                onClick={() => radioSystem.setStation(st.id)}
                className={`py-1 px-1.5 rounded text-[10px] font-semibold truncate transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-sm'
                    : 'bg-slate-950/60 text-slate-400 hover:text-white hover:bg-slate-800'
                }`}
              >
                {st.name.split(' ')[0]}
              </button>
            );
          })}
        </div>

        <button
          onClick={() => radioSystem.setStation('off')}
          title="Turn Radio Off"
          className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer ${
            isOff ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40' : 'text-slate-400 hover:text-white'
          }`}
        >
          OFF
        </button>

        <button
          onClick={() => radioSystem.cycleNextStation()}
          title="Next Station [R]"
          className="p-1 text-slate-400 hover:text-white rounded hover:bg-slate-800 cursor-pointer"
        >
          <ChevronRight className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Keyboard Shortcut Indicator */}
      <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-0.5 border-t border-slate-800/80">
        <span>IN VEHICLE: [R] CYCLE STATION</span>
        <span>AGAT FM NETWORK</span>
      </div>
    </div>
  );
};
