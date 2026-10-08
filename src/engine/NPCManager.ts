import * as THREE from 'three';
import { NPCData } from '../types/game';
import { WorldBuilder } from './WorldBuilder';

export interface ActiveNPC {
  data: NPCData;
  mesh: THREE.Group;
  legs: [THREE.Mesh, THREE.Mesh];
  arms: [THREE.Mesh, THREE.Mesh];
  head: THREE.Mesh;
  walkCycle: number;
  fleeTimer: number;
  shootCooldown: number;
  isDefeated: boolean;
}

export class NPCManager {
  public scene: THREE.Scene;
  public worldBuilder: WorldBuilder;
  public npcs: ActiveNPC[] = [];

  constructor(scene: THREE.Scene, worldBuilder: WorldBuilder) {
    this.scene = scene;
    this.worldBuilder = worldBuilder;
  }

  public initCivilianCrowd() {
    // Generate civilians across sidewalk grid
    const clothingColors = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#ec4899', '#64748b', '#06b6d4'];
    const names = [
      'Marcus Cole', 'Sarah Chen', 'Darius Vance', 'Maya Lin', 'Elijah Ward',
      'Elena Rostova', 'Jackson Miller', 'Chloe Adams', 'Ray Santos', 'Zoe King'
    ];

    for (let i = 0; i < 24; i++) {
      const seg = this.worldBuilder.roadSegments[i % this.worldBuilder.roadSegments.length];
      const t = Math.random();
      const x = seg.start.x + (seg.end.x - seg.start.x) * t + (Math.random() > 0.5 ? 9 : -9);
      const z = seg.start.z + (seg.end.z - seg.start.z) * t + (Math.random() > 0.5 ? 9 : -9);

      this.spawnNPC({
        id: `civ_${i}`,
        type: 'civilian',
        name: names[i % names.length],
        x,
        y: 0,
        z,
        rotation: Math.random() * Math.PI * 2,
        speed: 1.4 + Math.random() * 0.8,
        targetX: x + (Math.random() - 0.5) * 40,
        targetZ: z + (Math.random() - 0.5) * 40,
        state: 'walking',
        health: 50,
        maxHealth: 50,
        clothingColor: clothingColors[i % clothingColors.length],
      });
    }

    // Spawn 2 Police Officers guarding Police HQ
    this.spawnNPC({
      id: 'officer_1',
      type: 'police',
      name: 'Officer Daniels',
      x: 116,
      y: 0,
      z: -110,
      rotation: Math.PI,
      speed: 2.2,
      targetX: 116,
      targetZ: -105,
      state: 'idle',
      health: 80,
      maxHealth: 80,
      clothingColor: '#1e3a8a',
    });

    this.spawnNPC({
      id: 'officer_2',
      type: 'police',
      name: 'Officer Reyes',
      x: 124,
      y: 0,
      z: -110,
      rotation: Math.PI,
      speed: 2.2,
      targetX: 124,
      targetZ: -105,
      state: 'idle',
      health: 80,
      maxHealth: 80,
      clothingColor: '#1e3a8a',
    });
  }

