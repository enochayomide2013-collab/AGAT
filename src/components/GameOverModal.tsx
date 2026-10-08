import React from 'react';
import { HeartPulse, RotateCcw } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';

interface GameOverModalProps {
  engine: GameEngine;
  onRespawn: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({ engine, onRespawn }) => {
  const handleRespawn = () => {
    engine.respawnHospital();
    engine.playerMoney = Math.max(0, engine.playerMoney - 150);
    onRespawn();
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/90 backdrop-blur-md flex items-center justify-center p-6 select-none animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-slate-900 border border-rose-900/60 rounded-2xl p-8 shadow-2xl text-center space-y-6">
        <div>
          <div className="text-xs font-mono font-bold tracking-widest text-rose-500 uppercase mb-2">
            INCIDENT RESOLVED
          </div>
          <h2 className="text-4xl font-black text-white tracking-widest">
            AGAT
          </h2>
          <div className="text-lg font-bold text-rose-400 mt-2">
            CRITICAL EXHAUSTION
          </div>
          <p className="text-xs text-slate-400 mt-2">
            You were recovered by AGAT Emergency Paramedics and transported to AGAT General Hospital trauma ward.
          </p>
        </div>

        <div className="bg-slate-950/70 border border-slate-800 rounded-xl p-4 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-slate-300">
            <HeartPulse className="w-4 h-4 text-rose-500" />
            <span>Emergency Medical Fee</span>
          </div>
          <span className="font-mono text-rose-400 font-bold">-$150</span>
        </div>

        <button
          onClick={handleRespawn}
          className="w-full py-3.5 px-6 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-sm rounded-xl transition-all shadow-lg flex items-center justify-center gap-2 cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
          <span>RESPAWN AT AGAT GENERAL HOSPITAL</span>
        </button>
      </div>
    </div>
  );
};
