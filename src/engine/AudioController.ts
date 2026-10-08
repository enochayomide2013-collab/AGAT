import * as THREE from 'three';
import { WeatherType } from '../types/game';

export interface SpatialAudioSource {
  id: string;
  pos: THREE.Vector3;
  panner?: StereoPannerNode;
  gain?: GainNode;
  filter?: BiquadFilterNode;
  osc?: OscillatorNode;
  subOsc?: OscillatorNode;
  noise?: AudioBufferSourceNode;
  active: boolean;
}

export class AudioController {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private engineGain: GainNode | null = null;
  private chatterGain: GainNode | null = null;
  private weatherGain: GainNode | null = null;

  // Player engine state
  private playerEngineOsc: OscillatorNode | null = null;
  private playerEngineSubOsc: OscillatorNode | null = null;
  private playerEngineGain: GainNode | null = null;
  private playerEngineRunning: boolean = false;

  // Traffic vehicles 3D engine pool (handles closest 4 vehicles)
  private trafficEngines: Map<string, SpatialAudioSource> = new Map();

  // Weather audio nodes
  private rainNoiseNode: AudioBufferSourceNode | null = null;
  private rainGainNode: GainNode | null = null;
  private rainFilterNode: BiquadFilterNode | null = null;
  private windOscNode: OscillatorNode | null = null;
  private windGainNode: GainNode | null = null;
  private windFilterNode: BiquadFilterNode | null = null;

  // Chatter throttling to keep audio clean and non-overlapping
  private lastChatterTime: number = 0;
  private chatterCooldown: number = 1.2;

