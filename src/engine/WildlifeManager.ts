import * as THREE from 'three';
import { soundManager } from './SoundManager';

export type BirdSpecies = 'pigeon' | 'crow' | 'cyber_gull' | 'sparrow';
export type AnimalSpecies = 'rabbit' | 'fox' | 'cat' | 'squirrel';

export interface BirdData {
  id: string;
  species: BirdSpecies;
  group: THREE.Group;
  leftWing: THREE.Mesh;
  rightWing: THREE.Mesh;
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: number;
  pitch: number;
  state: 'perched' | 'idle' | 'flying' | 'startled' | 'circling';
  homePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  flapPhase: number;
  flapSpeed: number;
  idleTimer: number;
  perchY: number;
  scale: number;
}

export interface AnimalData {
  id: string;
  species: AnimalSpecies;
  group: THREE.Group;
  legs: THREE.Mesh[];
  tail: THREE.Mesh;
  head: THREE.Mesh;
  ears: THREE.Mesh[];
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  heading: number;
  state: 'idle' | 'roaming' | 'alert' | 'fleeing';
  homePos: THREE.Vector3;
  targetPos: THREE.Vector3;
  animPhase: number;
  idleTimer: number;
  baseSpeed: number;
  scale: number;
}

export class WildlifeManager {
  private scene: THREE.Scene;
  public birds: BirdData[] = [];
  public animals: AnimalData[] = [];

