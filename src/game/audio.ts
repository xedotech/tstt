/**
 * Procedural Web Audio Synth for Tesla Roadster: Apex Pursuit
 * 100% procedural, zero external audio asset dependencies.
 * Motor whine, SpaceX cold-gas thruster roar, tire squeals, EMP shockwaves,
 * impact hits, and dynamic thriller cyberpunk synth soundtrack.
 */

class SoundEngine {
  private ctx: AudioContext | null = null;
  private isMuted: boolean = false;

  // Motor nodes
  private motorOsc1: OscillatorNode | null = null;
  private motorOsc2: OscillatorNode | null = null;
  private motorGain: GainNode | null = null;

  // Thruster nodes
  private thrusterNoiseNode: AudioBufferSourceNode | null = null;
  private thrusterGain: GainNode | null = null;
  private thrusterFilter: BiquadFilterNode | null = null;

  // Tire squeal nodes
  private tireNoiseNode: AudioBufferSourceNode | null = null;
  private tireGain: GainNode | null = null;
  private tireFilter: BiquadFilterNode | null = null;

  // Music Synth nodes
  private musicInterval: number | null = null;
  private musicGain: GainNode | null = null;
  private musicStep: number = 0;
  private musicPlaying: boolean = false;

  private noiseBuffer: AudioBuffer | null = null;

  public init() {
    if (this.ctx) return;
    try {
      const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();
      this.createNoiseBuffer();
      this.setupContinuousNodes();
    } catch {
      // AudioContext unavailable in non-interactive environment
    }
  }

  private createNoiseBuffer() {
    if (!this.ctx) return;
    const bufferSize = this.ctx.sampleRate * 2; // 2 seconds of pink/white noise
    this.noiseBuffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = this.noiseBuffer.getChannelData(0);
    let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
    for (let i = 0; i < bufferSize; i++) {
      const white = Math.random() * 2 - 1;
      b0 = 0.99886 * b0 + white * 0.0555179;
      b1 = 0.99332 * b1 + white * 0.0750759;
      b2 = 0.96900 * b2 + white * 0.1538520;
      b3 = 0.86650 * b3 + white * 0.3104856;
      b4 = 0.55000 * b4 + white * 0.5329522;
      b5 = -0.7616 * b5 - white * 0.0168980;
      data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.11;
      b6 = white * 0.115926;
    }
  }

  private setupContinuousNodes() {
    if (!this.ctx || !this.noiseBuffer) return;

    // 1. Motor Synthesis (Dual High-Whine Electric Plaid Motors)
    this.motorOsc1 = this.ctx.createOscillator();
    this.motorOsc2 = this.ctx.createOscillator();
    this.motorOsc1.type = 'sawtooth';
    this.motorOsc2.type = 'triangle';
    this.motorOsc1.frequency.setValueAtTime(80, this.ctx.currentTime);
    this.motorOsc2.frequency.setValueAtTime(160, this.ctx.currentTime);

    const motorFilter = this.ctx.createBiquadFilter();
    motorFilter.type = 'lowpass';
    motorFilter.frequency.setValueAtTime(450, this.ctx.currentTime);

    this.motorGain = this.ctx.createGain();
    this.motorGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.motorOsc1.connect(motorFilter);
    this.motorOsc2.connect(motorFilter);
    motorFilter.connect(this.motorGain);
    this.motorGain.connect(this.ctx.destination);

    this.motorOsc1.start();
    this.motorOsc2.start();

    // 2. Thruster Roar Node
    this.thrusterNoiseNode = this.ctx.createBufferSource();
    this.thrusterNoiseNode.buffer = this.noiseBuffer;
    this.thrusterNoiseNode.loop = true;

    this.thrusterFilter = this.ctx.createBiquadFilter();
    this.thrusterFilter.type = 'bandpass';
    this.thrusterFilter.frequency.setValueAtTime(320, this.ctx.currentTime);
    this.thrusterFilter.Q.setValueAtTime(1.8, this.ctx.currentTime);

    this.thrusterGain = this.ctx.createGain();
    this.thrusterGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.thrusterNoiseNode.connect(this.thrusterFilter);
    this.thrusterFilter.connect(this.thrusterGain);
    this.thrusterGain.connect(this.ctx.destination);
    this.thrusterNoiseNode.start();

    // 3. Tire Squeal Node
    this.tireNoiseNode = this.ctx.createBufferSource();
    this.tireNoiseNode.buffer = this.noiseBuffer;
    this.tireNoiseNode.loop = true;

    this.tireFilter = this.ctx.createBiquadFilter();
    this.tireFilter.type = 'bandpass';
    this.tireFilter.frequency.setValueAtTime(1100, this.ctx.currentTime);
    this.tireFilter.Q.setValueAtTime(4.5, this.ctx.currentTime);

    this.tireGain = this.ctx.createGain();
    this.tireGain.gain.setValueAtTime(0, this.ctx.currentTime);

    this.tireNoiseNode.connect(this.tireFilter);
    this.tireFilter.connect(this.tireGain);
    this.tireGain.connect(this.ctx.destination);
    this.tireNoiseNode.start();

    // 4. Music Master Gain
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.setValueAtTime(0.24, this.ctx.currentTime);
    this.musicGain.connect(this.ctx.destination);
  }