  public spawnSyndicateEnemies(centerX: number, centerZ: number, count = 4) {
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const x = centerX + Math.cos(angle) * (6 + Math.random() * 4);
      const z = centerZ + Math.sin(angle) * (6 + Math.random() * 4);

      this.spawnNPC({
        id: `hostile_syndicate_${Date.now()}_${i}`,
        type: 'hostile',
        name: `Syndicate Operative #${i + 1}`,
        x,
        y: 0,
        z,
        rotation: angle + Math.PI,
        speed: 2.6,
        targetX: x,
        targetZ: z,
        state: 'idle',
        health: 70,
        maxHealth: 70,
        weaponId: 'arc9_stunner',
        clothingColor: '#18181b', // Black tactical syndicate gear
      });
    }
  }

  public spawnNPC(data: NPCData): ActiveNPC {
    const group = new THREE.Group();
    group.position.set(data.x, data.y, data.z);
    group.rotation.y = data.rotation;

    // Torso / Jacket
    const torsoMat = new THREE.MeshStandardMaterial({
      color: data.clothingColor,
      roughness: 0.7,
    });
    const torsoGeo = new THREE.BoxGeometry(0.55, 0.75, 0.3);
    const torso = new THREE.Mesh(torsoGeo, torsoMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd4a373, roughness: 0.8 });
    const headGeo = new THREE.BoxGeometry(0.32, 0.35, 0.32);
    const head = new THREE.Mesh(headGeo, skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    // Hair or Police Cap
    if (data.type === 'police') {
      const capGeo = new THREE.BoxGeometry(0.36, 0.12, 0.4);
      const capMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a });
      const cap = new THREE.Mesh(capGeo, capMat);
      cap.position.y = 1.9;
      group.add(cap);
    }

    // Legs
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.8 });
    const legGeo = new THREE.BoxGeometry(0.2, 0.75, 0.22);

    const leftLeg = new THREE.Mesh(legGeo, pantsMat);
    leftLeg.position.set(-0.14, 0.38, 0);
    leftLeg.castShadow = true;
    group.add(leftLeg);

    const rightLeg = new THREE.Mesh(legGeo, pantsMat);
    rightLeg.position.set(0.14, 0.38, 0);
    rightLeg.castShadow = true;
    group.add(rightLeg);

    // Arms
    const armGeo = new THREE.BoxGeometry(0.16, 0.65, 0.18);
    const leftArm = new THREE.Mesh(armGeo, torsoMat);
    leftArm.position.set(-0.35, 1.1, 0);
    leftArm.castShadow = true;
    group.add(leftArm);

    const rightArm = new THREE.Mesh(armGeo, torsoMat);
    rightArm.position.set(0.35, 1.1, 0);
    rightArm.castShadow = true;
    group.add(rightArm);

    this.scene.add(group);

    const activeNPC: ActiveNPC = {
      data,
      mesh: group,
      legs: [leftLeg, rightLeg],
      arms: [leftArm, rightArm],
      head,
      walkCycle: Math.random() * Math.PI * 2,
      fleeTimer: 0,
      shootCooldown: Math.random() * 2,
      isDefeated: false,
    };

    this.npcs.push(activeNPC);
    return activeNPC;
  }

  public update(
    delta: number,
    playerPos: THREE.Vector3,
    wantedLevel: number,
    onEnemyAttackPlayer?: (damage: number) => void
  ) {
    for (const npc of this.npcs) {
      if (npc.isDefeated) continue;

      const distToPlayer = playerPos.distanceTo(npc.mesh.position);

      // --- POLICE RESPONSE ---
      if (npc.data.type === 'police') {
        if (wantedLevel > 0 && distToPlayer < 70) {
          // Pursue player
          npc.data.state = 'attacking';
          const dx = playerPos.x - npc.mesh.position.x;
          const dz = playerPos.z - npc.mesh.position.z;
          npc.data.rotation = Math.atan2(dx, dz);
          npc.mesh.rotation.y = npc.data.rotation;

          if (distToPlayer > 8) {
            // Move toward player
            const step = npc.data.speed * 1.5 * delta;
            npc.mesh.position.x += Math.sin(npc.data.rotation) * step;
            npc.mesh.position.z += Math.cos(npc.data.rotation) * step;
            this.animateLegs(npc, delta * 8);
          } else {
            // In range: issue arrest/fire non-lethal stunner
            npc.shootCooldown -= delta;
            if (npc.shootCooldown <= 0 && onEnemyAttackPlayer) {
              npc.shootCooldown = 1.8;
              onEnemyAttackPlayer(12);
            }
          }
        }
      }

      // --- HOSTILE SYNDICATE BEHAVIOR ---
      else if (npc.data.type === 'hostile') {
        if (distToPlayer < 50) {
          npc.data.state = 'attacking';
          const dx = playerPos.x - npc.mesh.position.x;
          const dz = playerPos.z - playerPos.z;
          npc.data.rotation = Math.atan2(dx, playerPos.z - npc.mesh.position.z);
          npc.mesh.rotation.y = npc.data.rotation;

          // Attack in bursts
          npc.shootCooldown -= delta;
          if (npc.shootCooldown <= 0 && onEnemyAttackPlayer) {
            npc.shootCooldown = 1.4 + Math.random() * 0.8;
            onEnemyAttackPlayer(15);
          }
        }
      }

      // --- CIVILIAN WALKING & FLEEING ---
      else {
        if (npc.fleeTimer > 0) {
          npc.fleeTimer -= delta;
          // Run away from player
          const dx = npc.mesh.position.x - playerPos.x;
          const dz = npc.mesh.position.z - playerPos.z;
          npc.data.rotation = Math.atan2(dx, dz);
          npc.mesh.rotation.y = npc.data.rotation;

          const step = npc.data.speed * 2.2 * delta;
          npc.mesh.position.x += Math.sin(npc.data.rotation) * step;
          npc.mesh.position.z += Math.cos(npc.data.rotation) * step;
          this.animateLegs(npc, delta * 10);
        } else {
          // Casual walking
          const dx = npc.data.targetX - npc.mesh.position.x;
          const dz = npc.data.targetZ - npc.mesh.position.z;
          const dist = Math.sqrt(dx * dx + dz * dz);

          if (dist < 2) {
            // Pick new target within neighborhood
            npc.data.targetX = npc.mesh.position.x + (Math.random() - 0.5) * 50;
            npc.data.targetZ = npc.mesh.position.z + (Math.random() - 0.5) * 50;
          } else {
            npc.data.rotation = Math.atan2(dx, dz);
            npc.mesh.rotation.y = npc.data.rotation;
            const step = npc.data.speed * delta;
            npc.mesh.position.x += Math.sin(npc.data.rotation) * step;
            npc.mesh.position.z += Math.cos(npc.data.rotation) * step;
            this.animateLegs(npc, delta * 5);
          }
        }
      }
    }
  }

  private animateLegs(npc: ActiveNPC, speedMultiplier: number) {
    npc.walkCycle += speedMultiplier;
    const legAngle = Math.sin(npc.walkCycle) * 0.5;
    npc.legs[0].rotation.x = legAngle;
    npc.legs[1].rotation.x = -legAngle;
    npc.arms[0].rotation.x = -legAngle * 0.8;
    npc.arms[1].rotation.x = legAngle * 0.8;
  }

  public alertCivilians(noisePos: THREE.Vector3, radius = 25) {
    for (const npc of this.npcs) {
      if (npc.data.type === 'civilian' && npc.mesh.position.distanceTo(noisePos) < radius) {
        npc.fleeTimer = 6.0;
        npc.data.state = 'fleeing';
      }
    }
  }

  public damageNPC(pos: THREE.Vector3, damage: number, radius = 1.5): { hitNPC: ActiveNPC | null; wasDefeated: boolean } {
    for (const npc of this.npcs) {
      if (npc.isDefeated) continue;
      const d = npc.mesh.position.distanceTo(pos);
      if (d <= radius) {
        npc.data.health -= damage;
        if (npc.data.health <= 0) {
          npc.isDefeated = true;
          npc.data.state = 'defeated';
          // Non-graphic collapse / knock-down rotation
          npc.mesh.rotation.x = Math.PI / 2;
          npc.mesh.position.y = 0.2;
          return { hitNPC: npc, wasDefeated: true };
        }
        return { hitNPC: npc, wasDefeated: false };
      }
    }
    return { hitNPC: null, wasDefeated: false };
  }
}
