import * as THREE from 'three';
import { GameSaveData, WeatherType } from '../types/game';
import { AudioController, audioController } from './AudioController';
import { CombatController } from './CombatController';
import { CombatManager } from './CombatManager';
import { MissionManager } from './MissionManager';
import { NPCManager } from './NPCManager';
import { ShopManager } from './ShopManager';
import { soundManager } from './SoundManager';
import { VehicleManager } from './VehicleManager';
import { WantedLevel } from './WantedLevel';
import { WeatherSystem } from './WeatherSystem';
import { WeaponInventory } from './WeaponInventory';
import { WorldBuilder } from './WorldBuilder';

export class GameEngine {
  public canvas: HTMLCanvasElement;
  public scene: THREE.Scene;
  public camera: THREE.PerspectiveCamera;
  public renderer: THREE.WebGLRenderer;

  // Sub-systems
  public worldBuilder: WorldBuilder;
  public vehicleManager: VehicleManager;
  public npcManager: NPCManager;
  public weaponInventory: WeaponInventory;
  public combatController: CombatController;
  public combatManager: CombatManager;
  public missionManager: MissionManager;
  public shopManager: ShopManager;
  public weatherSystem: WeatherSystem;
  public wantedLevelSystem: WantedLevel;
  public audioController: AudioController;

  // Lighting & Day/Night
  public dirLight: THREE.DirectionalLight;
  public hemiLight: THREE.HemisphereLight;
  public timeOfDay: number = 14.0; // 24-hour format (14:00 default)
  public daySpeed: number = 0.05; // hours per second
  public weather: WeatherType = 'clear';
  public rainParticles: THREE.Points | null = null;
  public stormFlashTimer: number = 0;

  // Player Character State
  public playerPos: THREE.Vector3 = new THREE.Vector3(-120, 0, 18); // Safehouse Plaza / Avenue
  public playerVelocity: THREE.Vector3 = new THREE.Vector3();
  public playerHeading: number = 0;
  public isGrounded: boolean = true;
  public isSprinting: boolean = false;
  public isCrouching: boolean = false;
  public playerHealth: number = 100;
  public playerMoney: number = 500;
  public wantedLevel: number = 0;
  public wantedTimer: number = 0;

  // Player 3D Rig
  public playerMesh: THREE.Group;
  public playerTorso: THREE.Mesh;
  public playerHead: THREE.Mesh;
  public playerLegs: [THREE.Mesh, THREE.Mesh];
  public playerArms: [THREE.Mesh, THREE.Mesh];
  public playerWalkCycle: number = 0;

  // Camera State
  public cameraPitch: number = 0.25;
  public cameraYaw: number = 0;
  public cameraDistance: number = 5.5;

  // Waypoint & Navigation
  public customWaypoint: THREE.Vector3 | null = null;
  public waypointBeamMesh: THREE.Mesh | null = null;

  // Input State
  public keys: Record<string, boolean> = {};
  public mouseButtons: Record<number, boolean> = {};
  public isPointerLocked: boolean = false;

  // Animation & Loop
  private animFrameId: number | null = null;
  private lastTime: number = 0;
  public isPaused: boolean = false;

