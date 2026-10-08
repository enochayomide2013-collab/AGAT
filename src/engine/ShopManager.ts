import { ShopItem, SkillDef, VehicleDef, WeaponDef } from '../types/game';
import { soundManager } from './SoundManager';
import { WeaponInventory } from './WeaponInventory';

export class ShopManager {
  public catalog: ShopItem[] = [];
  public unlockedSkills: Map<string, SkillDef> = new Map();
  public onPurchaseSuccess?: (item: ShopItem, message: string) => void;

  constructor() {
    this.initCatalog();
  }

  private initCatalog() {
    // 1. SKILLS
    const defaultSkills: SkillDef[] = [
      {
        id: 'skill_armor',
        name: 'Tactical Nano-Weave Armor',
        description: 'Increases player maximum durability and shields, boosting maximum health by +50.',
        price: 800,
        unlocked: false,
        icon: 'Shield',
        category: 'survival',
        multiplier: 1.5,
      },
      {
        id: 'skill_speed',
        name: 'Adrenaline Reflexes',
        description: 'Enhances cellular endurance, increasing sprint and tactical movement speed by 25%.',
        price: 650,
        unlocked: false,
        icon: 'Zap',
        category: 'mobility',
        multiplier: 1.25,
      },
      {
        id: 'skill_reload',
        name: 'Quickdraw Sleight',
        description: 'Military-trained weapon manipulation that cuts all reload times in half.',
        price: 750,
        unlocked: false,
        icon: 'RotateCcw',
        category: 'combat',
        multiplier: 0.5,
      },
      {
        id: 'skill_damage',
        name: 'High-Impact Munitions',
        description: 'Custom tungsten-core projectiles granting +30% damage output to all ranged weapons.',
        price: 1200,
        unlocked: false,
        icon: 'Crosshair',
        category: 'combat',
        multiplier: 1.3,
      },
      {
        id: 'skill_economy',
        name: 'Syndicate Negotiator',
        description: 'Leverage illicit connections to earn +35% bonus reward cash on every completed mission.',
        price: 1000,
        unlocked: false,
        icon: 'DollarSign',
        category: 'economy',
        multiplier: 1.35,
      },
    ];

    defaultSkills.forEach((skill) => {
      this.catalog.push({
        id: `shop_${skill.id}`,
        category: 'skills',
        name: skill.name,
        description: skill.description,
        price: skill.price,
        icon: skill.icon,
        skillPayload: skill,
      });
    });

    // 2. WEAPONS
    const weapons: WeaponDef[] = [
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
        description: 'High-frequency ion sidearm designed for rapid engagement.',
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
        description: 'Military-grade compact bullpup automatic carbine.',
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
        description: 'Devastating close-range concussive scatter weapon.',
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
        description: 'Extreme-range designated marksman rifle with high armor punch.',
      },
      {
        id: 'havoc_cannon',
        name: 'HAVOC Kinetic LMG',
        type: 'rifle',
        damage: 55,
        maxAmmo: 60,
        currentAmmo: 60,
        reserveAmmo: 240,
        fireRate: 9.5,
        range: 95,
        reloadTime: 2.6,
        color: '#10b981',
        projectileSpeed: 140,
        condition: 100,
        description: 'Heavy drum-fed suppression system delivering overwhelming kinetic fire.',
      },
    ];

    weapons.forEach((w) => {
      let price = 500;
      if (w.id === 'vulcan45_carbine') price = 1100;
      if (w.id === 'pulse_shotgun') price = 950;
      if (w.id === 'spectre_dmr') price = 1800;
      if (w.id === 'havoc_cannon') price = 2600;

      this.catalog.push({
        id: `shop_w_${w.id}`,
        category: 'weapons',
        name: w.name,
        description: w.description || 'Advanced tactical firearm.',
        price,
        icon: 'Crosshair',
        weaponPayload: w,
      });
    });

    // 3. AMMO RESTOCK
    this.catalog.push({
      id: 'shop_ammo_crate',
      category: 'ammo',
      name: 'Universal Ammo Resupply Crate',
      description: 'Fully recharges ammunition reserve pools for all weapons in your inventory.',
      price: 200,
      icon: 'Boxes',
    });

