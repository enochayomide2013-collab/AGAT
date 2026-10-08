import * as THREE from 'three';
import { NPCManager } from './NPCManager';
import { soundManager } from './SoundManager';
import { VehicleManager } from './VehicleManager';

export type PursuitStatus = 'clear' | 'pursuit' | 'evading';

export class WantedLevel {
  public stars: number = 0; // 0 to 5 star threat meter
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
  private maxAllowedPoliceSpawns: number = 10;
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

  public getEvasionProgress(): number {
    if (this.status !== 'evading' || this.maxEvasionTime <= 0) return 0;
    return Math.max(0, Math.min(1, this.evasionTimer / this.maxEvasionTime));
  }

  // --- RECORD SUSPICIOUS ACTIONS ---

  public recordGunfire(pos: THREE.Vector3) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(20);
  }

  public recordVehicleTheft(pos: THREE.Vector3, isPolice = false) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(isPolice ? 55 : 30);
  }

  public recordAssault(pos: THREE.Vector3, isOfficer = false) {
    this.lastCrimePos.copy(pos);
    this.lastCrimeTime = performance.now();
    this.addHeat(isOfficer ? 60 : 25);
  }

  public addHeat(amount: number) {
    this.heat = Math.min(100, this.heat + amount);

    // Calculate 1 to 5 stars
    const previousStars = this.stars;
    if (this.heat >= 90) {
      this.stars = 5;
    } else if (this.heat >= 72) {
      this.stars = 4;
    } else if (this.heat >= 52) {
      this.stars = 3;
    } else if (this.heat >= 34) {
      this.stars = 2;
    } else if (this.heat >= 15) {
      this.stars = 1;
    } else {
      this.stars = 0;
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
    const detectionRadii = [0, 32, 48, 65, 80, 100];
    const detectionRadius = detectionRadii[this.stars] || 35;

    if (nearestPoliceDist < detectionRadius) {
      // In active sight / pursuit
      this.status = 'pursuit';
      this.evasionTimer = this.maxEvasionTime;
    } else {
      // Out of sight, evading and cooling down
      this.status = 'evading';
      this.evasionTimer -= delta;

      // Slowly bleed heat
      this.heat = Math.max(0, this.heat - delta * 3.5);

      if (this.evasionTimer <= 0) {
        // Drop 1 star
        this.stars--;
        if (this.stars > 0) {
          this.evasionTimer = 10;
          const starHeats = [0, 20, 40, 60, 80, 95];
          this.heat = starHeats[this.stars];
        } else {
          this.clearWanted();
        }
      }
    }

    // 3. Dynamic Police Reinforcement Spawning
    this.maxAllowedPoliceSpawns = this.stars >= 4 ? 12 : this.stars >= 2 ? 8 : 4;
    if (this.status === 'pursuit' && this.spawnCooldown <= 0 && this.activePoliceSpawns < this.maxAllowedPoliceSpawns) {
      this.spawnPoliceReinforcements(playerPos);
      this.spawnCooldown = this.stars >= 4 ? 8 : this.stars >= 2 ? 12 : 16;
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