  public updateMotorAudio(speedMps: number, throttle: number, thrusterActive: boolean, isDrifting: boolean) {
    if (!this.ctx || this.isMuted) return;

    const t = this.ctx.currentTime;
    const absSpeed = Math.abs(speedMps);
    const speedRatio = Math.min(1.2, absSpeed / 90);

    // Motor frequency: 80Hz idle -> up to 880Hz at top speed
    const baseFreq = 75 + speedRatio * 650 + (throttle > 0 ? 90 : 0);
    if (this.motorOsc1 && this.motorOsc2 && this.motorGain) {
      this.motorOsc1.frequency.setTargetAtTime(baseFreq, t, 0.05);
      this.motorOsc2.frequency.setTargetAtTime(baseFreq * 2.01, t, 0.05);

      const targetGain = Math.min(0.26, (0.04 + speedRatio * 0.16 + throttle * 0.12));
      this.motorGain.gain.setTargetAtTime(targetGain, t, 0.06);
    }

    // Thruster roar
    if (this.thrusterGain && this.thrusterFilter) {
      const targetThrustGain = thrusterActive ? 0.42 : 0;
      this.thrusterGain.gain.setTargetAtTime(targetThrustGain, t, 0.04);
      if (thrusterActive) {
        this.thrusterFilter.frequency.setTargetAtTime(420 + Math.random() * 80, t, 0.03);
      }
    }

    // Tire squeal
    if (this.tireGain) {
      const targetTireGain = isDrifting ? 0.32 : 0;
      this.tireGain.gain.setTargetAtTime(targetTireGain, t, 0.06);
    }
  }

  public playEMP() {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(650, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.65);

    gain.gain.setValueAtTime(0.55, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.65);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.65);
  }

  public playCollision(intensity: number = 1.0) {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = 'square';
    osc.frequency.setValueAtTime(140 * intensity, t);
    osc.frequency.exponentialRampToValueAtTime(30, t + 0.35);

    gain.gain.setValueAtTime(Math.min(0.6, 0.3 * intensity), t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.35);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.35);
  }

  public playTelegraphSound(type: 'interceptor' | 'enforcer' | 'drone') {
    if (!this.ctx || this.isMuted) return;
    const t = this.ctx.currentTime;

    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    if (type === 'drone') {
      // Rising warning chirp
      osc.type = 'sine';
      osc.frequency.setValueAtTime(700, t);
      osc.frequency.linearRampToValueAtTime(1400, t + 0.2);
    } else {
      // Rapid warning click
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(880, t);
      osc.frequency.setValueAtTime(1100, t + 0.08);
    }

    gain.gain.setValueAtTime(0.22, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.22);

    osc.connect(gain);
    gain.connect(this.ctx.destination);

    osc.start(t);
    osc.stop(t + 0.22);
  }

  public startThrillerMusic() {
    if (this.musicPlaying) return;
    this.musicPlaying = true;

    // Dark synth bassline: F - Ab - Bb - C (cyber thriller progression)
    const bassNotes = [43.65, 43.65, 51.91, 43.65, 58.27, 43.65, 65.41, 58.27];
    const arpNotes = [174.61, 207.65, 233.08, 261.63, 311.13, 349.23, 392.0, 466.16];

    this.musicStep = 0;
    this.musicInterval = window.setInterval(() => {
      if (!this.ctx || this.isMuted || !this.musicPlaying || !this.musicGain) return;
      const t = this.ctx.currentTime;

      // Bass beat
      const bassNote = bassNotes[this.musicStep % bassNotes.length];
      const bassOsc = this.ctx.createOscillator();
      const bassGain = this.ctx.createGain();

      bassOsc.type = 'sawtooth';
      bassOsc.frequency.setValueAtTime(bassNote, t);

      bassGain.gain.setValueAtTime(0.18, t);
      bassGain.gain.exponentialRampToValueAtTime(0.001, t + 0.16);

      bassOsc.connect(bassGain);
      bassGain.connect(this.musicGain);

      bassOsc.start(t);
      bassOsc.stop(t + 0.18);

      // Cyber arpeggio on alternate eighth notes
      if (this.musicStep % 2 === 0) {
        const arpNote = arpNotes[(this.musicStep * 3) % arpNotes.length];
        const arpOsc = this.ctx.createOscillator();
        const arpGain = this.ctx.createGain();

        arpOsc.type = 'sine';
        arpOsc.frequency.setValueAtTime(arpNote, t);

        arpGain.gain.setValueAtTime(0.07, t);
        arpGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

        arpOsc.connect(arpGain);
        arpGain.connect(this.musicGain);

        arpOsc.start(t);
        arpOsc.stop(t + 0.14);
      }

      this.musicStep++;
    }, 125); // 120 BPM 16th notes
  }

  public stopThrillerMusic() {
    this.musicPlaying = false;
    if (this.musicInterval !== null) {
      clearInterval(this.musicInterval);
      this.musicInterval = null;
    }
  }

  public setMuted(muted: boolean) {
    this.isMuted = muted;
    if (this.motorGain) {
      this.motorGain.gain.setValueAtTime(muted ? 0 : 0.05, this.ctx?.currentTime || 0);
    }
    if (this.thrusterGain) {
      this.thrusterGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    if (this.tireGain) {
      this.tireGain.gain.setValueAtTime(0, this.ctx?.currentTime || 0);
    }
    if (this.musicGain) {
      this.musicGain.gain.setValueAtTime(muted ? 0 : 0.24, this.ctx?.currentTime || 0);
    }
  }

  public toggleMute(): boolean {
    this.setMuted(!this.isMuted);
    return this.isMuted;
  }
}

export const soundEngine = new SoundEngine();