    // 4. VEHICLES
    const vehicles: VehicleDef[] = [
      {
        id: 'vortex_gt_sport',
        name: 'Vortex GT Sport',
        category: 'sport',
        color: '#00f2fe',
        maxSpeed: 46,
        acceleration: 28,
        handling: 3.0,
        health: 120,
        maxHealth: 120,
        price: 2400,
      },
      {
        id: 'titan_4x4_offroad',
        name: 'Titan 4x4 Armored',
        category: 'suv',
        color: '#15803d',
        maxSpeed: 34,
        acceleration: 22,
        handling: 2.4,
        health: 180,
        maxHealth: 180,
        price: 1900,
      },
      {
        id: 'apex_phantom_supercar',
        name: 'Apex Phantom Hypercar',
        category: 'sport',
        color: '#e11d48',
        maxSpeed: 52,
        acceleration: 34,
        handling: 3.2,
        health: 100,
        maxHealth: 100,
        price: 3800,
      },
      {
        id: 'brawn_hauler_truck',
        name: 'Brawn Hauler Utility',
        category: 'pickup',
        color: '#b45309',
        maxSpeed: 30,
        acceleration: 19,
        handling: 2.1,
        health: 160,
        maxHealth: 160,
        price: 1300,
      },
    ];

    vehicles.forEach((veh) => {
      this.catalog.push({
        id: `shop_v_${veh.id}`,
        category: 'vehicles',
        name: veh.name,
        description: `Max Speed: ${Math.round(veh.maxSpeed * 3.6)} km/h · Armor: ${veh.maxHealth} HP · Custom tuning.`,
        price: veh.price || 2000,
        icon: 'Car',
        vehiclePayload: veh,
      });
    });
  }

  public purchaseItem(
    itemId: string,
    playerMoney: number,
    inventory: WeaponInventory,
    onSuccess: (newBalance: number, item: ShopItem) => void,
    onSpawnVehicle?: (def: VehicleDef) => void,
    onApplySkill?: (skill: SkillDef) => void
  ): { success: boolean; message: string } {
    const item = this.catalog.find((i) => i.id === itemId);
    if (!item) {
      return { success: false, message: 'Item not found in catalog.' };
    }

    if (playerMoney < item.price) {
      return {
        success: false,
        message: `Insufficient funds! Need $${item.price.toLocaleString()}, you have $${playerMoney.toLocaleString()}.`,
      };
    }

    // Process Skill
    if (item.category === 'skills' && item.skillPayload) {
      if (this.unlockedSkills.has(item.skillPayload.id)) {
        return { success: false, message: 'Skill already acquired!' };
      }
      this.unlockedSkills.set(item.skillPayload.id, { ...item.skillPayload, unlocked: true });
      soundManager.playMissionComplete();
      onSuccess(playerMoney - item.price, item);
      if (onApplySkill) onApplySkill(item.skillPayload);
      return {
        success: true,
        message: `Unlocked Skill: ${item.name}! Effects applied immediately.`,
      };
    }

    // Process Weapon
    if (item.category === 'weapons' && item.weaponPayload) {
      const added = inventory.addWeapon({ ...item.weaponPayload });
      if (!added) {
        return {
          success: false,
          message: `Inventory full! Maximum ${inventory.maxWeapons} weapons allowed.`,
        };
      }
      soundManager.playMissionComplete();
      onSuccess(playerMoney - item.price, item);
      return {
        success: true,
        message: `Acquired ${item.name}! Equipped immediately into your tactical inventory.`,
      };
    }

    // Process Ammo
    if (item.category === 'ammo') {
      inventory.replenishAllReserves();
      soundManager.playReload();
      onSuccess(playerMoney - item.price, item);
      return {
        success: true,
        message: 'All weapon ammunition reserve pools fully replenished!',
      };
    }

    // Process Vehicle
    if (item.category === 'vehicles' && item.vehiclePayload) {
      soundManager.playMissionComplete();
      onSuccess(playerMoney - item.price, item);
      if (onSpawnVehicle) {
        onSpawnVehicle(item.vehiclePayload);
      }
      return {
        success: true,
        message: `Purchased ${item.name}! Delivered immediately beside your position.`,
      };
    }

    return { success: false, message: 'Unknown transaction error.' };
  }
}
