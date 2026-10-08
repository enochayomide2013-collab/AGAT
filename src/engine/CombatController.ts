import * as THREE from 'three';
import { WeaponInventory } from './WeaponInventory';
import { soundManager } from './SoundManager';

export type WeaponState = 'holstered' | 'ready' | 'aiming' | 'firing' | 'reloading';

export interface RaycastHitResult {
  hit: boolean;
  distance: number;
  point: THREE.Vector3;
  target: THREE.Object3D | null;
  normal?: THREE.Vector3;
  damageDealt: number;
}

export class CombatController {
  public inventory: WeaponInventory;
  public scene: THREE.Scene;

  // Weapon State
  public weaponState: WeaponState = 'ready';
  public isAiming: boolean = false;
  public aimTransition: number = 0; // 0 (exploration) to 1 (full combat aim)
  public isReloading: boolean = false;
  public reloadTimer: number = 0;
  public recoilKick: number = 0;
  public lastFireTime: number = 0;
  public crosshairSpread: number = 0; // Dynamic crosshair expansion on fire/move

  // Raycaster for hitbox hit detection
  private raycaster: THREE.Raycaster;

  // Weapon 3D Model Attachment attached to player's right arm
  public weaponMesh: THREE.Group | null = null;
  private weaponMeshMaterial: THREE.MeshStandardMaterial;

  // Visual projectile tracer lines and sparks
  private activeTracers: Array<{ line: THREE.Line; life: number }> = [];
  private activeSparks: Array<{ mesh: THREE.Mesh; vel: THREE.Vector3; life: number }> = [];

