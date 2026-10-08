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
  type?: 'Delivery' | 'Race' | 'Assault' | 'Heist';
  timeLimit?: number; // Time limit in seconds for delivery or race missions
  timeRemaining?: number; // Current countdown timer in seconds
  elapsedTime?: number; // Total seconds taken to complete the mission
}

export type HairstyleType = 'short_fade' | 'mohawk' | 'pompadour' | 'cyber_ponytail' | 'buzz' | 'afro' | 'long_wavy';
export type FacialHairType = 'none' | 'stubble' | 'goatee' | 'full_beard' | 'moustache';
export type EyewearType = 'none' | 'cyber_shades' | 'hud_visor' | 'cyber_eye';
export type BodyType = 'balanced' | 'muscular' | 'slim';
export type OutfitType = 'cyber_leather' | 'street_hoodie' | 'tactical_vest' | 'formal_suit';

export interface CharacterCustomization {
  hairstyle: HairstyleType;
  hairColor: string;
  skinTone: string;
  facialHair: FacialHairType;
  facialHairColor: string;
  eyewear: EyewearType;
  eyewearColor: string;
  bodyType: BodyType;
  outfit: OutfitType;
  jacketColor: string;
  pantsColor: string;
}

export type RadioStationId = 'off' | 'flash_pop' | 'liberty_rock' | 'pulse_electro' | 'kchat_talk' | 'synthwave' | 'electro' | 'chill';

export interface RadioStationDef {
  id: RadioStationId;
  name: string;
  genre: string;
  frequency: string;
  host: string;
  description: string;
  color: string;
}

export interface BuildingInteriorLocation {
  id: 'diner' | 'shop' | 'apartment' | 'barbershop';
  name: string;
  district: string;
  exteriorPos: Vector3D;
  interiorPos: Vector3D;
  exitPos: Vector3D;
  color: string;
  icon: string;
  description: string;
}

export interface InteriorInteractable {
  id: string;
  interiorId: 'diner' | 'shop' | 'apartment' | 'barbershop';
  name: string;
  actionText: string;
  pos: Vector3D;
  radius: number;
  type: 'heal' | 'buff' | 'shop' | 'customize' | 'rest' | 'music' | 'chat' | 'ammo' | 'cash';
  amount?: number;
}

export interface AlleyTagWallDef {
  id: string;
  name: string;
  district: string;
  pos: Vector3D; // Wall center point in 3D
  standPos: Vector3D; // Where player stands to spray
  normal: Vector3D; // Facing vector (direction perpendicular to wall)
  rotationY: number;
  width: number;
  height: number;
  wallType: 'brick' | 'concrete' | 'corrugated' | 'subway_tile';
  reward: number;
  description: string;
}

export interface TagStreetArtData {
  wallId: string;
  dataUrl: string; // Base64 png of the sprayed artwork
  author: string;
  timestamp: number;
  crewTag?: string;
  sprayColor: string;
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
    customization?: CharacterCustomization;
  };
  timeOfDay: number; // 0 to 24
  weather: WeatherType;
  completedMissionIds: string[];
  activeMissionId: string | null;
  savedStreetArt?: Record<string, string>; // wallId -> base64 dataUrl
  timestamp: number;
}

