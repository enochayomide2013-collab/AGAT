import { RadioStationDef, RadioStationId } from '../types/game';

export interface RadioTalkSegment {
  host: string;
  text: string;
  duration: number; // estimated seconds
}

export const RADIO_STATIONS: RadioStationDef[] = [
  {
    id: 'flash_pop',
    name: 'Flash Pop 104.5',
    genre: 'Upbeat Pop & Dance',
    frequency: '104.5 FM',
    host: 'DJ Cherry Starlight',
    description: 'Vibrant pop bangers, neon hooks, and cheerful melodies across AGAT City.',
    color: '#f43f5e',
  },
  {
    id: 'liberty_rock',
    name: 'Liberty Rock 92.7',
    genre: 'Classic Rock & Heavy Riffs',
    frequency: '92.7 FM',
    host: 'Axel "Wrench" Stone',
    description: 'Overdriven power chords, thunderous drums, and pure gasoline-fueled classic rock.',
    color: '#f97316',
  },
  {
    id: 'pulse_electro',
    name: 'Pulse Electro 99.3',
    genre: 'Cyber Club & Acid Techno',
    frequency: '99.3 FM',
    host: 'CYBER-9 (Station AI)',
    description: 'Hypnotic sub-bass, 16th-note acid sequences, and high-energy electronic club anthems.',
    color: '#06b6d4',
  },
  {
    id: 'kchat_talk',
    name: 'K-CHAT AGAT 90.1',
    genre: 'Satirical Talk & City News',
    frequency: '90.1 FM',
    host: 'Barry Baxter & Callers',
    description: 'Absurd caller conspiracies, wild AGAT City news flashes, and satirical commercials.',
    color: '#a855f7',
  },
  {
    id: 'off',
    name: 'Radio Off',
    genre: 'Muted',
    frequency: '--',
    host: 'None',
    description: 'Vehicle radio turned off.',
    color: '#64748b',
  },
];

export const TALK_SEGMENTS: Record<RadioStationId, RadioTalkSegment[]> = {
  flash_pop: [
    {
      host: 'DJ Cherry Starlight',
      text: "You're locked to Flash Pop 104.5! Reminder to all street racers: headlights do not make you invisible to police radar! Stay fabulous, AGAT City!",
      duration: 6,
    },
    {
      host: 'DJ Cherry Starlight',
      text: "Flash Pop exclusive: The Starlight Diner just won best cherry pie in the district for the 5th year in a row! Go get a slice before it sells out!",
      duration: 6,
    },
    {
      host: 'DJ Cherry Starlight',
      text: "DJ Cherry on the mic! If your heart isn't racing and your windows aren't down, you're driving in the wrong city! Here's the hottest track on the charts!",
      duration: 6,
    },
  ],
  liberty_rock: [
    {
      host: 'Axel Stone',
      text: "This is Axel 'Wrench' Stone on Liberty Rock 92.7! Real steel, roaring V8 engines, zero synthetic filler. Crank that dashboard knob until it breaks!",
      duration: 6,
    },
    {
      host: 'Axel Stone',
      text: "Traffic bulletin: PD squad cars are chasing another stolen muscle car down South Bridge. Axel says: pedal to the metal, kid!",
      duration: 6,
    },
    {
      host: 'Axel Stone',
      text: "Liberty Rock: Born in grease, raised on distortion. No auto-tune allowed on this frequency. Let's rip!",
      duration: 5,
    },
  ],
  pulse_electro: [
    {
      host: 'CYBER-9',
      text: "Transmitting on frequency 99.3, Pulse Electro. Synchronize neural pulse to 132 beats per minute. Velocity limit: nonexistent.",
      duration: 6,
    },
    {
      host: 'CYBER-9',
      text: "Atmospheric telemetry update: Neon rain detected over Downtown skyscrapers. Optical reflections at optimal aesthetic levels. Accelerate.",
      duration: 6,
    },
    {
      host: 'CYBER-9',
      text: "Pulse Electro 99.3. Curating the nocturnal rhythm for cybernetically augmented speed demons. Sound is survival.",
      duration: 6,
    },
  ],
  kchat_talk: [
    {
      host: 'Barry Baxter',
      text: "Welcome back to K-CHAT 90.1! Barry Baxter here. Caller three claims the city streetlights are transmitting subliminal grocery orders! Frank, take off the tinfoil hat!",
      duration: 7,
    },
    {
      host: 'Barry Baxter',
      text: "Commercial break: Spud-O-Matic Instant Fries! Made with up to 40% real nutrient paste. Now with cyber-crunch! Why chew when you can absorb?!",
      duration: 6,
    },
    {
      host: 'Barry Baxter',
      text: "Evening editorial: Crime is up 14%, but sports car sales are up 40%. AGAT City's economy is running entirely on adrenaline and poor life choices!",
      duration: 7,
    },
  ],
  off: [],
  synthwave: [],
  electro: [],
  chill: [],
};

