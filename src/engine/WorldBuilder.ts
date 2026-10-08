import * as THREE from 'three';
import { WeaponDef } from '../types/game';

export interface InWorldWeaponPickup {
  id: string;
  weapon: WeaponDef;
  mesh: THREE.Group;
  pos: THREE.Vector3;
  collected: boolean;
}

export interface RoadSegment {
  id: string;
  start: { x: number; z: number };
  end: { x: number; z: number };
  lanes: number;
  width: number;
}

export interface CityLocation {
  id: string;
  name: string;
  type: 'safehouse' | 'garage' | 'bank' | 'police' | 'hospital' | 'warehouse' | 'shop' | 'dock' | 'park';
  x: number;
  y: number;
  z: number;
  icon: string;
  description: string;
}

export interface WorldCollisionBox {
  min: THREE.Vector3;
  max: THREE.Vector3;
}

export class WorldBuilder {
  public scene: THREE.Scene;
  public colliders: WorldCollisionBox[] = [];
  public streetLights: THREE.PointLight[] = [];
  public streetLightMaterials: THREE.MeshStandardMaterial[] = [];
  public windowMaterials: THREE.MeshStandardMaterial[] = [];
  public roadSegments: RoadSegment[] = [];
  public keyLocations: CityLocation[] = [];
  public weaponPickups: InWorldWeaponPickup[] = [];
  public puddleMeshes: THREE.Mesh[] = [];

