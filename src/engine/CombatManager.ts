import * as THREE from 'three';
import { WeaponDef } from '../types/game';
import { soundManager } from './SoundManager';
import { WeaponInventory } from './WeaponInventory';
import { CombatController } from './CombatController';

export interface Projectile {
  mesh: THREE.Mesh;
  origin: THREE.Vector3;
  dir: THREE.Vector3;
  speed: number;
  distanceTraveled: number;
  maxDistance: number;
  damage: number;
  weaponType: 'pistol' | 'rifle' | 'shotgun' | 'precision';
}

export interface ImpactParticle {
  mesh: THREE.Mesh;
  life: number;
  maxLife: number;
  velocity: THREE.Vector3;
}

export class CombatManager {
  public scene: THREE.Scene;
  public inventory: WeaponInventory;
  public controller: CombatController;

  public projectiles: Projectile[] = [];
  public impactParticles: ImpactParticle[] = [];

  constructor(scene: THREE.Scene, inventory: WeaponInventory, controller: CombatController) {
    this.scene = scene;
    this.inventory = inventory;
    this.controller = controller;
  }

  public getEquippedWeapon(): WeaponDef | null {
    return this.inventory.getActiveWeapon();
  }

  public selectWeapon(index: number) {
    this.inventory.equip(index);
    this.controller.isReloading = false;
  }

  public cycleWeapon(direction: 1 | -1) {
    if (direction === 1) this.inventory.cycleNext();
    else this.inventory.cyclePrev();
    this.controller.isReloading = false;
  }

  public reload() {
    this.controller.triggerReload();
  }

  public canFire(): boolean {
    return this.controller.canFire();
  }

  public fire(origin: THREE.Vector3, direction: THREE.Vector3): boolean {
    const activeWeapon = this.inventory.getActiveWeapon();
    if (!activeWeapon) return false;

    if (!this.canFire()) {
      if (activeWeapon.currentAmmo <= 0) {
        this.reload();
      }
      return false;
    }

    // Consume ammunition via inventory
    this.inventory.consumeAmmo(1);
    this.controller.registerShotFired();

    soundManager.playWeaponFire(activeWeapon.type);

    // Muzzle flash light pulse
    const flash = new THREE.PointLight(new THREE.Color(activeWeapon.color), 3, 6, 2);
    flash.position.copy(origin);
    this.scene.add(flash);
    setTimeout(() => {
      this.scene.remove(flash);
    }, 45);

    // Create projectile(s) - shotgun fires spread pellets
    const pelletCount = activeWeapon.type === 'shotgun' ? 5 : 1;
    for (let i = 0; i < pelletCount; i++) {
      const spreadDir = direction.clone();
      if (activeWeapon.type === 'shotgun') {
        spreadDir.x += (Math.random() - 0.5) * 0.12;
        spreadDir.y += (Math.random() - 0.5) * 0.08;
        spreadDir.z += (Math.random() - 0.5) * 0.12;
        spreadDir.normalize();
      }

      // Projectile tracer mesh
      const tracerGeo = new THREE.CylinderGeometry(0.04, 0.04, 0.6, 6);
      tracerGeo.rotateX(Math.PI / 2);
      const tracerMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(activeWeapon.color) });
      const tracerMesh = new THREE.Mesh(tracerGeo, tracerMat);
      tracerMesh.position.copy(origin);
      tracerMesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), spreadDir);
      this.scene.add(tracerMesh);

      this.projectiles.push({
        mesh: tracerMesh,
        origin: origin.clone(),
        dir: spreadDir,
        speed: activeWeapon.projectileSpeed,
        distanceTraveled: 0,
        maxDistance: activeWeapon.range,
        damage: activeWeapon.damage / (activeWeapon.type === 'shotgun' ? 2 : 1),
        weaponType: activeWeapon.type,
      });
    }

    return true;
  }

  public update(delta: number, onHitTarget?: (targetPos: THREE.Vector3, damage: number) => void) {
    // Update active projectiles
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      const p = this.projectiles[i];
      const step = p.speed * delta;
      p.mesh.position.addScaledVector(p.dir, step);
      p.distanceTraveled += step;

      // Check collision/impact or range exceeded
      let impacted = false;
      if (p.mesh.position.y <= 0.05 || p.distanceTraveled >= p.maxDistance) {
        impacted = true;
      }

      if (impacted) {
        this.spawnImpactSparks(p.mesh.position, p.dir);
        if (onHitTarget) {
          onHitTarget(p.mesh.position, p.damage);
        }
        this.scene.remove(p.mesh);
        this.projectiles.splice(i, 1);
      }
    }

    // Update impact particles
    for (let i = this.impactParticles.length - 1; i >= 0; i--) {
      const pt = this.impactParticles[i];
      pt.life -= delta;
      pt.mesh.position.addScaledVector(pt.velocity, delta);
      pt.mesh.scale.multiplyScalar(0.92);

      if (pt.life <= 0) {
        this.scene.remove(pt.mesh);
        this.impactParticles.splice(i, 1);
      }
    }
  }

  public spawnImpactSparks(pos: THREE.Vector3, _dir: THREE.Vector3) {
    const count = 4;
    const sparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffcc33 });

    for (let i = 0; i < count; i++) {
      const mesh = new THREE.Mesh(sparkGeo, sparkMat);
      mesh.position.copy(pos);
      this.scene.add(mesh);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 6,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 6
      );

      this.impactParticles.push({
        mesh,
        life: 0.35,
        maxLife: 0.35,
        velocity: vel,
      });
    }
  }
}
