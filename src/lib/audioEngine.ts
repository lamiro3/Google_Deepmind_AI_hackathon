import { Track } from "@/types/komposer";

type Listener = () => void;

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

class KomposerAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private volume: number = 0.8;
  private isMuted: boolean = false;
  private isRepeat: boolean = false;

  private timerId: number | null = null;
  private lastTickTime: number = 0;
  private stepAccumulator: number = 0;
  private stepIndex: number = 0;

  private listeners: Set<Listener> = new Set();
  private onTrackEndedCallback: (() => void) | null = null;

  private initContext() {
    if (typeof window === "undefined") return;
    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      this.ctx = new AudioCtx();

      const compressor = this.ctx.createDynamicsCompressor();
      compressor.threshold.value = -16;
      compressor.knee.value = 18;
      compressor.ratio.value = 4;
      compressor.attack.value = 0.005;
      compressor.release.value = 0.18;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.82;

      // Stereo ambience delay for K-POP lead & chords
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.28;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.24;

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = "lowpass";
      delayFilter.frequency.value = 2600;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFeedback.connect(compressor);

      compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emit() {
    this.listeners.forEach((l) => l());
  }

  public setOnTrackEnded(cb: () => void) {
    this.onTrackEndedCallback = cb;
  }

  public loadTrack(track: Track, autoPlay: boolean = true) {
    const isSameTrack = this.currentTrack?.id === track.id;
    this.currentTrack = track;
    if (!isSameTrack) {
      this.currentTime = 0;
      this.stepIndex = 0;
      this.stepAccumulator = 0;
    }
    if (autoPlay) {
      this.play();
    } else {
      this.emit();
    }
  }

  public play() {
    if (!this.currentTrack) return;
    this.initContext();
    if (this.isPlaying) return;

    if (this.currentTime >= this.currentTrack.duration) {
      this.currentTime = 0;
      this.stepIndex = 0;
    }

    this.isPlaying = true;
    this.lastTickTime = performance.now();

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }
    this.timerId = window.setInterval(() => this.tick(), 30);
    this.emit();
  }

  public pause() {
    this.isPlaying = false;
    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
      this.timerId = null;
    }
    this.emit();
  }

  public togglePlay() {
    if (this.isPlaying) {
      this.pause();
    } else {
      this.play();
    }
  }

  public seek(seconds: number) {
    if (!this.currentTrack) return;
    this.currentTime = Math.max(0, Math.min(seconds, this.currentTrack.duration));
    const stepDuration = 60 / this.currentTrack.bpm / 4;
    this.stepIndex = Math.floor(this.currentTime / stepDuration);
    this.stepAccumulator = 0;
    this.emit();
  }

  public setVolume(val: number) {
    this.volume = Math.max(0, Math.min(1, val));
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
    this.emit();
  }

  public toggleMute() {
    this.isMuted = !this.isMuted;
    if (this.masterGain && this.ctx) {
      this.masterGain.gain.setTargetAtTime(
        this.isMuted ? 0 : this.volume,
        this.ctx.currentTime,
        0.02
      );
    }
    this.emit();
  }

  public toggleRepeat() {
    this.isRepeat = !this.isRepeat;
    this.emit();
  }

  public getState() {
    return {
      currentTrack: this.currentTrack,
      isPlaying: this.isPlaying,
      currentTime: this.currentTime,
      duration: this.currentTrack?.duration || 86,
      volume: this.volume,
      isMuted: this.isMuted,
      isRepeat: this.isRepeat,
    };
  }

  public getFrequencyData(): Uint8Array {
    if (!this.analyser || !this.isPlaying) {
      return new Uint8Array(32);
    }
    const data = new Uint8Array(this.analyser.frequencyBinCount);
    this.analyser.getByteFrequencyData(data);
    return data.slice(0, 32);
  }

  private tick() {
    if (!this.isPlaying || !this.currentTrack || !this.ctx) return;
    const now = performance.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    this.currentTime += dt;
    this.stepAccumulator += dt;

    const stepDuration = 60 / this.currentTrack.bpm / 4; // 16th note

    while (this.stepAccumulator >= stepDuration) {
      this.stepAccumulator -= stepDuration;
      this.triggerStep(this.stepIndex, stepDuration);
      this.stepIndex++;
    }

    if (this.currentTime >= this.currentTrack.duration) {
      if (this.isRepeat) {
        this.currentTime = 0;
        this.stepIndex = 0;
      } else {
        this.pause();
        this.currentTime = 0;
        if (this.onTrackEndedCallback) {
          this.onTrackEndedCallback();
        }
      }
    }

    this.emit();
  }

  private getCurrentSection(): string {
    if (!this.currentTrack) return "VERSE 1";
    const lyrics = this.currentTrack.lyrics;
    let active = lyrics[0]?.section || "INTRO";
    for (const line of lyrics) {
      if (this.currentTime >= line.time) {
        active = line.section;
      } else {
        break;
      }
    }
    return active;
  }

  private triggerStep(step: number, stepDuration: number) {
    if (!this.ctx || !this.currentTrack || !this.masterGain) return;

    const now = this.ctx.currentTime + 0.01;
    const dna = this.currentTrack.musicalDna;
    const section = this.getCurrentSection();

    const stepInBar = step % 16;
    const barIndex = Math.floor(step / 16);
    const chordOffsets = dna.chordProgression[barIndex % dna.chordProgression.length] || [0, 3, 7, 10];
    const rootMidi = dna.rootNote + chordOffsets[0];

    const isChorus = section.includes("CHORUS");
    const isIntroOrOutro = section === "INTRO" || section === "OUTRO";
    const isBridge = section === "BRIDGE";

    // Determine active archetype (blend Artist 1 & Artist 2 in Collab tracks)
    const activeArchetype =
      this.currentTrack.isCollab &&
      dna.secondaryArchetype &&
      (section === "PRE-CHORUS" || section === "RAP / VERSE 2" || (isChorus && stepInBar >= 8))
        ? dna.secondaryArchetype
        : dna.synthArchetype;

    // 1. DRUMS
    if (!isIntroOrOutro && !isBridge) {
      this.scheduleDrums(now, stepInBar, activeArchetype, isChorus);
    } else if (isBridge && stepInBar % 4 === 0) {
      this.playHiHat(now, false, 0.08);
    } else if (section === "INTRO" && stepInBar % 2 === 0) {
      this.playHiHat(now, false, 0.09);
    }

    // 2. CHORD PAD / STABS
    if (stepInBar === 0 || (isChorus && stepInBar === 6) || (activeArchetype === "uk_garage" && stepInBar === 10)) {
      const duration = stepInBar === 0 ? stepDuration * (isChorus ? 6 : 14) : stepDuration * 4;
      this.playChord(now, dna.rootNote, chordOffsets, duration, activeArchetype, isChorus);
    }

    // 3. BASSLINE
    if (!isBridge && section !== "OUTRO") {
      this.scheduleBass(now, stepInBar, rootMidi - 24, stepDuration, dna.bassGroove, isChorus);
    }

    // 4. MELODY & VOCAL SYNTH HOOK
    const motif = dna.melodyMotif || [0, 3, 7, 10, 7, 5, 3, 2];
    const shouldPlayMelody =
      isChorus
        ? stepInBar % 2 === 0 || stepInBar === 7 || stepInBar === 15
        : stepInBar % 4 === 0 || stepInBar === 6 || stepInBar === 14;

    if (shouldPlayMelody) {
      const motifIdx = Math.floor(step / 2) % motif.length;
      const semitoneOffset = motif[motifIdx];
      const leadMidi = dna.rootNote + semitoneOffset + (isChorus ? 12 : 0);

      this.playLeadNote(
        now,
        leadMidi,
        stepDuration * (isChorus ? 1.9 : 2.6),
        activeArchetype,
        isChorus
      );

      // If Collab Chorus, play second artist harmony interval (+3 or +4 semitones)
      if (isChorus && this.currentTrack.isCollab && dna.secondaryArchetype) {
        const thirdInterval = dna.scale === "major" ? 4 : 3;
        this.playLeadNote(
          now,
          leadMidi + thirdInterval,
          stepDuration * 1.8,
          dna.secondaryArchetype,
          false,
          0.06
        );
      }
    }
  }

  private scheduleDrums(
    time: number,
    stepInBar: number,
    archetype: string,
    isChorus: boolean
  ) {
    // Kick pattern by K-POP genre archetype
    const isJerseyOrGarage = archetype === "jersey_club" || archetype === "uk_garage";
    const isTrap = archetype === "boom_bap" || archetype === "hyperpop";

    if (isJerseyOrGarage) {
      // Bouncy Jersey Club / UK Garage kick: 0, 4, 8, 11, 14
      if (
        stepInBar === 0 ||
        stepInBar === 4 ||
        stepInBar === 8 ||
        stepInBar === 11 ||
        (isChorus && stepInBar === 14)
      ) {
        this.playKick(time, isChorus ? 0.42 : 0.34);
      }
    } else if (isTrap) {
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || (isChorus && stepInBar === 14)) {
        this.playKick(time, 0.45);
      }
    } else {
      // Four-on-the-floor / Band driving kick
      if (stepInBar % 4 === 0 || (isChorus && stepInBar === 14)) {
        this.playKick(time, 0.38);
      }
    }

    // Snare / Clap on 4 and 12
    if (stepInBar === 4 || stepInBar === 12) {
      this.playSnare(time, isChorus ? 0.26 : 0.19);
    }

    // Hi-hats
    if (stepInBar % 2 === 0 || (isChorus && isTrap)) {
      const isOpen = stepInBar === 2 || stepInBar === 10;
      this.playHiHat(time, isOpen, isChorus ? 0.12 : 0.08);
    }
  }

  private scheduleBass(
    time: number,
    stepInBar: number,
    bassMidi: number,
    stepDuration: number,
    groove: string,
    isChorus: boolean
  ) {
    if (!this.ctx || !this.masterGain) return;

    let trigger = false;
    let noteLen = stepDuration * 1.8;
    let pitchOffset = 0;

    if (groove === "garage_sub" || groove === "bouncy") {
      trigger = stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 10 || stepInBar === 12;
      if (stepInBar === 10) pitchOffset = 7;
    } else if (groove === "sustained_808") {
      trigger = stepInBar === 0 || stepInBar === 6 || stepInBar === 10;
      noteLen = stepDuration * 4.5;
    } else if (groove === "driving_8th") {
      trigger = stepInBar % 2 === 0;
      noteLen = stepDuration * 1.5;
      if (stepInBar === 14) pitchOffset = 12;
    } else {
      // syncopated_slap
      trigger = stepInBar === 0 || stepInBar === 3 || stepInBar === 7 || stepInBar === 8 || stepInBar === 14;
      if (stepInBar === 3 || stepInBar === 14) pitchOffset = 12;
    }

    if (!trigger) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = groove === "sustained_808" ? "triangle" : "sawtooth";
    osc.frequency.setValueAtTime(midiToFreq(bassMidi + pitchOffset), time);

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isChorus ? 520 : 340, time);
    filter.frequency.exponentialRampToValueAtTime(110, time + noteLen);

    const peak = isChorus ? 0.25 : 0.19;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, time + noteLen);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + noteLen + 0.02);
  }

  private playChord(
    time: number,
    rootNote: number,
    offsets: number[],
    duration: number,
    archetype: string,
    isChorus: boolean
  ) {
    if (!this.ctx || !this.masterGain) return;

    offsets.forEach((semi, idx) => {
      if (!this.ctx || !this.masterGain) return;
      const osc = this.ctx.createOscillator();
      const filter = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      if (archetype === "hyperpop" || archetype === "synthwave") {
        osc.type = "sawtooth";
      } else if (archetype === "uk_garage" || archetype === "rnb_ballad") {
        osc.type = "triangle";
      } else {
        osc.type = idx % 2 === 0 ? "triangle" : "sawtooth";
      }

      const freq = midiToFreq(rootNote - 12 + semi);
      osc.frequency.setValueAtTime(freq, time);
      osc.detune.setValueAtTime((idx - 1.5) * 6, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isChorus ? 2200 : 1300, time);

      const level = isChorus ? 0.065 : 0.048;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(level, time + 0.04);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.masterGain);
      if (this.delayNode) {
        gain.connect(this.delayNode);
      }

      osc.start(time);
      osc.stop(time + duration + 0.03);
    });
  }

  private playLeadNote(
    time: number,
    midiNote: number,
    duration: number,
    archetype: string,
    isChorus: boolean,
    customGain?: number
  ) {
    if (!this.ctx || !this.masterGain) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    if (archetype === "hyperpop") {
      osc.type = "sawtooth";
    } else if (archetype === "uk_garage" || archetype === "rnb_ballad") {
      osc.type = "sine";
    } else if (archetype === "rock_band") {
      osc.type = "square";
    } else {
      osc.type = "triangle";
    }

    const targetFreq = midiToFreq(midiNote);
    osc.frequency.setValueAtTime(targetFreq * 0.992, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.035);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isChorus ? 1850 : 1350, time);
    filter.Q.value = 1.6;

    const peak = customGain ?? (isChorus ? 0.12 : 0.085);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);
    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  private playKick(time: number, level: number) {
    if (!this.ctx || !this.masterGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(135, time);
    osc.frequency.exponentialRampToValueAtTime(42, time + 0.11);

    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.masterGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private playSnare(time: number, level: number) {
    if (!this.ctx || !this.masterGain) return;

    // Noise burst
    const bufferSize = this.ctx.sampleRate * 0.14;
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(900, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private playHiHat(time: number, isOpen: boolean, level: number) {
    if (!this.ctx || !this.masterGain) return;

    const dur = isOpen ? 0.16 : 0.045;
    const bufferSize = Math.floor(this.ctx.sampleRate * dur);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(6500, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.masterGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }
}

export const audioEngine = new KomposerAudioEngine();

