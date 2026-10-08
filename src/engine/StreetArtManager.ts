import * as THREE from 'three';
import { AlleyTagWallDef, TagStreetArtData, Vector3D } from '../types/game';
import { soundManager } from './SoundManager';

export const ALLEY_TAG_WALLS: AlleyTagWallDef[] = [
  {
    id: 'wall_neon_alley',
    name: 'Neon Alleyway Wall',
    district: 'Downtown East',
    pos: { x: -52, y: 2.0, z: 24 },
    standPos: { x: -49.5, y: 0, z: 24 },
    normal: { x: 1, y: 0, z: 0 },
    rotationY: Math.PI / 2,
    width: 4.8,
    height: 3.2,
    wallType: 'brick',
    reward: 350,
    description: 'Dark brick alley behind Starlight Diner. Prime territory for glowing neon street tags.',
  },
  {
    id: 'wall_underpass',
    name: 'Harbor Transit Underpass',
    district: 'South Docks Highway',
    pos: { x: 22, y: 2.0, z: 98 },
    standPos: { x: 22, y: 0, z: 95.5 },
    normal: { x: 0, y: 0, z: -1 },
    rotationY: 0,
    width: 5.2,
    height: 3.2,
    wallType: 'concrete',
    reward: 400,
    description: 'Heavy weathered concrete abutment under the transit overpass. High visibility for passing vehicles.',
  },
  {
    id: 'wall_chinatown',
    name: 'Dragon Gate Backstreet',
    district: 'Midtown Alley',
    pos: { x: 55, y: 2.0, z: -38 },
    standPos: { x: 55, y: 0, z: -35.5 },
    normal: { x: 0, y: 0, z: 1 },
    rotationY: Math.PI,
    width: 4.6,
    height: 3.0,
    wallType: 'brick',
    reward: 300,
    description: 'Secluded narrow lane beneath paper lanterns. Coveted turf for underground street artists.',
  },
  {
    id: 'wall_safehouse',
    name: 'Skyline Alley Courtyard',
    district: 'West Residential',
    pos: { x: -128, y: 2.0, z: 28 },
    standPos: { x: -128, y: 0, z: 25.5 },
    normal: { x: 0, y: 0, z: -1 },
    rotationY: 0,
    width: 5.0,
    height: 3.2,
    wallType: 'corrugated',
    reward: 250,
    description: 'Private alley wall adjacent to your skyline safehouse. Your personal crew signature canvas.',
  },
  {
    id: 'wall_docks_warehouse',
    name: 'Docks Pier 4 Warehouse',
    district: 'Industrial Bay',
    pos: { x: -80, y: 2.0, z: 125 },
    standPos: { x: -77.5, y: 0, z: 125 },
    normal: { x: 1, y: 0, z: 0 },
    rotationY: Math.PI / 2,
    width: 5.4,
    height: 3.4,
    wallType: 'concrete',
    reward: 450,
    description: 'Rusted industrial shipping bay wall overlooking cargo cranes and ocean container stacks.',
  },
  {
    id: 'wall_corporate_service',
    name: 'Solis Tower Service Alley',
    district: 'Financial Core',
    pos: { x: 108, y: 2.0, z: -55 },
    standPos: { x: 105.5, y: 0, z: -55 },
    normal: { x: -1, y: 0, z: 0 },
    rotationY: -Math.PI / 2,
    width: 4.8,
    height: 3.2,
    wallType: 'subway_tile',
    reward: 500,
    description: 'High-security back corridor behind corporate financial towers. Daring high-value tag spot.',
  },
];

const STORAGE_KEY = 'agat_street_art_tags';

export class StreetArtManager {
  public scene: THREE.Scene;
  public wallMeshes: Map<string, THREE.Group> = new Map();
  public decalMeshes: Map<string, THREE.Mesh> = new Map();
  public beaconMeshes: Map<string, THREE.Group> = new Map();
  public activeNearWall: AlleyTagWallDef | null = null;
  public savedTags: Map<string, TagStreetArtData> = new Map();

  // Spray Animation State
  public isAnimatingSpray = false;
  private sprayParticles: THREE.Points | null = null;
  private sprayCanProp: THREE.Group | null = null;

