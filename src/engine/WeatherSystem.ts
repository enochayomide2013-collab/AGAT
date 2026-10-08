import * as THREE from 'three';
import { WeatherType } from '../types/game';
import { soundManager } from './SoundManager';
import { VehicleManager } from './VehicleManager';
import { WorldBuilder } from './WorldBuilder';

export class WeatherSystem {
  public scene: THREE.Scene;
  public worldBuilder: WorldBuilder;
  public vehicleManager: VehicleManager;

  // Current weather state
  public currentWeather: WeatherType = 'clear';
  public targetWeather: WeatherType = 'clear';
  public wetness: number = 0; // 0 (bone dry) to 1 (soaked wet reflections)
  public transitionProgress: number = 1.0;

  // Auto-cycle settings
  public autoCycle: boolean = true;
  public cycleTimer: number = 180; // duration in seconds per weather phase
  public timeUntilNextCycle: number = 180;

  // Visual Rain System
  private rainParticles: THREE.Points | null = null;
  private rainGeometry: THREE.BufferGeometry | null = null;
  private rainCount: number = 2200;

  // Fog & Lighting References
  public dirLight: THREE.DirectionalLight | null = null;
  public hemiLight: THREE.HemisphereLight | null = null;

  constructor(
    scene: THREE.Scene,
    worldBuilder: WorldBuilder,
    vehicleManager: VehicleManager,
    dirLight?: THREE.DirectionalLight,
    hemiLight?: THREE.HemisphereLight
  ) {
    this.scene = scene;
    this.worldBuilder = worldBuilder;
    this.vehicleManager = vehicleManager;
    this.dirLight = dirLight || null;
    this.hemiLight = hemiLight || null;

    this.initRainParticles();
  }

  private initRainParticles() {
    this.rainGeometry = new THREE.BufferGeometry();
    const positions = new Float32Array(this.rainCount * 3);

    for (let i = 0; i < this.rainCount * 3; i += 3) {
      positions[i] = (Math.random() - 0.5) * 90;
      positions[i + 1] = Math.random() * 45;
      positions[i + 2] = (Math.random() - 0.5) * 90;
    }

    this.rainGeometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    const material = new THREE.PointsMaterial({
      color: 0xa5b4fc,
      size: 0.28,
      transparent: true,
      opacity: 0.7,
      depthWrite: false,
    });

    this.rainParticles = new THREE.Points(this.rainGeometry, material);
    this.rainParticles.visible = false;
    this.scene.add(this.rainParticles);
  }

  public setWeather(weather: WeatherType, immediate = false) {
    this.targetWeather = weather;
    if (immediate) {
      this.currentWeather = weather;
      this.transitionProgress = 1.0;
      this.wetness = weather === 'rain' || weather === 'storm' ? 1.0 : 0.0;
    } else {
      this.transitionProgress = 0.0;
    }

    soundManager.setWeatherAudio(weather);
    if (this.rainParticles) {
      this.rainParticles.visible = weather === 'rain' || weather === 'storm';
    }
  }

  public update(delta: number, timeOfDay: number, playerPos: THREE.Vector3) {
    // 1. Auto cycle weather timer
    if (this.autoCycle) {
      this.timeUntilNextCycle -= delta;
      if (this.timeUntilNextCycle <= 0) {
        this.timeUntilNextCycle = this.cycleTimer;
        const cycleOrder: WeatherType[] = ['clear', 'cloudy', 'rain', 'clear'];
        const nextIdx = (cycleOrder.indexOf(this.currentWeather) + 1) % cycleOrder.length;
        this.setWeather(cycleOrder[nextIdx]);
      }
    }

    // 2. Smooth weather transition
    if (this.transitionProgress < 1.0) {
      this.transitionProgress = Math.min(1.0, this.transitionProgress + delta * 0.25);
      if (this.transitionProgress >= 1.0) {
        this.currentWeather = this.targetWeather;
      }
    }

    // 3. Wetness accumulation and drying
    const isPrecipitating = this.targetWeather === 'rain' || this.targetWeather === 'storm';
    if (isPrecipitating) {
      this.wetness = Math.min(1.0, this.wetness + delta * 0.15); // accumulates wetness
    } else {
      this.wetness = Math.max(0.0, this.wetness - delta * 0.04); // dries naturally
    }

    // 4. Update Fog & Atmosphere
    this.updateAtmosphereAndFog(timeOfDay);

    // 5. Update Wet Surface Reflections on Roads and Vehicles
    this.updateWetSurfaces();

    // 6. Update Rain Particle Simulation
    this.updateRainParticles(delta, playerPos);
  }

