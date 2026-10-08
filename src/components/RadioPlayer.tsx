import React from 'react';
import { Radio, Volume2, VolumeX } from 'lucide-react';
import { soundManager } from '../engine/SoundManager';

interface RadioPlayerProps {
  currentStation: string;
  onStationChange: (station: 'off' | 'synthwave' | 'electro' | 'chill') => void;
}

export const RadioPlayer: React.FC<RadioPlayerProps> = ({ currentStation, onStationChange }) => {
  const stations: Array<{ id: 'synthwave' | 'electro' | 'chill' | 'off'; name: string; freq: string }> = [
    { id: 'synthwave', name: 'AGAT FM', freq: '98.4' },
    { id: 'electro', name: 'Vortex Beat', freq: '102.1' },
    { id: 'chill', name: 'Neon Chill', freq: '88.5' },
    { id: 'off', name: 'Radio Off', freq: '--' },
  ];

  return (
    <div className="bg-slate-950/85 backdrop-blur-md border border-slate-800 rounded-lg p-2.5 text-xs text-white shadow-xl flex items-center gap-3">
      <div className="flex items-center gap-1.5 text-sky-400 font-semibold uppercase tracking-wider">
        <Radio className="w-4 h-4 text-sky-400" />
        <span>AGAT Audio</span>
      </div>

      <div className="flex items-center gap-1 bg-slate-900/90 rounded p-1">
        {stations.map((st) => {
          const isActive = currentStation === st.id;
          return (
            <button
              key={st.id}
              onClick={() => {
                onStationChange(st.id);
                soundManager.setRadioStation(st.id);
              }}
              className={`px-2.5 py-1 rounded transition-colors text-xs font-medium cursor-pointer ${
                isActive
                  ? 'bg-sky-500 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white hover:bg-slate-800'
              }`}
            >
              <span>{st.name}</span>
              <span className="text-[10px] ml-1 opacity-70">{st.freq}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
};
