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

export type HairstyleType =
  | 'short_fade'
  | 'mohawk'
  | 'pompadour'
  | 'cyber_ponytail'
  | 'buzz'
  | 'afro'
  | 'long_wavy'
  | 'dreadlocks'
  | 'undercut'
  | 'messy_spikes'
  | 'cornrows'
  | 'slick_back';

export type FacialHairType = 'none' | 'stubble' | 'goatee' | 'full_beard' | 'moustache' | 'chinstrap';
export type EyewearType = 'none' | 'cyber_shades' | 'hud_visor' | 'cyber_eye' | 'aviators' | 'tactical_mask';
export type HeadwearType = 'none' | 'baseball_cap' | 'backwards_cap' | 'beanie' | 'cyber_headphones' | 'tactical_helmet';
export type NoseType = 'straight' | 'button' | 'aquiline' | 'broad';
export type FaceShapeType = 'angular' | 'round' | 'square' | 'sharp';
export type EyebrowStyleType = 'arched' | 'thick' | 'straight' | 'slit';
export type BodyType = 'balanced' | 'muscular' | 'slim' | 'heavy';
export type OutfitType = 'cyber_leather' | 'street_hoodie' | 'tactical_vest' | 'formal_suit' | 'track_jacket' | 'tank_top';
export type PantsType = 'cargo_pants' | 'slim_jeans' | 'joggers' | 'formal_slacks' | 'cyber_armor';
export type ShoesType = 'high_tops' | 'combat_boots' | 'skate_shoes' | 'formal_oxfords';

export interface CharacterCustomization {
  hairstyle: HairstyleType;
  hairColor: string;
  skinTone: string;
  eyeColor: string;
  noseType: NoseType;
  faceShape: FaceShapeType;
  eyebrowStyle: EyebrowStyleType;
  eyebrowColor?: string;
  // Fine Tuning Anatomical Sliders
  noseBridgeWidth?: number; // 0.5 - 1.8
  noseProjection?: number; // 0.5 - 1.8
  eyeSpacing?: number; // 0.6 - 1.5
  eyeDepth?: number; // 0.6 - 1.5
  earLobeSize?: number; // 0.6 - 1.8
  jawAngle?: number; // 0.6 - 1.5
  jawlineDefinition?: number; // 0.6 - 1.5
  facialHair: FacialHairType;
  facialHairColor: string;
  eyewear: EyewearType;
  eyewearColor: string;
  headwear: HeadwearType;
  headwearColor?: string;
  bodyType: BodyType;
  heightScale?: number; // 0.9 to 1.1
  outfit: OutfitType;
  jacketColor: string;
  pantsType: PantsType;
  pantsColor: string;
  shoes: ShoesType;
  shoesColor: string;
}

export interface GameAudioSettings {
  masterVolume: number; // 0-100
  musicVolume: number; // 0-100
  sfxVolume: number; // 0-100
  engineVolume: number; // 0-100
  weatherVolume: number; // 0-100
  isMuted: boolean;
}

export interface GameEnvironmentSettings {
  weather: WeatherType;
  timeOfDay: number; // 0-24
  timeProgression: boolean;
  timeSpeedMultiplier: number; // 1 to 10
  fogDensity: 'off' | 'low' | 'medium' | 'high';
  shadows: 'off' | 'medium' | 'high';
  trafficDensity: 'low' | 'normal' | 'dense';
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