  private updateAtmosphereAndFog(timeOfDay: number) {
    const isNight = timeOfDay < 6 || timeOfDay > 19;
    const isSunriseOrSet = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);

    let baseSkyColor: number;
    let baseFogDensity: number;

    // Base colors according to time
    if (isNight) {
      baseSkyColor = 0x090d16;
      baseFogDensity = 0.0035;
    } else if (isSunriseOrSet) {
      baseSkyColor = 0xf59e0b;
      baseFogDensity = 0.004;
    } else {
      baseSkyColor = 0x87ceeb;
      baseFogDensity = 0.003;
    }

    // Modulate based on weather
    if (this.currentWeather === 'cloudy') {
      baseSkyColor = isNight ? 0x0f172a : 0x94a3b8;
      baseFogDensity = 0.0055;
    } else if (this.currentWeather === 'rain') {
      baseSkyColor = isNight ? 0x0a0f1d : 0x475569;
      baseFogDensity = 0.0085; // dense atmospheric rain fog
    } else if (this.currentWeather === 'storm') {
      baseSkyColor = 0x0f172a;
      baseFogDensity = 0.012; // deep storm mist
    }

    // Apply to scene background and fog
    const skyCol = new THREE.Color(baseSkyColor);
    this.scene.background = skyCol;

    if (this.scene.fog && this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.lerp(skyCol, 0.08);
      this.scene.fog.density = THREE.MathUtils.lerp(this.scene.fog.density, baseFogDensity, 0.08);
    }

    // Modulate direct sunlight
    if (this.dirLight) {
      let sunMultiplier = 1.0;
      if (this.currentWeather === 'cloudy') sunMultiplier = 0.65;
      else if (this.currentWeather === 'rain') sunMultiplier = 0.4;
      else if (this.currentWeather === 'storm') sunMultiplier = 0.2;

      if (!isNight) {
        this.dirLight.intensity = (isSunriseOrSet ? 0.9 : 1.35) * sunMultiplier;
      }
    }
  }

  private updateWetSurfaces() {
    // 1. Road Asphalt Wet-Surface Reflections
    if (this.worldBuilder.roadMaterial) {
      // Roughness drops from 0.8 (dry matte asphalt) to 0.18 (slick mirror asphalt)
      this.worldBuilder.roadMaterial.roughness = THREE.MathUtils.lerp(0.8, 0.18, this.wetness);
      // Metalness/Specular reflections increase from 0.1 to 0.55
      this.worldBuilder.roadMaterial.metalness = THREE.MathUtils.lerp(0.1, 0.55, this.wetness);
    }

    // 2. Sidewalk Concrete Wetness
    if (this.worldBuilder.sidewalkMaterial) {
      this.worldBuilder.sidewalkMaterial.roughness = THREE.MathUtils.lerp(0.85, 0.3, this.wetness);
      this.worldBuilder.sidewalkMaterial.metalness = THREE.MathUtils.lerp(0.05, 0.35, this.wetness);
    }

    // 3. Puddles Glistening
    if (this.worldBuilder.puddleMaterial) {
      this.worldBuilder.puddleMaterial.opacity = this.wetness * 0.9;
    }

    // 4. Vehicle Paint Wet-Surface Clearcoat & Specular Highlights
    for (const v of this.vehicleManager.vehicles) {
      v.mesh.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material instanceof THREE.MeshStandardMaterial) {
          // Glossy wet clearcoat on car bodies
          if (child.material !== this.worldBuilder.roadMaterial) {
            child.material.roughness = THREE.MathUtils.lerp(0.35, 0.12, this.wetness);
            child.material.metalness = THREE.MathUtils.lerp(0.5, 0.75, this.wetness);
          }
        }
      });
    }
  }

  private updateRainParticles(delta: number, playerPos: THREE.Vector3) {
    if (!this.rainParticles || !this.rainParticles.visible || !this.rainGeometry) return;

    const positions = this.rainGeometry.attributes.position.array as Float32Array;

    for (let i = 0; i < positions.length; i += 3) {
      positions[i + 1] -= (this.currentWeather === 'storm' ? 52 : 40) * delta; // velocity

      if (positions[i + 1] < 0) {
        positions[i + 1] = 40 + Math.random() * 6;
        positions[i] = playerPos.x + (Math.random() - 0.5) * 80;
        positions[i + 2] = playerPos.z + (Math.random() - 0.5) * 80;
      }
    }

    this.rainGeometry.attributes.position.needsUpdate = true;
  }
}