  constructor() {
    // Lazily initialized on first user interaction
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.85, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.engineGain = this.ctx.createGain();
      this.engineGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.engineGain.connect(this.masterGain);

      this.chatterGain = this.ctx.createGain();
      this.chatterGain.gain.setValueAtTime(0.7, this.ctx.currentTime);
      this.chatterGain.connect(this.masterGain);

      this.weatherGain = this.ctx.createGain();
      this.weatherGain.gain.setValueAtTime(0.75, this.ctx.currentTime);
      this.weatherGain.connect(this.masterGain);

      this.initWeatherNodes();
    } catch {
      // AudioContext unavailable in environment
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime, 0.05);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(muted ? 0 : 0.85, this.ctx.currentTime, 0.05);
    }
  }

  // ==========================================
  // SPATIAL ATTENUATION & PANNING UTILITY
  // ==========================================
  private computeSpatialParameters(
    listenerPos: THREE.Vector3,
    listenerHeading: number,
    soundPos: THREE.Vector3,
    refDistance = 10,
    maxDistance = 55
  ): { volume: number; pan: number; distance: number } {
    const dist = listenerPos.distanceTo(soundPos);
    if (dist > maxDistance) {
      return { volume: 0, pan: 0, distance: dist };
    }

    // Inverse distance attenuation curve: 1 / (1 + (d / refDist)^1.4)
    const factor = dist / Math.max(1, refDistance);
    const volume = Math.max(0, Math.min(1, 1 / (1 + Math.pow(factor, 1.4))));

    // Calculate relative horizontal panning angle
    const dx = soundPos.x - listenerPos.x;
    const dz = soundPos.z - listenerPos.z;

    // Listener right vector perpendicular to heading
    const rightX = Math.cos(listenerHeading);
    const rightZ = -Math.sin(listenerHeading);

    const horizontalDist = Math.sqrt(dx * dx + dz * dz) || 1;
    const pan = Math.max(-0.95, Math.min(0.95, (dx * rightX + dz * rightZ) / horizontalDist));

    return { volume, pan, distance: dist };
  }

  // ==========================================
  // 1. VEHICLE ENGINE AUDIO (PLAYER & 3D TRAFFIC)
  // ==========================================
  public startPlayerEngine() {
    if (!this.ctx || this.playerEngineRunning || this.isMuted) return;
    const now = this.ctx.currentTime;

    this.playerEngineOsc = this.ctx.createOscillator();
    this.playerEngineSubOsc = this.ctx.createOscillator();
    this.playerEngineGain = this.ctx.createGain();

    this.playerEngineOsc.type = 'sawtooth';
    this.playerEngineSubOsc.type = 'triangle';

    this.playerEngineOsc.frequency.setValueAtTime(55, now);
    this.playerEngineSubOsc.frequency.setValueAtTime(27.5, now);

    this.playerEngineGain.gain.setValueAtTime(0.12, now);

    this.playerEngineOsc.connect(this.playerEngineGain);
    this.playerEngineSubOsc.connect(this.playerEngineGain);
    this.playerEngineGain.connect(this.engineGain!);

    this.playerEngineOsc.start(now);
    this.playerEngineSubOsc.start(now);
    this.playerEngineRunning = true;
  }

  public updatePlayerEngine(speedRatio: number, isReversing = false) {
    if (!this.playerEngineRunning || !this.playerEngineOsc || !this.playerEngineSubOsc || !this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = isReversing ? 44 : 52;
    const targetFreq = baseFreq + speedRatio * 180;

    this.playerEngineOsc.frequency.setTargetAtTime(targetFreq, now, 0.06);
    this.playerEngineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.06);

    if (this.playerEngineGain) {
      const vol = 0.08 + speedRatio * 0.16;
      this.playerEngineGain.gain.setTargetAtTime(vol, now, 0.04);
    }
  }

  public stopPlayerEngine() {
    if (!this.playerEngineRunning) return;
    try {
      this.playerEngineOsc?.stop();
      this.playerEngineSubOsc?.stop();
      this.playerEngineOsc?.disconnect();
      this.playerEngineSubOsc?.disconnect();
      this.playerEngineGain?.disconnect();
    } catch {
      // ignore
    }
    this.playerEngineOsc = null;
    this.playerEngineSubOsc = null;
    this.playerEngineGain = null;
    this.playerEngineRunning = false;
  }

  /**
   * Updates 3D spatialized engine loops for active traffic vehicles near the player
   */
  public updateTrafficEngines(
    listenerPos: THREE.Vector3,
    listenerHeading: number,
    trafficVehicles: Array<{ id: string; position: THREE.Vector3; speed: number; isPlayerVehicle?: boolean }>
  ) {
    if (!this.ctx || this.isMuted) return;

    // Filter to closest non-player vehicles within 45 meters
    const candidates = trafficVehicles
      .filter((v) => !v.isPlayerVehicle && v.position.distanceTo(listenerPos) < 45)
      .sort((a, b) => a.position.distanceTo(listenerPos) - b.position.distanceTo(listenerPos))
      .slice(0, 4);

    const activeIds = new Set(candidates.map((c) => c.id));

    // Remove distant / despawned vehicle engines
    for (const [id, src] of this.trafficEngines.entries()) {
      if (!activeIds.has(id)) {
        try {
          src.osc?.stop();
          src.osc?.disconnect();
          src.gain?.disconnect();
          src.panner?.disconnect();
        } catch {
          // ignore
        }
        this.trafficEngines.delete(id);
      }
    }

    // Update or spawn spatial engines for closest vehicles
    for (const veh of candidates) {
      let src = this.trafficEngines.get(veh.id);
      const spatial = this.computeSpatialParameters(listenerPos, listenerHeading, veh.position, 8, 45);

      if (!src) {
        try {
          const osc = this.ctx.createOscillator();
          const gain = this.ctx.createGain();
          const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(45 + Math.min(veh.speed * 8, 90), this.ctx.currentTime);
          gain.gain.setValueAtTime(spatial.volume * 0.08, this.ctx.currentTime);

          if (panner) {
            panner.pan.setValueAtTime(spatial.pan, this.ctx.currentTime);
            osc.connect(gain);
            gain.connect(panner);
            panner.connect(this.engineGain!);
          } else {
            osc.connect(gain);
            gain.connect(this.engineGain!);
          }

          osc.start();
          src = {
            id: veh.id,
            pos: veh.position.clone(),
            osc,
            gain,
            panner: panner || undefined,
            active: true,
          };
          this.trafficEngines.set(veh.id, src);
        } catch {
          continue;
        }
      } else {
        const now = this.ctx.currentTime;
        src.pos.copy(veh.position);
        if (src.gain) {
          src.gain.gain.setTargetAtTime(spatial.volume * 0.08, now, 0.08);
        }
        if (src.panner) {
          src.panner.pan.setTargetAtTime(spatial.pan, now, 0.08);
        }
        if (src.osc) {
          const targetFreq = 40 + Math.min(veh.speed * 8, 85);
          src.osc.frequency.setTargetAtTime(targetFreq, now, 0.1);
        }
      }
    }
  }

  // ==========================================
  // 2. PEDESTRIAN 3D CHATTER & VOCAL REACTIONS
  // ==========================================
  /**
   * Generates procedural multi-formant human speech / gasps / greetings spatialized in 3D
   */
  public triggerPedestrianChatter(
    listenerPos: THREE.Vector3,
    listenerHeading: number,
    pedestrianPos: THREE.Vector3,
    type: 'greeting' | 'alarm' | 'startled' | 'chatter' = 'greeting'
  ) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    // Enforce cooldown
    if (now - this.lastChatterTime < this.chatterCooldown) return;
    this.lastChatterTime = now;

    const spatial = this.computeSpatialParameters(listenerPos, listenerHeading, pedestrianPos, 6, 25);
    if (spatial.volume <= 0.01) return;

    try {
      // Formant synthesis using bandpass filters (F1, F2 vowel bands)
      const osc = this.ctx.createOscillator();
      const formant1 = this.ctx.createBiquadFilter();
      const formant2 = this.ctx.createBiquadFilter();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;
      const gain = this.ctx.createGain();

      osc.type = 'sawtooth';
      formant1.type = 'bandpass';
      formant2.type = 'bandpass';
      formant1.Q.setValueAtTime(6.0, now);
      formant2.Q.setValueAtTime(7.0, now);

      let duration = 0.28;
      let pitchStart = 160;
      let pitchEnd = 140;

      switch (type) {
        case 'alarm':
        case 'startled': // "Whoa!" / "Watch out!"
          pitchStart = 260 + Math.random() * 80;
          pitchEnd = 380 + Math.random() * 60;
          formant1.frequency.setValueAtTime(550, now);
          formant2.frequency.setValueAtTime(1800, now);
          duration = 0.32;
          break;
        case 'greeting': // "Hey" / "Morning"
          pitchStart = 180 + Math.random() * 40;
          pitchEnd = 160;
          formant1.frequency.setValueAtTime(450, now);
          formant2.frequency.setValueAtTime(1400, now);
          duration = 0.24;
          break;
        case 'chatter': // Casual street murmur
        default:
          pitchStart = 150 + Math.random() * 50;
          pitchEnd = 130 + Math.random() * 30;
          formant1.frequency.setValueAtTime(400, now);
          formant2.frequency.setValueAtTime(1200, now);
          duration = 0.35;
          break;
      }

      osc.frequency.setValueAtTime(pitchStart, now);
      osc.frequency.exponentialRampToValueAtTime(Math.max(80, pitchEnd), now + duration);

      const targetVol = spatial.volume * 0.14;
      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(targetVol, now + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

      osc.connect(formant1);
      formant1.connect(formant2);
      formant2.connect(gain);

      if (panner) {
        panner.pan.setValueAtTime(spatial.pan, now);
        gain.connect(panner);
        panner.connect(this.chatterGain!);
      } else {
        gain.connect(this.chatterGain!);
      }

      osc.start(now);
      osc.stop(now + duration + 0.02);
    } catch {
      // Audio node failure
    }
  }

  // ==========================================
  // 3. ENVIRONMENTAL WEATHER & ATMOSPHERIC EFFECTS
  // ==========================================
  private initWeatherNodes() {
    if (!this.ctx || !this.weatherGain) return;

    try {
      // 1. Rain Audio (pink noise buffer + low-pass filter)
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.06;
      }

      this.rainNoiseNode = this.ctx.createBufferSource();
      this.rainNoiseNode.buffer = buffer;
      this.rainNoiseNode.loop = true;

      this.rainFilterNode = this.ctx.createBiquadFilter();
      this.rainFilterNode.type = 'lowpass';
      this.rainFilterNode.frequency.setValueAtTime(3200, this.ctx.currentTime);

      this.rainGainNode = this.ctx.createGain();
      this.rainGainNode.gain.setValueAtTime(0, this.ctx.currentTime);

      this.rainNoiseNode.connect(this.rainFilterNode);
      this.rainFilterNode.connect(this.rainGainNode);
      this.rainGainNode.connect(this.weatherGain);

      this.rainNoiseNode.start();

      // 2. Wind Atmosphere
      this.windOscNode = this.ctx.createOscillator();
      this.windFilterNode = this.ctx.createBiquadFilter();
      this.windGainNode = this.ctx.createGain();

      this.windOscNode.type = 'sine';
      this.windOscNode.frequency.setValueAtTime(90, this.ctx.currentTime);

      this.windFilterNode.type = 'bandpass';
      this.windFilterNode.frequency.setValueAtTime(140, this.ctx.currentTime);
      this.windFilterNode.Q.setValueAtTime(3.0, this.ctx.currentTime);

      this.windGainNode.gain.setValueAtTime(0.02, this.ctx.currentTime);

      this.windOscNode.connect(this.windFilterNode);
      this.windFilterNode.connect(this.windGainNode);
      this.windGainNode.connect(this.weatherGain);

      this.windOscNode.start();
    } catch {
      // Audio setup fallback
    }
  }

  public updateWeatherAudio(weather: WeatherType, wetness: number) {
    if (!this.ctx || !this.rainGainNode) return;
    const now = this.ctx.currentTime;

    const isRaining = weather === 'rain' || weather === 'storm';
    const targetRainVol = isRaining ? (weather === 'storm' ? 0.15 : 0.08) : 0;
    this.rainGainNode.gain.setTargetAtTime(targetRainVol, now, 0.4);

    if (this.windGainNode && this.windFilterNode) {
      const windVol = weather === 'storm' ? 0.08 : (weather === 'cloudy' ? 0.03 : 0.015);
      this.windGainNode.gain.setTargetAtTime(windVol, now, 0.5);
      const windFreq = weather === 'storm' ? 240 : 130;
      this.windFilterNode.frequency.setTargetAtTime(windFreq, now, 0.5);
    }
  }

  /**
   * Spatially placed thunder strike with acoustic travel delay (d / 340)
   */
  public triggerSpatialThunder(
    listenerPos: THREE.Vector3,
    listenerHeading: number,
    lightningPos: THREE.Vector3
  ) {
    if (!this.ctx || this.isMuted) return;

    const spatial = this.computeSpatialParameters(listenerPos, listenerHeading, lightningPos, 30, 220);
    // Acoustic delay in milliseconds
    const delaySec = Math.min(2.5, spatial.distance / 340);

    window.setTimeout(() => {
      if (!this.ctx || this.isMuted) return;
      const now = this.ctx.currentTime;

      try {
        const osc = this.ctx.createOscillator();
        const subOsc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

        osc.type = 'triangle';
        subOsc.type = 'sine';

        osc.frequency.setValueAtTime(65, now);
        osc.frequency.exponentialRampToValueAtTime(18, now + 1.4);

        subOsc.frequency.setValueAtTime(45, now);
        subOsc.frequency.exponentialRampToValueAtTime(14, now + 1.8);

        const vol = spatial.volume * 0.35;
        gain.gain.setValueAtTime(vol, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 1.8);

        osc.connect(gain);
        subOsc.connect(gain);

        if (panner) {
          panner.pan.setValueAtTime(spatial.pan, now);
          gain.connect(panner);
          panner.connect(this.weatherGain!);
        } else {
          gain.connect(this.weatherGain!);
        }

        osc.start(now);
        subOsc.start(now);
        osc.stop(now + 1.85);
        subOsc.stop(now + 1.85);
      } catch {
        // ignore
      }
    }, delaySec * 1000);
  }

  /**
   * Spatial tire screech / wet puddle splash when driving or braking on wet pavement
   */
  public playSpatialTireSkid(
    listenerPos: THREE.Vector3,
    listenerHeading: number,
    skidPos: THREE.Vector3,
    isWet = false
  ) {
    if (!this.ctx || this.isMuted) return;
    const spatial = this.computeSpatialParameters(listenerPos, listenerHeading, skidPos, 10, 40);
    if (spatial.volume <= 0.02) return;

    const now = this.ctx.currentTime;
    try {
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      const panner = this.ctx.createStereoPanner ? this.ctx.createStereoPanner() : null;

      osc.type = isWet ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(isWet ? 380 : 540, now);
      osc.frequency.exponentialRampToValueAtTime(isWet ? 120 : 220, now + 0.25);

      gain.gain.setValueAtTime(spatial.volume * (isWet ? 0.09 : 0.12), now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.26);

      osc.connect(gain);
      if (panner) {
        panner.pan.setValueAtTime(spatial.pan, now);
        gain.connect(panner);
        panner.connect(this.engineGain!);
      } else {
        gain.connect(this.engineGain!);
      }

      osc.start(now);
      osc.stop(now + 0.28);
    } catch {
      // ignore
    }
  }

  public dispose() {
    this.stopPlayerEngine();
    for (const [, src] of this.trafficEngines) {
      try {
        src.osc?.stop();
        src.osc?.disconnect();
        src.gain?.disconnect();
      } catch {
        // ignore
      }
    }
    this.trafficEngines.clear();
    try {
      this.rainNoiseNode?.stop();
      this.windOscNode?.stop();
      this.ctx?.close();
    } catch {
      // ignore
    }
    this.ctx = null;
  }
}

export const audioController = new AudioController();
