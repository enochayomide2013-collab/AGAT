import * as THREE from 'three';
import { VehicleDef } from '../types/game';
import { soundManager } from './SoundManager';
import { WorldBuilder } from './WorldBuilder';

export interface ActiveVehicle {
  id: string;
  def: VehicleDef;
  mesh: THREE.Group;
  speed: number;
  steering: number;
  heading: number;
  health: number;
  isPlayerInside: boolean;
  isAI: boolean;
  aiTarget: { x: number; z: number } | null;
  wheels: THREE.Mesh[];
  headlights: THREE.SpotLight[];
  taillightMesh: THREE.Mesh;
  sirenLight?: THREE.PointLight;
  sirenMesh?: THREE.Mesh;
  sirenActive?: boolean;
}

export class VehicleManager {
  public scene: THREE.Scene;
  public worldBuilder: WorldBuilder;
  public vehicles: ActiveVehicle[] = [];
  public playerVehicle: ActiveVehicle | null = null;
  private headlightMaterial: THREE.MeshStandardMaterial;
  private taillightOffMat: THREE.MeshStandardMaterial;
  private taillightOnMat: THREE.MeshStandardMaterial;

  constructor(scene: THREE.Scene, worldBuilder: WorldBuilder) {
    this.scene = scene;
    this.worldBuilder = worldBuilder;

    this.headlightMaterial = new THREE.MeshStandardMaterial({
      color: 0xffffff,
      emissive: 0xffffff,
      emissiveIntensity: 0.8,
    });

    this.taillightOffMat = new THREE.MeshStandardMaterial({
      color: 0x550000,
    });

    this.taillightOnMat = new THREE.MeshStandardMaterial({
      color: 0xff1111,
      emissive: 0xff0000,
      emissiveIntensity: 1.2,
    });
  }

  public initInitialVehicles() {
    // Spawn player starter car near Safehouse (-115, 35)
    this.spawnVehicle({
      id: 'player_starter_car',
      name: 'Vortex GT Sport',
      category: 'sport',
      color: '#00d2ff',
      maxSpeed: 42,
      acceleration: 24,
      handling: 2.8,
      health: 100,
      maxHealth: 100,
    }, -114, 0.4, 32, 0);

    // Spawn taxi near downtown
    this.spawnVehicle({
      id: 'metro_cab_1',
      name: 'Metro Cab',
      category: 'sedan',
      color: '#facc15',
      maxSpeed: 30,
      acceleration: 18,
      handling: 2.4,
      health: 100,
      maxHealth: 100,
    }, 40, 0.4, -60, Math.PI / 2);

    // Spawn Police cruiser near Police HQ
    this.spawnVehicle({
      id: 'police_patrol_1',
      name: 'Metro Interceptor',
      category: 'police',
      color: '#0f172a',
      maxSpeed: 38,
      acceleration: 22,
      handling: 2.7,
      health: 120,
      maxHealth: 120,
      isPolice: true,
    }, 115, 0.4, -100, Math.PI);

    // Spawn SUV at dealership
    this.spawnVehicle({
      id: 'titan_suv_1',
      name: 'Titan 4x4',
      category: 'suv',
      color: '#15803d',
      maxSpeed: 32,
      acceleration: 19,
      handling: 2.2,
      health: 140,
      maxHealth: 140,
    }, -40, 0.4, 32, -Math.PI / 2);

    // Spawn traffic vehicles
    this.spawnTrafficFleet();
  }

  private spawnTrafficFleet() {
    const trafficConfigs: Array<{ category: 'sedan' | 'sport' | 'suv' | 'van'; color: string; x: number; z: number; heading: number }> = [
      { category: 'sedan', color: '#cbd5e1', x: -80, z: -40, heading: 0 },
      { category: 'suv', color: '#b91c1c', x: 0, z: -80, heading: Math.PI / 2 },
      { category: 'van', color: '#f97316', x: 80, z: 0, heading: Math.PI },
      { category: 'sedan', color: '#1e293b', x: -160, z: 20, heading: -Math.PI / 2 },
      { category: 'sport', color: '#ef4444', x: 40, z: 80, heading: 0 },
      { category: 'sedan', color: '#3b82f6', x: -40, z: 120, heading: Math.PI / 2 },
    ];

    trafficConfigs.forEach((cfg, idx) => {
      this.spawnVehicle({
        id: `traffic_${idx}`,
        name: `City ${cfg.category}`,
        category: cfg.category,
        color: cfg.color,
        maxSpeed: 20 + Math.random() * 8,
        acceleration: 14,
        handling: 2.2,
        health: 100,
        maxHealth: 100,
      }, cfg.x, 0.4, cfg.z, cfg.heading, true);
    });
  }

