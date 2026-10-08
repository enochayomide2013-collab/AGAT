import * as THREE from 'three';
import { NPCManager } from './NPCManager';
import { soundManager } from './SoundManager';
import { VehicleManager } from './VehicleManager';

export type PursuitStatus = 'clear' | 'pursuit' | 'evading';

export class WantedLevel {
  public stars: number = 0; // 0 to 3 star threat meter
  public heat: number = 0; // 0 to 100 heat progress
  public status: PursuitStatus = 'clear';

  public evasionTimer: number = 0;
  public maxEvasionTime: number = 18; // seconds of staying out of sight to clear

  public lastCrimePos: THREE.Vector3 = new THREE.Vector3();
  public lastCrimeTime: number = 0;

  private npcManager: NPCManager;
  private vehicleManager: VehicleManager;

  // Police spawn tracking
  private activePoliceSpawns: number = 0;
  private maxAllowedPoliceSpawns: number = 6;
  private spawnCooldown: number = 0;

  constructor(npcManager: NPCManager, vehicleManager: VehicleManager) {
    this.npcManager = npcManager;
    this.vehicleManager = vehicleManager;
  }

  public getStars(): number {
    return this.stars;
  }

  public getHeatPercent(): number {
    return Math.min(100, Math.round(this.heat));
  }

  public getStatus(): PursuitStatus {
    return this.status;
  }

  // --- RECORD SUSPICIOUS ACTIONS ---

  public recordGunfire(pos: THREE.Vector3) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(25);
  }

  public recordVehicleTheft(pos: THREE.Vector3, isPolice = false) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(isPolice ? 70 : 40);
  }

  public recordAssault(pos: THREE.Vector3, isOfficer = false) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(isOfficer ? 65 : 35);
  }

  public addHeat(amount: number) {
    this.heat = Math.min(100, this.heat + amount);

    // Calculate stars
    const previousStars = this.stars;
    if (this.heat >= 85) {
      this.stars = 3;
    } else if (this.heat >= 50) {
      this.stars = 2;
    } else if (this.heat >= 20) {
      this.stars = 1;
    }

    if (this.stars > 0) {
      this.status = 'pursuit';
      this.evasionTimer = this.maxEvasionTime;
      soundManager.setPoliceSiren(true);

      // Trigger immediate police deployment if threat increased
      if (this.stars > previousStars) {
        this.deployPoliceUnits();
      }
    }
  }

  public clearWanted() {
    this.stars = 0;
    this.heat = 0;
    this.status = 'clear';
    this.evasionTimer = 0;
    soundManager.setPoliceSiren(false);
  }

  public update(delta: number, playerPos: THREE.Vector3) {
    if (this.stars === 0) {
      this.status = 'clear';
      return;
    }

    this.spawnCooldown = Math.max(0, this.spawnCooldown - delta);

    // 1. Check distance to nearest police unit
    let nearestPoliceDist = Infinity;
    for (const npc of this.npcManager.npcs) {
      if (npc.data.type === 'police' && !npc.isDefeated) {
        const d = playerPos.distanceTo(npc.mesh.position);
        if (d < nearestPoliceDist) nearestPoliceDist = d;
      }
    }

    // Also check police vehicle proximity
    for (const v of this.vehicleManager.vehicles) {
      if (v.def.isPolice && !v.isPlayerInside) {
        const d = playerPos.distanceTo(v.mesh.position);
        if (d < nearestPoliceDist) nearestPoliceDist = d;
      }
    }

    // 2. State Machine: In sight vs Evading
    const detectionRadius = this.stars === 3 ? 65 : this.stars === 2 ? 45 : 30;

    if (nearestPoliceDist < detectionRadius) {
      // In active sight / pursuit
      this.status = 'pursuit';
      this.evasionTimer = this.maxEvasionTime;
    } else {
      // Out of sight, evading and cooling down
      this.status = 'evading';
      this.evasionTimer -= delta;

      // Slowly bleed heat
      this.heat = Math.max(0, this.heat - delta * 4);

      if (this.evasionTimer <= 0) {
        // Drop 1 star or clear
        this.stars--;
        if (this.stars > 0) {
          this.evasionTimer = 12;
          this.heat = this.stars === 2 ? 60 : 30;
        } else {
          this.clearWanted();
        }
      }
    }

    // 3. Dynamic Police Reinforcement Spawning
    if (this.status === 'pursuit' && this.spawnCooldown <= 0 && this.activePoliceSpawns < this.maxAllowedPoliceSpawns) {
      this.spawnPoliceReinforcements(playerPos);
      this.spawnCooldown = this.stars === 3 ? 12 : 18;
    }
  }

  private deployPoliceUnits() {
    // Immediate response depending on threat level
    if (this.stars >= 2) {
      this.spawnPoliceInterceptorUnit();
    }
  }

  private spawnPoliceReinforcements(playerPos: THREE.Vector3) {
    if (this.stars >= 2) {
      this.spawnPoliceInterceptorUnit(playerPos);
    } else if (this.stars === 1) {
      this.spawnPatrolOfficers(playerPos);
    }
  }

  private spawnPatrolOfficers(playerPos: THREE.Vector3) {
    // Spawn 2 responding officers down the block
    for (let i = 0; i < 2; i++) {
      const angle = Math.random() * Math.PI * 2;
      const dist = 35 + Math.random() * 15;
      const ox = playerPos.x + Math.cos(angle) * dist;
      const oz = playerPos.z + Math.sin(angle) * dist;

      this.npcManager.spawnNPC({
        id: `responding_officer_${Date.now()}_${i}`,
        type: 'police',
        name: `Metro Officer #${Math.floor(Math.random() * 800 + 100)}`,
        x: ox,
        y: 0,
        z: oz,
        rotation: angle + Math.PI,
        speed: 2.8,
        targetX: playerPos.x,
        targetZ: playerPos.z,
        state: 'attacking',
        health: 90,
        maxHealth: 90,
        clothingColor: '#1e3a8a',
      });
      this.activePoliceSpawns++;
    }
  }

  private spawnPoliceInterceptorUnit(playerPos?: THREE.Vector3) {
    const center = playerPos || this.lastCrimePos;
    const angle = Math.random() * Math.PI * 2;
    const dist = 45 + Math.random() * 20;
    const vx = center.x + Math.cos(angle) * dist;
    const vz = center.z + Math.sin(angle) * dist;

    const policeCar = this.vehicleManager.spawnVehicle(
      {
        id: `police_cruiser_${Date.now()}`,
        name: 'Metro Interceptor Pursuit',
        category: 'police',
        color: '#0f172a',
        maxSpeed: 42,
        acceleration: 26,
        handling: 2.8,
        health: 140,
        maxHealth: 140,
        isPolice: true,
      },
      vx,
      0.4,
      vz,
      angle + Math.PI,
      true
    );

    policeCar.sirenActive = true;
    policeCar.aiTarget = { x: center.x, z: center.z };
    this.activePoliceSpawns++;
  }
}
