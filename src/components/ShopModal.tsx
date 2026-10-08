import React, { useState } from 'react';
import { X, DollarSign, Shield, Zap, RotateCcw, Crosshair, Car, Boxes, Check, AlertCircle } from 'lucide-react';
import { GameEngine } from '../engine/GameEngine';
import { ShopItem } from '../types/game';

interface ShopModalProps {
  engine: GameEngine;
  onClose: () => void;
}

export const ShopModal: React.FC<ShopModalProps> = ({ engine, onClose }) => {
  const [activeTab, setActiveTab] = useState<'skills' | 'weapons' | 'ammo' | 'vehicles'>('skills');
  const [feedback, setFeedback] = useState<{ text: string; isError: boolean } | null>(null);

  const catalog = engine.shopManager.catalog.filter((item) => item.category === activeTab);
  const playerCash = engine.playerMoney;

  const handlePurchase = (item: ShopItem) => {
    const result = engine.shopManager.purchaseItem(
      item.id,
      engine.playerMoney,
      engine.weaponInventory,
      (newBalance) => {
        engine.playerMoney = newBalance;
      },
      (vehDef) => {
        // Spawn delivered vehicle right next to player
        const spawnX = engine.playerPos.x + 3.5;
        const spawnZ = engine.playerPos.z + 1.5;
        engine.vehicleManager.spawnVehicle(
          { ...vehDef, id: `bought_${vehDef.id}_${Date.now()}` },
          spawnX,
          0.4,
          spawnZ,
          engine.playerHeading
        );
      },
      (skillDef) => {
        // Apply skill multiplier to player stats
        if (skillDef.id === 'skill_armor') {
          engine.playerHealth = Math.min(150, engine.playerHealth + 50);
        }
      }
    );

    setFeedback({ text: result.message, isError: !result.success });
    setTimeout(() => {
      setFeedback(null);
    }, 3800);
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-4 select-none">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-4xl w-full h-[85vh] flex flex-col overflow-hidden shadow-2xl">
        {/* Header */}
        <div className="p-4 border-b border-slate-800 bg-slate-950/80 flex items-center justify-between">
          <div>
            <div className="text-[11px] font-mono font-bold text-sky-400 tracking-widest uppercase">
              AGAT METROPOLITAN EXCHANGE
            </div>
            <h2 className="text-xl font-black text-white tracking-wide">
              UNDERGROUND & COMMERCIAL MARKET
            </h2>
          </div>

          <div className="flex items-center gap-4">
            {/* Live Cash Balance */}
            <div className="flex items-center gap-1.5 bg-emerald-950/60 border border-emerald-500/30 px-3 py-1.5 rounded-lg text-emerald-400 font-mono font-bold text-base shadow-sm">
              <DollarSign className="w-4 h-4 text-emerald-400" />
              <span>{playerCash.toLocaleString()}</span>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Feedback Banner */}
        {feedback && (
          <div
            className={`px-4 py-2.5 text-xs font-semibold flex items-center gap-2 border-b transition-all ${
              feedback.isError
                ? 'bg-rose-950/90 text-rose-300 border-rose-800'
                : 'bg-emerald-950/90 text-emerald-300 border-emerald-800'
            }`}
          >
            {feedback.isError ? (
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
            ) : (
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
        )}

        {/* Navigation Tabs */}
        <div className="flex items-center gap-2 px-4 py-2.5 bg-slate-950/40 border-b border-slate-800">
          {[
            { id: 'skills', label: 'Perks & Skills', icon: Zap },
            { id: 'weapons', label: 'Tactical Weapons', icon: Crosshair },
            { id: 'ammo', label: 'Ammunition Crate', icon: Boxes },
            { id: 'vehicles', label: 'Vehicle Fleet', icon: Car },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as typeof activeTab)}
                className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-sky-500 text-white shadow-md'
                    : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Catalog Items Grid */}
        <div className="flex-1 p-5 overflow-y-auto grid grid-cols-1 md:grid-cols-2 gap-4 bg-slate-950/20">
          {catalog.map((item) => {
            const isSkillOwned = item.skillPayload && engine.shopManager.unlockedSkills.has(item.skillPayload.id);
            const isWeaponOwned = item.weaponPayload && engine.weaponInventory.weapons.some((w) => w.id === item.weaponPayload!.id);
            const canAfford = playerCash >= item.price;

            return (
              <div
                key={item.id}
                className="bg-slate-900/90 border border-slate-800/90 hover:border-sky-500/40 rounded-xl p-4 flex flex-col justify-between transition-all shadow-md group"
              >
                <div>
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2.5">
                      <div className="p-2 rounded-lg bg-sky-950/80 border border-sky-500/20 text-sky-400">
                        {item.category === 'skills' && <Zap className="w-4 h-4" />}
                        {item.category === 'weapons' && <Crosshair className="w-4 h-4" />}
                        {item.category === 'ammo' && <Boxes className="w-4 h-4" />}
                        {item.category === 'vehicles' && <Car className="w-4 h-4" />}
                      </div>
                      <div>
                        <h3 className="text-sm font-bold text-white group-hover:text-sky-300 transition-colors">
                          {item.name}
                        </h3>
                        <span className="text-[10px] font-mono text-slate-500 uppercase">
                          {item.category}
                        </span>
                      </div>
                    </div>

                    <div className="text-right">
                      <span className="text-base font-black font-mono text-amber-400">
                        ${item.price.toLocaleString()}
                      </span>
                    </div>
                  </div>

                  <p className="text-xs text-slate-400 mt-3 leading-relaxed">
                    {item.description}
                  </p>

                  {/* Weapon Specific Specs */}
                  {item.weaponPayload && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-500 block">DAMAGE</span>
                        <span className="text-white font-bold">{item.weaponPayload.damage}</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">CAPACITY</span>
                        <span className="text-white font-bold">
                          {item.weaponPayload.maxAmmo} / {item.weaponPayload.reserveAmmo}
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">RANGE</span>
                        <span className="text-white font-bold">{item.weaponPayload.range}m</span>
                      </div>
                    </div>
                  )}

                  {/* Vehicle Specific Specs */}
                  {item.vehiclePayload && (
                    <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-800/80 text-[10px] font-mono text-slate-400">
                      <div>
                        <span className="text-slate-500 block">TOP SPEED</span>
                        <span className="text-white font-bold">
                          {Math.round(item.vehiclePayload.maxSpeed * 3.6)} km/h
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">ARMOR</span>
                        <span className="text-white font-bold">{item.vehiclePayload.maxHealth} HP</span>
                      </div>
                      <div>
                        <span className="text-slate-500 block">TYPE</span>
                        <span className="text-white font-bold uppercase">{item.vehiclePayload.category}</span>
                      </div>
                    </div>
                  )}
                </div>

                {/* Purchase Button */}
                <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between">
                  <div className="text-[11px] text-slate-500">
                    {isSkillOwned && <span className="text-emerald-400 font-semibold">Active & Applied</span>}
                    {isWeaponOwned && <span className="text-sky-400 font-semibold">In Inventory (Restock Available)</span>}
                  </div>

                  <button
                    disabled={isSkillOwned || !canAfford}
                    onClick={() => handlePurchase(item)}
                    className={`py-2 px-4 rounded-lg text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                      isSkillOwned
                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                        : canAfford
                        ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-lg active:scale-95'
                        : 'bg-slate-800 text-slate-500 cursor-not-allowed opacity-60'
                    }`}
                  >
                    <DollarSign className="w-3.5 h-3.5" />
                    <span>
                      {isSkillOwned ? 'PURCHASED' : canAfford ? 'BUY NOW' : 'NEED CASH'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {/* Footer info */}
        <div className="p-3 border-t border-slate-800 bg-slate-950/80 text-[11px] text-slate-500 flex items-center justify-between px-5 font-mono">
          <span>PRESS [B] OR USE HUD TO OPEN SHOP ANYTIME</span>
          <span>IMMEDIATE VEHICLE & WEAPON AIRDROP DELIVERY</span>
        </div>
      </div>
    </div>
  );
};
