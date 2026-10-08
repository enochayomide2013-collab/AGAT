export type WeatherType = 'clear' | 'cloudy' | 'rain' | 'storm';

export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

export interface WeaponDef {
  id: string;
  name: string;
  type: 'pistol' | 'rifle' | 'shotgun' | 'precision';
  damage: number;
  maxAmmo: number;
  currentAmmo: number;
  reserveAmmo: number;
  fireRate: number; // shots per sec
  range: number;
  reloadTime: number; // seconds
  color: string;
  projectileSpeed: number;
  condition: number; // 0-100%
  description?: string;
}

export interface VehicleDef {
  id: string;
  name: string;
  category: 'sedan' | 'sport' | 'suv' | 'pickup' | 'police' | 'van';
  color: string;
  maxSpeed: number;
  acceleration: number;
  handling: number;
  health: number;
  maxHealth: number;
  isPolice?: boolean;
  price?: number;
}

export interface SkillDef {
  id: string;
  name: string;
  description: string;
  price: number;
  unlocked: boolean;
  icon: string;
  category: 'combat' | 'mobility' | 'survival' | 'economy';
  multiplier: number;
}

export interface ShopItem {
  id: string;
  category: 'skills' | 'weapons' | 'vehicles' | 'ammo';
  name: string;
  description: string;
  price: number;
  icon: string;
  weaponPayload?: WeaponDef;
  vehiclePayload?: VehicleDef;
  skillPayload?: SkillDef;
  ammoPayload?: { weaponId: string; amount: number };
}

export interface WeaponPickupEntity {
  id: string;
  weapon: WeaponDef;
  x: number;
  y: number;
  z: number;
  collected: boolean;
}

export interface NPCData {
  id: string;
  type: 'civilian' | 'police' | 'hostile';
  name: string;
  x: number;
  y: number;
  z: number;
  rotation: number;
  speed: number;
  targetX: number;
  targetZ: number;
  state: 'idle' | 'walking' | 'running' | 'reacting' | 'fleeing' | 'attacking' | 'defeated';
  health: number;
  maxHealth: number;
  weaponId?: string;
  clothingColor: string;
}

export interface MissionStep {
  id: string;
  description: string;
  targetPos?: Vector3D;
  targetRadius?: number;
  type: 'goto' | 'collect' | 'drive' | 'defeat' | 'escape_police';
  completed: boolean;
}

export interface Mission {
  id: string;
  title: string;
  subtitle: string;
  briefing: string;
  reward: number;
  steps: MissionStep[];
  currentStepIndex: number;
  status: 'available' | 'active' | 'completed' | 'failed';
  icon: string;
}

export interface GameSaveData {
  version: number;
  player: {
    x: number;
    y: number;
    z: number;
    rotation: number;
    health: number;
    money: number;
    equippedWeaponIndex: number;
    weapons: WeaponDef[];
    wantedLevel: number;
    skills: string[]; // unlocked skill IDs
  };
  timeOfDay: number; // 0 to 24
  weather: WeatherType;
  completedMissionIds: string[];
  activeMissionId: string | null;
  timestamp: number;
}