  // Ground and road materials for wetness updates
  public roadMaterial: THREE.MeshStandardMaterial | null = null;
  public sidewalkMaterial: THREE.MeshStandardMaterial | null = null;
  public puddleMaterial: THREE.MeshStandardMaterial | null = null;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
  }

  public buildWorld() {
    this.createMaterials();
    this.createTerrainAndOcean();
    this.createRoadGrid();
    this.createDowntownDistrict();
    this.createIndustrialDocks();
    this.createResidentialDistrict();
    this.createPublicInstitutions();
    this.createParkAndVegetation();
    this.createStreetFurniture();
    this.defineKeyLocations();
    this.spawnWeaponPickups();
    this.createRainPuddles();
  }

  private createMaterials() {
    // Road asphalt
    this.roadMaterial = new THREE.MeshStandardMaterial({
      color: 0x1f2428,
      roughness: 0.8,
      metalness: 0.1,
    });

    // Sidewalk concrete
    this.sidewalkMaterial = new THREE.MeshStandardMaterial({
      color: 0x7a8288,
      roughness: 0.85,
      metalness: 0.05,
    });
  }

  private createTerrainAndOcean() {
    // Ground base plate (covers 800m x 800m)
    const groundGeo = new THREE.PlaneGeometry(800, 800);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x223026,
      roughness: 0.95,
      metalness: 0.05,
    });
    const groundMesh = new THREE.Mesh(groundGeo, groundMat);
    groundMesh.rotation.x = -Math.PI / 2;
    groundMesh.position.y = -0.05;
    groundMesh.receiveShadow = true;
    this.scene.add(groundMesh);

    // Ocean water plane to the South/South-East
    const oceanGeo = new THREE.PlaneGeometry(800, 400);
    const oceanMat = new THREE.MeshStandardMaterial({
      color: 0x0c3b5e,
      roughness: 0.15,
      metalness: 0.8,
      transparent: true,
      opacity: 0.85,
    });
    const oceanMesh = new THREE.Mesh(oceanGeo, oceanMat);
    oceanMesh.rotation.x = -Math.PI / 2;
    oceanMesh.position.set(0, -0.4, 380);
    this.scene.add(oceanMesh);

    // Sandy beach buffer strip
    const beachGeo = new THREE.PlaneGeometry(600, 50);
    const beachMat = new THREE.MeshStandardMaterial({
      color: 0xc4b28a,
      roughness: 0.9,
    });
    const beachMesh = new THREE.Mesh(beachGeo, beachMat);
    beachMesh.rotation.x = -Math.PI / 2;
    beachMesh.position.set(0, -0.02, 175);
    beachMesh.receiveShadow = true;
    this.scene.add(beachMesh);
  }

  private createRoadGrid() {
    // Define main avenue coordinates
    // East-West avenues: Z = -160, -80, 0, 80, 150
    // North-South boulevards: X = -160, -80, 0, 80, 160
    const ewAvenues = [-160, -80, 0, 80, 150];
    const nsBoulevards = [-160, -80, 0, 80, 160];

    // East-West Roads
    for (const z of ewAvenues) {
      const roadGeo = new THREE.PlaneGeometry(360, 14);
      const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial!);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(0, 0.02, z);
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      // Road markings (yellow dashed centerline)
      this.createCenterline(-170, z, 170, z);

      // Sidewalk strips
      this.createSidewalk(0, z + 8, 360, 2.5);
      this.createSidewalk(0, z - 8, 360, 2.5);

      this.roadSegments.push({
        id: `ew_${z}`,
        start: { x: -170, z },
        end: { x: 170, z },
        lanes: 2,
        width: 14,
      });
    }

    // North-South Roads
    for (const x of nsBoulevards) {
      const roadGeo = new THREE.PlaneGeometry(14, 330);
      const roadMesh = new THREE.Mesh(roadGeo, this.roadMaterial!);
      roadMesh.rotation.x = -Math.PI / 2;
      roadMesh.position.set(x, 0.02, 0);
      roadMesh.receiveShadow = true;
      this.scene.add(roadMesh);

      this.createCenterline(x, -165, x, 155);

      this.createSidewalk(x + 8, 0, 2.5, 330);
      this.createSidewalk(x - 8, 0, 2.5, 330);

      this.roadSegments.push({
        id: `ns_${x}`,
        start: { x, z: -165 },
        end: { x, z: 155 },
        lanes: 2,
        width: 14,
      });
    }
  }

  private createSidewalk(x: number, z: number, width: number, depth: number) {
    const geo = new THREE.BoxGeometry(width, 0.25, depth);
    const mesh = new THREE.Mesh(geo, this.sidewalkMaterial!);
    mesh.position.set(x, 0.125, z);
    mesh.receiveShadow = true;
    this.scene.add(mesh);
  }

  private createCenterline(x1: number, z1: number, x2: number, z2: number) {
    const isHorizontal = Math.abs(z1 - z2) < 0.1;
    const count = isHorizontal ? Math.floor(Math.abs(x2 - x1) / 8) : Math.floor(Math.abs(z2 - z1) / 8);
    const dashGeo = new THREE.PlaneGeometry(isHorizontal ? 4 : 0.4, isHorizontal ? 0.4 : 4);
    const dashMat = new THREE.MeshBasicMaterial({ color: 0xe6b800 });

    for (let i = 0; i < count; i++) {
      const t = (i + 0.5) / count;
      const x = x1 + (x2 - x1) * t;
      const z = z1 + (z2 - z1) * t;
      const dash = new THREE.Mesh(dashGeo, dashMat);
      dash.rotation.x = -Math.PI / 2;
      dash.position.set(x, 0.03, z);
      this.scene.add(dash);
    }
  }

  private addBuilding(
    x: number,
    z: number,
    width: number,
    depth: number,
    height: number,
    color: number,
    name?: string,
    neonColor?: number
  ) {
    const geo = new THREE.BoxGeometry(width, height, depth);
    const mat = new THREE.MeshStandardMaterial({
      color,
      roughness: 0.4,
      metalness: 0.3,
    });

    const mesh = new THREE.Mesh(geo, mat);
    mesh.position.set(x, height / 2, z);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    this.scene.add(mesh);

    // Register collider box
    this.colliders.push({
      min: new THREE.Vector3(x - width / 2 - 0.2, 0, z - depth / 2 - 0.2),
      max: new THREE.Vector3(x + width / 2 + 0.2, height, z + depth / 2 + 0.2),
    });

    // Add illuminated windows
    const windowMat = new THREE.MeshStandardMaterial({
      color: 0xfff2a3,
      emissive: 0xffea78,
      emissiveIntensity: 0.2,
      roughness: 0.2,
    });
    this.windowMaterials.push(windowMat);

    // Window facade slabs
    if (height > 15) {
      const facadeGeo = new THREE.PlaneGeometry(width * 0.85, height * 0.7);
      const facadeFront = new THREE.Mesh(facadeGeo, windowMat);
      facadeFront.position.set(x, height * 0.5, z + depth / 2 + 0.05);
      this.scene.add(facadeFront);

      const facadeBack = new THREE.Mesh(facadeGeo, windowMat);
      facadeBack.rotation.y = Math.PI;
      facadeBack.position.set(x, height * 0.5, z - depth / 2 - 0.05);
      this.scene.add(facadeBack);
    }

    // Optional Roof Heli-pad or Architectural Crown
    if (height > 35) {
      const crownGeo = new THREE.BoxGeometry(width * 0.7, 3, depth * 0.7);
      const crownMat = new THREE.MeshStandardMaterial({ color: 0x111115, metalness: 0.7, roughness: 0.2 });
      const crown = new THREE.Mesh(crownGeo, crownMat);
      crown.position.set(x, height + 1.5, z);
      this.scene.add(crown);

      // Antenna beacon
      const antennaGeo = new THREE.CylinderGeometry(0.3, 0.3, 10);
      const antennaMat = new THREE.MeshStandardMaterial({ color: 0x990000, emissive: 0xff0000, emissiveIntensity: 0.8 });
      const antenna = new THREE.Mesh(antennaGeo, antennaMat);
      antenna.position.set(x, height + 8, z);
      this.scene.add(antenna);
    }

    // Neon signage banner if specified
    if (name && neonColor) {
      this.addNeonSign(x, height * 0.3, z + depth / 2 + 0.3, name, neonColor);
    }

    return mesh;
  }

  private addNeonSign(x: number, y: number, z: number, text: string, colorHex: number) {
    const signGroup = new THREE.Group();
    signGroup.position.set(x, y, z);

    // Sign backing board
    const backGeo = new THREE.BoxGeometry(16, 3, 0.4);
    const backMat = new THREE.MeshStandardMaterial({ color: 0x15161c, roughness: 0.5 });
    const backMesh = new THREE.Mesh(backGeo, backMat);
    signGroup.add(backMesh);

    // Glowing Neon Bar
    const neonGeo = new THREE.BoxGeometry(15, 2.2, 0.5);
    const neonMat = new THREE.MeshStandardMaterial({
      color: colorHex,
      emissive: colorHex,
      emissiveIntensity: 0.9,
      roughness: 0.1,
    });
    this.windowMaterials.push(neonMat);
    const neonMesh = new THREE.Mesh(neonGeo, neonMat);
    neonMesh.position.z = 0.1;
    signGroup.add(neonMesh);

    this.scene.add(signGroup);
  }

  private createDowntownDistrict() {
    // Downtown occupies (X: 20 to 140, Z: -60 to 60)
    // Tower 1: AGAT Financial Centre
    this.addBuilding(40, -40, 32, 32, 75, 0x1a2634, 'AGAT FINANCIAL', 0x00e5ff);

    // Tower 2: SOLIS TOWER
    this.addBuilding(120, -40, 36, 36, 92, 0x1c2b3a, 'SOLIS TOWER', 0xffa600);

    // Tower 3: VORTEX PLAZA
    this.addBuilding(40, 40, 30, 30, 60, 0x222630, 'VORTEX PLAZA', 0x00ff88);

    // Tower 4: NEO APEX TOWER
    this.addBuilding(120, 40, 34, 34, 80, 0x2a2238, 'NEO APEX', 0xe000ff);

    // Secondary mid-rises downtown
    this.addBuilding(40, -120, 28, 28, 48, 0x303540);
    this.addBuilding(120, -120, 30, 26, 42, 0x252a35);
  }

  private createIndustrialDocks() {
    // Industrial Docks occupy (X: -140 to 140, Z: 100 to 150)
    // Large Cargo Warehouse 1 (First Job Pickup location)
    this.addBuilding(-40, 115, 45, 24, 12, 0x545b63, 'DOCK LOGISTICS', 0xff9900);

    // Cargo Warehouse 2 (Syndicate Hideout)
    this.addBuilding(40, 115, 45, 24, 12, 0x484f57, 'WAREHOUSE 07', 0xff2222);

    // Shipping Container Stacks
    const containerColors = [0xb83227, 0x1b74e4, 0x16a085, 0xd35400, 0x7f8c8d];
    for (let i = 0; i < 8; i++) {
      const cx = -110 + i * 14;
      const cz = 120 + (i % 2) * 8;
      const cGeo = new THREE.BoxGeometry(10, 4, 4.5);
      const cMat = new THREE.MeshStandardMaterial({
        color: containerColors[i % containerColors.length],
        roughness: 0.6,
        metalness: 0.4,
      });
      const cMesh = new THREE.Mesh(cGeo, cMat);
      cMesh.position.set(cx, 2, cz);
      cMesh.castShadow = true;
      this.scene.add(cMesh);

      this.colliders.push({
        min: new THREE.Vector3(cx - 5.2, 0, cz - 2.5),
        max: new THREE.Vector3(cx + 5.2, 4.2, cz + 2.5),
      });

      // Second stack level on some
      if (i % 3 === 0) {
        const topMesh = new THREE.Mesh(cGeo, cMat);
        topMesh.position.set(cx, 6, cz);
        topMesh.castShadow = true;
        this.scene.add(topMesh);
      }
    }

    // Heavy Dock Crane
    this.createHarborCrane(110, 135);
    this.createHarborCrane(-120, 135);
  }

  private createHarborCrane(x: number, z: number) {
    const craneMat = new THREE.MeshStandardMaterial({ color: 0xf1c40f, roughness: 0.4, metalness: 0.7 });
    // Tower mast
    const mastGeo = new THREE.BoxGeometry(4, 38, 4);
    const mast = new THREE.Mesh(mastGeo, craneMat);
    mast.position.set(x, 19, z);
    this.scene.add(mast);

    // Boom arm
    const boomGeo = new THREE.BoxGeometry(40, 3, 3);
    const boom = new THREE.Mesh(boomGeo, craneMat);
    boom.position.set(x, 38, z);
    this.scene.add(boom);

    this.colliders.push({
      min: new THREE.Vector3(x - 2.5, 0, z - 2.5),
      max: new THREE.Vector3(x + 2.5, 38, z + 2.5),
    });
  }

  private createResidentialDistrict() {
    // Residential / Commercial District occupies (X: -140 to -40, Z: -140 to 60)
    // Player Safehouse & Tuning Garage
    this.addBuilding(-120, 40, 26, 26, 14, 0x4a5568, 'AGAT SAFEHOUSE', 0x38bdf8);

    // Downtown Motors / Car Dealership
    this.addBuilding(-40, 40, 28, 28, 12, 0x2d3748, 'VORTEX MOTORS', 0x22c55e);

    // Gas Station & Canopy
    this.createGasStation(-120, -40);

    // Residential Apartment Blocks
    this.addBuilding(-120, -120, 30, 25, 24, 0x64748b);
    this.addBuilding(-40, -120, 28, 26, 28, 0x52525b);
  }

  private createGasStation(x: number, z: number) {
    // Station Convenience Store
    this.addBuilding(x - 6, z - 8, 18, 12, 6, 0x334155, 'AGAT 24/7 MART', 0xef4444);

    // Canopy over pumps
    const canopyMat = new THREE.MeshStandardMaterial({ color: 0xe2e8f0, roughness: 0.3 });
    const canopyGeo = new THREE.BoxGeometry(22, 1, 14);
    const canopy = new THREE.Mesh(canopyGeo, canopyMat);
    canopy.position.set(x + 6, 5.5, z + 6);
    this.scene.add(canopy);

    // 4 Support Pillars
    const pillarGeo = new THREE.CylinderGeometry(0.3, 0.3, 5);
    const pillarMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8 });
    const pillars = [
      [-3, -4],
      [3, -4],
      [-3, 4],
      [3, 4],
    ];
    for (const [px, pz] of pillars) {
      const p = new THREE.Mesh(pillarGeo, pillarMat);
      p.position.set(x + 6 + px, 2.5, z + 6 + pz);
      this.scene.add(p);
    }

    // Fuel pump island
    const pumpGeo = new THREE.BoxGeometry(1.5, 2.5, 3);
    const pumpMat = new THREE.MeshStandardMaterial({ color: 0xdc2626 });
    const pump = new THREE.Mesh(pumpGeo, pumpMat);
    pump.position.set(x + 6, 1.25, z + 6);
    this.scene.add(pump);

    this.colliders.push({
      min: new THREE.Vector3(x + 4.5, 0, z + 4),
      max: new THREE.Vector3(x + 7.5, 3, z + 8),
    });
  }

  private createPublicInstitutions() {
    // Central AGAT Bank (Major Heist target!)
    this.addBuilding(40, -40 + 80 * 0, 32, 32, 28, 0x475569, 'CENTRAL AGAT BANK', 0xeab308);

    // AGAT Metro Police Department HQ
    this.addBuilding(120, -120 + 80 * 0, 32, 30, 20, 0x1e293b, 'METRO POLICE DEPT', 0x2563eb);

    // AGAT City General Hospital
    this.addBuilding(-40, -40, 30, 30, 22, 0xe2e8f0, 'AGAT GENERAL HOSPITAL', 0xef4444);
  }

  private createParkAndVegetation() {
    // Civic Park in the quadrant (X: -140 to -20, Z: -150 to -70)
    const parkGrassGeo = new THREE.PlaneGeometry(100, 60);
    const parkGrassMat = new THREE.MeshStandardMaterial({
      color: 0x2d5a27,
      roughness: 0.9,
    });
    const parkGrass = new THREE.Mesh(parkGrassGeo, parkGrassMat);
    parkGrass.rotation.x = -Math.PI / 2;
    parkGrass.position.set(-80, 0.05, -80);
    parkGrass.receiveShadow = true;
    this.scene.add(parkGrass);

    // Park Pond / Water
    const pondGeo = new THREE.CircleGeometry(16, 24);
    const pondMat = new THREE.MeshStandardMaterial({
      color: 0x1b4965,
      roughness: 0.2,
      metalness: 0.7,
    });
    const pond = new THREE.Mesh(pondGeo, pondMat);
    pond.rotation.x = -Math.PI / 2;
    pond.position.set(-80, 0.08, -80);
    this.scene.add(pond);

    // Trees in the park and along roads
    const treeCoords = [
      [-110, -95],
      [-110, -65],
      [-50, -95],
      [-50, -65],
      [-80, -100],
      [-80, -60],
      [-100, -80],
      [-60, -80],
      // Boulevard trees
      [-3, -30],
      [-3, 30],
      [-3, -110],
      [-3, 110],
    ];

    for (const [tx, tz] of treeCoords) {
      this.createTree(tx, tz);
    }
  }

  private createTree(x: number, z: number) {
    const treeGroup = new THREE.Group();
    treeGroup.position.set(x, 0, z);

    // Trunk
    const trunkGeo = new THREE.CylinderGeometry(0.35, 0.5, 4, 8);
    const trunkMat = new THREE.MeshStandardMaterial({ color: 0x5a3d28, roughness: 0.9 });
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2;
    trunk.castShadow = true;
    treeGroup.add(trunk);

    // Foliage (two stacked cones)
    const folMat = new THREE.MeshStandardMaterial({ color: 0x1e6f3d, roughness: 0.8 });
    const cone1 = new THREE.Mesh(new THREE.ConeGeometry(2.5, 4, 8), folMat);
    cone1.position.y = 4.5;
    cone1.castShadow = true;
    treeGroup.add(cone1);

    const cone2 = new THREE.Mesh(new THREE.ConeGeometry(2, 3.5, 8), folMat);
    cone2.position.y = 6.5;
    cone2.castShadow = true;
    treeGroup.add(cone2);

    this.scene.add(treeGroup);

    this.colliders.push({
      min: new THREE.Vector3(x - 0.5, 0, z - 0.5),
      max: new THREE.Vector3(x + 0.5, 5, z + 0.5),
    });
  }

  private createStreetFurniture() {
    // Street lamps along main avenues
    const lampSpacing = 40;
    for (let x = -160; x <= 160; x += lampSpacing) {
      for (const z of [-80, 0, 80]) {
        this.createStreetLamp(x + 6, z + 6);
      }
    }
  }

  private createStreetLamp(x: number, z: number) {
    const poleGeo = new THREE.CylinderGeometry(0.12, 0.16, 7);
    const poleMat = new THREE.MeshStandardMaterial({ color: 0x334155, metalness: 0.8, roughness: 0.3 });
    const pole = new THREE.Mesh(poleGeo, poleMat);
    pole.position.set(x, 3.5, z);
    pole.castShadow = true;
    this.scene.add(pole);

    // Arm and Bulb
    const armGeo = new THREE.BoxGeometry(1.5, 0.15, 0.15);
    const arm = new THREE.Mesh(armGeo, poleMat);
    arm.position.set(x + 0.7, 6.9, z);
    this.scene.add(arm);

    // Light bulb mesh
    const bulbGeo = new THREE.SphereGeometry(0.3, 8, 8);
    const bulbMat = new THREE.MeshStandardMaterial({
      color: 0xffea9f,
      emissive: 0xffea9f,
      emissiveIntensity: 0.8,
    });
    this.streetLightMaterials.push(bulbMat);

    const bulb = new THREE.Mesh(bulbGeo, bulbMat);
    bulb.position.set(x + 1.3, 6.7, z);
    this.scene.add(bulb);

    // Light source
    const light = new THREE.PointLight(0xffea9f, 0.8, 22, 1.8);
    light.position.set(x + 1.3, 6.5, z);
    this.scene.add(light);
    this.streetLights.push(light);
  }

  private defineKeyLocations() {
    this.keyLocations = [
      {
        id: 'safehouse',
        name: 'AGAT Safehouse & Garage',
        type: 'safehouse',
        x: -120,
        y: 0,
        z: 40,
        icon: 'Home',
        description: 'Your primary hideout, vehicle storage, and equipment depot.',
      },
      {
        id: 'docks_warehouse',
        name: 'Industrial Port Warehouse 07',
        type: 'warehouse',
        x: 40,
        y: 0,
        z: 115,
        icon: 'Package',
        description: 'Smuggling bay and cargo storage along the southern coastline.',
      },
      {
        id: 'central_bank',
        name: 'Central Bank of AGAT',
        type: 'bank',
        x: 40,
        y: 0,
        z: -40,
        icon: 'Landmark',
        description: 'Heavily guarded high-security financial vault downtown.',
      },
      {
        id: 'police_hq',
        name: 'AGAT Metro Police HQ',
        type: 'police',
        x: 120,
        y: 0,
        z: -120,
        icon: 'Shield',
        description: 'District 1 precinct and tactical law enforcement dispatch.',
      },
      {
        id: 'hospital',
        name: 'AGAT General Hospital',
        type: 'hospital',
        x: -40,
        y: 0,
        z: -40,
        icon: 'HeartPulse',
        description: 'City emergency medical centre and trauma care ward.',
      },
      {
        id: 'solis_tower',
        name: 'Solis Corporate Tower',
        type: 'dock',
        x: 120,
        y: 0,
        z: -40,
        icon: 'Building2',
        description: 'Prominent skyscraper headquarters overlooking the bay.',
      },
      {
        id: 'civic_park',
        name: 'Civic Central Gardens',
        type: 'park',
        x: -80,
        y: 0,
        z: -80,
        icon: 'Trees',
        description: 'Tranquil public sanctuary featuring the central lake.',
      },
    ];
  }

  // Weather & Night lighting updates
  public updateEnvironment(timeOfDay: number, weather: 'clear' | 'cloudy' | 'rain' | 'storm') {
    const isNight = timeOfDay < 6 || timeOfDay > 19;
    const isRaining = weather === 'rain' || weather === 'storm';

    // Toggle streetlights and building window illumination
    const streetLightIntensity = isNight ? 1.4 : 0.05;
    for (const light of this.streetLights) {
      light.intensity = streetLightIntensity;
    }
    for (const mat of this.streetLightMaterials) {
      mat.emissiveIntensity = isNight ? 1.2 : 0.1;
    }
    for (const mat of this.windowMaterials) {
      mat.emissiveIntensity = isNight ? 0.9 : 0.15;
    }

    // Wet asphalt reflections during rain
    if (this.roadMaterial) {
      this.roadMaterial.roughness = isRaining ? 0.25 : 0.8;
      this.roadMaterial.metalness = isRaining ? 0.45 : 0.1;
    }
    if (this.sidewalkMaterial) {
      this.sidewalkMaterial.roughness = isRaining ? 0.35 : 0.85;
    }
    if (this.puddleMaterial) {
      this.puddleMaterial.opacity = isRaining ? 0.85 : 0.0;
    }
  }

  public createRainPuddles() {
    this.puddleMaterial = new THREE.MeshStandardMaterial({
      color: 0x0f172a,
      roughness: 0.05,
      metalness: 0.85,
      transparent: true,
      opacity: 0.0,
    });

    const puddlePositions = [
      [-40, 0.035, 0],
      [40, 0.035, 0],
      [0, 0.035, -80],
      [0, 0.035, 80],
      [-120, 0.035, 30],
    ];

    puddlePositions.forEach(([px, py, pz]) => {
      const geo = new THREE.CircleGeometry(3.5 + Math.random() * 2, 16);
      const mesh = new THREE.Mesh(geo, this.puddleMaterial!);
      mesh.rotation.x = -Math.PI / 2;
      mesh.position.set(px, py, pz);
      this.scene.add(mesh);
      this.puddleMeshes.push(mesh);
    });
  }

  public spawnWeaponPickups() {
    const pickupDefs: Array<{ x: number; z: number; weapon: WeaponDef }> = [
      {
        x: -110,
        z: 38,
        weapon: {
          id: 'arc9_stunner',
          name: 'ARC-9 Stunner',
          type: 'pistol',
          damage: 25,
          maxAmmo: 14,
          currentAmmo: 14,
          reserveAmmo: 70,
          fireRate: 4.0,
          range: 50,
          reloadTime: 1.1,
          color: '#00d2ff',
          projectileSpeed: 100,
          condition: 100,
          description: 'Tactical ion sidearm with rapid cycle rate.',
        },
      },
      {
        x: 35,
        z: 115,
        weapon: {
          id: 'vulcan45_carbine',
          name: 'VULCAN-45 Carbine',
          type: 'rifle',
          damage: 35,
          maxAmmo: 30,
          currentAmmo: 30,
          reserveAmmo: 150,
          fireRate: 8.5,
          range: 85,
          reloadTime: 1.6,
          color: '#f59e0b',
          projectileSpeed: 130,
          condition: 100,
          description: 'Military-grade automatic carbine.',
        },
      },
      {
        x: 115,
        z: -40,
        weapon: {
          id: 'spectre_dmr',
          name: 'SPECTRE Precision DMR',
          type: 'precision',
          damage: 95,
          maxAmmo: 10,
          currentAmmo: 10,
          reserveAmmo: 40,
          fireRate: 2.0,
          range: 140,
          reloadTime: 1.9,
          color: '#a855f7',
          projectileSpeed: 175,
          condition: 100,
          description: 'Long-range marksman rifle with high kinetic penetration.',
        },
      },
    ];

    pickupDefs.forEach((item, idx) => {
      const group = new THREE.Group();
      group.position.set(item.x, 0.6, item.z);

      // Glowing hologram pedestal
      const pedGeo = new THREE.CylinderGeometry(0.5, 0.6, 0.3, 16);
      const pedMat = new THREE.MeshStandardMaterial({
        color: 0x1e293b,
        metalness: 0.8,
        roughness: 0.2,
      });
      const ped = new THREE.Mesh(pedGeo, pedMat);
      ped.position.y = -0.45;
      group.add(ped);

      // Weapon floating icon
      const weaponGeo = new THREE.BoxGeometry(0.12, 0.18, 0.7);
      const weaponMat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(item.weapon.color),
        emissive: new THREE.Color(item.weapon.color),
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.1,
      });
      const weaponMesh = new THREE.Mesh(weaponGeo, weaponMat);
      group.add(weaponMesh);

      // Light glow
      const light = new THREE.PointLight(new THREE.Color(item.weapon.color), 1.5, 5, 2);
      light.position.y = 0.2;
      group.add(light);

      this.scene.add(group);

      this.weaponPickups.push({
        id: `pickup_${idx}_${item.weapon.id}`,
        weapon: item.weapon,
        mesh: group,
        pos: new THREE.Vector3(item.x, 0.6, item.z),
        collected: false,
      });
    });
  }

  public updatePickups(delta: number) {
    const time = performance.now() * 0.002;
    for (const p of this.weaponPickups) {
      if (!p.collected) {
        p.mesh.rotation.y += delta * 1.5;
        p.mesh.position.y = 0.6 + Math.sin(time + p.pos.x) * 0.12;
      }
    }
  }

  public getNearestPickup(pos: THREE.Vector3, maxDist = 2.8): InWorldWeaponPickup | null {
    let nearest: InWorldWeaponPickup | null = null;
    let minDist = maxDist;

    for (const p of this.weaponPickups) {
      if (p.collected) continue;
      const d = pos.distanceTo(p.pos);
      if (d < minDist) {
        minDist = d;
        nearest = p;
      }
    }
    return nearest;
  }

  public collectPickup(pickup: InWorldWeaponPickup) {
    pickup.collected = true;
    this.scene.remove(pickup.mesh);
  }

  // Simple box collision test for player and vehicle
  public checkCollision(pos: THREE.Vector3, radius = 0.6): boolean {
    // World boundary check (-240 to 240)
    if (Math.abs(pos.x) > 230 || Math.abs(pos.z) > 230) {
      return true;
    }

    for (const box of this.colliders) {
      if (
        pos.x + radius > box.min.x &&
        pos.x - radius < box.max.x &&
        pos.z + radius > box.min.z &&
        pos.z - radius < box.max.z &&
        pos.y < box.max.y &&
        pos.y + 1.8 > box.min.y
      ) {
        return true;
      }
    }
    return false;
  }
}
