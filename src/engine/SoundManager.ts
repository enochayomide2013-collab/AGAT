/**
 * AGAT Procedural Audio Engine
 * Uses Web Audio API to synthesize responsive game sound effects, vehicle engines,
 * sirens, dynamic weather audio, weapons, and original radio stations.
 */

export class SoundManager {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;
  private masterGain: GainNode | null = null;
  private sfxGain: GainNode | null = null;
  private musicGain: GainNode | null = null;

  // Engine sound state
  private engineOsc: OscillatorNode | null = null;
  private engineSubOsc: OscillatorNode | null = null;
  private engineGain: GainNode | null = null;
  private isEngineRunning: boolean = false;

  // Siren sound state
  private sirenOsc: OscillatorNode | null = null;
  private sirenGain: GainNode | null = null;
  private sirenInterval: number | null = null;

  // Rain sound state
  private rainNode: AudioNode | null = null;
  private rainGain: GainNode | null = null;

  // Radio synthesizer
  private radioStation: string = 'synthwave'; // 'off' | 'synthwave' | 'electro' | 'chill'
  private radioTimer: number | null = null;
  private radioStep: number = 0;

  constructor() {
    // Lazily initialize on user gesture to obey browser autoplay policy
  }

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.setValueAtTime(0.8, this.ctx.currentTime);
      this.masterGain.connect(this.ctx.destination);

      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.setValueAtTime(0.9, this.ctx.currentTime);
      this.sfxGain.connect(this.masterGain);

      this.musicGain = this.ctx.createGain();
      this.musicGain.gain.setValueAtTime(0.4, this.ctx.currentTime);
      this.musicGain.connect(this.masterGain);