  public spawnVehicle(
    def: VehicleDef,
    x: number,
    y: number,
    z: number,
    heading = 0,
    isAI = false
  ): ActiveVehicle {
    const group = new THREE.Group();
    group.position.set(x, y, z);
    group.rotation.y = heading;

    // Body dimensions based on category
    let length = 4.2;
    let width = 2.0;
    let height = 1.35;
    if (cfgIsSport(def.category)) {
      length = 4.4;
      width = 2.1;
      height = 1.15;
    } else if (def.category === 'suv') {
      length = 4.6;
      width = 2.2;
      height = 1.6;
    } else if (def.category === 'van') {
      length = 5.0;
      width = 2.2;
      height = 1.9;
    }

    // Chassis mesh
    const bodyMat = new THREE.MeshStandardMaterial({
      color: def.color,
      roughness: 0.35,
      metalness: 0.5,
    });
    const chassisGeo = new THREE.BoxGeometry(width, height * 0.55, length);
    const chassis = new THREE.Mesh(chassisGeo, bodyMat);
    chassis.position.y = height * 0.4;
    chassis.castShadow = true;
    chassis.receiveShadow = true;
    group.add(chassis);

    // Cabin / Roof (tinted glass look)
    const cabinWidth = width * 0.86;
    const cabinLength = length * 0.55;
    const cabinHeight = height * 0.55;
    const cabinGeo = new THREE.BoxGeometry(cabinWidth, cabinHeight, cabinLength);
    const cabinMat = new THREE.MeshStandardMaterial({
      color: 0x181a20,
      roughness: 0.1,
      metalness: 0.8,
    });
    const cabin = new THREE.Mesh(cabinGeo, cabinMat);
    cabin.position.set(0, height * 0.82, -length * 0.05);
    cabin.castShadow = true;
    group.add(cabin);

    // Wheels (4 cylinder meshes)
    const wheels: THREE.Mesh[] = [];
    const wheelRadius = height * 0.28;
    const wheelGeo = new THREE.CylinderGeometry(wheelRadius, wheelRadius, 0.4, 16);
    const wheelMat = new THREE.MeshStandardMaterial({ color: 0x111111, roughness: 0.9 });

    const wheelPositions = [
      [-width * 0.52, wheelRadius, length * 0.32], // front left
      [width * 0.52, wheelRadius, length * 0.32],  // front right
      [-width * 0.52, wheelRadius, -length * 0.32], // rear left
      [width * 0.52, wheelRadius, -length * 0.32],  // rear right
    ];

    wheelPositions.forEach(([wx, wy, wz]) => {
      const wheel = new THREE.Mesh(wheelGeo, wheelMat);
      wheel.rotation.z = Math.PI / 2;
      wheel.position.set(wx, wy, wz);
      wheel.castShadow = true;
      group.add(wheel);
      wheels.push(wheel);
    });

    // Headlights
    const headlights: THREE.SpotLight[] = [];
    const hlGeo = new THREE.BoxGeometry(0.35, 0.2, 0.1);
    [-width * 0.38, width * 0.38].forEach((hx) => {
      const hlMesh = new THREE.Mesh(hlGeo, this.headlightMaterial);
      hlMesh.position.set(hx, height * 0.45, length * 0.5 + 0.02);
      group.add(hlMesh);

      const spot = new THREE.SpotLight(0xfffbe6, 0, 35, Math.PI / 5, 0.3);
      spot.position.set(hx, height * 0.45, length * 0.5 + 0.1);
      spot.target.position.set(hx, 0, length * 0.5 + 15);
      group.add(spot);
      group.add(spot.target);
      headlights.push(spot);
    });

    // Taillights
    const tlGeo = new THREE.BoxGeometry(width * 0.8, 0.18, 0.1);
    const taillightMesh = new THREE.Mesh(tlGeo, this.taillightOffMat);
    taillightMesh.position.set(0, height * 0.45, -length * 0.5 - 0.02);
    group.add(taillightMesh);

    // Police lightbar & siren if police
    let sirenLight: THREE.PointLight | undefined;
    let sirenMesh: THREE.Mesh | undefined;
    if (def.isPolice) {
      const barGeo = new THREE.BoxGeometry(width * 0.7, 0.22, 0.4);
      const barMat = new THREE.MeshStandardMaterial({ color: 0x0088ff, emissive: 0x0055ff, emissiveIntensity: 1 });
      sirenMesh = new THREE.Mesh(barGeo, barMat);
      sirenMesh.position.set(0, height * 1.15, -length * 0.05);
      group.add(sirenMesh);

      sirenLight = new THREE.PointLight(0x0088ff, 0, 16, 2);
      sirenLight.position.set(0, height * 1.25, -length * 0.05);
      group.add(sirenLight);
    }

    this.scene.add(group);

    const activeVehicle: ActiveVehicle = {
      id: def.id,
      def,
      mesh: group,
      speed: 0,
      steering: 0,
      heading,
      health: def.health,
      isPlayerInside: false,
      isAI,
      aiTarget: isAI ? this.getRandomRoadTarget() : null,
      wheels,
      headlights,
      taillightMesh,
      sirenLight,
      sirenMesh,
      sirenActive: false,
    };

    this.vehicles.push(activeVehicle);
    return activeVehicle;
  }