  constructor(inventory: WeaponInventory, scene: THREE.Scene) {
    this.inventory = inventory;
    this.scene = scene;
    this.raycaster = new THREE.Raycaster();

    this.weaponMeshMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      metalness: 0.8,
      roughness: 0.2,
    });

    this.createWeaponMesh();
  }

  private createWeaponMesh() {
    this.weaponMesh = new THREE.Group();

    // Receiver / Barrel
    const barrelGeo = new THREE.BoxGeometry(0.08, 0.1, 0.45);
    const barrel = new THREE.Mesh(barrelGeo, this.weaponMeshMaterial);
    barrel.position.set(0, 0, 0.15);
    barrel.castShadow = true;
    this.weaponMesh.add(barrel);

    // Grip
    const gripGeo = new THREE.BoxGeometry(0.06, 0.18, 0.08);
    const gripMat = new THREE.MeshStandardMaterial({ color: 0x111827, roughness: 0.8 });
    const grip = new THREE.Mesh(gripGeo, gripMat);
    grip.position.set(0, -0.1, 0);
    this.weaponMesh.add(grip);

    // Energy emitter tip
    const tipGeo = new THREE.CylinderGeometry(0.03, 0.03, 0.08);
    tipGeo.rotateX(Math.PI / 2);
    const tipMat = new THREE.MeshBasicMaterial({ color: 0x00f2fe });
    const tip = new THREE.Mesh(tipGeo, tipMat);
    tip.position.set(0, 0, 0.38);
    this.weaponMesh.add(tip);

    this.weaponMesh.visible = false;
  }

  public setAiming(aiming: boolean) {
    if (aiming && this.inventory.isWeaponEquipped()) {
      this.isAiming = true;
      if (!this.isReloading) this.weaponState = 'aiming';
    } else {
      this.isAiming = false;
      if (!this.isReloading) {
        this.weaponState = this.inventory.isWeaponEquipped() ? 'ready' : 'holstered';
      }
    }
  }

  public shouldShowCrosshair(): boolean {
    return this.inventory.isWeaponEquipped();
  }

  public canFire(): boolean {
    const active = this.inventory.getActiveWeapon();
    if (!active || this.isReloading || active.currentAmmo <= 0) return false;
    const now = performance.now() / 1000;
    return now - this.lastFireTime >= 1 / active.fireRate;
  }

  public triggerReload(): boolean {
    const active = this.inventory.getActiveWeapon();
    if (!active || this.isReloading || active.currentAmmo >= active.maxAmmo || active.reserveAmmo <= 0) {
      return false;
    }
    this.isReloading = true;
    this.weaponState = 'reloading';
    this.reloadTimer = active.reloadTime;
    soundManager.playReload();
    return true;
  }

  public registerShotFired() {
    this.lastFireTime = performance.now() / 1000;
    this.recoilKick = 0.24;
    this.crosshairSpread = 16;
    this.weaponState = 'firing';
  }

  /**
   * Raycasting against target hitboxes in the scene
   * Casts a ray from the camera center into the world, detects intersections,
   * creates visual tracers and impact sparks, and applies damage.
   */
  public fireRaycast(
    camera: THREE.Camera,
    muzzleOrigin: THREE.Vector3,
    targetHitboxes: THREE.Object3D[]
  ): RaycastHitResult {
    const activeWeapon = this.inventory.getActiveWeapon();
    if (!activeWeapon || !this.canFire()) {
      if (activeWeapon && activeWeapon.currentAmmo <= 0) {
        this.triggerReload();
      }
      return {
        hit: false,
        distance: 0,
        point: new THREE.Vector3(),
        target: null,
        damageDealt: 0,
      };
    }

    // Consume 1 ammunition and register fire
    this.inventory.consumeAmmo(1);
    this.registerShotFired();
    soundManager.playWeaponFire(activeWeapon.type);

    // Muzzle flash light pulse
    const flash = new THREE.PointLight(new THREE.Color(activeWeapon.color), 3, 7, 2);
    flash.position.copy(muzzleOrigin);
    this.scene.add(flash);
    setTimeout(() => {
      this.scene.remove(flash);
    }, 45);

    // Cast ray from camera center (screen center: [0, 0] in NDC)
    this.raycaster.setFromCamera(new THREE.Vector2(0, 0), camera);
    this.raycaster.far = activeWeapon.range;

    // Optional spread deviation for shotgun or rapid firing
    if (activeWeapon.type === 'shotgun') {
      this.raycaster.ray.direction.x += (Math.random() - 0.5) * 0.08;
      this.raycaster.ray.direction.y += (Math.random() - 0.5) * 0.06;
      this.raycaster.ray.direction.z += (Math.random() - 0.5) * 0.08;
      this.raycaster.ray.direction.normalize();
    }

    const intersects = this.raycaster.intersectObjects(targetHitboxes, true);

    let hitPoint: THREE.Vector3;
    let hitObject: THREE.Object3D | null = null;
    let hitDistance = activeWeapon.range;
    let hitNormal: THREE.Vector3 | undefined;

    if (intersects.length > 0) {
      const hit = intersects[0];
      hitPoint = hit.point;
      hitObject = hit.object;
      hitDistance = hit.distance;
      if (hit.face) hitNormal = hit.face.normal;
    } else {
      // Ray did not hit hitbox, project to max range along ray
      hitPoint = this.raycaster.ray.origin.clone().addScaledVector(this.raycaster.ray.direction, activeWeapon.range);
    }

    // 1. Create instant 3D Tracer Beam from muzzle to hitPoint
    this.spawnTracer(muzzleOrigin, hitPoint, activeWeapon.color);

    // 2. Create Impact Sparks at hitPoint
    this.spawnImpactSparks(hitPoint, activeWeapon.color);

    return {
      hit: intersects.length > 0,
      distance: hitDistance,
      point: hitPoint,
      target: hitObject,
      normal: hitNormal,
      damageDealt: activeWeapon.damage,
    };
  }

  private spawnTracer(start: THREE.Vector3, end: THREE.Vector3, colorHex: string) {
    const points = [start, end];
    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const material = new THREE.LineBasicMaterial({
      color: new THREE.Color(colorHex),
      linewidth: 2,
      transparent: true,
      opacity: 0.85,
    });
    const line = new THREE.Line(geometry, material);
    this.scene.add(line);

    this.activeTracers.push({ line, life: 0.08 });
  }

  public spawnImpactSparks(pos: THREE.Vector3, colorHex: string) {
    const sparkGeo = new THREE.SphereGeometry(0.06, 4, 4);
    const sparkMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(colorHex) });

    for (let i = 0; i < 5; i++) {
      const spark = new THREE.Mesh(sparkGeo, sparkMat);
      spark.position.copy(pos);
      this.scene.add(spark);

      const vel = new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 0.5,
        (Math.random() - 0.5) * 5
      );

      this.activeSparks.push({ mesh: spark, vel, life: 0.3 });
    }
  }

  /**
   * Crosshair Canvas 2D Drawing Helper
   * Can be invoked on a 2D canvas overlay to render an authentic dynamic reticle.
   */
  public drawCrosshair(ctx: CanvasRenderingContext2D, width: number, height: number) {
    if (!this.shouldShowCrosshair()) return;

    const cx = width / 2;
    const cy = height / 2;
    const spread = 6 + this.crosshairSpread;
    const lineLength = this.isAiming ? 10 : 7;

    ctx.save();
    ctx.strokeStyle = this.isAiming ? '#38bdf8' : 'rgba(255, 255, 255, 0.8)';
    ctx.fillStyle = this.isAiming ? '#38bdf8' : 'rgba(255, 255, 255, 0.9)';
    ctx.lineWidth = this.isAiming ? 2 : 1.5;

    // Center dot
    ctx.beginPath();
    ctx.arc(cx, cy, this.isAiming ? 1.5 : 2, 0, Math.PI * 2);
    ctx.fill();

    // 4 crosshair ticks
    // Top
    ctx.beginPath();
    ctx.moveTo(cx, cy - spread);
    ctx.lineTo(cx, cy - spread - lineLength);
    ctx.stroke();

    // Bottom
    ctx.beginPath();
    ctx.moveTo(cx, cy + spread);
    ctx.lineTo(cx, cy + spread + lineLength);
    ctx.stroke();

    // Left
    ctx.beginPath();
    ctx.moveTo(cx - spread, cy);
    ctx.lineTo(cx - spread - lineLength, cy);
    ctx.stroke();

    // Right
    ctx.beginPath();
    ctx.moveTo(cx + spread, cy);
    ctx.lineTo(cx + spread + lineLength, cy);
    ctx.stroke();

    // Outer circle when aiming
    if (this.isAiming) {
      ctx.strokeStyle = 'rgba(56, 189, 248, 0.6)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.arc(cx, cy, spread + lineLength + 2, 0, Math.PI * 2);
      ctx.stroke();
    }

    ctx.restore();
  }

  public update(
    delta: number,
    isMoving: boolean,
    walkCycle: number,
    isSprinting: boolean,
    rightArm: THREE.Mesh,
    leftArm: THREE.Mesh,
    torso: THREE.Mesh,
    head: THREE.Mesh | THREE.Group
  ) {
    const hasWeapon = this.inventory.isWeaponEquipped();
    const activeWeapon = this.inventory.getActiveWeapon();

    // Update weapon mesh visibility and color
    if (this.weaponMesh) {
      this.weaponMesh.visible = hasWeapon;
      if (activeWeapon) {
        this.weaponMeshMaterial.color.set(activeWeapon.color);
      }
    }

    // 1. Aim Transition Lerp
    const targetAim = (this.isAiming && hasWeapon) ? 1.0 : 0.0;
    this.aimTransition = THREE.MathUtils.lerp(this.aimTransition, targetAim, delta * 12);

    // 2. Recoil & Crosshair Decay
    if (this.recoilKick > 0) {
      this.recoilKick = Math.max(0, this.recoilKick - delta * 1.8);
    }
    if (this.crosshairSpread > 0) {
      this.crosshairSpread = Math.max(0, this.crosshairSpread - delta * 30);
    }

    // 3. Reload Timer
    if (this.isReloading) {
      this.reloadTimer -= delta;
      if (this.reloadTimer <= 0) {
        this.inventory.replenishAmmo();
        this.isReloading = false;
        this.weaponState = this.isAiming ? 'aiming' : 'ready';
      }
    } else if (this.weaponState === 'firing' && this.recoilKick <= 0.05) {
      this.weaponState = this.isAiming ? 'aiming' : (hasWeapon ? 'ready' : 'holstered');
    }

    // 4. ANIMATION BLENDING: Exploration vs Combat Stance vs Aiming
    const legAngle = Math.sin(walkCycle) * 0.6;
    const swingFactor = isSprinting ? 0.9 : 0.6;

    if (!hasWeapon) {
      this.weaponState = 'holstered';
      // PURE EXPLORATION: Both arms swing naturally with leg cycle
      const targetRightArmX = isMoving ? -legAngle * swingFactor : 0;
      const targetLeftArmX = isMoving ? legAngle * swingFactor : 0;

      rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, targetRightArmX, delta * 10);
      rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, 0, delta * 10);
      rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0, delta * 10);

      leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, targetLeftArmX, delta * 10);
      leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, 0, delta * 10);
      leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, delta * 10);

      torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, 0, delta * 10);
      head.rotation.y = THREE.MathUtils.lerp(head.rotation.y, 0, delta * 10);
    } else {
      // WEAPON IS EQUIPPED: Blend between Combat Ready and Full Aim
      if (this.aimTransition > 0.05) {
        // FULL AIMING STANCE:
        const aimArmAngleX = -Math.PI / 2 + (this.recoilKick * 0.4);
        const aimArmAngleY = -0.15;
        const aimArmAngleZ = 0.08;

        const leftArmAimX = -Math.PI / 2.3;
        const leftArmAimY = 0.45;
        const leftArmAimZ = 0.2;

        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, aimArmAngleX, this.aimTransition);
        rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, aimArmAngleY, this.aimTransition);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, aimArmAngleZ, this.aimTransition);

        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, leftArmAimX, this.aimTransition);
        leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, leftArmAimY, this.aimTransition);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, leftArmAimZ, this.aimTransition);

        torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, -0.1, delta * 8);
      } else {
        // COMBAT READY (low-ready stance):
        const readyRightArmX = -0.6 + (isMoving ? Math.sin(walkCycle) * 0.15 : 0);
        const readyLeftArmX = isMoving ? legAngle * swingFactor * 0.5 : 0;

        rightArm.rotation.x = THREE.MathUtils.lerp(rightArm.rotation.x, readyRightArmX, delta * 10);
        rightArm.rotation.y = THREE.MathUtils.lerp(rightArm.rotation.y, -0.1, delta * 10);
        rightArm.rotation.z = THREE.MathUtils.lerp(rightArm.rotation.z, 0.05, delta * 10);

        leftArm.rotation.x = THREE.MathUtils.lerp(leftArm.rotation.x, readyLeftArmX, delta * 10);
        leftArm.rotation.y = THREE.MathUtils.lerp(leftArm.rotation.y, 0, delta * 10);
        leftArm.rotation.z = THREE.MathUtils.lerp(leftArm.rotation.z, 0, delta * 10);

        torso.rotation.y = THREE.MathUtils.lerp(torso.rotation.y, 0, delta * 10);
      }
    }

    // Attach weapon mesh to the right arm end
    if (this.weaponMesh) {
      this.weaponMesh.position.set(0, -0.32, 0.05);
      this.weaponMesh.rotation.set(Math.PI / 2, 0, 0);
      if (rightArm.children.indexOf(this.weaponMesh) === -1) {
        rightArm.add(this.weaponMesh);
      }
    }

    // 5. Update Visual Tracer Lines
    for (let i = this.activeTracers.length - 1; i >= 0; i--) {
      const t = this.activeTracers[i];
      t.life -= delta;
      if (t.life <= 0) {
        this.scene.remove(t.line);
        t.line.geometry.dispose();
        (t.line.material as THREE.Material).dispose();
        this.activeTracers.splice(i, 1);
      }
    }

    // 6. Update Visual Spark Particles
    for (let i = this.activeSparks.length - 1; i >= 0; i--) {
      const sp = this.activeSparks[i];
      sp.life -= delta;
      sp.mesh.position.addScaledVector(sp.vel, delta);
      sp.mesh.scale.multiplyScalar(0.92);
      if (sp.life <= 0) {
        this.scene.remove(sp.mesh);
        sp.mesh.geometry.dispose();
        (sp.mesh.material as THREE.Material).dispose();
        this.activeSparks.splice(i, 1);
      }
    }
  }
}