      this.startRadio();
    } catch {
      // AudioContext unavailable
    }
  }

  public resume() {
    if (this.ctx && this.ctx.state === 'suspended') {
      this.ctx.resume();
    }
  }

  public setVolume(volume: number) {
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(Math.max(0, Math.min(1, volume)), this.ctx.currentTime);
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setValueAtTime(muted ? 0 : 0.8, this.ctx.currentTime);
    }
  }

  // --- FOOTSTEPS ---
  public playFootstep() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(90, now);
    osc.frequency.exponentialRampToValueAtTime(30, now + 0.08);

    gain.gain.setValueAtTime(0.08, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.08);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.09);
  }

  // --- JUMP / LAND ---
  public playJump() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(140, now);
    osc.frequency.exponentialRampToValueAtTime(320, now + 0.15);

    gain.gain.setValueAtTime(0.12, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.15);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.16);
  }

  // --- VEHICLE ENGINE ---
  public startVehicleEngine() {
    if (!this.ctx || this.isEngineRunning || this.isMuted) return;
    const now = this.ctx.currentTime;

    this.engineOsc = this.ctx.createOscillator();
    this.engineSubOsc = this.ctx.createOscillator();
    this.engineGain = this.ctx.createGain();

    this.engineOsc.type = 'sawtooth';
    this.engineSubOsc.type = 'triangle';

    this.engineOsc.frequency.setValueAtTime(55, now);
    this.engineSubOsc.frequency.setValueAtTime(27.5, now);

    this.engineGain.gain.setValueAtTime(0.1, now);

    this.engineOsc.connect(this.engineGain);
    this.engineSubOsc.connect(this.engineGain);
    this.engineGain.connect(this.sfxGain!);

    this.engineOsc.start(now);
    this.engineSubOsc.start(now);
    this.isEngineRunning = true;
  }

  public updateVehicleEngine(speedRatio: number, isReversing = false) {
    if (!this.isEngineRunning || !this.engineOsc || !this.engineSubOsc || !this.ctx) return;
    const now = this.ctx.currentTime;
    const baseFreq = isReversing ? 45 : 50;
    const targetFreq = baseFreq + speedRatio * 160;
    this.engineOsc.frequency.setTargetAtTime(targetFreq, now, 0.08);
    this.engineSubOsc.frequency.setTargetAtTime(targetFreq * 0.5, now, 0.08);

    if (this.engineGain) {
      const vol = 0.08 + speedRatio * 0.14;
      this.engineGain.gain.setTargetAtTime(vol, now, 0.05);
    }
  }

  public stopVehicleEngine() {
    if (!this.isEngineRunning) return;
    try {
      this.engineOsc?.stop();
      this.engineSubOsc?.stop();
      this.engineOsc?.disconnect();
      this.engineSubOsc?.disconnect();
      this.engineGain?.disconnect();
    } catch {
      // ignore
    }
    this.engineOsc = null;
    this.engineSubOsc = null;
    this.engineGain = null;
    this.isEngineRunning = false;
  }

  // --- VEHICLE HORN ---
  public playHorn() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc1 = this.ctx.createOscillator();
    const osc2 = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc1.type = 'sawtooth';
    osc2.type = 'sawtooth';
    osc1.frequency.setValueAtTime(340, now);
    osc2.frequency.setValueAtTime(425, now);

    gain.gain.setValueAtTime(0.15, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.4);

    osc1.connect(gain);
    osc2.connect(gain);
    gain.connect(this.sfxGain!);

    osc1.start(now);
    osc2.start(now);
    osc1.stop(now + 0.41);
    osc2.stop(now + 0.41);
  }

  // --- VEHICLE IMPACT / CRASH ---
  public playCrash(intensity = 1) {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(110, now);
    osc.frequency.exponentialRampToValueAtTime(20, now + 0.3);

    const vol = Math.min(0.4, 0.15 * intensity);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.35);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.36);
  }

  // --- WEAPON SOUNDS ---
  public playWeaponFire(type: 'pistol' | 'rifle' | 'shotgun' | 'precision') {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    let startFreq = 600;
    let duration = 0.12;
    let gainVal = 0.25;

    if (type === 'rifle') {
      startFreq = 850;
      duration = 0.1;
      gainVal = 0.22;
      osc.type = 'sawtooth';
    } else if (type === 'shotgun') {
      startFreq = 380;
      duration = 0.24;
      gainVal = 0.35;
      osc.type = 'square';
    } else if (type === 'precision') {
      startFreq = 1200;
      duration = 0.3;
      gainVal = 0.3;
      osc.type = 'sawtooth';
    } else {
      osc.type = 'triangle';
    }

    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(40, now + duration);

    gain.gain.setValueAtTime(gainVal, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + duration + 0.02);
  }

  public playReload() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Two mechanical clicks
    [0, 0.25].forEach((delay) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now + delay);
      osc.frequency.exponentialRampToValueAtTime(200, now + delay + 0.05);
      gain.gain.setValueAtTime(0.12, now + delay);
      gain.gain.exponentialRampToValueAtTime(0.001, now + delay + 0.06);

      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(now + delay);
      osc.stop(now + delay + 0.07);
    });
  }

  // --- POLICE SIREN ---
  public setPoliceSiren(active: boolean) {
    if (!this.ctx) return;
    if (active && !this.sirenOsc) {
      const now = this.ctx.currentTime;
      this.sirenOsc = this.ctx.createOscillator();
      this.sirenGain = this.ctx.createGain();

      this.sirenOsc.type = 'sine';
      this.sirenOsc.frequency.setValueAtTime(650, now);
      this.sirenGain.gain.setValueAtTime(0.08, now);

      this.sirenOsc.connect(this.sirenGain);
      this.sirenGain.connect(this.sfxGain!);
      this.sirenOsc.start(now);

      let toneToggle = false;
      this.sirenInterval = window.setInterval(() => {
        if (!this.sirenOsc || !this.ctx) return;
        toneToggle = !toneToggle;
        const target = toneToggle ? 850 : 550;
        this.sirenOsc.frequency.setTargetAtTime(target, this.ctx.currentTime, 0.15);
      }, 450);
    } else if (!active && this.sirenOsc) {
      if (this.sirenInterval) clearInterval(this.sirenInterval);
      this.sirenInterval = null;
      try {
        this.sirenOsc.stop();
        this.sirenOsc.disconnect();
        this.sirenGain?.disconnect();
      } catch {
        // ignore
      }
      this.sirenOsc = null;
      this.sirenGain = null;
    }
  }

  // --- WEATHER SOUNDS ---
  public setWeatherAudio(weather: 'clear' | 'cloudy' | 'rain' | 'storm') {
    if (!this.ctx) return;
    const isRaining = weather === 'rain' || weather === 'storm';

    if (isRaining && !this.rainNode) {
      // Pink/white noise for rain
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const output = buffer.getChannelData(0);
      let b0 = 0, b1 = 0, b2 = 0;
      for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + white * 0.0555179;
        b1 = 0.99332 * b1 + white * 0.0750759;
        b2 = 0.96900 * b2 + white * 0.1538520;
        output[i] = (b0 + b1 + b2) * 0.05;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      this.rainGain = this.ctx.createGain();
      this.rainGain.gain.setValueAtTime(weather === 'storm' ? 0.12 : 0.06, this.ctx.currentTime);

      noise.connect(this.rainGain);
      this.rainGain.connect(this.masterGain!);
      noise.start();
      this.rainNode = noise;
    } else if (!isRaining && this.rainNode) {
      try {
        (this.rainNode as AudioBufferSourceNode).stop();
        this.rainNode.disconnect();
        this.rainGain?.disconnect();
      } catch {
        // ignore
      }
      this.rainNode = null;
      this.rainGain = null;
    }

    if (weather === 'storm' && Math.random() < 0.3) {
      this.playThunder();
    }
  }

  public playThunder() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'triangle';
    osc.frequency.setValueAtTime(60, now);
    osc.frequency.exponentialRampToValueAtTime(15, now + 1.2);

    gain.gain.setValueAtTime(0.3, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 1.5);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 1.55);
  }

  // --- UI SOUNDS ---
  public playUIClick() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sine';
    osc.frequency.setValueAtTime(700, now);
    osc.frequency.exponentialRampToValueAtTime(1200, now + 0.04);

    gain.gain.setValueAtTime(0.1, now);
    gain.gain.linearRampToValueAtTime(0.001, now + 0.05);

    osc.connect(gain);
    gain.connect(this.sfxGain!);

    osc.start(now);
    osc.stop(now + 0.06);
  }

  public playDoorOpen() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Two-tone door transition chime
    [520, 680].forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const time = now + idx * 0.1;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, time);
      gain.gain.setValueAtTime(0.14, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.28);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(time);
      osc.stop(time + 0.3);
    });
  }

  public playMissionComplete() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Triumphant 3-note arpeggio
    const notes = [440, 554, 659, 880];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const time = now + idx * 0.12;

      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.18, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.4);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time);
      osc.stop(time + 0.42);
    });
  }

  public playMissionFailed() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Descending melancholy tones
    const notes = [330, 293, 261, 220];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const time = now + idx * 0.15;

      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(freq, time);

      gain.gain.setValueAtTime(0.16, time);
      gain.gain.exponentialRampToValueAtTime(0.001, time + 0.35);

      osc.connect(gain);
      gain.connect(this.sfxGain!);

      osc.start(time);
      osc.stop(time + 0.38);
    });
  }

  // --- ORIGINAL AGAT RADIO GENERATOR ---
  public setRadioStation(station: 'off' | 'synthwave' | 'electro' | 'chill') {
    this.radioStation = station;
    if (station === 'off') {
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setValueAtTime(0, this.ctx.currentTime);
      }
    } else {
      if (this.musicGain && this.ctx) {
        this.musicGain.gain.setValueAtTime(0.35, this.ctx.currentTime);
      }
    }
  }

  public getRadioStation() {
    return this.radioStation;
  }

  private startRadio() {
    if (this.radioTimer) return;
    const synthNotes = [220, 246.94, 261.63, 293.66, 329.63, 392.0, 440];

    this.radioTimer = window.setInterval(() => {
      if (!this.ctx || this.isMuted || this.radioStation === 'off') return;
      const now = this.ctx.currentTime;
      this.radioStep = (this.radioStep + 1) % 16;

      // Bassline note on quarter beats
      if (this.radioStep % 2 === 0) {
        const bassOsc = this.ctx.createOscillator();
        const bassGain = this.ctx.createGain();
        bassOsc.type = this.radioStation === 'synthwave' ? 'sawtooth' : 'triangle';
        const bassFreq = synthNotes[this.radioStep % 4] * 0.5;
        bassOsc.frequency.setValueAtTime(bassFreq, now);

        bassGain.gain.setValueAtTime(0.15, now);
        bassGain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        bassOsc.connect(bassGain);
        bassGain.connect(this.musicGain!);

        bassOsc.start(now);
        bassOsc.stop(now + 0.24);
      }

      // Melodic arpeggio
      if (this.radioStep % 4 === 1 || this.radioStep % 4 === 3) {
        const leadOsc = this.ctx.createOscillator();
        const leadGain = this.ctx.createGain();
        leadOsc.type = 'sine';
        const leadFreq = synthNotes[(this.radioStep * 2 + 3) % synthNotes.length];
        leadOsc.frequency.setValueAtTime(leadFreq, now);

        leadGain.gain.setValueAtTime(0.08, now);
        leadGain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);

        leadOsc.connect(leadGain);
        leadGain.connect(this.musicGain!);

        leadOsc.start(now);
        leadOsc.stop(now + 0.2);
      }
    }, 240);
  }

  // --- SPRAY PAINTING AUDIO EFFECTS ---
  private activeSprayHissNode: AudioBufferSourceNode | null = null;
  private activeSprayHissGain: GainNode | null = null;

  public playSprayRattle() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Rhythmic metal bearing rattle inside aerosol can (3 quick metallic clicks)
    for (let i = 0; i < 4; i++) {
      const clickTime = now + i * 0.045;
      const osc = this.ctx.createOscillator();
      const gain = this.ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(1400 + Math.random() * 600, clickTime);
      gain.gain.setValueAtTime(0.08, clickTime);
      gain.gain.exponentialRampToValueAtTime(0.001, clickTime + 0.02);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(clickTime);
      osc.stop(clickTime + 0.025);
    }
  }

  public startSprayHiss() {
    if (!this.ctx || this.isMuted || this.activeSprayHissNode) return;
    try {
      const bufferSize = this.ctx.sampleRate * 2;
      const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.35;
      }

      const noise = this.ctx.createBufferSource();
      noise.buffer = buffer;
      noise.loop = true;

      // Bandpass filter to model pressurized nozzle aerosol hiss
      const filter = this.ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(3200, this.ctx.currentTime);
      filter.Q.setValueAtTime(2.5, this.ctx.currentTime);

      const gain = this.ctx.createGain();
      gain.gain.setValueAtTime(0.01, this.ctx.currentTime);
      gain.gain.linearRampToValueAtTime(0.12, this.ctx.currentTime + 0.05);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(this.sfxGain!);

      noise.start();
      this.activeSprayHissNode = noise;
      this.activeSprayHissGain = gain;
    } catch {
      // AudioContext fallback
    }
  }

  public stopSprayHiss() {
    if (!this.ctx || !this.activeSprayHissNode || !this.activeSprayHissGain) return;
    try {
      const now = this.ctx.currentTime;
      this.activeSprayHissGain.gain.setValueAtTime(this.activeSprayHissGain.gain.value, now);
      this.activeSprayHissGain.gain.linearRampToValueAtTime(0.001, now + 0.04);
      setTimeout(() => {
        try {
          this.activeSprayHissNode?.stop();
          this.activeSprayHissNode?.disconnect();
        } catch {
          // ignore
        }
        this.activeSprayHissNode = null;
        this.activeSprayHissGain = null;
      }, 50);
    } catch {
      this.activeSprayHissNode = null;
      this.activeSprayHissGain = null;
    }
  }

  public playSprayBurst(durationMs: number = 250) {
    this.startSprayHiss();
    setTimeout(() => {
      this.stopSprayHiss();
    }, durationMs);
  }

  public playTagCompletedFanfare() {
    if (!this.ctx || this.isMuted) return;
    const now = this.ctx.currentTime;
    // Urban celebratory chord with synth chime
    const notes = [392, 493.88, 587.33, 783.99, 987.77];
    notes.forEach((freq, idx) => {
      const osc = this.ctx!.createOscillator();
      const gain = this.ctx!.createGain();
      const t = now + idx * 0.08;
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, t);
      gain.gain.setValueAtTime(0.16, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.45);
      osc.connect(gain);
      gain.connect(this.sfxGain!);
      osc.start(t);
      osc.stop(t + 0.5);
    });
  }
}

export const soundManager = new SoundManager();