  public enterVehicle(vehicle: ActiveVehicle) {
    if (this.playerVehicle) return;
    this.playerVehicle = vehicle;
    vehicle.isPlayerInside = true;
    vehicle.isAI = false;

    soundManager.startVehicleEngine();

    // Toggle police siren if police vehicle
    if (vehicle.def.isPolice) {
      vehicle.sirenActive = true;
      soundManager.setPoliceSiren(true);
    }
  }

  public exitVehicle(): THREE.Vector3 {
    if (!this.playerVehicle) return new THREE.Vector3();
    const v = this.playerVehicle;
    v.isPlayerInside = false;
    v.speed = 0;
    this.playerVehicle = null;

    soundManager.stopVehicleEngine();
    if (v.sirenActive) {
      v.sirenActive = false;
      soundManager.setPoliceSiren(false);
    }

    // Return safe exit coordinate slightly to left of car
    const exitOffset = new THREE.Vector3(-2.2, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), v.heading);
    return v.mesh.position.clone().add(exitOffset);
  }

  public update(delta: number, input: { forward: boolean; backward: boolean; left: boolean; right: boolean; handbrake: boolean }, isNight: boolean) {
    for (const v of this.vehicles) {
      if (v.isPlayerInside) {
        this.updatePlayerVehicle(v, delta, input);
      } else if (v.isAI) {
        this.updateAITraffic(v, delta);
      }

      // Update lights
      const hlIntensity = isNight || v.sirenActive ? 2.5 : 0;
      v.headlights.forEach((h) => (h.intensity = hlIntensity));

      // Flashing siren lightbar
      if (v.sirenActive && v.sirenLight && v.sirenMesh) {
        const toggle = Math.sin(Date.now() * 0.012) > 0;
        const color = toggle ? 0x0066ff : 0xff1111;
        v.sirenLight.color.setHex(color);
        v.sirenLight.intensity = 3.5;
        (v.sirenMesh.material as THREE.MeshStandardMaterial).color.setHex(color);
        (v.sirenMesh.material as THREE.MeshStandardMaterial).emissive.setHex(color);
      }
    }
  }

  private updatePlayerVehicle(
    v: ActiveVehicle,
    delta: number,
    input: { forward: boolean; backward: boolean; left: boolean; right: boolean; handbrake: boolean }
  ) {
    const accelRate = v.def.acceleration;
    const maxSpeed = v.def.maxSpeed;
    const handling = v.def.handling;

    // Acceleration & Braking
    let isBraking = false;
    if (input.forward) {
      if (v.speed < 0) {
        v.speed += accelRate * 2.0 * delta; // Braking from reverse
        isBraking = true;
      } else {
        v.speed = Math.min(maxSpeed, v.speed + accelRate * delta);
      }
    } else if (input.backward) {
      if (v.speed > 0) {
        v.speed -= accelRate * 2.5 * delta; // Braking
        isBraking = true;
      } else {
        v.speed = Math.max(-maxSpeed * 0.4, v.speed - accelRate * 0.8 * delta); // Reverse
      }
    } else {
      // Natural friction deceleration
      if (v.speed > 0) v.speed = Math.max(0, v.speed - 12 * delta);
      else if (v.speed < 0) v.speed = Math.min(0, v.speed + 12 * delta);
    }

    if (input.handbrake) {
      isBraking = true;
      v.speed *= Math.max(0, 1 - 4 * delta);
    }

    // Taillight brake glow
    v.taillightMesh.material = isBraking ? this.taillightOnMat : this.taillightOffMat;

    // Steering
    if (Math.abs(v.speed) > 0.5) {
      const dir = v.speed >= 0 ? 1 : -1;
      if (input.left) {
        v.heading += handling * dir * delta;
      }
      if (input.right) {
        v.heading -= handling * dir * delta;
      }
    }

    v.mesh.rotation.y = v.heading;

    // Move forward along heading vector
    const moveDist = v.speed * delta;
    const forwardVec = new THREE.Vector3(
      Math.sin(v.heading) * moveDist,
      0,
      Math.cos(v.heading) * moveDist
    );

    const nextPos = v.mesh.position.clone().add(forwardVec);

    // Collision with world buildings & barriers
    if (this.worldBuilder.checkCollision(nextPos, 1.4)) {
      // Impact crash
      soundManager.playCrash(Math.abs(v.speed) / maxSpeed);
      v.health = Math.max(0, v.health - Math.abs(v.speed) * 0.6);
      v.speed = -v.speed * 0.3; // Rebound
    } else {
      v.mesh.position.copy(nextPos);
    }

    // Spin wheels
    v.wheels.forEach((w) => {
      w.rotation.x += v.speed * delta * 2;
    });

    // Audio RPM update
    soundManager.updateVehicleEngine(Math.abs(v.speed) / maxSpeed, v.speed < 0);
  }

  private updateAITraffic(v: ActiveVehicle, delta: number) {
    if (!v.aiTarget) {
      v.aiTarget = this.getRandomRoadTarget();
      return;
    }

    const dx = v.aiTarget.x - v.mesh.position.x;
    const dz = v.aiTarget.z - v.mesh.position.z;
    const dist = Math.sqrt(dx * dx + dz * dz);

    if (dist < 6) {
      // Arrived at target road waypoint, pick next target
      v.aiTarget = this.getRandomRoadTarget();
      return;
    }

    // Target heading
    const targetHeading = Math.atan2(dx, dz);
    let diff = targetHeading - v.heading;
    while (diff > Math.PI) diff -= Math.PI * 2;
    while (diff < -Math.PI) diff += Math.PI * 2;

    v.heading += Math.sign(diff) * Math.min(Math.abs(diff), 2.2 * delta);
    v.mesh.rotation.y = v.heading;

    // Cruising speed
    const cruiseSpeed = 16;
    v.speed = Math.min(cruiseSpeed, v.speed + 10 * delta);

    const moveDist = v.speed * delta;
    const forwardVec = new THREE.Vector3(
      Math.sin(v.heading) * moveDist,
      0,
      Math.cos(v.heading) * moveDist
    );

    const nextPos = v.mesh.position.clone().add(forwardVec);
    if (!this.worldBuilder.checkCollision(nextPos, 1.3)) {
      v.mesh.position.copy(nextPos);
    } else {
      v.aiTarget = this.getRandomRoadTarget();
    }
  }

  private getRandomRoadTarget(): { x: number; z: number } {
    const segs = this.worldBuilder.roadSegments;
    if (segs.length === 0) return { x: 0, z: 0 };
    const seg = segs[Math.floor(Math.random() * segs.length)];
    const t = Math.random();
    return {
      x: seg.start.x + (seg.end.x - seg.start.x) * t,
      z: seg.start.z + (seg.end.z - seg.start.z) * t,
    };
  }

  public getNearestVehicle(pos: THREE.Vector3, maxDist = 4.0): ActiveVehicle | null {
    let nearest: ActiveVehicle | null = null;
    let minDist = maxDist;

    for (const v of this.vehicles) {
      if (v.isPlayerInside) continue;
      const d = pos.distanceTo(v.mesh.position);
      if (d < minDist) {
        minDist = d;
        nearest = v;
      }
    }

    return nearest;
  }
}

function cfgIsSport(category: string) {
  return category === 'sport';
}
