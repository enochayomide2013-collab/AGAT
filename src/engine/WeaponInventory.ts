import { WeaponDef } from '../types/game';
import { soundManager } from './SoundManager';

export class WeaponInventory {
  public weapons: WeaponDef[] = [];
  public maxWeapons: number = 5; // Strict inventory limit
  public equippedIndex: number = 0; // -1 if unarmed/holstered, or index
  public isHolstered: boolean = false;
  public onChange?: () => void;

  constructor() {
    this.initDefaultWeapons();
  }

  private initDefaultWeapons() {
    this.weapons = [
      {
        id: 'arc9_stunner',
        name: 'ARC-9 Stunner',
        type: 'pistol',
        damage: 25,
        maxAmmo: 14,
        currentAmmo: 14,
        reserveAmmo: 70,
        fireRate: 4.0,
        range: 50,
        reloadTime: 1.1,
        color: '#00d2ff',
        projectileSpeed: 100,
        condition: 100,
        description: 'Compact ion sidearm with rapid cycle rate.',
      },
      {
        id: 'vulcan45_carbine',
        name: 'VULCAN-45 Carbine',
        type: 'rifle',
        damage: 35,
        maxAmmo: 30,
        currentAmmo: 30,
        reserveAmmo: 150,
        fireRate: 8.5,
        range: 85,
        reloadTime: 1.6,
        color: '#f59e0b',
        projectileSpeed: 130,
        condition: 100,
        description: 'Bullpup automatic assault rifle with optical reflex.',
      },
      {
        id: 'pulse_shotgun',
        name: 'PULSE Shock Wave',
        type: 'shotgun',
        damage: 75,
        maxAmmo: 8,
        currentAmmo: 8,
        reserveAmmo: 40,
        fireRate: 1.4,
        range: 35,
        reloadTime: 2.0,
        color: '#ef4444',
        projectileSpeed: 90,
        condition: 100,
        description: 'Heavy tactical concussive dispersion shotgun.',
      },
      {
        id: 'spectre_dmr',
        name: 'SPECTRE Precision DMR',
        type: 'precision',
        damage: 95,
        maxAmmo: 10,
        currentAmmo: 10,
        reserveAmmo: 40,
        fireRate: 2.0,
        range: 140,
        reloadTime: 1.9,
        color: '#a855f7',
        projectileSpeed: 175,
        condition: 100,
        description: 'High-caliber marksman rifle with thermal optic.',
      },
    ];
    this.equippedIndex = 0;
  }

  public getActiveWeapon(): WeaponDef | null {
    if (this.isHolstered || this.equippedIndex < 0 || this.equippedIndex >= this.weapons.length) {
      return null;
    }
    return this.weapons[this.equippedIndex];
  }

  public isWeaponEquipped(): boolean {
    return !this.isHolstered && this.equippedIndex >= 0 && this.equippedIndex < this.weapons.length;
  }

  public equip(index: number) {
    if (index >= 0 && index < this.weapons.length) {
      this.equippedIndex = index;
      this.isHolstered = false;
      soundManager.playUIClick();
      this.notifyChange();
    }
  }

  public toggleHolster() {
    this.isHolstered = !this.isHolstered;
    soundManager.playUIClick();
    this.notifyChange();
  }

  public cycleNext() {
    if (this.weapons.length === 0) return;
    this.isHolstered = false;
    this.equippedIndex = (this.equippedIndex + 1) % this.weapons.length;
    soundManager.playUIClick();
    this.notifyChange();
  }

  public cyclePrev() {
    if (this.weapons.length === 0) return;
    this.isHolstered = false;
    this.equippedIndex = (this.equippedIndex - 1 + this.weapons.length) % this.weapons.length;
    soundManager.playUIClick();
    this.notifyChange();
  }

  public consumeAmmo(count = 1): boolean {
    const active = this.getActiveWeapon();
    if (!active || active.currentAmmo < count) return false;
    active.currentAmmo -= count;
    // Slight wear & tear condition degradation per 20 rounds
    if (Math.random() < 0.05) {
      active.condition = Math.max(75, active.condition - 1);
    }
    this.notifyChange();
    return true;
  }

  public replenishAmmo(): boolean {
    const active = this.getActiveWeapon();
    if (!active || active.currentAmmo >= active.maxAmmo || active.reserveAmmo <= 0) {
      return false;
    }
    const needed = active.maxAmmo - active.currentAmmo;
    const available = Math.min(needed, active.reserveAmmo);
    active.currentAmmo += available;
    active.reserveAmmo -= available;
    this.notifyChange();
    return true;
  }

  public replenishAllReserves() {
    this.weapons.forEach((w) => {
      w.reserveAmmo = Math.max(w.reserveAmmo, w.maxAmmo * 4);
    });
    this.notifyChange();
  }

  public addWeapon(weapon: WeaponDef): boolean {
    const existing = this.weapons.find((w) => w.id === weapon.id);
    if (existing) {
      existing.reserveAmmo += weapon.reserveAmmo || weapon.maxAmmo * 2;
      existing.condition = 100;
      this.notifyChange();
      return true;
    }

    if (this.weapons.length >= this.maxWeapons) {
      return false; // Inventory capacity limit reached
    }

    this.weapons.push({ ...weapon, condition: weapon.condition || 100 });
    this.equippedIndex = this.weapons.length - 1;
    this.isHolstered = false;
    this.notifyChange();
    return true;
  }

  private notifyChange() {
    if (this.onChange) {
      this.onChange();
    }
  }
}
