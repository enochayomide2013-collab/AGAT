import * as THREE from 'three';
import { BuildingInteriorLocation, InteriorInteractable, Vector3D } from '../types/game';
import { soundManager } from './SoundManager';

export const INTERIOR_LOCATIONS: BuildingInteriorLocation[] = [
  {
    id: 'diner',
    name: 'Starlight Diner',
    district: 'Downtown East',
    exteriorPos: { x: -45, y: 0, z: 25 },
    interiorPos: { x: -45, y: 0.05, z: 32 },
    exitPos: { x: -45, y: 0.05, z: 28 },
    color: '#f59e0b',
    icon: 'Coffee',
    description: 'Retro 24-hour diner known for fresh espresso, homemade cherry pie, and jukebox hits.',
  },
  {
    id: 'shop',
    name: 'Quick-Mart 24/7',
    district: 'Mid-City North',
    exteriorPos: { x: 35, y: 0, z: -50 },
    interiorPos: { x: 35, y: 0.05, z: -57 },
    exitPos: { x: 35, y: 0.05, z: -53 },
    color: '#10b981',
    icon: 'ShoppingBag',
    description: 'Convenience store stocked with energy drinks, first-aid kits, ATMs, and counter supplies.',
  },
  {
    id: 'apartment',
    name: 'Skyline Safehouse Apartment',
    district: 'West Residential',
    exteriorPos: { x: -120, y: 0, z: 18 },
    interiorPos: { x: -120, y: 0.05, z: 27 },
    exitPos: { x: -120, y: 0.05, z: 22 },
    color: '#06b6d4',
    icon: 'Home',
    description: 'Your private high-rise penthouse loft featuring a wardrobe mirror, ammo lockers, and cozy rest bed.',
  },
  {
    id: 'barbershop',
    name: 'Fade & Blade Barbershop',
    district: 'South Commerce',
    exteriorPos: { x: 80, y: 0, z: 80 },
    interiorPos: { x: 80, y: 0.05, z: 88 },
    exitPos: { x: 80, y: 0.05, z: 83 },
    color: '#a855f7',
    icon: 'Scissors',
    description: 'Premier urban stylist parlor for custom hairstyles, beard trims, cyber eyewear, and fresh threads.',
  },
];

export class InteriorManager {
  public scene: THREE.Scene;
  public currentInterior: BuildingInteriorLocation | null = null;
  public interactables: InteriorInteractable[] = [];
  public activeInteractable: InteriorInteractable | null = null;
  public nearExteriorEntrance: BuildingInteriorLocation | null = null;

  // 3D groups & props
  public interiorGroups: Map<string, THREE.Group> = new Map();
  public entranceMarkers: THREE.Group[] = [];
  public interiorLights: THREE.Light[] = [];

  // Callback hooks
  public onOpenCustomization?: () => void;
  public onOpenShop?: () => void;
  public onDialoguePrompt?: (speaker: string, text: string) => void;

  constructor(scene: THREE.Scene) {
    this.scene = scene;
    this.buildAllInteriors();
  }

  private buildAllInteriors() {
    this.buildExteriorMarkers();
    this.buildStarlightDiner();
    this.buildQuickMart();
    this.buildSafehouseApartment();
    this.buildBarbershop();
  }