  // Audio timer throttles
  private lastAmbientChirpTime: number = 0;
  private lastRustleTime: number = 0;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.populateWildlife();
  }

  /**
   * Populate parks and outskirts with procedural birds and small roaming animals.
   */
  public populateWildlife() {
    this.clearAll();

    // 1. CIVIC PARK WILDLIFE (Center: X: -80, Z: -80; Range: X: -130 to -30, Z: -130 to -50)
    const parkBirdCount = 20;
    const speciesList: BirdSpecies[] = ['pigeon', 'cyber_gull', 'sparrow', 'crow'];
    for (let i = 0; i < parkBirdCount; i++) {
      const rx = -120 + Math.random() * 90;
      const rz = -120 + Math.random() * 70;
      // Some on ground, some elevated on trees or benches
      const isElevated = Math.random() > 0.6;
      const ry = isElevated ? 2.5 + Math.random() * 4.0 : 0.12;
      const species = speciesList[Math.floor(Math.random() * speciesList.length)];
      this.spawnBird(new THREE.Vector3(rx, ry, rz), species);
    }

    const parkAnimalCount = 14;
    const animalSpeciesList: AnimalSpecies[] = ['rabbit', 'squirrel', 'cat', 'fox'];
    for (let i = 0; i < parkAnimalCount; i++) {
      const rx = -125 + Math.random() * 95;
      const rz = -125 + Math.random() * 75;
      const species = animalSpeciesList[Math.floor(Math.random() * animalSpeciesList.length)];
      this.spawnAnimal(new THREE.Vector3(rx, 0.1, rz), species);
    }

    // 2. AGAT CITY OUTSKIRTS WILDLIFE (Borders & Outer Perimeters)
    // Outskirt regions: North (Z: -200), East (X: 190), West (X: -200), South (Z: 190)
    const outskirtSpawns: Array<{ x: number; z: number }> = [
      // North Hills Outskirts
      { x: -160, z: -210 }, { x: -80, z: -220 }, { x: 0, z: -215 }, { x: 80, z: -210 }, { x: 150, z: -205 },
      // South Fringe Outskirts
      { x: -150, z: 200 }, { x: -60, z: 210 }, { x: 40, z: 205 }, { x: 130, z: 215 },
      // East Outskirts
      { x: 200, z: -100 }, { x: 210, z: 0 }, { x: 205, z: 100 },
      // West Cliffs Outskirts
      { x: -210, z: -80 }, { x: -205, z: 40 }, { x: -215, z: 120 },
    ];

    for (const point of outskirtSpawns) {
      // 1-2 Birds per outskirt node
      const birdCount = 1 + Math.floor(Math.random() * 2);
      for (let b = 0; b < birdCount; b++) {
        const bx = point.x + (Math.random() * 20 - 10);
        const bz = point.z + (Math.random() * 20 - 10);
        const species = speciesList[Math.floor(Math.random() * speciesList.length)];
        this.spawnBird(new THREE.Vector3(bx, 0.15, bz), species);
      }

      // 1 Animal per outskirt node
      const ax = point.x + (Math.random() * 24 - 12);
      const az = point.z + (Math.random() * 24 - 12);
      const animalSpecies = animalSpeciesList[Math.floor(Math.random() * animalSpeciesList.length)];
      this.spawnAnimal(new THREE.Vector3(ax, 0.1, az), animalSpecies);
    }
  }

  /**
   * Spawn procedural 3D bird mesh.
   */
  private spawnBird(pos: THREE.Vector3, species: BirdSpecies): BirdData {
    const group = new THREE.Group();
    group.position.copy(pos);

    let bodyColor = 0x71717a;
    let wingColor = 0x52525b;
    let headColor = 0x3f3f46;
    let beakColor = 0xf59e0b;
    let scale = 0.45;

    if (species === 'crow') {
      bodyColor = 0x18181b;
      wingColor = 0x09090b;
      headColor = 0x27272a;
      beakColor = 0x18181b;
      scale = 0.52;
    } else if (species === 'cyber_gull') {
      bodyColor = 0xf8fafc;
      wingColor = 0x38bdf8;
      headColor = 0xffffff;
      beakColor = 0x38bdf8;
      scale = 0.55;
    } else if (species === 'sparrow') {
      bodyColor = 0x78350f;
      wingColor = 0x92400e;
      headColor = 0xb45309;
      beakColor = 0xf59e0b;
      scale = 0.35;
    }

    const matBody = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.6 });
    const matWing = new THREE.MeshStandardMaterial({ color: wingColor, roughness: 0.5, side: THREE.DoubleSide });
    const matHead = new THREE.MeshStandardMaterial({ color: headColor, roughness: 0.6 });
    const matBeak = new THREE.MeshBasicMaterial({ color: beakColor });

    // Torso Body
    const bodyGeo = new THREE.ConeGeometry(0.18, 0.5, 5);
    bodyGeo.rotateX(-Math.PI / 2);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Head
    const headGeo = new THREE.SphereGeometry(0.12, 6, 6);
    const headMesh = new THREE.Mesh(headGeo, matHead);
    headMesh.position.set(0, 0.12, 0.22);
    group.add(headMesh);

    // Beak
    const beakGeo = new THREE.ConeGeometry(0.04, 0.14, 4);
    beakGeo.rotateX(Math.PI / 2);
    const beakMesh = new THREE.Mesh(beakGeo, matBeak);
    beakMesh.position.set(0, 0.12, 0.32);
    group.add(beakMesh);

    // Wings (Hinged at shoulders)
    const wingGeo = new THREE.PlaneGeometry(0.45, 0.22);

    // Left Wing Pivot
    const leftWingGroup = new THREE.Group();
    leftWingGroup.position.set(-0.1, 0.08, 0.05);
    const leftWingMesh = new THREE.Mesh(wingGeo, matWing);
    leftWingMesh.position.set(-0.22, 0, 0);
    leftWingMesh.rotation.x = Math.PI / 2;
    leftWingGroup.add(leftWingMesh);
    group.add(leftWingGroup);

    // Right Wing Pivot
    const rightWingGroup = new THREE.Group();
    rightWingGroup.position.set(0.1, 0.08, 0.05);
    const rightWingMesh = new THREE.Mesh(wingGeo, matWing);
    rightWingMesh.position.set(0.22, 0, 0);
    rightWingMesh.rotation.x = Math.PI / 2;
    rightWingGroup.add(rightWingMesh);
    group.add(rightWingGroup);

    // Tail Feather Quad
    const tailGeo = new THREE.PlaneGeometry(0.22, 0.3);
    const tailMesh = new THREE.Mesh(tailGeo, matWing);
    tailMesh.rotation.x = Math.PI / 2.2;
    tailMesh.position.set(0, 0.02, -0.32);
    group.add(tailMesh);

    group.scale.set(scale, scale, scale);
    this.scene.add(group);

    const bird: BirdData = {
      id: `bird_${Math.random().toString(36).substr(2, 7)}`,
      species,
      group,
      leftWing: leftWingMesh,
      rightWing: rightWingMesh,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      heading: Math.random() * Math.PI * 2,
      pitch: 0,
      state: 'perched',
      homePos: pos.clone(),
      targetPos: pos.clone(),
      flapPhase: Math.random() * Math.PI * 2,
      flapSpeed: 6.0,
      idleTimer: 2.0 + Math.random() * 5.0,
      perchY: pos.y,
      scale,
    };

    group.rotation.y = bird.heading;
    this.birds.push(bird);
    return bird;
  }

  /**
   * Spawn procedural 3D small roaming animal mesh.
   */
  private spawnAnimal(pos: THREE.Vector3, species: AnimalSpecies): AnimalData {
    const group = new THREE.Group();
    group.position.copy(pos);

    let bodyColor = 0xd97706; // Fox default orange
    let bellyColor = 0xffedd5;
    let earColor = 0x92400e;
    let baseSpeed = 1.6;
    let scale = 0.5;

    if (species === 'rabbit') {
      bodyColor = 0xe2e8f0;
      bellyColor = 0xffffff;
      earColor = 0xf472b6;
      baseSpeed = 1.4;
      scale = 0.42;
    } else if (species === 'cat') {
      bodyColor = 0x334155;
      bellyColor = 0x94a3b8;
      earColor = 0x1e293b;
      baseSpeed = 1.8;
      scale = 0.45;
    } else if (species === 'squirrel') {
      bodyColor = 0xb45309;
      bellyColor = 0xfde68a;
      earColor = 0x78350f;
      baseSpeed = 2.0;
      scale = 0.35;
    }

    const matBody = new THREE.MeshStandardMaterial({ color: bodyColor, roughness: 0.7 });
    const matBelly = new THREE.MeshStandardMaterial({ color: bellyColor, roughness: 0.8 });
    const matEar = new THREE.MeshStandardMaterial({ color: earColor, roughness: 0.6 });

    // Torso Body Box
    const bodyGeo = new THREE.BoxGeometry(0.24, 0.22, 0.45);
    const bodyMesh = new THREE.Mesh(bodyGeo, matBody);
    bodyMesh.position.set(0, 0.18, 0);
    bodyMesh.castShadow = true;
    group.add(bodyMesh);

    // Belly underlay
    const bellyGeo = new THREE.BoxGeometry(0.2, 0.12, 0.36);
    const bellyMesh = new THREE.Mesh(bellyGeo, matBelly);
    bellyMesh.position.set(0, 0.12, 0);
    group.add(bellyMesh);

    // Head Box/Sphere
    const headGeo = new THREE.BoxGeometry(0.18, 0.16, 0.22);
    const headMesh = new THREE.Mesh(headGeo, matBody);
    headMesh.position.set(0, 0.26, 0.24);
    group.add(headMesh);

    // Eyes
    const eyeGeo = new THREE.SphereGeometry(0.025, 4, 4);
    const eyeMat = new THREE.MeshBasicMaterial({ color: 0x000000 });
    const leftEye = new THREE.Mesh(eyeGeo, eyeMat);
    leftEye.position.set(-0.08, 0.28, 0.32);
    const rightEye = new THREE.Mesh(eyeGeo, eyeMat);
    rightEye.position.set(0.08, 0.28, 0.32);
    group.add(leftEye);
    group.add(rightEye);

    // Ears
    const ears: THREE.Mesh[] = [];
    const earHeight = species === 'rabbit' ? 0.35 : 0.14;
    const earGeo = new THREE.BoxGeometry(0.04, earHeight, 0.05);
    
    const leftEar = new THREE.Mesh(earGeo, matEar);
    leftEar.position.set(-0.06, 0.32 + earHeight / 2, 0.22);
    group.add(leftEar);
    ears.push(leftEar);

    const rightEar = new THREE.Mesh(earGeo, matEar);
    rightEar.position.set(0.06, 0.32 + earHeight / 2, 0.22);
    group.add(rightEar);
    ears.push(rightEar);

    // 4 Legs
    const legs: THREE.Mesh[] = [];
    const legGeo = new THREE.BoxGeometry(0.06, 0.18, 0.06);
    const legOffsets = [
      [-0.1, 0.09, 0.14],  // Front Left
      [0.1, 0.09, 0.14],   // Front Right
      [-0.1, 0.09, -0.14], // Back Left
      [0.1, 0.09, -0.14],  // Back Right
    ];

    for (const [lx, ly, lz] of legOffsets) {
      const legMesh = new THREE.Mesh(legGeo, matBody);
      legMesh.position.set(lx, ly, lz);
      group.add(legMesh);
      legs.push(legMesh);
    }

    // Tail
    let tailGeo: THREE.BufferGeometry = new THREE.BoxGeometry(0.08, 0.08, 0.32);
    if (species === 'fox' || species === 'squirrel') {
      tailGeo = new THREE.ConeGeometry(0.1, 0.4, 5);
      tailGeo.rotateX(-Math.PI / 2.5);
    } else if (species === 'rabbit') {
      tailGeo = new THREE.SphereGeometry(0.07, 5, 5);
    }
    const tailMesh = new THREE.Mesh(tailGeo, matEar);
    tailMesh.position.set(0, 0.22, -0.26);
    group.add(tailMesh);

    group.scale.set(scale, scale, scale);
    this.scene.add(group);

    const animal: AnimalData = {
      id: `animal_${Math.random().toString(36).substr(2, 7)}`,
      species,
      group,
      legs,
      tail: tailMesh,
      head: headMesh,
      ears,
      position: pos.clone(),
      velocity: new THREE.Vector3(),
      heading: Math.random() * Math.PI * 2,
      state: 'idle',
      homePos: pos.clone(),
      targetPos: pos.clone(),
      animPhase: Math.random() * Math.PI * 2,
      idleTimer: 1.5 + Math.random() * 4.0,
      baseSpeed,
      scale,
    };

    group.rotation.y = animal.heading;
    this.animals.push(animal);
    return animal;
  }

  /**
   * Main game tick update loop.
   */
  public update(dt: number, playerPos: THREE.Vector3) {
    const now = performance.now() * 0.001;

    // Ambient random bird chirps near player if near park/outskirt
    if (now - this.lastAmbientChirpTime > 6.0) {
      const distToPark = playerPos.distanceTo(new THREE.Vector3(-80, 0, -80));
      if (distToPark < 120 || Math.abs(playerPos.x) > 150 || Math.abs(playerPos.z) > 150) {
        if (Math.random() < 0.45) {
          soundManager.playBirdChirp();
          this.lastAmbientChirpTime = now;
        }
      }
    }

    // 1. UPDATE BIRDS
    for (const bird of this.birds) {
      this.updateBird(bird, dt, playerPos, now);
    }

    // 2. UPDATE ANIMALS
    for (const animal of this.animals) {
      this.updateAnimal(animal, dt, playerPos, now);
    }
  }

  private updateBird(bird: BirdData, dt: number, playerPos: THREE.Vector3, now: number) {
    const distToPlayer = bird.position.distanceTo(playerPos);

    // REACTIVITY 1: Player Proximity Scatter (< 8.5m)
    if (distToPlayer < 8.5 && bird.state !== 'startled' && bird.state !== 'flying') {
      bird.state = 'startled';
      const escapeDir = new THREE.Vector3().subVectors(bird.position, playerPos).normalize();
      escapeDir.y = 1.2 + Math.random() * 0.8;
      escapeDir.normalize();
      bird.velocity.copy(escapeDir).multiplyScalar(8 + Math.random() * 4);
      bird.flapSpeed = 26.0;
      soundManager.playBirdTakeoff();
    }

    // STATE MACHINE
    switch (bird.state) {
      case 'perched':
      case 'idle': {
        // Wings folded
        bird.leftWing.rotation.z = -0.1;
        bird.rightWing.rotation.z = 0.1;

        bird.idleTimer -= dt;
        // Pecking / looking around animation
        bird.group.rotation.x = Math.sin(now * 3.0 + bird.flapPhase) * 0.08;

        if (bird.idleTimer <= 0) {
          bird.idleTimer = 3.0 + Math.random() * 6.0;
          // 25% chance to take flight and roam/circle
          if (Math.random() < 0.25) {
            bird.state = 'flying';
            bird.targetPos.set(
              bird.homePos.x + (Math.random() * 60 - 30),
              6 + Math.random() * 10,
              bird.homePos.z + (Math.random() * 60 - 30)
            );
          }
        }
        break;
      }

      case 'startled': {
        // Move according to escape velocity upward
        bird.position.addScaledVector(bird.velocity, dt);
        bird.flapPhase += bird.flapSpeed * dt;

        // Wing flapping
        const wingAngle = Math.sin(bird.flapPhase) * 0.7;
        bird.leftWing.rotation.z = wingAngle;
        bird.rightWing.rotation.z = -wingAngle;

        bird.heading = Math.atan2(bird.velocity.x, bird.velocity.z);
        bird.group.rotation.y = bird.heading;
        bird.group.rotation.x = -0.3; // Pitching up

        // Once high enough, transition to circling/flying
        if (bird.position.y >= 14.0) {
          bird.state = 'circling';
          bird.velocity.set(0, 0, 0);
          bird.flapSpeed = 12.0;
        }
        break;
      }

      case 'flying':
      case 'circling': {
        bird.flapPhase += bird.flapSpeed * dt;
        const wingAngle = Math.sin(bird.flapPhase) * 0.55;
        bird.leftWing.rotation.z = wingAngle;
        bird.rightWing.rotation.z = -wingAngle;

        // Smooth flight vector towards targetPos
        const dir = new THREE.Vector3().subVectors(bird.targetPos, bird.position);
        const dist = dir.length();

        if (dist < 3.0) {
          // Reached air waypoint -> either find new air waypoint or land back at home/perch
          if (Math.random() < 0.4) {
            // Land back near home
            bird.targetPos.set(
              bird.homePos.x + (Math.random() * 12 - 6),
              bird.perchY,
              bird.homePos.z + (Math.random() * 12 - 6)
            );
          } else {
            // New flight target
            bird.targetPos.set(
              bird.homePos.x + (Math.random() * 80 - 40),
              6 + Math.random() * 12,
              bird.homePos.z + (Math.random() * 80 - 40)
            );
          }
        }

        dir.normalize();
        const flySpeed = bird.state === 'circling' ? 7.5 : 5.5;
        bird.position.addScaledVector(dir, flySpeed * dt);

        const targetHeading = Math.atan2(dir.x, dir.z);
        bird.heading = THREE.MathUtils.lerp(bird.heading, targetHeading, dt * 3.0);
        bird.group.rotation.y = bird.heading;
        bird.group.rotation.x = Math.sin(now * 2.0) * 0.05;

        // If close to ground and landing, return to perched
        if (bird.position.y <= bird.perchY + 0.3 && dir.y < 0) {
          bird.position.y = bird.perchY;
          bird.state = 'perched';
          bird.flapSpeed = 6.0;
        }
        break;
      }
    }

    bird.group.position.copy(bird.position);
  }

  private updateAnimal(animal: AnimalData, dt: number, playerPos: THREE.Vector3, now: number) {
    const distToPlayer = animal.position.distanceTo(playerPos);

    // REACTIVITY 1: Player Proximity Alert/Flee (< 8.0m)
    if (distToPlayer < 8.0 && animal.state !== 'fleeing') {
      animal.state = 'fleeing';
      // Pick flee target away from player
      const escapeDir = new THREE.Vector3().subVectors(animal.position, playerPos).setY(0).normalize();
      animal.targetPos.copy(animal.position).addScaledVector(escapeDir, 25);
      
      if (now - this.lastRustleTime > 1.2) {
        soundManager.playAnimalRustle();
        this.lastRustleTime = now;
      }
    }

    switch (animal.state) {
      case 'idle': {
        animal.idleTimer -= dt;
        // Idle twitch head & ears
        if (animal.head) {
          animal.head.rotation.y = Math.sin(now * 4.0) * 0.15;
        }
        // Reset legs
        animal.legs.forEach(leg => leg.rotation.x = 0);

        if (animal.idleTimer <= 0) {
          animal.idleTimer = 2.0 + Math.random() * 5.0;
          animal.state = 'roaming';
          // Pick random local point in park/outskirt grass
          animal.targetPos.set(
            animal.homePos.x + (Math.random() * 24 - 12),
            0.1,
            animal.homePos.z + (Math.random() * 24 - 12)
          );
        }
        break;
      }

      case 'roaming': {
        const dir = new THREE.Vector3().subVectors(animal.targetPos, animal.position).setY(0);
        const dist = dir.length();

        if (dist < 1.0) {
          animal.state = 'idle';
          break;
        }

        dir.normalize();
        const moveSpeed = animal.baseSpeed;
        animal.position.addScaledVector(dir, moveSpeed * dt);

        const targetHeading = Math.atan2(dir.x, dir.z);
        animal.heading = THREE.MathUtils.lerp(animal.heading, targetHeading, dt * 6.0);
        animal.group.rotation.y = animal.heading;

        // Quadruped walking leg swing
        animal.animPhase += moveSpeed * 8.0 * dt;
        const swing = Math.sin(animal.animPhase) * 0.45;
        if (animal.legs.length === 4) {
          animal.legs[0].rotation.x = swing;
          animal.legs[1].rotation.x = -swing;
          animal.legs[2].rotation.x = -swing;
          animal.legs[3].rotation.x = swing;
        }
        if (animal.tail) {
          animal.tail.rotation.y = Math.cos(animal.animPhase) * 0.25;
        }
        break;
      }

      case 'fleeing': {
        const dir = new THREE.Vector3().subVectors(animal.targetPos, animal.position).setY(0);
        const dist = dir.length();

        if (dist < 1.5) {
          animal.state = 'idle';
          animal.homePos.copy(animal.position); // New safe home base
          break;
        }

        dir.normalize();
        const sprintSpeed = animal.baseSpeed * 3.2; // High panic speed
        animal.position.addScaledVector(dir, sprintSpeed * dt);

        const targetHeading = Math.atan2(dir.x, dir.z);
        animal.heading = THREE.MathUtils.lerp(animal.heading, targetHeading, dt * 10.0);
        animal.group.rotation.y = animal.heading;

        // Fast quadruped/hopping animation
        animal.animPhase += sprintSpeed * 10.0 * dt;
        const swing = Math.sin(animal.animPhase) * 0.8;
        if (animal.legs.length === 4) {
          animal.legs[0].rotation.x = swing;
          animal.legs[1].rotation.x = -swing;
          animal.legs[2].rotation.x = -swing;
          animal.legs[3].rotation.x = swing;
        }
        // Hopping body y wobble for rabbits/squirrels
        animal.group.position.y = 0.1 + Math.abs(Math.sin(animal.animPhase)) * 0.15;
        break;
      }
    }

    if (animal.state !== 'fleeing') {
      animal.group.position.y = 0.1;
    }
    animal.group.position.x = animal.position.x;
    animal.group.position.z = animal.position.z;
  }

  /**
   * REACTIVITY 2: Gunfire Event Panic Response.
   * Called whenever player fires a weapon.
   */
  public triggerGunfireReaction(gunshotOrigin: THREE.Vector3) {
    let birdsStartled = 0;

    // All birds within 80m of gunshot take flight en masse!
    for (const bird of this.birds) {
      const dist = bird.position.distanceTo(gunshotOrigin);
      if (dist < 80.0) {
        bird.state = 'startled';
        const escapeDir = new THREE.Vector3().subVectors(bird.position, gunshotOrigin).normalize();
        escapeDir.y = 1.5 + Math.random() * 1.0;
        escapeDir.normalize();
        bird.velocity.copy(escapeDir).multiplyScalar(10 + Math.random() * 5);
        bird.flapSpeed = 32.0;
        birdsStartled++;
      }
    }

    if (birdsStartled > 0) {
      soundManager.playBirdTakeoff();
    }

    // All animals within 65m of gunshot sprint directly away from gun source
    for (const animal of this.animals) {
      const dist = animal.position.distanceTo(gunshotOrigin);
      if (dist < 65.0) {
        animal.state = 'fleeing';
        const escapeDir = new THREE.Vector3().subVectors(animal.position, gunshotOrigin).setY(0).normalize();
        animal.targetPos.copy(animal.position).addScaledVector(escapeDir, 30);
      }
    }

    soundManager.playAnimalRustle();
  }

  /**
   * Clean up all 3D meshes on reset or destruction.
   */
  public clearAll() {
    for (const bird of this.birds) {
      this.scene.remove(bird.group);
    }
    for (const animal of this.animals) {
      this.scene.remove(animal.group);
    }
    this.birds = [];
    this.animals = [];
  }
}