export class RadioSystem {
  public currentStation: RadioStationId = 'flash_pop';
  public volume: number = 0.45;
  public isMuted: boolean = false;
  public onAirTalk: RadioTalkSegment | null = null;
  public onStationChangeListeners: ((station: RadioStationDef) => void)[] = [];
  public onTalkSegmentListeners: ((segment: RadioTalkSegment | null) => void)[] = [];

  private audioCtx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private musicGain: GainNode | null = null;
  private distortionCurve: Float32Array | null = null;
  private timer: number | null = null;
  private step: number = 0;
  private talkTimer: number | null = null;
  private currentUtterance: SpeechSynthesisUtterance | null = null;

  constructor() {
    this.createDistortionCurve();
  }

  private initAudio() {
    if (this.audioCtx) return;
    try {
      const AudioCtxClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.audioCtx = new AudioCtxClass();
      this.masterGain = this.audioCtx.createGain();
      this.masterGain.gain.setValueAtTime(this.volume, this.audioCtx.currentTime);

      this.musicGain = this.audioCtx.createGain();
      this.musicGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);

      this.musicGain.connect(this.masterGain);
      this.masterGain.connect(this.audioCtx.destination);
    } catch {
      // Audio context might fail before user interaction
    }
  }

  private createDistortionCurve() {
    const k = 40;
    const nSamples = 44100;
    const curve = new Float32Array(nSamples);
    const deg = Math.PI / 180;
    for (let i = 0; i < nSamples; ++i) {
      const x = (i * 2) / nSamples - 1;
      curve[i] = ((3 + k) * x * 20 * deg) / (Math.PI + k * Math.abs(x));
    }
    this.distortionCurve = curve;
  }

  public setStation(id: RadioStationId) {
    this.initAudio();
    if (this.audioCtx && this.audioCtx.state === 'suspended') {
      this.audioCtx.resume();
    }

    this.currentStation = id;
    this.step = 0;

    // Stop ongoing speech
    if (window.speechSynthesis && window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
    this.onAirTalk = null;
    this.notifyTalkListeners();

    if (id === 'off') {
      this.stopSynthesizer();
    } else {
      this.startSynthesizer();
      // Trigger short DJ welcome or intro after 1 second
      if (this.talkTimer) window.clearTimeout(this.talkTimer);
      this.talkTimer = window.setTimeout(() => {
        this.triggerRandomTalkSegment();
      }, 1500);
    }

    const stationDef = this.getCurrentStationDef();
    this.onStationChangeListeners.forEach((fn) => fn(stationDef));
  }

  public cycleNextStation() {
    const available = RADIO_STATIONS.map((s) => s.id);
    const curIdx = available.indexOf(this.currentStation);
    const nextIdx = (curIdx + 1) % available.length;
    this.setStation(available[nextIdx]);
  }

  public cyclePrevStation() {
    const available = RADIO_STATIONS.map((s) => s.id);
    const curIdx = available.indexOf(this.currentStation);
    const prevIdx = (curIdx - 1 + available.length) % available.length;
    this.setStation(available[prevIdx]);
  }

  public getCurrentStationDef(): RadioStationDef {
    return (
      RADIO_STATIONS.find((s) => s.id === this.currentStation) || {
        id: 'flash_pop',
        name: 'Flash Pop 104.5',
        genre: 'Upbeat Pop',
        frequency: '104.5 FM',
        host: 'DJ Cherry',
        description: 'Vibrant pop',
        color: '#f43f5e',
      }
    );
  }

  private startSynthesizer() {
    if (this.timer) return;

    // 16th note clock at ~124 BPM (approx 120ms per 16th note)
    this.timer = window.setInterval(() => {
      this.tick();
    }, 120);

    // Schedule periodic DJ talk segments every 35-50 seconds
    this.scheduleNextTalk();
  }

  private stopSynthesizer() {
    if (this.timer) {
      window.clearInterval(this.timer);
      this.timer = null;
    }
    if (this.talkTimer) {
      window.clearTimeout(this.talkTimer);
      this.talkTimer = null;
    }
  }

  private scheduleNextTalk() {
    if (this.talkTimer) window.clearTimeout(this.talkTimer);
    if (this.currentStation === 'off') return;

    const delay = (25 + Math.random() * 20) * 1000;
    this.talkTimer = window.setTimeout(() => {
      this.triggerRandomTalkSegment();
      this.scheduleNextTalk();
    }, delay);
  }

  public triggerRandomTalkSegment() {
    if (this.currentStation === 'off') return;
    const segments = TALK_SEGMENTS[this.currentStation];
    if (!segments || segments.length === 0) return;

    const seg = segments[Math.floor(Math.random() * segments.length)];
    this.onAirTalk = seg;
    this.notifyTalkListeners();

    // Audio ducking for speech
    if (this.musicGain && this.audioCtx) {
      this.musicGain.gain.setValueAtTime(0.25, this.audioCtx.currentTime);
    }

    // Spoken speech synthesis
    this.speakText(seg);

    // Release ducking after duration
    setTimeout(() => {
      if (this.musicGain && this.audioCtx) {
        this.musicGain.gain.setValueAtTime(1.0, this.audioCtx.currentTime);
      }
      this.onAirTalk = null;
      this.notifyTalkListeners();
    }, (seg.duration + 1) * 1000);
  }

  private speakText(segment: RadioTalkSegment) {
    if (!('speechSynthesis' in window)) return;
    try {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(segment.text);
      this.currentUtterance = utterance;

      // Adjust personality voice properties
      if (this.currentStation === 'flash_pop') {
        utterance.pitch = 1.35;
        utterance.rate = 1.15;
      } else if (this.currentStation === 'liberty_rock') {
        utterance.pitch = 0.75;
        utterance.rate = 1.0;
      } else if (this.currentStation === 'pulse_electro') {
        utterance.pitch = 0.65;
        utterance.rate = 1.05;
      } else {
        utterance.pitch = 1.1;
        utterance.rate = 1.25;
      }

      utterance.volume = Math.min(1, this.volume * 1.5);
      window.speechSynthesis.speak(utterance);
    } catch {
      // Ignore speech synth error if blocked
    }
  }

  private notifyTalkListeners() {
    this.onTalkSegmentListeners.forEach((fn) => fn(this.onAirTalk));
  }

  private tick() {
    if (!this.audioCtx || this.isMuted || this.currentStation === 'off') return;
    const now = this.audioCtx.currentTime;
    this.step = (this.step + 1) % 32;

    switch (this.currentStation) {
      case 'flash_pop':
        this.playPopTick(now, this.step);
        break;
      case 'liberty_rock':
        this.playRockTick(now, this.step);
        break;
      case 'pulse_electro':
        this.playElectroTick(now, this.step);
        break;
      case 'kchat_talk':
        this.playTalkBedTick(now, this.step);
        break;
    }
  }

  // --- GENRE 1: FLASH POP (UPBEAT POP) ---
  private playPopTick(now: number, step: number) {
    if (!this.audioCtx) return;
    // Chords: C (0-7), G (8-15), Am (16-23), F (24-31)
    const chordIdx = Math.floor(step / 8);
    const popChords = [
      [261.63, 329.63, 392.0], // C
      [196.0, 246.94, 293.66], // G
      [220.0, 261.63, 329.63], // Am
      [174.61, 220.0, 261.63], // F
    ];
    const bassNotes = [130.81, 98.0, 110.0, 87.31];

    // Four-on-the-floor Pop Kick (steps 0, 4, 8, 12, etc.)
    if (step % 4 === 0) {
      this.synthesizeKick(now, 130, 45, 0.12, 0.28);
    }

    // Snappy Snare / Clap on 4 and 12
    if (step % 8 === 4) {
      this.synthesizeSnare(now, 0.22);
    }

    // Bouncy pop bassline on quarter & off-beats
    if (step % 2 === 0) {
      const bFreq = bassNotes[chordIdx] * (step % 4 === 2 ? 1.5 : 1.0);
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(bFreq, now);

      gain.gain.setValueAtTime(0.2, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + 0.18);
    }

    // Bright cheerful synth melody arpeggio
    if (step % 2 === 1) {
      const chord = popChords[chordIdx];
      const noteFreq = chord[(step % chord.length) * 1] * 2;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(noteFreq, now);

      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.14);

      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + 0.15);
    }
  }

  // --- GENRE 2: LIBERTY ROCK (CLASSIC ROCK / POWER CHORDS) ---
  private playRockTick(now: number, step: number) {
    if (!this.audioCtx) return;
    // Rock Power Chords: E5 (0-7), G5 (8-15), A5 (16-23), D5 (24-31)
    const chordIdx = Math.floor(step / 8);
    const powerRoots = [82.41, 98.0, 110.0, 73.42]; // E2, G2, A2, D2

    // Heavy Rock Kick (steps 0, 6, 8, 14, 16, 22, 24, 30)
    if (step % 8 === 0 || step % 8 === 6) {
      this.synthesizeKick(now, 160, 38, 0.16, 0.35);
    }

    // Heavy Rock Snare (step 4, 12, 20, 28)
    if (step % 8 === 4) {
      this.synthesizeRockSnare(now);
    }

    // Hi-hat cymbal 8th notes
    if (step % 2 === 0) {
      this.synthesizeHiHat(now, 0.08);
    }

    // Distorted Sawtooth Guitar Power-Chord (Driving 8th notes)
    if (step % 2 === 0) {
      const root = powerRoots[chordIdx];
      const fifth = root * 1.5;

      [root, fifth].forEach((freq) => {
        const osc = this.audioCtx!.createOscillator();
        const dist = this.audioCtx!.createWaveShaper();
        const filter = this.audioCtx!.createBiquadFilter();
        const gain = this.audioCtx!.createGain();

        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(freq, now);

        if (this.distortionCurve) dist.curve = this.distortionCurve as any;
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(1800, now);

        gain.gain.setValueAtTime(0.12, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.22);

        osc.connect(dist);
        dist.connect(filter);
        filter.connect(gain);
        gain.connect(this.musicGain!);

        osc.start(now);
        osc.stop(now + 0.24);
      });
    }

    // Pentatonic rock lead lick on syncopated 16ths
    if (step % 4 === 3) {
      const pentatonic = [329.63, 392.0, 440.0, 493.88, 587.33];
      const note = pentatonic[(step * 3) % pentatonic.length];
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(note, now);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.15);

      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + 0.17);
    }
  }

  // --- GENRE 3: PULSE ELECTRO (CYBER CLUB & ACID TECHNO) ---
  private playElectroTick(now: number, step: number) {
    if (!this.audioCtx) return;

    // Relentless 4-on-the-floor Club Sub-Kick
    if (step % 4 === 0) {
      this.synthesizeKick(now, 150, 30, 0.14, 0.38);
    }

    // Crisp Open Hi-Hat on offbeats (2, 6, 10, 14, etc.)
    if (step % 4 === 2) {
      this.synthesizeHiHat(now, 0.14);
    }

    // Rolling 16th-note sub bassline
    const bassScale = [55, 55, 65.41, 55, 73.42, 55, 82.41, 55];
    const bFreq = bassScale[step % bassScale.length];
    const bOsc = this.audioCtx.createOscillator();
    const bGain = this.audioCtx.createGain();
    bOsc.type = 'sawtooth';
    bOsc.frequency.setValueAtTime(bFreq, now);
    bGain.gain.setValueAtTime(0.18, now);
    bGain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
    bOsc.connect(bGain);
    bGain.connect(this.musicGain!);
    bOsc.start(now);
    bOsc.stop(now + 0.11);

    // Resonant 303 acid lead arpeggiator with filter sweep
    const acidNotes = [220, 246.94, 261.63, 293.66, 329.63, 440, 523.25];
    const acidFreq = acidNotes[(step * 2 + (step > 16 ? 3 : 0)) % acidNotes.length];
    const osc = this.audioCtx.createOscillator();
    const filter = this.audioCtx.createBiquadFilter();
    const gain = this.audioCtx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(acidFreq, now);

    filter.type = 'lowpass';
    const cutoff = 400 + Math.sin(step * 0.4) * 800 + 400;
    filter.frequency.setValueAtTime(cutoff, now);
    filter.Q.setValueAtTime(8, now);

    gain.gain.setValueAtTime(0.09, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.musicGain!);

    osc.start(now);
    osc.stop(now + 0.11);
  }

  // --- GENRE 4: K-CHAT TALK BED (JAZZY TALK LOUNGE) ---
  private playTalkBedTick(now: number, step: number) {
    if (!this.audioCtx) return;
    // Subdued jazzy walking bass on quarter notes
    if (step % 4 === 0) {
      const jazzNotes = [110, 138.59, 164.81, 146.83];
      const freq = jazzNotes[(step / 4) % jazzNotes.length];
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(freq, now);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.connect(gain);
      gain.connect(this.musicGain!);
      osc.start(now);
      osc.stop(now + 0.32);
    }

    // Soft ride cymbal
    if (step % 2 === 0) {
      this.synthesizeHiHat(now, 0.04);
    }
  }

  // --- PERCUSSION SYNTHESIS HELPERS ---
  private synthesizeKick(now: number, startFreq: number, endFreq: number, duration: number, vol: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq, now);
    osc.frequency.exponentialRampToValueAtTime(endFreq, now + duration);

    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + duration);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(now);
    osc.stop(now + duration + 0.01);
  }

  private synthesizeSnare(now: number, vol: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'triangle';
    osc.frequency.setValueAtTime(200, now);
    osc.frequency.exponentialRampToValueAtTime(60, now + 0.1);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.12);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(now);
    osc.stop(now + 0.13);
  }

  private synthesizeRockSnare(now: number) {
    if (!this.audioCtx) return;
    // Dual tone punch + noise crack
    const osc1 = this.audioCtx.createOscillator();
    const gain1 = this.audioCtx.createGain();
    osc1.type = 'square';
    osc1.frequency.setValueAtTime(280, now);
    osc1.frequency.exponentialRampToValueAtTime(70, now + 0.15);
    gain1.gain.setValueAtTime(0.2, now);
    gain1.gain.exponentialRampToValueAtTime(0.001, now + 0.16);

    osc1.connect(gain1);
    gain1.connect(this.musicGain!);
    osc1.start(now);
    osc1.stop(now + 0.17);
  }

  private synthesizeHiHat(now: number, vol: number) {
    if (!this.audioCtx) return;
    const osc = this.audioCtx.createOscillator();
    const gain = this.audioCtx.createGain();
    osc.type = 'highpass' as unknown as OscillatorType;
    osc.frequency.setValueAtTime(7500, now);
    gain.gain.setValueAtTime(vol, now);
    gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

    osc.connect(gain);
    gain.connect(this.musicGain!);
    osc.start(now);
    osc.stop(now + 0.07);
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.masterGain && this.audioCtx) {
      this.masterGain.gain.setValueAtTime(this.isMuted ? 0 : this.volume, this.audioCtx.currentTime);
    }
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    this.setVolume(this.volume);
  }

  public dispose() {
    this.stopSynthesizer();
    if (window.speechSynthesis) window.speechSynthesis.cancel();
    if (this.audioCtx) {
      try {
        this.audioCtx.close();
      } catch {
        // ignore
      }
      this.audioCtx = null;
    }
  }
}

export const radioSystem = new RadioSystem();