  // --- EXTERIOR ENTRANCE MARKERS ---
  private buildExteriorMarkers() {
    INTERIOR_LOCATIONS.forEach((loc) => {
      const markerGroup = new THREE.Group();
      markerGroup.position.set(loc.exteriorPos.x, 0.05, loc.exteriorPos.z);

      // Glowing circular door pad on sidewalk
      const padGeo = new THREE.RingGeometry(0.8, 1.4, 24);
      const padMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(loc.color),
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.65,
      });
      const pad = new THREE.Mesh(padGeo, padMat);
      pad.rotation.x = -Math.PI / 2;
      markerGroup.add(pad);

      // Hovering pulsing beacon icon
      const beaconGeo = new THREE.CylinderGeometry(0.08, 0.08, 2.2, 8);
      const beaconMat = new THREE.MeshBasicMaterial({
        color: new THREE.Color(loc.color),
        transparent: true,
        opacity: 0.4,
      });
      const beam = new THREE.Mesh(beaconGeo, beaconMat);
      beam.position.y = 1.1;
      markerGroup.add(beam);

      this.scene.add(markerGroup);
      this.entranceMarkers.push(markerGroup);
    });
  }

  // --- INTERIOR 1: STARLIGHT DINER ---
  private buildStarlightDiner() {
    const group = new THREE.Group();
    const pos = { x: -45, y: 0, z: 34 };
    group.position.set(pos.x, pos.y, pos.z);

    // Floor (Checkered black & white linoleum)
    const floorGeo = new THREE.PlaneGeometry(14, 12);
    const floorMat = new THREE.MeshStandardMaterial({
      color: 0x242426,
      roughness: 0.4,
      metalness: 0.2,
    });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling
    const ceilGeo = new THREE.PlaneGeometry(14, 12);
    const ceilMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.9 });
    const ceil = new THREE.Mesh(ceilGeo, ceilMat);
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.6;
    group.add(ceil);

    // Walls (North back wall, East & West walls)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.7 }); // retro diner burgundy
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(14, 3.6, 0.3), wallMat);
    backWall.position.set(0, 1.8, 6);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 12), wallMat);
    leftWall.position.set(-7, 1.8, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 12), wallMat);
    rightWall.position.set(7, 1.8, 0);
    group.add(rightWall);

    // Front wall with exit door opening
    const frontWallL = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.6, 0.3), wallMat);
    frontWallL.position.set(-4.25, 1.8, -6);
    group.add(frontWallL);

    const frontWallR = new THREE.Mesh(new THREE.BoxGeometry(5.5, 3.6, 0.3), wallMat);
    frontWallR.position.set(4.25, 1.8, -6);
    group.add(frontWallR);

    // Diner Chrome Counter (Long L-shaped counter)
    const counterMat = new THREE.MeshStandardMaterial({ color: 0xd4d4d8, roughness: 0.3, metalness: 0.7 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(8, 1.05, 1.1), counterMat);
    counter.position.set(0, 0.52, 2.5);
    counter.castShadow = true;
    group.add(counter);

    // Stools along counter
    const stoolMat = new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.4 }); // red vinyl
    for (let i = -3; i <= 3; i += 1.5) {
      const stool = new THREE.Mesh(new THREE.CylinderGeometry(0.28, 0.28, 0.7, 16), stoolMat);
      stool.position.set(i, 0.35, 1.2);
      group.add(stool);
    }

    // Espresso Machine on Counter
    const coffeeMat = new THREE.MeshStandardMaterial({ color: 0x09090b, metalness: 0.8, roughness: 0.2 });
    const coffeeMachine = new THREE.Mesh(new THREE.BoxGeometry(0.8, 0.65, 0.5), coffeeMat);
    coffeeMachine.position.set(-2.5, 1.35, 2.5);
    group.add(coffeeMachine);

    // Cherry Pie Glass Dome on Counter
    const pieMat = new THREE.MeshStandardMaterial({ color: 0xd97706, roughness: 0.5 });
    const pie = new THREE.Mesh(new THREE.CylinderGeometry(0.25, 0.25, 0.12, 16), pieMat);
    pie.position.set(1.8, 1.12, 2.5);
    group.add(pie);

    // Vintage Neon Jukebox in corner
    const jukeMat = new THREE.MeshStandardMaterial({
      color: 0xf59e0b,
      emissive: 0xf59e0b,
      emissiveIntensity: 0.4,
      roughness: 0.3,
    });
    const jukebox = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.1, 0.9), jukeMat);
    jukebox.position.set(5.5, 1.05, 4.5);
    group.add(jukebox);

    // Diner Booth Tables
    const tableMat = new THREE.MeshStandardMaterial({ color: 0x3f3f46, roughness: 0.5 });
    [-4, 4].forEach((xPos) => {
      const table = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.95, 1.5), tableMat);
      table.position.set(xPos, 0.47, -2.5);
      group.add(table);
    });

    // Warm Interior Point Lights
    const dinerLight = new THREE.PointLight(0xffedd5, 1.4, 18);
    dinerLight.position.set(0, 3.0, 1.5);
    group.add(dinerLight);
    this.interiorLights.push(dinerLight);

    const jukeGlow = new THREE.PointLight(0xf59e0b, 0.8, 6);
    jukeGlow.position.set(5.5, 1.5, 4.5);
    group.add(jukeGlow);

    this.scene.add(group);
    this.interiorGroups.set('diner', group);

    // Register diner interactables
    this.interactables.push(
      {
        id: 'diner_coffee',
        interiorId: 'diner',
        name: 'Starlight Espresso Maker',
        actionText: 'Drink Espresso (+25 Health)',
        pos: { x: pos.x - 2.5, y: 1.0, z: pos.z + 2.0 },
        radius: 2.0,
        type: 'heal',
        amount: 25,
      },
      {
        id: 'diner_pie',
        interiorId: 'diner',
        name: 'Fresh Cherry Pie',
        actionText: 'Eat Slice of Cherry Pie (+30 Health)',
        pos: { x: pos.x + 1.8, y: 1.0, z: pos.z + 2.0 },
        radius: 2.0,
        type: 'heal',
        amount: 30,
      },
      {
        id: 'diner_jukebox',
        interiorId: 'diner',
        name: 'Neon Jukebox',
        actionText: 'Play Vintage Diner Track',
        pos: { x: pos.x + 5.5, y: 1.0, z: pos.z + 4.5 },
        radius: 2.4,
        type: 'music',
      },
      {
        id: 'diner_exit',
        interiorId: 'diner',
        name: 'Diner Exit Door',
        actionText: 'Exit to AGAT City Street',
        pos: { x: pos.x, y: 0.5, z: pos.z - 5.8 },
        radius: 2.2,
        type: 'buff',
      }
    );
  }

  // --- INTERIOR 2: QUICK-MART 24/7 ---
  private buildQuickMart() {
    const group = new THREE.Group();
    const pos = { x: 35, y: 0, z: -55 };
    group.position.set(pos.x, pos.y, pos.z);

    // Floor (Clean bright commercial tile)
    const floorGeo = new THREE.PlaneGeometry(13, 14);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x94a3b8, roughness: 0.3 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Ceiling with fluorescent fixtures
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(13, 14),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.9 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.5;
    group.add(ceil);

    // Walls (Bright green and white accents)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x065f46, roughness: 0.6 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(13, 3.5, 0.3), wallMat);
    backWall.position.set(0, 1.75, -7);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 14), wallMat);
    leftWall.position.set(-6.5, 1.75, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 14), wallMat);
    rightWall.position.set(6.5, 1.75, 0);
    group.add(rightWall);

    // Front Wall with door opening
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.5, 0.3), wallMat);
    frontL.position.set(-3.9, 1.75, 7);
    group.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(5.2, 3.5, 0.3), wallMat);
    frontR.position.set(3.9, 1.75, 7);
    group.add(frontR);

    // Glowing Refrigerated Beverage Cooler along back wall
    const coolerMat = new THREE.MeshStandardMaterial({
      color: 0x0284c7,
      emissive: 0x0284c7,
      emissiveIntensity: 0.45,
      roughness: 0.2,
      metalness: 0.5,
    });
    const cooler = new THREE.Mesh(new THREE.BoxGeometry(8.5, 2.5, 0.9), coolerMat);
    cooler.position.set(0, 1.25, -6.3);
    group.add(cooler);

    // Store Shelving Aisles (Center gondola shelves)
    const shelfMat = new THREE.MeshStandardMaterial({ color: 0x475569, metalness: 0.4, roughness: 0.6 });
    [-2.2, 2.2].forEach((x) => {
      const shelf = new THREE.Mesh(new THREE.BoxGeometry(1.2, 1.8, 6.5), shelfMat);
      shelf.position.set(x, 0.9, -0.5);
      group.add(shelf);
    });

    // Checkout Counter & Register
    const counterMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.5 });
    const counter = new THREE.Mesh(new THREE.BoxGeometry(3.5, 1.1, 1.2), counterMat);
    counter.position.set(-3.5, 0.55, 4.5);
    group.add(counter);

    const registerMat = new THREE.MeshStandardMaterial({ color: 0x10b981, metalness: 0.7, roughness: 0.3 });
    const register = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.5, 0.5), registerMat);
    register.position.set(-3.5, 1.35, 4.5);
    group.add(register);

    // ATM Machine on entrance wall
    const atmMat = new THREE.MeshStandardMaterial({
      color: 0x3b82f6,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.35,
    });
    const atm = new THREE.Mesh(new THREE.BoxGeometry(0.9, 1.9, 0.7), atmMat);
    atm.position.set(5.2, 0.95, 5.8);
    group.add(atm);

    // Overhead Store Lights
    const storeLight = new THREE.PointLight(0xf0fdf4, 1.5, 16);
    storeLight.position.set(0, 3.0, 0);
    group.add(storeLight);
    this.interiorLights.push(storeLight);

    this.scene.add(group);
    this.interiorGroups.set('shop', group);

    // Register Quick-Mart interactables
    this.interactables.push(
      {
        id: 'shop_cooler',
        interiorId: 'shop',
        name: 'Beverage Cooler',
        actionText: 'Grab Hyper-Energy Cola (+25 Health)',
        pos: { x: pos.x, y: 1.0, z: pos.z - 5.5 },
        radius: 2.4,
        type: 'heal',
        amount: 25,
      },
      {
        id: 'shop_clerk',
        interiorId: 'shop',
        name: 'Store Counter / Clerk',
        actionText: 'Browse Store Catalog (Weapons & Supplies)',
        pos: { x: pos.x - 3.5, y: 1.0, z: pos.z + 3.8 },
        radius: 2.2,
        type: 'shop',
      },
      {
        id: 'shop_atm',
        interiorId: 'shop',
        name: 'Quick-Mart ATM',
        actionText: 'Withdraw Cash (+$150)',
        pos: { x: pos.x + 5.2, y: 1.0, z: pos.z + 5.2 },
        radius: 2.0,
        type: 'cash',
        amount: 150,
      },
      {
        id: 'shop_exit',
        interiorId: 'shop',
        name: 'Shop Exit Door',
        actionText: 'Exit to AGAT City Street',
        pos: { x: pos.x, y: 0.5, z: pos.z + 6.8 },
        radius: 2.2,
        type: 'buff',
      }
    );
  }

  // --- INTERIOR 3: SKYLINE SAFEHOUSE APARTMENT ---
  private buildSafehouseApartment() {
    const group = new THREE.Group();
    const pos = { x: -120, y: 0, z: 27 };
    group.position.set(pos.x, pos.y, pos.z);

    // Floor (Polished dark oak wood)
    const floorGeo = new THREE.PlaneGeometry(16, 14);
    const floorMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.4 });
    const floor = new THREE.Mesh(floorGeo, floorMat);
    floor.rotation.x = -Math.PI / 2;
    floor.receiveShadow = true;
    group.add(floor);

    // Cozy Plush Rug in living room
    const rugMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.9 });
    const rug = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), rugMat);
    rug.rotation.x = -Math.PI / 2;
    rug.position.set(-2, 0.02, 0);
    group.add(rug);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(16, 14),
      new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.9 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.6;
    group.add(ceil);

    // Walls (Sleek slate with ambient neon baseboards)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.7 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(16, 3.6, 0.3), wallMat);
    backWall.position.set(0, 1.8, 7);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 14), wallMat);
    leftWall.position.set(-8, 1.8, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.6, 14), wallMat);
    rightWall.position.set(8, 1.8, 0);
    group.add(rightWall);

    // Front wall with exit door opening
    const frontL = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.6, 0.3), wallMat);
    frontL.position.set(-4.75, 1.8, -7);
    group.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(6.5, 3.6, 0.3), wallMat);
    frontR.position.set(4.75, 1.8, -7);
    group.add(frontR);

    // Big Panoramic Skyline Window on Back Wall
    const glassMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0369a1,
      emissiveIntensity: 0.3,
      transparent: true,
      opacity: 0.6,
      roughness: 0.1,
    });
    const windowGlass = new THREE.Mesh(new THREE.BoxGeometry(10, 2.4, 0.1), glassMat);
    windowGlass.position.set(0, 2.0, 6.8);
    group.add(windowGlass);

    // Leather Sofa & Coffee Table
    const couchMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.4 });
    const couch = new THREE.Mesh(new THREE.BoxGeometry(3.6, 0.9, 1.3), couchMat);
    couch.position.set(-2, 0.45, -1.8);
    group.add(couch);

    const tableMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.3, metalness: 0.6 });
    const coffeeTable = new THREE.Mesh(new THREE.BoxGeometry(2.4, 0.45, 1.0), tableMat);
    coffeeTable.position.set(-2, 0.22, 0.2);
    group.add(coffeeTable);

    // Wall-mounted Hologram TV
    const tvMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.6,
    });
    const tv = new THREE.Mesh(new THREE.BoxGeometry(3.2, 1.8, 0.1), tvMat);
    tv.position.set(-2, 2.0, 2.5);
    group.add(tv);

    // Bedroom: King Size Bed with Pillows
    const bedFrameMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.6 });
    const bed = new THREE.Mesh(new THREE.BoxGeometry(3.2, 0.6, 3.8), bedFrameMat);
    bed.position.set(5.2, 0.3, 3.5);
    group.add(bed);

    const blanketMat = new THREE.MeshStandardMaterial({ color: 0x0284c7, roughness: 0.8 });
    const blanket = new THREE.Mesh(new THREE.BoxGeometry(3.0, 0.2, 2.8), blanketMat);
    blanket.position.set(5.2, 0.7, 3.0);
    group.add(blanket);

    // Wardrobe & Full-Length Mirror (Character Customization station)
    const wardrobeMat = new THREE.MeshStandardMaterial({ color: 0x020617, roughness: 0.5 });
    const wardrobe = new THREE.Mesh(new THREE.BoxGeometry(2.6, 2.6, 0.8), wardrobeMat);
    wardrobe.position.set(5.5, 1.3, -4.5);
    group.add(wardrobe);

    const mirrorMat = new THREE.MeshStandardMaterial({
      color: 0xe0f2fe,
      roughness: 0.05,
      metalness: 0.95,
      emissive: 0x38bdf8,
      emissiveIntensity: 0.25,
    });
    const mirror = new THREE.Mesh(new THREE.BoxGeometry(1.2, 2.2, 0.08), mirrorMat);
    mirror.position.set(5.5, 1.2, -4.0);
    group.add(mirror);

    // Heavy Weapons & Ammo Lockers
    const lockerMat = new THREE.MeshStandardMaterial({ color: 0x164e63, metalness: 0.8, roughness: 0.3 });
    const locker = new THREE.Mesh(new THREE.BoxGeometry(1.8, 2.2, 0.6), lockerMat);
    locker.position.set(-6.8, 1.1, -4.5);
    group.add(locker);

    // Warm Ambient Apartment Light
    const aptLight = new THREE.PointLight(0xbae6fd, 1.4, 18);
    aptLight.position.set(-1, 3.1, 0);
    group.add(aptLight);
    this.interiorLights.push(aptLight);

    this.scene.add(group);
    this.interiorGroups.set('apartment', group);

    // Register Safehouse interactables
    this.interactables.push(
      {
        id: 'apt_mirror',
        interiorId: 'apartment',
        name: 'Wardrobe Mirror',
        actionText: 'Customize Character Appearance / Stylist',
        pos: { x: pos.x + 5.5, y: 1.0, z: pos.z - 3.2 },
        radius: 2.2,
        type: 'customize',
      },
      {
        id: 'apt_bed',
        interiorId: 'apartment',
        name: 'Safehouse Bed',
        actionText: 'Rest & Save Game (Restore Full Health)',
        pos: { x: pos.x + 5.2, y: 1.0, z: pos.z + 2.5 },
        radius: 2.5,
        type: 'rest',
        amount: 100,
      },
      {
        id: 'apt_lockers',
        interiorId: 'apartment',
        name: 'Ammunition Armory',
        actionText: 'Restock All Weapon Ammunition',
        pos: { x: pos.x - 6.8, y: 1.0, z: pos.z - 3.5 },
        radius: 2.2,
        type: 'ammo',
      },
      {
        id: 'apt_tv',
        interiorId: 'apartment',
        name: 'Holographic TV',
        actionText: 'Watch City News Broadcast',
        pos: { x: pos.x - 2, y: 1.0, z: pos.z + 1.2 },
        radius: 2.2,
        type: 'buff',
      },
      {
        id: 'apt_exit',
        interiorId: 'apartment',
        name: 'Apartment Exit Door',
        actionText: 'Exit to AGAT City Street',
        pos: { x: pos.x, y: 0.5, z: pos.z - 6.8 },
        radius: 2.2,
        type: 'buff',
      }
    );
  }

  // --- INTERIOR 4: FADE & BLADE BARBERSHOP / CLOTHING BOUTIQUE ---
  private buildBarbershop() {
    const group = new THREE.Group();
    const pos = { x: 80, y: 0, z: 88 };
    group.position.set(pos.x, pos.y, pos.z);

    // Floor (Polished checkered tiles)
    const floor = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.3 })
    );
    floor.rotation.x = -Math.PI / 2;
    group.add(floor);

    // Ceiling
    const ceil = new THREE.Mesh(
      new THREE.PlaneGeometry(12, 12),
      new THREE.MeshStandardMaterial({ color: 0x09090b, roughness: 0.9 })
    );
    ceil.rotation.x = Math.PI / 2;
    ceil.position.y = 3.5;
    group.add(ceil);

    // Walls (Rich purple & gold trims)
    const wallMat = new THREE.MeshStandardMaterial({ color: 0x581c87, roughness: 0.6 });
    const backWall = new THREE.Mesh(new THREE.BoxGeometry(12, 3.5, 0.3), wallMat);
    backWall.position.set(0, 1.75, 6);
    group.add(backWall);

    const leftWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 12), wallMat);
    leftWall.position.set(-6, 1.75, 0);
    group.add(leftWall);

    const rightWall = new THREE.Mesh(new THREE.BoxGeometry(0.3, 3.5, 12), wallMat);
    rightWall.position.set(6, 1.75, 0);
    group.add(rightWall);

    const frontL = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.5, 0.3), wallMat);
    frontL.position.set(-3.6, 1.75, -6);
    group.add(frontL);

    const frontR = new THREE.Mesh(new THREE.BoxGeometry(4.8, 3.5, 0.3), wallMat);
    frontR.position.set(3.6, 1.75, -6);
    group.add(frontR);

    // Barber Chairs & Mirror Station
    const chairMat = new THREE.MeshStandardMaterial({ color: 0xa855f7, roughness: 0.4 });
    const chair = new THREE.Mesh(new THREE.CylinderGeometry(0.45, 0.45, 0.85, 16), chairMat);
    chair.position.set(0, 0.42, 2.5);
    group.add(chair);

    const stationMirror = new THREE.Mesh(
      new THREE.BoxGeometry(4.5, 2.2, 0.1),
      new THREE.MeshStandardMaterial({
        color: 0xf3e8ff,
        metalness: 0.9,
        roughness: 0.1,
        emissive: 0xc084fc,
        emissiveIntensity: 0.2,
      })
    );
    stationMirror.position.set(0, 1.8, 5.8);
    group.add(stationMirror);

    // Clothing Racks with jackets along right wall
    const rackMat = new THREE.MeshStandardMaterial({ color: 0x9333ea, roughness: 0.5 });
    const rack = new THREE.Mesh(new THREE.BoxGeometry(0.8, 1.8, 4.5), rackMat);
    rack.position.set(4.8, 0.9, 0);
    group.add(rack);

    // Barber Pole outside entrance
    const poleMat = new THREE.MeshStandardMaterial({
      color: 0xef4444,
      emissive: 0x3b82f6,
      emissiveIntensity: 0.5,
    });
    const barberPole = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.18, 2.2, 16), poleMat);
    barberPole.position.set(-1.8, 1.1, -5.8);
    group.add(barberPole);

    // Stylist Purple Glow Lights
    const barberLight = new THREE.PointLight(0xf3e8ff, 1.4, 16);
    barberLight.position.set(0, 3.0, 1.5);
    group.add(barberLight);
    this.interiorLights.push(barberLight);

    this.scene.add(group);
    this.interiorGroups.set('barbershop', group);

    // Register Barbershop interactables
    this.interactables.push(
      {
        id: 'barber_chair',
        interiorId: 'barbershop',
        name: 'Stylist Chair & Wardrobe Mirror',
        actionText: 'Sit in Barber Chair / Modify Hairstyle & Outfits',
        pos: { x: pos.x, y: 0.8, z: pos.z + 2.0 },
        radius: 2.5,
        type: 'customize',
      },
      {
        id: 'barber_exit',
        interiorId: 'barbershop',
        name: 'Barbershop Exit Door',
        actionText: 'Exit to AGAT City Street',
        pos: { x: pos.x, y: 0.5, z: pos.z - 5.8 },
        radius: 2.2,
        type: 'buff',
      }
    );
  }

  // --- PROXIMITY & INTERACTION UPDATE ---
  public update(playerPos: THREE.Vector3) {
    // 1. If currently inside an interior:
    if (this.currentInterior) {
      this.nearExteriorEntrance = null;
      let closest: InteriorInteractable | null = null;
      let minDist = Infinity;

      for (const item of this.interactables) {
        if (item.interiorId !== this.currentInterior.id) continue;
        const d = Math.hypot(playerPos.x - item.pos.x, playerPos.z - item.pos.z);
        if (d < item.radius && d < minDist) {
          minDist = d;
          closest = item;
        }
      }

      this.activeInteractable = closest;
      return;
    }

    // 2. If outdoors: check proximity to any exterior building entrance door
    this.activeInteractable = null;
    let closestEntrance: BuildingInteriorLocation | null = null;
    let minEntranceDist = 3.5; // enter range in meters

    for (const loc of INTERIOR_LOCATIONS) {
      const d = Math.hypot(playerPos.x - loc.exteriorPos.x, playerPos.z - loc.exteriorPos.z);
      if (d < minEntranceDist) {
        minEntranceDist = d;
        closestEntrance = loc;
      }
    }

    this.nearExteriorEntrance = closestEntrance;
  }

  // --- SEAMLESS TRANSITIONS ---
  public enterInterior(loc: BuildingInteriorLocation, playerPos: THREE.Vector3): void {
    soundManager.playDoorOpen();
    this.currentInterior = loc;
    playerPos.set(loc.interiorPos.x, loc.interiorPos.y, loc.interiorPos.z);
  }

  public exitInterior(playerPos: THREE.Vector3): void {
    if (!this.currentInterior) return;
    soundManager.playDoorOpen();
    const loc = this.currentInterior;
    this.currentInterior = null;
    playerPos.set(loc.exteriorPos.x, loc.exteriorPos.y, loc.exteriorPos.z + 1.8);
  }

  public handleInteract(
    playerPos: THREE.Vector3,
    onHeal: (amount: number) => void,
    onAddCash: (amount: number) => void,
    onRefillAmmo: () => void
  ): boolean {
    // 1. If outdoors and near an entrance door
    if (!this.currentInterior && this.nearExteriorEntrance) {
      this.enterInterior(this.nearExteriorEntrance, playerPos);
      return true;
    }

    // 2. If indoors and near an interactable
    if (this.currentInterior && this.activeInteractable) {
      const act = this.activeInteractable;

      if (act.id.endsWith('_exit')) {
        this.exitInterior(playerPos);
        return true;
      }

      if (act.type === 'heal' && act.amount) {
        onHeal(act.amount);
        soundManager.playMissionComplete();
        return true;
      }

      if (act.type === 'cash' && act.amount) {
        onAddCash(act.amount);
        soundManager.playMissionComplete();
        return true;
      }

      if (act.type === 'ammo') {
        onRefillAmmo();
        soundManager.playReload();
        return true;
      }

      if (act.type === 'rest') {
        onHeal(100);
        soundManager.playMissionComplete();
        return true;
      }

      if (act.type === 'shop' && this.onOpenShop) {
        this.onOpenShop();
        return true;
      }

      if (act.type === 'customize' && this.onOpenCustomization) {
        this.onOpenCustomization();
        return true;
      }

      if (act.type === 'music') {
        soundManager.playMissionComplete();
        return true;
      }
    }

    return false;
  }
}