  // UI Event Callback
  public onStateUpdate?: () => void;
  public onToggleShop?: () => void;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // 1. Scene & Camera
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0x87ceeb);
    this.scene.fog = new THREE.FogExp2(0x87ceeb, 0.0035);

    const aspect = canvas.clientWidth / (canvas.clientHeight || 1);
    this.camera = new THREE.PerspectiveCamera(60, aspect, 0.1, 1000);

    // 2. Renderer
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setSize(canvas.clientWidth, canvas.clientHeight, false);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    // 3. Lighting
    this.hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 0.6);
    this.scene.add(this.hemiLight);

    this.dirLight = new THREE.DirectionalLight(0xfff7e6, 1.4);
    this.dirLight.position.set(100, 150, 80);
    this.dirLight.castShadow = true;
    this.dirLight.shadow.mapSize.width = 2048;
    this.dirLight.shadow.mapSize.height = 2048;
    this.dirLight.shadow.camera.near = 10;
    this.dirLight.shadow.camera.far = 400;
    const shadowD = 120;
    this.dirLight.shadow.camera.left = -shadowD;
    this.dirLight.shadow.camera.right = shadowD;
    this.dirLight.shadow.camera.top = shadowD;
    this.dirLight.shadow.camera.bottom = -shadowD;
    this.scene.add(this.dirLight);

    // 4. Sub-systems
    this.worldBuilder = new WorldBuilder(this.scene);
    this.worldBuilder.buildWorld();

    this.vehicleManager = new VehicleManager(this.scene, this.worldBuilder);
    this.vehicleManager.initInitialVehicles();

    this.npcManager = new NPCManager(this.scene, this.worldBuilder);
    this.npcManager.initCivilianCrowd();

    // Weapon Inventory & Combat Controller & Shop
    this.weaponInventory = new WeaponInventory();
    this.combatController = new CombatController(this.weaponInventory, this.scene);
    this.combatManager = new CombatManager(this.scene, this.weaponInventory, this.combatController);
    this.missionManager = new MissionManager();
    this.shopManager = new ShopManager();
    this.weatherSystem = new WeatherSystem(this.scene, this.worldBuilder, this.vehicleManager, this.dirLight, this.hemiLight);
    this.wantedLevelSystem = new WantedLevel(this.npcManager, this.vehicleManager);
    this.audioController = audioController;
    this.audioController.init();

    // 5. Build Player Character Rig
    const { group, torso, head, legs, arms } = this.createPlayerRig();
    this.playerMesh = group;
    this.playerTorso = torso;
    this.playerHead = head;
    this.playerLegs = legs;
    this.playerArms = arms;
    this.scene.add(this.playerMesh);

    // 6. Rain System
    this.initRainParticles();

    // 7. Waypoint Beacon
    this.initWaypointBeam();

    // 8. Event listeners
    this.setupInputs();
    this.setupWindowResize();

    // Try load saved data
    this.loadSavedGame();

    // Start loop
    this.lastTime = performance.now();
    this.loop = this.loop.bind(this);
    this.animFrameId = requestAnimationFrame(this.loop);
  }

  private createPlayerRig() {
    const group = new THREE.Group();
    group.position.copy(this.playerPos);

    // Torso (AGAT protagonist cyber-leather jacket)
    const torsoMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.5, metalness: 0.3 });
    const torso = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.75, 0.3), torsoMat);
    torso.position.y = 1.15;
    torso.castShadow = true;
    group.add(torso);

    // Head
    const skinMat = new THREE.MeshStandardMaterial({ color: 0xd9a07a, roughness: 0.8 });
    const head = new THREE.Mesh(new THREE.BoxGeometry(0.32, 0.35, 0.32), skinMat);
    head.position.y = 1.72;
    head.castShadow = true;
    group.add(head);

    // Hair
    const hairMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const hair = new THREE.Mesh(new THREE.BoxGeometry(0.34, 0.14, 0.34), hairMat);
    hair.position.y = 1.9;
    group.add(hair);

    // Legs
    const pantsMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8 });
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

    return { group, torso, head, legs: [leftLeg, rightLeg] as [THREE.Mesh, THREE.Mesh], arms: [leftArm, rightArm] as [THREE.Mesh, THREE.Mesh] };
  }

  private initRainParticles() {
    const rainCount = 1800;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(rainCount * 3);

    for (let i = 0; i < rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 80;
      positions[i + 1] = Math.random() * 40;
      positions[i + 2] = (Math.random() - 0.5) * 80;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x93c5fd,
      size: 0.25,
      transparent: true,
      opacity: 0.6,
    });

    this.rainParticles = new THREE.Points(geometry, material);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  private initWaypointBeam() {
    const geo = new THREE.CylinderGeometry(0.5, 0.5, 80, 16);
    const mat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.45,
      wireframe: false,
    });
    this.waypointBeamMesh = new THREE.Mesh(geo, mat);
    this.waypointBeamMesh.position.set(0, 40, 0);
    this.waypointBeamMesh.visible = false;
    this.scene.add(this.waypointBeamMesh);
  }

  public setWaypoint(x: number, z: number) {
    this.customWaypoint = new THREE.Vector3(x, 0, z);
    if (this.waypointBeamMesh) {
      this.waypointBeamMesh.position.set(x, 40, z);
      this.waypointBeamMesh.visible = true;
    }
  }

  public clearWaypoint() {
    this.customWaypoint = null;
    if (this.waypointBeamMesh) {
      this.waypointBeamMesh.visible = false;
    }
  }

  private setupInputs() {
    const registerKeyDown = (e: KeyboardEvent) => {
      soundManager.resume();
      this.audioController.resume();
      this.keys[e.code] = true;
      if (e.key) {
        this.keys[e.key] = true;
        this.keys[e.key.toLowerCase()] = true;
      }

      // Toggle Pause with Escape
      if (e.code === 'Escape') {
        this.isPaused = !this.isPaused;
      }

      // Enter / Exit vehicle
      if (e.code === 'KeyE' || e.key === 'e' || e.key === 'E') {
        this.handleInteract();
      }

      // Reload
      if (e.code === 'KeyR' || e.key === 'r' || e.key === 'R') {
        this.combatController.triggerReload();
      }

      // Weapon slots 1, 2, 3, 4, 5
      if (e.code === 'Digit1' || e.key === '1') this.weaponInventory.equip(0);
      if (e.code === 'Digit2' || e.key === '2') this.weaponInventory.equip(1);
      if (e.code === 'Digit3' || e.key === '3') this.weaponInventory.equip(2);
      if (e.code === 'Digit4' || e.key === '4') this.weaponInventory.equip(3);
      if (e.code === 'Digit5' || e.key === '5') this.weaponInventory.equip(4);

      // Toggle Shop with B
      if ((e.code === 'KeyB' || e.key === 'b' || e.key === 'B') && this.onToggleShop) {
        this.onToggleShop();
      }

      // Holster / Unholster toggle with X or 0
      if (e.code === 'KeyX' || e.key === 'x' || e.code === 'Digit0' || e.key === '0') {
        this.weaponInventory.toggleHolster();
      }

      // Horn in vehicle
      if ((e.code === 'KeyH' || e.key === 'h') && this.vehicleManager.playerVehicle) {
        soundManager.playHorn();
      }
    };

    const registerKeyUp = (e: KeyboardEvent) => {
      this.keys[e.code] = false;
      if (e.key) {
        this.keys[e.key] = false;
        this.keys[e.key.toLowerCase()] = false;
      }
    };

    window.addEventListener('keydown', registerKeyDown);
    window.addEventListener('keyup', registerKeyUp);
    window.addEventListener('blur', () => {
      this.keys = {};
      this.mouseButtons = {};
    });

    this.canvas.addEventListener('mousedown', (e) => {
      soundManager.resume();
      this.audioController.resume();
      this.mouseButtons[e.button] = true;

      // Right Click (Aiming)
      if (e.button === 2) {
        this.combatController.setAiming(true);
      }

      // Left Click (Fire weapon)
      if (e.button === 0 && !this.vehicleManager.playerVehicle) {
        this.handleWeaponFire();
      }
    });

    window.addEventListener('mouseup', (e) => {
      this.mouseButtons[e.button] = false;
      if (e.button === 2) {
        this.combatController.setAiming(false);
      }
    });

    this.canvas.addEventListener('contextmenu', (e) => e.preventDefault());

    // Mouse Look
    window.addEventListener('mousemove', (e) => {
      if (this.isPaused) return;
      if (document.pointerLockElement === this.canvas || this.mouseButtons[0] || this.mouseButtons[2] || this.combatController.isAiming) {
        const sensitivity = 0.003;
        this.cameraYaw -= e.movementX * sensitivity;
        this.cameraPitch = Math.max(0.05, Math.min(1.4, this.cameraPitch + e.movementY * sensitivity));
      }
    });

    // Request pointer lock on canvas click
    this.canvas.addEventListener('click', () => {
      if (!this.isPaused && document.pointerLockElement !== this.canvas) {
        this.canvas.requestPointerLock?.();
      }
    });
  }

  private handleInteract() {
    if (this.vehicleManager.playerVehicle) {
      // Exit vehicle
      this.audioController.stopPlayerEngine();
      const exitPos = this.vehicleManager.exitVehicle();
      this.playerPos.copy(exitPos);
      this.playerPos.y = 0;
      this.playerMesh.visible = true;
      this.playerMesh.position.copy(this.playerPos);
      return;
    }

    // Check nearest vehicle to enter
    const nearestV = this.vehicleManager.getNearestVehicle(this.playerPos, 3.8);
    if (nearestV) {
      this.vehicleManager.enterVehicle(nearestV);
      this.audioController.startPlayerEngine();
      this.playerMesh.visible = false;
      this.wantedLevelSystem.recordVehicleTheft(this.playerPos, !!nearestV.def.isPolice);
      return;
    }

    // Check nearest weapon pickup in world
    const nearPickup = this.worldBuilder.getNearestPickup(this.playerPos, 3.2);
    if (nearPickup) {
      const added = this.weaponInventory.addWeapon(nearPickup.weapon);
      if (added) {
        this.worldBuilder.collectPickup(nearPickup);
        soundManager.playMissionComplete();
        return;
      }
    }

    // Check available missions near player
    for (const m of this.missionManager.missions) {
      if (m.status === 'available') {
        const firstStep = m.steps[0];
        if (firstStep && firstStep.targetPos) {
          const d = this.playerPos.distanceTo(new THREE.Vector3(firstStep.targetPos.x, 0, firstStep.targetPos.z));
          if (d < 10) {
            this.missionManager.startMission(m.id);
            return;
          }
        }
      }
    }
  }

  private handleWeaponFire() {
    if (!this.combatController.canFire()) {
      const active = this.weaponInventory.getActiveWeapon();
      if (active && active.currentAmmo <= 0) {
        this.combatController.triggerReload();
      }
      return;
    }

    // Determine fire ray origin from player weapon position
    const origin = this.playerPos.clone();
    origin.y += 1.35;

    // Target hitboxes from NPCs, Vehicles, and World
    const targetHitboxes: THREE.Object3D[] = [];
    this.npcManager.npcs.forEach((n) => {
      if (!n.isDefeated) targetHitboxes.push(n.mesh);
    });
    this.vehicleManager.vehicles.forEach((v) => {
      targetHitboxes.push(v.mesh);
    });

    // Execute raycast against target hitboxes
    const hitResult = this.combatController.fireRaycast(this.camera, origin, targetHitboxes);

    if (hitResult.hit && hitResult.target) {
      // Find if an NPC or child mesh was hit
      let hitNPC = this.npcManager.npcs.find((n) => !n.isDefeated && n.mesh === hitResult.target);
      if (!hitNPC) {
        hitNPC = this.npcManager.npcs.find((n) => {
          if (n.isDefeated) return false;
          let isChild = false;
          n.mesh.traverse((child) => {
            if (child === hitResult.target) isChild = true;
          });
          return isChild;
        });
      }

      if (hitNPC) {
        hitNPC.data.health -= hitResult.damageDealt;
        if (hitNPC.data.health <= 0) {
          hitNPC.isDefeated = true;
          hitNPC.data.state = 'defeated';
          hitNPC.mesh.rotation.x = Math.PI / 2;
          hitNPC.mesh.position.y = 0.2;

          // Check mission progression for eliminating hostile targets
          this.missionManager.checkPlayerProgress(
            { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
            this.wantedLevel,
            (reward) => {
              const bonus = this.shopManager.unlockedSkills.has('skill_economy') ? 1.35 : 1.0;
              this.playerMoney += Math.round(reward * bonus);
            }
          );
        }

        if (hitNPC.data.type === 'civilian') {
          this.wantedLevelSystem.recordAssault(this.playerPos, false);
        } else if (hitNPC.data.type === 'police') {
          this.wantedLevelSystem.recordAssault(this.playerPos, true);
        }
      }

      // Check if a vehicle was hit
      let hitVehicle = this.vehicleManager.vehicles.find((v) => v.mesh === hitResult.target);
      if (!hitVehicle) {
        hitVehicle = this.vehicleManager.vehicles.find((v) => {
          let isChild = false;
          v.mesh.traverse((child) => {
            if (child === hitResult.target) isChild = true;
          });
          return isChild;
        });
      }

      if (hitVehicle) {
        hitVehicle.health = Math.max(0, hitVehicle.health - hitResult.damageDealt);
      }
    }

    // Alert nearby civilians & record gunfire in wanted system
    this.npcManager.alertCivilians(this.playerPos, 30);
    this.wantedLevelSystem.recordGunfire(this.playerPos);
  }

  public addCrime(amount: number) {
    this.wantedTimer = 25; // 25 seconds of pursuit
    if (this.wantedLevel === 0 && amount >= 0.5) {
      this.wantedLevel = 1;
    } else if (this.wantedLevel === 1 && amount >= 1.0) {
      this.wantedLevel = 2;
    } else if (this.wantedLevel === 2 && amount >= 2.0) {
      this.wantedLevel = 3;
    }
  }

  private setupWindowResize() {
    window.addEventListener('resize', () => {
      const w = this.canvas.clientWidth;
      const h = this.canvas.clientHeight;
      if (w && h) {
        this.camera.aspect = w / h;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(w, h, false);
      }
    });
  }

  public setWeather(newWeather: WeatherType) {
    this.weather = newWeather;
    this.weatherSystem.setWeather(newWeather, true);
  }

  private loop(currentTime: number) {
    this.animFrameId = requestAnimationFrame(this.loop);
    const delta = Math.min((currentTime - this.lastTime) / 1000, 0.1);
    this.lastTime = currentTime;

    if (this.isPaused) return;

    // 1. Day / Night & Dynamic Weather System
    this.timeOfDay = (this.timeOfDay + this.daySpeed * delta) % 24;
    this.weatherSystem.update(delta, this.timeOfDay, this.playerPos);
    this.weather = this.weatherSystem.currentWeather;

    // 2. Player Controls or Vehicle Driving
    if (this.vehicleManager.playerVehicle) {
      this.updateDriving(delta);
    } else {
      this.updateOnFoot(delta);
    }

    // 3. Vehicles & Traffic Update
    const isNight = this.timeOfDay < 6 || this.timeOfDay > 19;
    const isForward = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
    const isBackward = !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']);
    const isLeft = !!(this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']);
    const isRight = !!(this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']);

    this.vehicleManager.update(
      delta,
      {
        forward: isForward,
        backward: isBackward,
        left: isLeft,
        right: isRight,
        handbrake: !!this.keys['Space'],
      },
      isNight
    );

    // 4. Combat & Projectiles
    this.combatManager.update(delta, (targetPos, damage) => {
      // Check hit on NPCs
      const { hitNPC, wasDefeated } = this.npcManager.damageNPC(targetPos, damage, 2.0);
      if (hitNPC) {
        if (hitNPC.data.type === 'civilian') {
          this.addCrime(1.5);
        } else if (hitNPC.data.type === 'police') {
          this.addCrime(2.5);
        } else if (wasDefeated && hitNPC.data.type === 'hostile') {
          // Check mission progress for defeating enemies
          this.missionManager.checkPlayerProgress(
            { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
            this.wantedLevel,
            (r) => (this.playerMoney += r)
          );
        }
      }
    });

    // 5. NPC Crowd AI with Finite State Machine & Traffic Events
    const listenerHeading = this.vehicleManager.playerVehicle
      ? this.vehicleManager.playerVehicle.heading
      : this.playerHeading;

    this.npcManager.update(
      delta,
      this.playerPos,
      listenerHeading,
      this.wantedLevel,
      this.vehicleManager.vehicles,
      this.combatController.isAiming,
      this.isSprinting,
      (dmg) => {
        this.playerHealth = Math.max(0, this.playerHealth - dmg);
      }
    );

    // 5b. Update 3D Spatial Audio Controller
    if (this.vehicleManager.playerVehicle) {
      const pv = this.vehicleManager.playerVehicle;
      const speedRatio = Math.min(1, Math.abs(pv.speed) / Math.max(1, pv.def.maxSpeed));
      this.audioController.updatePlayerEngine(speedRatio, pv.speed < -0.1);
    } else {
      this.audioController.stopPlayerEngine();
    }

    // Update 3D traffic engines with dynamic spatialization
    this.audioController.updateTrafficEngines(
      this.playerPos,
      listenerHeading,
      this.vehicleManager.vehicles.map((v) => ({
        id: v.id,
        position: v.mesh.position,
        speed: v.speed,
        isPlayerVehicle: v.isPlayerInside,
      }))
    );

    // Dynamic weather sound scaling
    this.audioController.updateWeatherAudio(this.weather, this.weatherSystem.wetness);

    // 6. Mission Check & Rewards
    this.missionManager.checkPlayerProgress(
      { x: this.playerPos.x, y: this.playerPos.y, z: this.playerPos.z },
      this.wantedLevel,
      (reward) => {
        const bonus = this.shopManager.unlockedSkills.has('skill_economy') ? 1.35 : 1.0;
        this.playerMoney += Math.round(reward * bonus);
      }
    );

    // 7. World Pickups Animation
    this.worldBuilder.updatePickups(delta);

    // 8. Wanted Threat System Update
    this.wantedLevelSystem.update(delta, this.playerPos);
    this.wantedLevel = this.wantedLevelSystem.getStars();

    // 8. Rain Particles Animation
    if (this.rainParticles && this.rainParticles.visible) {
      const positions = this.rainParticles.geometry.attributes.position.array as Float32Array;
      const targetPos = this.vehicleManager.playerVehicle ? this.vehicleManager.playerVehicle.mesh.position : this.playerPos;

      for (let i = 0; i < positions.length; i += 3) {
        positions[i + 1] -= 42 * delta; // Fall downwards
        if (positions[i + 1] < 0) {
          positions[i + 1] = 35 + Math.random() * 5;
          positions[i] = targetPos.x + (Math.random() - 0.5) * 60;
          positions[i + 2] = targetPos.z + (Math.random() - 0.5) * 60;
        }
      }
      this.rainParticles.geometry.attributes.position.needsUpdate = true;
    }

    // 9. Camera Update
    this.updateCamera(delta);

    // 10. Render
    this.renderer.render(this.scene, this.camera);

    // 11. UI State Sync
    if (this.onStateUpdate) {
      this.onStateUpdate();
    }
  }

  private updateOnFoot(delta: number) {
    const isForward = !!(this.keys['KeyW'] || this.keys['ArrowUp'] || this.keys['w'] || this.keys['W']);
    const isBackward = !!(this.keys['KeyS'] || this.keys['ArrowDown'] || this.keys['s'] || this.keys['S']);
    const isLeft = !!(this.keys['KeyA'] || this.keys['ArrowLeft'] || this.keys['a'] || this.keys['A']);
    const isRight = !!(this.keys['KeyD'] || this.keys['ArrowRight'] || this.keys['d'] || this.keys['D']);

    const forwardInput = (isForward ? 1 : 0) - (isBackward ? 1 : 0);
    const rightInput = (isRight ? 1 : 0) - (isLeft ? 1 : 0);

    this.isSprinting = !!(this.keys['ShiftLeft'] || this.keys['ShiftRight']);
    this.isCrouching = !!(this.keys['KeyC'] || this.keys['c']);

    const speedBonus = this.shopManager.unlockedSkills.has('skill_speed') ? 1.25 : 1.0;
    let speed = 5.2 * speedBonus;
    if (this.isSprinting && !this.combatController.isAiming) speed = 9.2 * speedBonus;
    if (this.isCrouching) speed = 2.6 * speedBonus;
    if (this.combatController.isAiming) speed = 3.4 * speedBonus; // Aim walk speed

    const isMoving = forwardInput !== 0 || rightInput !== 0;

    // Camera planar vectors (Yaw 0 = looking towards -Z)
    const camForward = new THREE.Vector3(-Math.sin(this.cameraYaw), 0, -Math.cos(this.cameraYaw));
    const camRight = new THREE.Vector3(Math.cos(this.cameraYaw), 0, -Math.sin(this.cameraYaw));

    if (isMoving) {
      // Calculate move vector in world space aligned with camera direction
      const forwardVec = new THREE.Vector3()
        .addScaledVector(camForward, forwardInput)
        .addScaledVector(camRight, rightInput)
        .normalize();

      const deltaMove = forwardVec.clone().multiplyScalar(speed * delta);
      const nextPos = this.playerPos.clone().add(deltaMove);

      // Smooth sliding collision against buildings and obstacles
      if (!this.worldBuilder.checkCollision(nextPos, 0.4)) {
        this.playerPos.copy(nextPos);
      } else {
        // Try slide on X axis
        const nextPosX = this.playerPos.clone().add(new THREE.Vector3(deltaMove.x, 0, 0));
        if (!this.worldBuilder.checkCollision(nextPosX, 0.4)) {
          this.playerPos.copy(nextPosX);
        } else {
          // Try slide on Z axis
          const nextPosZ = this.playerPos.clone().add(new THREE.Vector3(0, 0, deltaMove.z));
          if (!this.worldBuilder.checkCollision(nextPosZ, 0.4)) {
            this.playerPos.copy(nextPosZ);
          }
        }
      }

      // If aiming, face camera aim direction; otherwise face movement direction
      if (this.combatController.aimTransition > 0.25) {
        this.playerHeading = this.cameraYaw + Math.PI;
      } else {
        this.playerHeading = Math.atan2(forwardVec.x, forwardVec.z);
      }
      this.playerMesh.rotation.y = this.playerHeading;

      // Leg cycle animation
      this.playerWalkCycle += delta * (this.isSprinting ? 14 : 9);
      const legAngle = Math.sin(this.playerWalkCycle) * 0.6;
      this.playerLegs[0].rotation.x = legAngle;
      this.playerLegs[1].rotation.x = -legAngle;

      // Footstep audio
      if (Math.abs(Math.sin(this.playerWalkCycle)) > 0.95) {
        soundManager.playFootstep();
      }
    } else {
      // Idle legs
      this.playerLegs[0].rotation.x = 0;
      this.playerLegs[1].rotation.x = 0;

      // When standing still and aiming, face crosshair camera aim direction
      if (this.combatController.aimTransition > 0.1) {
        this.playerHeading = this.cameraYaw + Math.PI;
        this.playerMesh.rotation.y = this.playerHeading;
      }
    }

    // Delegate upper body, arms, and weapon attachment to CombatController
    this.combatController.update(
      delta,
      isMoving,
      this.playerWalkCycle,
      this.isSprinting,
      this.playerArms[1], // rightArm
      this.playerArms[0], // leftArm
      this.playerTorso,
      this.playerHead
    );

    // Jump / Gravity
    if (this.keys['Space'] && this.isGrounded) {
      this.playerVelocity.y = 6.2;
      this.isGrounded = false;
      soundManager.playJump();
    }

    if (!this.isGrounded) {
      this.playerVelocity.y -= 18.0 * delta; // Gravity
      this.playerPos.y += this.playerVelocity.y * delta;
      if (this.playerPos.y <= 0) {
        this.playerPos.y = 0;
        this.playerVelocity.y = 0;
        this.isGrounded = true;
      }
    }

    this.playerMesh.position.copy(this.playerPos);
  }

  private updateDriving(_delta: number) {
    if (!this.vehicleManager.playerVehicle) return;
    const v = this.vehicleManager.playerVehicle;
    this.playerPos.copy(v.mesh.position);
    this.playerPos.y = 0.5;
  }

  private updateCamera(_delta: number) {
    if (this.vehicleManager.playerVehicle) {
      // Vehicle Chase Camera
      const v = this.vehicleManager.playerVehicle;
      const chaseDistance = 7.5 + Math.abs(v.speed) * 0.08;
      const chaseHeight = 2.6;

      const camOffset = new THREE.Vector3(
        -Math.sin(v.heading) * chaseDistance,
        chaseHeight,
        -Math.cos(v.heading) * chaseDistance
      );

      const targetCamPos = v.mesh.position.clone().add(camOffset);
      this.camera.position.lerp(targetCamPos, 0.15);
      this.camera.lookAt(v.mesh.position.clone().add(new THREE.Vector3(0, 1.2, 0)));
    } else {
      // Third Person Character Camera with smooth Aim Zoom
      const targetPos = this.playerPos.clone().add(new THREE.Vector3(0, 1.4, 0));

      const aimT = this.combatController.aimTransition;
      const curDist = THREE.MathUtils.lerp(this.cameraDistance, 2.2, aimT);

      const offsetX = Math.sin(this.cameraYaw) * Math.cos(this.cameraPitch) * curDist;
      const offsetY = Math.sin(this.cameraPitch) * curDist;
      const offsetZ = Math.cos(this.cameraYaw) * Math.cos(this.cameraPitch) * curDist;

      const desiredPos = new THREE.Vector3(
        targetPos.x + offsetX,
        targetPos.y + offsetY,
        targetPos.z + offsetZ
      );

      // Over the shoulder aim offset
      if (aimT > 0.01) {
        const sideOffset = new THREE.Vector3(
          Math.cos(this.cameraYaw) * 0.65 * aimT,
          0.1 * aimT,
          -Math.sin(this.cameraYaw) * 0.65 * aimT
        );
        desiredPos.add(sideOffset);
      }

      this.camera.position.lerp(desiredPos, 0.28);
      this.camera.lookAt(targetPos);
    }
  }

  private updateAtmosphere() {
    const hour = this.timeOfDay;
    // Calculate sun angle
    const sunAngle = ((hour - 6) / 24) * Math.PI * 2;
    const sunY = Math.sin(sunAngle) * 200;
    const sunX = Math.cos(sunAngle) * 200;

    this.dirLight.position.set(sunX, Math.max(10, sunY), 80);

    const isDay = hour >= 6 && hour <= 18;
    const isSunriseOrSet = (hour >= 5 && hour <= 7) || (hour >= 17 && hour <= 19);

    let skyColor = 0x87ceeb; // Daytime blue
    let sunIntensity = 1.3;

    if (!isDay) {
      // Night
      skyColor = 0x090d16; // Deep midnight
      sunIntensity = 0.05;
      this.hemiLight.intensity = 0.15;
    } else if (isSunriseOrSet) {
      // Golden hour
      skyColor = 0xf59e0b;
      sunIntensity = 0.9;
      this.hemiLight.intensity = 0.5;
    } else {
      // Midday
      this.hemiLight.intensity = 0.65;
    }

    this.scene.background = new THREE.Color(skyColor);
    if (this.scene.fog) {
      this.scene.fog.color.setHex(skyColor);
    }
    this.dirLight.intensity = sunIntensity;

    // Storm lightning effect
    if (this.weather === 'storm') {
      if (Math.random() < 0.008) {
        this.dirLight.intensity = 4.0;
        soundManager.playThunder();
      }
    }

    this.worldBuilder.updateEnvironment(hour, this.weather);
  }

  public saveGame(): boolean {
    try {
      const data: GameSaveData = {
        version: 1,
        player: {
          x: this.playerPos.x,
          y: this.playerPos.y,
          z: this.playerPos.z,
          rotation: this.playerHeading,
          health: this.playerHealth,
          money: this.playerMoney,
          equippedWeaponIndex: this.weaponInventory.equippedIndex,
          weapons: this.weaponInventory.weapons,
          wantedLevel: this.wantedLevel,
          skills: Array.from(this.shopManager.unlockedSkills.keys()),
        },
        timeOfDay: this.timeOfDay,
        weather: this.weather,
        completedMissionIds: Array.from(this.missionManager.completedMissionIds),
        activeMissionId: this.missionManager.activeMission ? this.missionManager.activeMission.id : null,
        timestamp: Date.now(),
      };
      localStorage.setItem('agat_save_data', JSON.stringify(data));
      soundManager.playUIClick();
      return true;
    } catch {
      return false;
    }
  }

  public loadSavedGame(): boolean {
    try {
      const raw = localStorage.getItem('agat_save_data');
      if (!raw) return false;
      const data: GameSaveData = JSON.parse(raw);

      this.playerPos.set(data.player.x, data.player.y, data.player.z);
      if (this.worldBuilder.checkCollision(this.playerPos, 0.45)) {
        this.playerPos.set(-120, 0, 18);
      }
      this.playerMesh.position.copy(this.playerPos);
      this.playerHeading = data.player.rotation;
      this.playerHealth = data.player.health;
      this.playerMoney = data.player.money;
      this.wantedLevel = data.player.wantedLevel;

      this.timeOfDay = data.timeOfDay;
      this.setWeather(data.weather);

      if (data.player.weapons && data.player.weapons.length > 0) {
        this.weaponInventory.weapons = data.player.weapons;
        this.weaponInventory.equippedIndex = data.player.equippedWeaponIndex;
      }

      if (data.player.skills && Array.isArray(data.player.skills)) {
        data.player.skills.forEach((skillId) => {
          const item = this.shopManager.catalog.find((c) => c.skillPayload?.id === skillId);
          if (item?.skillPayload) {
            this.shopManager.unlockedSkills.set(skillId, { ...item.skillPayload, unlocked: true });
          }
        });
      }

      this.missionManager.completedMissionIds = new Set(data.completedMissionIds);
      if (data.activeMissionId) {
        this.missionManager.startMission(data.activeMissionId);
      }
      return true;
    } catch {
      return false;
    }
  }

  public respawnHospital() {
    this.playerHealth = 100;
    this.wantedLevel = 0;
    this.playerPos.set(-40, 0, -32); // AGAT General Hospital front entrance
    this.playerMesh.position.copy(this.playerPos);
    if (this.vehicleManager.playerVehicle) {
      this.vehicleManager.exitVehicle();
    }
    this.playerMesh.visible = true;
  }

  public dispose() {
    if (this.animFrameId !== null) {
      cancelAnimationFrame(this.animFrameId);
    }
    this.renderer.dispose();
  }
}
