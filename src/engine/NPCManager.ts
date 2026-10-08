import * as THREE from 'three';
import { NPCData } from '../types/game';
import { audioController } from './AudioController';
import { ActiveVehicle } from './VehicleManager';
import { WorldBuilder } from './WorldBuilder';

export interface RagdollLimb {
  mesh: THREE.Mesh;
  baseOffset: THREE.Vector3;
  targetRot: THREE.Euler;
}

export interface RagdollData {
  active: boolean;
  settled: boolean;
  settleTimer: number;
  centerVel: THREE.Vector3;
  centerAngVel: THREE.Vector3;
  limbs: {
    head: RagdollLimb;
    leftArm: RagdollLimb;
    rightArm: RagdollLimb;
    leftLeg: RagdollLimb;
    rightLeg: RagdollLimb;
  };
}

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
  ragdoll?: RagdollData;

  // Finite State Machine (FSM) state properties
  stateTimer: number; // Duration spent in current FSM state (idle, reacting, running)
  reactionCooldown: number; // Prevents spamming reaction transitions
  idleLookAngle: number;
  reactSourcePos: THREE.Vector3;
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

    for (let i = 0; i < 28; i++) {
      const seg = this.worldBuilder.roadSegments[i % this.worldBuilder.roadSegments.length];
      const t = Math.random();
      const x = seg.start.x + (seg.end.x - seg.start.x) * t + (Math.random() > 0.5 ? 9 : -9);
      const z = seg.start.z + (seg.end.z - seg.start.z) * t + (Math.random() > 0.5 ? 9 : -9);

      // Random initial state between idle and walking
      const initialState = Math.random() > 0.4 ? 'walking' : 'idle';

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
        state: initialState,
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
      stateTimer: 2.0 + Math.random() * 4.0,
      reactionCooldown: 0,
      idleLookAngle: 0,
      reactSourcePos: new THREE.Vector3(),
    };

    this.npcs.push(activeNPC);
    return activeNPC;
  }

  // ==========================================
  // FINITE STATE MACHINE (FSM) UPDATE
  // ==========================================
  public update(
    delta: number,
    playerPos: THREE.Vector3,
    listenerHeading: number,
    wantedLevel: number,
    activeVehicles: ActiveVehicle[] = [],
    isPlayerAiming: boolean = false,
    isPlayerSprinting: boolean = false,
    onEnemyAttackPlayer?: (damage: number) => void,
    onCrimeReported?: (amount: number) => void
  ) {
    // 1. Advance active ragdoll physics simulations
    this.updateRagdolls(delta);

    // 2. Check high-impact vehicle collisions against NPCs
    this.checkVehicleCollisions(activeVehicles, playerPos, listenerHeading, onCrimeReported);

    for (const npc of this.npcs) {
      if (npc.isDefeated) continue;

      const npcPos = npc.mesh.position;
      const distToPlayer = playerPos.distanceTo(npcPos);

      // Decrement timers
      npc.reactionCooldown = Math.max(0, npc.reactionCooldown - delta);
      npc.stateTimer -= delta;

      // --- POLICE AGENT FSM ---
      if (npc.data.type === 'police') {
        if (wantedLevel > 0 && distToPlayer < 75) {
          npc.data.state = 'attacking';
          const dx = playerPos.x - npcPos.x;
          const dz = playerPos.z - npcPos.z;
          npc.data.rotation = Math.atan2(dx, dz);
          npc.mesh.rotation.y = npc.data.rotation;

          if (distToPlayer > 8) {
            const step = npc.data.speed * 1.5 * delta;
            npcPos.x += Math.sin(npc.data.rotation) * step;
            npcPos.z += Math.cos(npc.data.rotation) * step;
            this.animateLegs(npc, delta * 8);
          } else {
            // In range: issue arrest/fire non-lethal stunner
            npc.shootCooldown -= delta;
            if (npc.shootCooldown <= 0 && onEnemyAttackPlayer) {
              npc.shootCooldown = 1.8;
              onEnemyAttackPlayer(12);
            }
          }
        } else {
          npc.data.state = 'idle';
          this.animateIdle(npc, delta);
        }
      }

      // --- HOSTILE SYNDICATE AGENT FSM ---
      else if (npc.data.type === 'hostile') {
        if (distToPlayer < 55) {
          npc.data.state = 'attacking';
          const dx = playerPos.x - npcPos.x;
          const dz = playerPos.z - npcPos.z;
          npc.data.rotation = Math.atan2(dx, dz);
          npc.mesh.rotation.y = npc.data.rotation;

          npc.shootCooldown -= delta;
          if (npc.shootCooldown <= 0 && onEnemyAttackPlayer) {
            npc.shootCooldown = 1.4 + Math.random() * 0.8;
            onEnemyAttackPlayer(15);
          }
        } else {
          npc.data.state = 'idle';
          this.animateIdle(npc, delta);
        }
      }

      // --- CITIZEN FINITE-STATE MACHINE (idle | walking | running | reacting) ---
      else {
        this.updateCitizenFSM(
          npc,
          delta,
          playerPos,
          listenerHeading,
          distToPlayer,
          activeVehicles,
          isPlayerAiming,
          isPlayerSprinting
        );
      }
    }
  }

  private updateCitizenFSM(
    npc: ActiveNPC,
    delta: number,
    playerPos: THREE.Vector3,
    listenerHeading: number,
    distToPlayer: number,
    activeVehicles: ActiveVehicle[],
    isPlayerAiming: boolean,
    isPlayerSprinting: boolean
  ) {
    const npcPos = npc.mesh.position;

    // ----------------------------------------------------
    // SENSING: Check Traffic Events & Vehicle Proximity
    // ----------------------------------------------------
    let nearestThreatPos: THREE.Vector3 | null = null;
    let isVehicleDanger = false;
    let isVehicleHonking = false;

    for (const veh of activeVehicles) {
      const vehPos = veh.mesh.position;
      const dist = vehPos.distanceTo(npcPos);

      // If vehicle is moving close or honking
      if (dist < 6.5 && Math.abs(veh.speed) > 1.5) {
        // Check if moving toward NPC
        const toNPCX = npcPos.x - vehPos.x;
        const toNPCZ = npcPos.z - vehPos.z;
        const vehForwardX = Math.sin(veh.heading);
        const vehForwardZ = Math.cos(veh.heading);
        const dot = toNPCX * vehForwardX + toNPCZ * vehForwardZ;

        if (dot > -2 || dist < 4.0) {
          nearestThreatPos = vehPos;
          isVehicleDanger = true;
          break;
        }
      }
    }

    // ----------------------------------------------------
    // SENSING: Player Proximity Events
    // ----------------------------------------------------
    const isPlayerBump = distToPlayer < 1.8 && isPlayerSprinting;
    const isPlayerAimingAtNPC = isPlayerAiming && distToPlayer < 12.0;

    // Trigger reaction transition if safety compromised
    if (
      npc.reactionCooldown <= 0 &&
      npc.data.state !== 'reacting' &&
      npc.data.state !== 'running' &&
      (isVehicleDanger || isVehicleHonking || isPlayerBump || isPlayerAimingAtNPC)
    ) {
      // TRANSITION TO REACTING STATE
      this.transitionToReacting(
        npc,
        nearestThreatPos || playerPos,
        playerPos,
        listenerHeading,
        isVehicleDanger ? 'traffic' : 'player'
      );
      return;
    }

    // ----------------------------------------------------
    // STATE EXECUTION & TRANSITIONS
    // ----------------------------------------------------
    switch (npc.data.state) {
      // 1. REACTING STATE
      case 'reacting': {
        // Step slightly away from threat source
        const backX = npcPos.x - npc.reactSourcePos.x;
        const backZ = npcPos.z - npc.reactSourcePos.z;
        const backDist = Math.sqrt(backX * backX + backZ * backZ) || 1;
        const backStep = 0.8 * delta;

        npcPos.x += (backX / backDist) * backStep;
        npcPos.z += (backZ / backDist) * backStep;

        // Defensive alarmed posture (arms raised defensively in shock)
        npc.arms[0].rotation.x = -1.2 + Math.sin(npc.stateTimer * 9) * 0.15;
        npc.arms[1].rotation.x = -1.2 + Math.cos(npc.stateTimer * 9) * 0.15;
        npc.head.rotation.x = -0.2; // Head jerked back slightly

        // If threat persists dangerously close (< 3.2m), escalate to RUNNING
        if (isVehicleDanger || (distToPlayer < 2.0 && isPlayerAiming)) {
          this.transitionToRunning(npc, nearestThreatPos || playerPos, 6.0);
          return;
        }

        // When reaction timer expires, return to walking or idle
        if (npc.stateTimer <= 0) {
          if (Math.random() > 0.4) {
            this.transitionToWalking(npc);
          } else {
            this.transitionToIdle(npc, 3.0 + Math.random() * 3.0);
          }
        }
        break;
      }

      // 2. RUNNING STATE (Fleeing Danger)
      case 'running':
      case 'fleeing': {
        // Run rapidly away from threat source
        const runFrom = nearestThreatPos || playerPos;
        const dx = npcPos.x - runFrom.x;
        const dz = npcPos.z - runFrom.z;
        npc.data.rotation = Math.atan2(dx, dz);
        npc.mesh.rotation.y = npc.data.rotation;

        const runSpeed = npc.data.speed * 2.3 * delta;
        npcPos.x += Math.sin(npc.data.rotation) * runSpeed;
        npcPos.z += Math.cos(npc.data.rotation) * runSpeed;

        this.animateLegs(npc, delta * 12);

        // When run timer finishes and far enough from danger
        if (npc.stateTimer <= 0 && distToPlayer > 26 && !isVehicleDanger) {
          // Transition back to calm walking
          this.transitionToWalking(npc);
        }
        break;
      }

      // 3. IDLE STATE (Standing, Looking Around, Weight Shift)
      case 'idle': {
        this.animateIdle(npc, delta);

        // Friendly greeting chance if player passes calmly nearby
        if (distToPlayer < 3.8 && distToPlayer > 1.8 && Math.random() < 0.008) {
          audioController.triggerPedestrianChatter(playerPos, listenerHeading, npcPos, 'greeting');
        }

        // When idle timer ends, pick new destination and walk
        if (npc.stateTimer <= 0) {
          this.transitionToWalking(npc);
        }
        break;
      }

      // 4. WALKING STATE (Strolling Sidewalks)
      case 'walking':
      default: {
        const dx = npc.data.targetX - npcPos.x;
        const dz = npc.data.targetZ - npcPos.z;
        const distToTarget = Math.sqrt(dx * dx + dz * dz);

        if (distToTarget < 2.0) {
          // Reached target waypoint: 35% chance to pause in IDLE, or pick new point
          if (Math.random() < 0.35) {
            this.transitionToIdle(npc, 3.5 + Math.random() * 4.0);
          } else {
            this.pickNewWalkTarget(npc);
          }
        } else {
          npc.data.rotation = Math.atan2(dx, dz);
          npc.mesh.rotation.y = npc.data.rotation;

          const step = npc.data.speed * delta;
          npcPos.x += Math.sin(npc.data.rotation) * step;
          npcPos.z += Math.cos(npc.data.rotation) * step;

          this.animateLegs(npc, delta * 5.5);

          // Ambient street chatter chance
          if (distToPlayer < 12 && Math.random() < 0.003) {
            audioController.triggerPedestrianChatter(playerPos, listenerHeading, npcPos, 'chatter');
          }
        }
        break;
      }
    }
  }

  // ==========================================
  // STATE TRANSITION HELPERS
  // ==========================================
  private transitionToReacting(
    npc: ActiveNPC,
    threatPos: THREE.Vector3,
    playerPos: THREE.Vector3,
    listenerHeading: number,
    _source: 'traffic' | 'player'
  ) {
    npc.data.state = 'reacting';
    npc.stateTimer = 1.8 + Math.random() * 0.8; // React for ~2 seconds
    npc.reactionCooldown = 4.5;
    npc.reactSourcePos.copy(threatPos);

    // Face towards threat in surprise
    const dx = threatPos.x - npc.mesh.position.x;
    const dz = threatPos.z - npc.mesh.position.z;
    npc.mesh.rotation.y = Math.atan2(dx, dz);

    // Trigger 3D spatialized vocal shout / gasp
    audioController.triggerPedestrianChatter(
      playerPos,
      listenerHeading,
      npc.mesh.position,
      'startled'
    );
  }

  public transitionToRunning(npc: ActiveNPC, threatPos: THREE.Vector3, duration = 6.0) {
    npc.data.state = 'running';
    npc.stateTimer = duration;
    npc.fleeTimer = duration;
    npc.reactSourcePos.copy(threatPos);
  }

  private transitionToWalking(npc: ActiveNPC) {
    npc.data.state = 'walking';
    npc.arms[0].rotation.x = 0;
    npc.arms[1].rotation.x = 0;
    npc.head.rotation.x = 0;
    this.pickNewWalkTarget(npc);
  }

  private transitionToIdle(npc: ActiveNPC, duration = 4.0) {
    npc.data.state = 'idle';
    npc.stateTimer = duration;
    npc.arms[0].rotation.x = 0;
    npc.arms[1].rotation.x = 0;
    npc.legs[0].rotation.x = 0;
    npc.legs[1].rotation.x = 0;
    npc.head.rotation.x = 0;
  }

  private pickNewWalkTarget(npc: ActiveNPC) {
    // Pick target in nearby sidewalk bounds
    npc.data.targetX = npc.mesh.position.x + (Math.random() - 0.5) * 45;
    npc.data.targetZ = npc.mesh.position.z + (Math.random() - 0.5) * 45;
  }

  // ==========================================
  // ANIMATIONS
  // ==========================================
  private animateLegs(npc: ActiveNPC, speedMultiplier: number) {
    npc.walkCycle += speedMultiplier;
    const legAngle = Math.sin(npc.walkCycle) * 0.5;
    npc.legs[0].rotation.x = legAngle;
    npc.legs[1].rotation.x = -legAngle;
    npc.arms[0].rotation.x = -legAngle * 0.8;
    npc.arms[1].rotation.x = legAngle * 0.8;
  }

  private animateIdle(npc: ActiveNPC, delta: number) {
    npc.walkCycle += delta * 1.5;
    // Breathing sway
    npc.mesh.position.y = Math.sin(npc.walkCycle) * 0.015;
    // Subtle head turn looking left / right
    npc.head.rotation.y = Math.sin(npc.walkCycle * 0.7) * 0.3;
    // Rest limbs
    npc.legs[0].rotation.x = 0;
    npc.legs[1].rotation.x = 0;
    npc.arms[0].rotation.x = 0;
    npc.arms[1].rotation.x = 0;
  }

  // ==========================================
  // EXTERNAL EVENT TRIGGERS
  // ==========================================
  public alertCivilians(noisePos: THREE.Vector3, radius = 30) {
    for (const npc of this.npcs) {
      if (npc.data.type === 'civilian' && npc.mesh.position.distanceTo(noisePos) < radius) {
        this.transitionToRunning(npc, noisePos, 7.0);
      }
    }
  }

  public onTrafficEvent(eventPos: THREE.Vector3, radius = 12) {
    for (const npc of this.npcs) {
      if (
        npc.data.type === 'civilian' &&
        npc.mesh.position.distanceTo(eventPos) < radius &&
        npc.reactionCooldown <= 0
      ) {
        npc.data.state = 'reacting';
        npc.stateTimer = 2.2;
        npc.reactionCooldown = 4.0;
        npc.reactSourcePos.copy(eventPos);
      }
    }
  }

  public damageNPC(
    pos: THREE.Vector3,
    damage: number,
    radius = 1.5,
    impactVector?: THREE.Vector3
  ): { hitNPC: ActiveNPC | null; wasDefeated: boolean } {
    for (const npc of this.npcs) {
      if (npc.isDefeated) continue;
      const d = npc.mesh.position.distanceTo(pos);
      if (d <= radius) {
        npc.data.health -= damage;
        if (npc.data.health <= 0) {
          const defaultImpact = impactVector || new THREE.Vector3(
            (Math.random() - 0.5) * 3,
            2.5,
            (Math.random() - 0.5) * 3
          );
          this.triggerRagdoll(npc, defaultImpact);
          return { hitNPC: npc, wasDefeated: true };
        }
        // Escalate into running if hit
        this.transitionToRunning(npc, pos, 8.0);
        return { hitNPC: npc, wasDefeated: false };
      }
    }
    return { hitNPC: null, wasDefeated: false };
  }

  // ==========================================
  // RAGDOLL PHYSICS & VEHICLE IMPACT SYSTEM
  // ==========================================
  public triggerRagdoll(npc: ActiveNPC, impactForce: THREE.Vector3) {
    if (npc.isDefeated && npc.ragdoll?.active) return;

    npc.isDefeated = true;
    npc.data.state = 'defeated';

    const upForce = Math.max(1.8, impactForce.y);
    const horizForce = new THREE.Vector3(impactForce.x, 0, impactForce.z);

    // Add random torque for realistic airborne tumbling
    const randomSpin = new THREE.Vector3(
      (Math.random() - 0.5) * 12.0,
      (Math.random() - 0.5) * 8.0,
      (Math.random() - 0.5) * 10.0
    );

    npc.ragdoll = {
      active: true,
      settled: false,
      settleTimer: 0,
      centerVel: new THREE.Vector3(horizForce.x, upForce, horizForce.z),
      centerAngVel: randomSpin,
      limbs: {
        head: {
          mesh: npc.head,
          baseOffset: new THREE.Vector3(0, 1.72, 0),
          targetRot: new THREE.Euler((Math.random() - 0.5) * 0.8, 0, (Math.random() - 0.5) * 0.8),
        },
        leftArm: {
          mesh: npc.arms[0],
          baseOffset: new THREE.Vector3(-0.35, 1.1, 0),
          targetRot: new THREE.Euler(-1.5 + Math.random() * 0.5, 0, -0.8 - Math.random() * 0.8),
        },
        rightArm: {
          mesh: npc.arms[1],
          baseOffset: new THREE.Vector3(0.35, 1.1, 0),
          targetRot: new THREE.Euler(-1.5 + Math.random() * 0.5, 0, 0.8 + Math.random() * 0.8),
        },
        leftLeg: {
          mesh: npc.legs[0],
          baseOffset: new THREE.Vector3(-0.14, 0.38, 0),
          targetRot: new THREE.Euler(0.4 + Math.random() * 0.5, 0, -0.3),
        },
        rightLeg: {
          mesh: npc.legs[1],
          baseOffset: new THREE.Vector3(0.14, 0.38, 0),
          targetRot: new THREE.Euler(-0.4 - Math.random() * 0.5, 0, 0.3),
        },
      },
    };
  }

  private updateRagdolls(delta: number) {
    const gravity = -18.0;

    for (const npc of this.npcs) {
      if (!npc.isDefeated || !npc.ragdoll || !npc.ragdoll.active) continue;
      const rd = npc.ragdoll;

      if (rd.settled) continue;

      // 1. Gravity & Linear Motion
      rd.centerVel.y += gravity * delta;
      npc.mesh.position.addScaledVector(rd.centerVel, delta);

      // 2. Angular Motion & Tumbling
      npc.mesh.rotation.x += rd.centerAngVel.x * delta;
      npc.mesh.rotation.y += rd.centerAngVel.y * delta;
      npc.mesh.rotation.z += rd.centerAngVel.z * delta;

      // 3. Ground Collision & Floor Reaction
      const minFloorY = 0.22; // resting height of body mesh on asphalt
      if (npc.mesh.position.y <= minFloorY) {
        npc.mesh.position.y = minFloorY;

        // Bounce
        if (Math.abs(rd.centerVel.y) > 0.8) {
          rd.centerVel.y = -rd.centerVel.y * 0.32;
        } else {
          rd.centerVel.y = 0;
        }

        // Friction damping on ground
        const horizFriction = Math.pow(0.08, delta);
        rd.centerVel.x *= horizFriction;
        rd.centerVel.z *= horizFriction;

        // Angular damping on ground
        const angDamping = Math.pow(0.04, delta);
        rd.centerAngVel.multiplyScalar(angDamping);
      }

      // 4. Dynamic Limb Flail / Sprawl Inertia
      const speed = rd.centerVel.length();
      const isAirborne = npc.mesh.position.y > minFloorY + 0.05;

      // Head flail
      rd.limbs.head.mesh.rotation.x = THREE.MathUtils.lerp(
        rd.limbs.head.mesh.rotation.x,
        isAirborne ? Math.sin(performance.now() * 0.015) * 0.6 : rd.limbs.head.targetRot.x,
        delta * 8
      );
      rd.limbs.head.mesh.rotation.z = THREE.MathUtils.lerp(
        rd.limbs.head.mesh.rotation.z,
        isAirborne ? Math.cos(performance.now() * 0.015) * 0.5 : rd.limbs.head.targetRot.z,
        delta * 8
      );

      // Arms flail outward in air, sprawl on floor
      const armTargetZLeft = isAirborne ? -1.8 : rd.limbs.leftArm.targetRot.z;
      const armTargetZRight = isAirborne ? 1.8 : rd.limbs.rightArm.targetRot.z;

      rd.limbs.leftArm.mesh.rotation.z = THREE.MathUtils.lerp(
        rd.limbs.leftArm.mesh.rotation.z,
        armTargetZLeft,
        delta * 10
      );
      rd.limbs.leftArm.mesh.rotation.x = THREE.MathUtils.lerp(
        rd.limbs.leftArm.mesh.rotation.x,
        rd.limbs.leftArm.targetRot.x,
        delta * 8
      );

      rd.limbs.rightArm.mesh.rotation.z = THREE.MathUtils.lerp(
        rd.limbs.rightArm.mesh.rotation.z,
        armTargetZRight,
        delta * 10
      );
      rd.limbs.rightArm.mesh.rotation.x = THREE.MathUtils.lerp(
        rd.limbs.rightArm.mesh.rotation.x,
        rd.limbs.rightArm.targetRot.x,
        delta * 8
      );

      // Legs bend/sprawl
      rd.limbs.leftLeg.mesh.rotation.x = THREE.MathUtils.lerp(
        rd.limbs.leftLeg.mesh.rotation.x,
        rd.limbs.leftLeg.targetRot.x,
        delta * 8
      );
      rd.limbs.rightLeg.mesh.rotation.x = THREE.MathUtils.lerp(
        rd.limbs.rightLeg.mesh.rotation.x,
        rd.limbs.rightLeg.targetRot.x,
        delta * 8
      );

      // 5. Settling check
      if (!isAirborne && speed < 0.12 && rd.centerAngVel.length() < 0.2) {
        rd.settleTimer += delta;
        if (rd.settleTimer > 0.35) {
          rd.settled = true;
          rd.centerVel.set(0, 0, 0);
          rd.centerAngVel.set(0, 0, 0);
        }
      }
    }
  }

  private checkVehicleCollisions(
    activeVehicles: ActiveVehicle[],
    playerPos: THREE.Vector3,
    listenerHeading: number,
    onCrimeReported?: (amount: number) => void
  ) {
    for (const veh of activeVehicles) {
      const vehSpeed = Math.abs(veh.speed);
      if (vehSpeed < 2.2) continue; // Only moving vehicles trigger ragdoll collisions

      const vehPos = veh.mesh.position;

      for (const npc of this.npcs) {
        if (npc.isDefeated) continue;

        const npcPos = npc.mesh.position;
        const dist = vehPos.distanceTo(npcPos);

        if (dist < 2.1) {
          // Calculate impact momentum direction
          const impactDir = new THREE.Vector3()
            .subVectors(npcPos, vehPos)
            .normalize();

          const vehHeadingVec = new THREE.Vector3(
            Math.sin(veh.heading),
            0,
            Math.cos(veh.heading)
          );
          impactDir.add(vehHeadingVec).normalize();

          // Launch impulse magnitude proportional to vehicle speed
          const forceMagnitude = Math.max(7.0, vehSpeed * 0.55);
          impactDir.multiplyScalar(forceMagnitude);
          impactDir.y = 2.5 + vehSpeed * 0.15; // Upward toss

          // Apply collision damage
          const damage = vehSpeed * 14.0;
          npc.data.health -= damage;

          // Sound effect & startled vocal scream
          audioController.triggerPedestrianChatter(
            playerPos,
            listenerHeading,
            npcPos,
            'startled'
          );

          if (npc.data.health <= 0 || vehSpeed > 4.2) {
            this.triggerRagdoll(npc, impactDir);

            if (veh.isPlayerInside && onCrimeReported) {
              onCrimeReported(npc.data.type === 'police' ? 2.5 : 1.5);
            }
          } else {
            // Non-fatal knockback: run away from vehicle
            this.transitionToRunning(npc, vehPos, 6.0);
          }
        }
      }
    }
  }
}