  // Callbacks
  public onTagCompleted?: (wall: AlleyTagWallDef, reward: number) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.loadPersistedTags();
    this.buildAlleyWalls();
    this.createSprayMistParticles();
  }

  // --- PERSISTENCE ---
  public loadPersistedTags() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: Record<string, TagStreetArtData> = JSON.parse(raw);
        Object.entries(parsed).forEach(([k, v]) => {
          this.savedTags.set(k, v);
        });
      }
    } catch {
      // ignore
    }
  }

  public savePersistedTags() {
    try {
      const obj: Record<string, TagStreetArtData> = {};
      this.savedTags.forEach((v, k) => {
        obj[k] = v;
      });
      localStorage.setItem(STORAGE_KEY, JSON.stringify(obj));
    } catch {
      // ignore
    }
  }

  public getAllSavedTags(): Record<string, string> {
    const res: Record<string, string> = {};
    this.savedTags.forEach((v, k) => {
      res[k] = v.dataUrl;
    });
    return res;
  }

  public loadSavedTagsFromSaveData(data?: Record<string, string>) {
    if (!data) return;
    Object.entries(data).forEach(([wallId, dataUrl]) => {
      this.savedTags.set(wallId, {
        wallId,
        dataUrl,
        author: 'Player',
        timestamp: Date.now(),
        sprayColor: '#00f0ff',
      });
      this.updateWallDecalTexture(wallId, dataUrl);
    });
    this.savePersistedTags();
  }

  // --- 3D ENVIRONMENT CREATION ---
  private buildAlleyWalls() {
    ALLEY_TAG_WALLS.forEach((wallDef) => {
      const group = new THREE.Group();
      group.position.set(wallDef.pos.x, wallDef.pos.y, wallDef.pos.z);
      group.rotation.y = wallDef.rotationY;

      // 1. Backing wall structure
      const wallGeo = new THREE.BoxGeometry(wallDef.width + 0.6, wallDef.height + 0.6, 0.4);
      let wallColor = 0x27272a;
      let roughness = 0.9;
      if (wallDef.wallType === 'brick') {
        wallColor = 0x3f221f;
        roughness = 0.95;
      } else if (wallDef.wallType === 'concrete') {
        wallColor = 0x334155;
        roughness = 0.85;
      } else if (wallDef.wallType === 'corrugated') {
        wallColor = 0x222b37;
        roughness = 0.7;
      } else if (wallDef.wallType === 'subway_tile') {
        wallColor = 0x1e293b;
        roughness = 0.4;
      }

      const wallMat = new THREE.MeshStandardMaterial({
        color: wallColor,
        roughness,
        metalness: 0.1,
      });
      const wallBacking = new THREE.Mesh(wallGeo, wallMat);
      wallBacking.castShadow = true;
      wallBacking.receiveShadow = true;
      group.add(wallBacking);

      // 2. Concrete/Alley trim frame
      const frameGeo = new THREE.BoxGeometry(wallDef.width + 0.8, 0.15, 0.45);
      const frameMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
      const topFrame = new THREE.Mesh(frameGeo, frameMat);
      topFrame.position.y = wallDef.height / 2 + 0.3;
      group.add(topFrame);

      const bottomFrame = new THREE.Mesh(frameGeo, frameMat);
      bottomFrame.position.y = -wallDef.height / 2 - 0.25;
      group.add(bottomFrame);

      // 3. Ground splatter decal
      const puddleGeo = new THREE.PlaneGeometry(wallDef.width * 0.9, 1.8);
      const puddleMat = new THREE.MeshBasicMaterial({
        color: 0x09090b,
        transparent: true,
        opacity: 0.4,
      });
      const groundSplatter = new THREE.Mesh(puddleGeo, puddleMat);
      groundSplatter.rotation.x = -Math.PI / 2;
      groundSplatter.position.set(0, -wallDef.pos.y + 0.02, 0.8);
      group.add(groundSplatter);

      // 4. Street Art Canvas Decal Quad
      const decalGeo = new THREE.PlaneGeometry(wallDef.width, wallDef.height);
      const defaultMat = new THREE.MeshStandardMaterial({
        color: 0xffffff,
        roughness: 0.85,
        metalness: 0.05,
        transparent: true,
        opacity: 0.95,
      });
      const decalMesh = new THREE.Mesh(decalGeo, defaultMat);
      decalMesh.position.set(0, 0, 0.21); // slightly in front of wall backing
      group.add(decalMesh);
      this.decalMeshes.set(wallDef.id, decalMesh);

      // Check if tag is already saved
      const existingTag = this.savedTags.get(wallDef.id);
      if (existingTag && existingTag.dataUrl) {
        this.updateWallDecalTexture(wallDef.id, existingTag.dataUrl);
      } else {
        // Draw unclaimed turf stencil preview
        this.drawUnclaimedCanvasPreview(wallDef.id, wallDef.name);
      }

      // 5. Hovering Spray Can Beacon Icon
      const beaconGroup = new THREE.Group();
      beaconGroup.position.set(0, wallDef.height / 2 + 0.8, 0.6);

      // Miniature spray can mesh for beacon
      const canBodyGeo = new THREE.CylinderGeometry(0.12, 0.12, 0.4, 16);
      const canMat = new THREE.MeshStandardMaterial({
        color: 0x00f0ff,
        emissive: 0x00f0ff,
        emissiveIntensity: 0.8,
        roughness: 0.3,
        metalness: 0.7,
      });
      const canBody = new THREE.Mesh(canBodyGeo, canMat);
      beaconGroup.add(canBody);

      const canNozzleGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.1, 12);
      const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xffffff, metalness: 0.8 });
      const nozzle = new THREE.Mesh(canNozzleGeo, nozzleMat);
      nozzle.position.y = 0.25;
      beaconGroup.add(nozzle);

      // Pulsing glow ring around spray can
      const ringGeo = new THREE.RingGeometry(0.3, 0.45, 24);
      const ringMat = new THREE.MeshBasicMaterial({
        color: 0x00f0ff,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.6,
      });
      const ring = new THREE.Mesh(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      beaconGroup.add(ring);

      group.add(beaconGroup);
      this.beaconMeshes.set(wallDef.id, beaconGroup);

      this.scene.add(group);
      this.wallMeshes.set(wallDef.id, group);
    });
  }

  // --- UNCLAIMED TURF PREVIEW TEXTURE ---
  private drawUnclaimedCanvasPreview(wallId: string, wallName: string) {
    const canvas = document.createElement('canvas');
    canvas.width = 1024;
    canvas.height = 680;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Dark weathered wall backing
    ctx.fillStyle = '#1c1c22';
    ctx.fillRect(0, 0, 1024, 680);

    // Weathered grunge noise lines
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.04)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 40; i++) {
      ctx.beginPath();
      ctx.moveTo(0, i * 18);
      ctx.lineTo(1024, i * 18 + (Math.random() - 0.5) * 10);
      ctx.stroke();
    }

    // Dashed bounding box for tagging zone
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.5)';
    ctx.lineWidth = 5;
    ctx.setLineDash([16, 12]);
    ctx.strokeRect(40, 40, 944, 600);
    ctx.setLineDash([]);

    // Corner targeting brackets
    const bracketSize = 50;
    ctx.strokeStyle = '#00f0ff';
    ctx.lineWidth = 8;
    // Top-left
    ctx.beginPath();
    ctx.moveTo(35, 35 + bracketSize);
    ctx.lineTo(35, 35);
    ctx.lineTo(35 + bracketSize, 35);
    ctx.stroke();
    // Top-right
    ctx.beginPath();
    ctx.moveTo(989 - bracketSize, 35);
    ctx.lineTo(989, 35);
    ctx.lineTo(989, 35 + bracketSize);
    ctx.stroke();
    // Bottom-left
    ctx.beginPath();
    ctx.moveTo(35, 645 - bracketSize);
    ctx.lineTo(35, 645);
    ctx.lineTo(35 + bracketSize, 645);
    ctx.stroke();
    // Bottom-right
    ctx.beginPath();
    ctx.moveTo(989 - bracketSize, 645);
    ctx.lineTo(989, 645);
    ctx.lineTo(989, 645 - bracketSize);
    ctx.stroke();

    // Center Stencil & Text
    ctx.fillStyle = 'rgba(0, 240, 255, 0.9)';
    ctx.font = '900 48px monospace';
    ctx.textAlign = 'center';
    ctx.fillText('AGAT STREET ART · TAG ZONE', 512, 280);

    ctx.fillStyle = '#ffffff';
    ctx.font = '700 28px sans-serif';
    ctx.fillText(wallName.toUpperCase(), 512, 340);

    ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
    ctx.font = '600 22px monospace';
    ctx.fillText('APPROACH & PRESS [E] TO SPRAY TAG WALL', 512, 400);

    ctx.fillStyle = '#f59e0b';
    ctx.font = '700 20px monospace';
    ctx.fillText('CLAIM TURF · STREET REP + CASH REWARD', 512, 450);

    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    const mesh = this.decalMeshes.get(wallId);
    if (mesh) {
      mesh.material = new THREE.MeshStandardMaterial({
        map: texture,
        roughness: 0.8,
        metalness: 0.1,
      });
    }
  }

  // --- UPDATE WALL WITH CUSTOM STREET ART ---
  public updateWallDecalTexture(wallId: string, dataUrl: string) {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 1024;
      canvas.height = 680;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      // Realistic wall backing underlay
      ctx.fillStyle = '#1c1c24';
      ctx.fillRect(0, 0, 1024, 680);

      // Subtle wall brick / mortar lines
      ctx.strokeStyle = 'rgba(0, 0, 0, 0.3)';
      ctx.lineWidth = 4;
      for (let y = 0; y < 680; y += 40) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(1024, y);
        ctx.stroke();
      }

      // Draw the player's custom spray artwork
      ctx.drawImage(img, 0, 0, 1024, 680);

      // Subtle street varnish & border
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.15)';
      ctx.lineWidth = 6;
      ctx.strokeRect(10, 10, 1004, 660);

      const texture = new THREE.CanvasTexture(canvas);
      texture.colorSpace = THREE.SRGBColorSpace;
      const mesh = this.decalMeshes.get(wallId);
      if (mesh) {
        mesh.material = new THREE.MeshStandardMaterial({
          map: texture,
          roughness: 0.65,
          metalness: 0.15,
          emissive: 0x111118,
          emissiveIntensity: 0.3,
        });
      }

      // Update beacon to marked / claimed state (Gold/Purple)
      const beacon = this.beaconMeshes.get(wallId);
      if (beacon) {
        beacon.traverse((child) => {
          if (child instanceof THREE.Mesh && child.material) {
            if ('color' in child.material) {
              child.material.color.set(0xff007f); // neon magenta for tagged turf
            }
            if ('emissive' in child.material) {
              child.material.emissive.set(0xff007f);
            }
          }
        });
      }
    };
    img.src = dataUrl;
  }

  // --- PROCEDURAL SPRAY MIST PARTICLES ---
  private createSprayMistParticles() {
    const particleCount = 200;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);

    for (let i = 0; i < particleCount * 3; i += 3) {
      positions[i] = 0;
      positions[i + 1] = 0;
      positions[i + 2] = 0;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0x00f0ff,
      size: 0.15,
      transparent: true,
      opacity: 0.75,
      blending: THREE.AdditiveBlending,
    });

    this.sprayParticles = new THREE.Points(geometry, material);
    this.sprayParticles.visible = false;
    this.scene.add(this.sprayParticles);
  }

  // --- DETECT NEAREST ALLEY WALL ---
  public update(playerPos: THREE.Vector3, time: number): AlleyTagWallDef | null {
    // 1. Animate hovering beacon markers
    this.beaconMeshes.forEach((beacon) => {
      beacon.rotation.y = time * 2;
      beacon.position.y = 2.4 + Math.sin(time * 3) * 0.12;
    });

    // 2. Check nearest wall
    let nearest: AlleyTagWallDef | null = null;
    let minDist = 3.6;

    for (const wall of ALLEY_TAG_WALLS) {
      const dx = playerPos.x - wall.standPos.x;
      const dz = playerPos.z - wall.standPos.z;
      const dist = Math.hypot(dx, dz);
      if (dist < minDist) {
        minDist = dist;
        nearest = wall;
      }
    }

    this.activeNearWall = nearest;
    return nearest;
  }

  // --- PROCEDURAL SPRAY PAINTING SEQUENCE IN 3D ---
  public async playTaggingSequence(
    wall: AlleyTagWallDef,
    dataUrl: string,
    playerMesh: THREE.Group,
    sprayColorHex: string = '#00f0ff',
    onProgress?: (ratio: number) => void
  ): Promise<void> {
    if (this.isAnimatingSpray) return;
    this.isAnimatingSpray = true;

    // 1. Audio: Spray can rattle
    soundManager.playSprayRattle();

    // 2. Spawn in-hand spray can prop on player
    const canGroup = new THREE.Group();
    const canBodyGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.18, 12);
    const canMat = new THREE.MeshStandardMaterial({
      color: new THREE.Color(sprayColorHex),
      roughness: 0.4,
      metalness: 0.6,
    });
    const canBody = new THREE.Mesh(canBodyGeo, canMat);
    canGroup.add(canBody);

    const nozzleGeo = new THREE.CylinderGeometry(0.015, 0.015, 0.04, 8);
    const nozzleMat = new THREE.MeshStandardMaterial({ color: 0xffffff });
    const nozzle = new THREE.Mesh(nozzleGeo, nozzleMat);
    nozzle.position.y = 0.11;
    canGroup.add(nozzle);

    // Attach spray can near right hand
    canGroup.position.set(0.35, 1.1, 0.4);
    playerMesh.add(canGroup);
    this.sprayCanProp = canGroup;

    // Wait a brief moment for can rattle
    await new Promise((r) => setTimeout(r, 400));

    // 3. Start spray hiss sound
    soundManager.startSprayHiss();

    // 4. Configure spray mist particle color & visibility
    if (this.sprayParticles) {
      if (this.sprayParticles.material instanceof THREE.PointsMaterial) {
        this.sprayParticles.material.color.set(sprayColorHex);
      }
      this.sprayParticles.visible = true;
    }

    // 5. Procedural spray animation sweep loop
    const totalDuration = 2200; // ms
    const startTime = performance.now();

    await new Promise<void>((resolve) => {
      const step = (now: number) => {
        const elapsed = now - startTime;
        const progress = Math.min(1, elapsed / totalDuration);
        onProgress?.(progress);

        // Animate player right arm & spray can
        const sweepX = Math.sin(progress * Math.PI * 6) * 0.25;
        const sweepY = 1.1 + Math.cos(progress * Math.PI * 4) * 0.18;
        if (this.sprayCanProp) {
          this.sprayCanProp.position.set(0.35 + sweepX, sweepY, 0.45);
          this.sprayCanProp.rotation.x = -0.2 + Math.sin(progress * 15) * 0.08;
          this.sprayCanProp.rotation.z = sweepX * 0.5;
        }

        // Animate spray mist particles shooting forward from nozzle
        if (this.sprayParticles && this.sprayCanProp) {
          const nozzleWorldPos = new THREE.Vector3();
          this.sprayCanProp.getWorldPosition(nozzleWorldPos);

          const positions = this.sprayParticles.geometry.attributes.position.array as Float32Array;
          const count = positions.length / 3;

          for (let i = 0; i < count; i++) {
            const spread = (i / count);
            const angle = Math.random() * Math.PI * 2;
            const coneRadius = 0.05 + spread * 0.35;
            // Spray forward in player's forward direction towards wall
            const forwardOffset = spread * 1.5;

            // Compute direction based on wall normal
            positions[i * 3] = nozzleWorldPos.x - wall.normal.x * forwardOffset + Math.cos(angle) * coneRadius;
            positions[i * 3 + 1] = nozzleWorldPos.y + Math.sin(angle) * coneRadius;
            positions[i * 3 + 2] = nozzleWorldPos.z - wall.normal.z * forwardOffset + Math.sin(angle) * coneRadius;
          }
          this.sprayParticles.geometry.attributes.position.needsUpdate = true;
        }

        if (progress < 1) {
          requestAnimationFrame(step);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(step);
    });

    // 6. Stop spray hiss
    soundManager.stopSprayHiss();

    // 7. Hide spray particles and remove spray can prop
    if (this.sprayParticles) {
      this.sprayParticles.visible = false;
    }
    if (this.sprayCanProp) {
      playerMesh.remove(this.sprayCanProp);
      this.sprayCanProp = null;
    }

    // 8. Update wall decal with final custom artwork
    this.updateWallDecalTexture(wall.id, dataUrl);

    // 9. Save tag to persistent record
    const tagRecord: TagStreetArtData = {
      wallId: wall.id,
      dataUrl,
      author: 'Player',
      timestamp: Date.now(),
      sprayColor: sprayColorHex,
    };
    this.savedTags.set(wall.id, tagRecord);
    this.savePersistedTags();

    // 10. Play celebratory fanfare and trigger callback
    soundManager.playTagCompletedFanfare();
    this.isAnimatingSpray = false;
    this.onTagCompleted?.(wall, wall.reward);
  }

  public getTaggedCount(): number {
    return this.savedTags.size;
  }

  public getTotalWallsCount(): number {
    return ALLEY_TAG_WALLS.length;
  }
}
