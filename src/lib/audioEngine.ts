import { LyricLine, Track } from "@/types/komposer";

type Listener = () => void;
export type VocalMixMode = "full" | "vocal_boost" | "inst";

function midiToFreq(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

interface ArtistVocalDSP {
  baseDetuneCents: number;
  formantFreq: number;
  melodicDepth: number; // 0.0 (rap speech contour) to 1.0 (full melodic singing pitch lock)
  vibratoCents: number;
  doubleWidth: number;
}

const ARTIST_VOCAL_DSP: Record<string, ArtistVocalDSP> = {
  newjeans: {
    baseDetuneCents: 140,
    formantFreq: 2900,
    melodicDepth: 0.78,
    vibratoCents: 14,
    doubleWidth: 16,
  },
  aespa: {
    baseDetuneCents: 90,
    formantFreq: 3200,
    melodicDepth: 0.85,
    vibratoCents: 20,
    doubleWidth: 24,
  },
  day6: {
    baseDetuneCents: -60,
    formantFreq: 2300,
    melodicDepth: 0.9,
    vibratoCents: 24,
    doubleWidth: 18,
  },
  iu: {
    baseDetuneCents: 180,
    formantFreq: 3100,
    melodicDepth: 0.92,
    vibratoCents: 22,
    doubleWidth: 14,
  },
  seventeen: {
    baseDetuneCents: -40,
    formantFreq: 2500,
    melodicDepth: 0.82,
    vibratoCents: 18,
    doubleWidth: 26,
  },
  lesserafim: {
    baseDetuneCents: 60,
    formantFreq: 2750,
    melodicDepth: 0.65,
    vibratoCents: 12,
    doubleWidth: 20,
  },
  straykids: {
    baseDetuneCents: -160,
    formantFreq: 2150,
    melodicDepth: 0.52,
    vibratoCents: 10,
    doubleWidth: 28,
  },
  ive: {
    baseDetuneCents: 130,
    formantFreq: 3000,
    melodicDepth: 0.86,
    vibratoCents: 18,
    doubleWidth: 22,
  },
  bts: {
    baseDetuneCents: -80,
    formantFreq: 2450,
    melodicDepth: 0.8,
    vibratoCents: 18,
    doubleWidth: 24,
  },
  blackpink: {
    baseDetuneCents: 40,
    formantFreq: 2850,
    melodicDepth: 0.72,
    vibratoCents: 15,
    doubleWidth: 25,
  },
  riize: {
    baseDetuneCents: -50,
    formantFreq: 2400,
    melodicDepth: 0.8,
    vibratoCents: 16,
    doubleWidth: 18,
  },
  kiss_of_life: {
    baseDetuneCents: 70,
    formantFreq: 2950,
    melodicDepth: 0.88,
    vibratoCents: 26,
    doubleWidth: 20,
  },
};

class KomposerAudioEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private instGain: GainNode | null = null;
  private vocalBusGain: GainNode | null = null;
  private analyser: AnalyserNode | null = null;
  private delayNode: DelayNode | null = null;
  private delayFeedback: GainNode | null = null;

  private currentTrack: Track | null = null;
  private isPlaying: boolean = false;
  private currentTime: number = 0;
  private volume: number = 0.82;
  private isMuted: boolean = false;
  private isRepeat: boolean = false;
  private vocalMixMode: VocalMixMode = "full";

  private timerId: number | null = null;
  private lastTickTime: number = 0;
  private stepAccumulator: number = 0;
  private stepIndex: number = 0;

  // Vocal synthesis cache & active playback tracking
  private vocalBufferCache: Map<string, AudioBuffer> = new Map();
  private vocalLoadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private activeVocalSources: Set<AudioBufferSourceNode> = new Set();
  private trackAudioBufferCache: Map<string, AudioBuffer> = new Map();
  private trackAudioLoadingPromises: Map<string, Promise<AudioBuffer | null>> = new Map();
  private activeTrackAudioSource: AudioBufferSourceNode | null = null;
  private lastTriggeredLyricIndex: number = -1;
  private vocalReadyCount: number = 0;
  private vocalTotalCount: number = 0;
  private activeVocalArtistId: string = "newjeans";

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
      compressor.threshold.value = -15;
      compressor.knee.value = 16;
      compressor.ratio.value = 4.2;
      compressor.attack.value = 0.004;
      compressor.release.value = 0.16;

      this.masterGain = this.ctx.createGain();
      this.masterGain.gain.value = this.isMuted ? 0 : this.volume;

      this.instGain = this.ctx.createGain();
      this.vocalBusGain = this.ctx.createGain();
      this.applyVocalMixGains();

      this.analyser = this.ctx.createAnalyser();
      this.analyser.fftSize = 128;
      this.analyser.smoothingTimeConstant = 0.8;

      // Stereo ambience delay for K-POP vocals & leads
      this.delayNode = this.ctx.createDelay(1.0);
      this.delayNode.delayTime.value = 0.25;
      this.delayFeedback = this.ctx.createGain();
      this.delayFeedback.gain.value = 0.25;

      const delayFilter = this.ctx.createBiquadFilter();
      delayFilter.type = "lowpass";
      delayFilter.frequency.value = 2800;

      this.delayNode.connect(delayFilter);
      delayFilter.connect(this.delayFeedback);
      this.delayFeedback.connect(this.delayNode);
      this.delayFeedback.connect(compressor);

      this.instGain.connect(compressor);
      this.vocalBusGain.connect(compressor);

      compressor.connect(this.masterGain);
      this.masterGain.connect(this.analyser);
      this.analyser.connect(this.ctx.destination);
    }

    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  private applyVocalMixGains() {
    if (!this.instGain || !this.vocalBusGain || !this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.vocalMixMode === "full") {
      this.instGain.gain.setTargetAtTime(0.85, now, 0.03);
      this.vocalBusGain.gain.setTargetAtTime(1.35, now, 0.03);
    } else if (this.vocalMixMode === "vocal_boost") {
      this.instGain.gain.setTargetAtTime(0.48, now, 0.03);
      this.vocalBusGain.gain.setTargetAtTime(1.65, now, 0.03);
    } else {
      // Instrumental only
      this.instGain.gain.setTargetAtTime(1.0, now, 0.03);
      this.vocalBusGain.gain.setTargetAtTime(0.0, now, 0.03);
    }
  }

  public cycleVocalMixMode() {
    if (this.vocalMixMode === "full") {
      this.vocalMixMode = "vocal_boost";
    } else if (this.vocalMixMode === "vocal_boost") {
      this.vocalMixMode = "inst";
    } else {
      this.vocalMixMode = "full";
    }
    this.applyVocalMixGains();
    this.emit();
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

  private getLineArtistId(track: Track, lineIndex: number, line: LyricLine): string {
    const primary = track.artists[0] || "newjeans";
    const secondary = track.artists[1];
    if (!track.isCollab || !secondary) return primary;

    if (line.section === "PRE-CHORUS" || line.section === "RAP / VERSE 2") {
      return secondary;
    }
    if (line.section === "BRIDGE") {
      return lineIndex % 2 === 0 ? secondary : primary;
    }
    if (line.section.includes("CHORUS")) {
      return lineIndex % 2 === 1 ? secondary : primary;
    }
    return primary;
  }

  private getTrackSectionMelodyArray(track: Track, section: string): number[] {
    const dna = track.musicalDna;
    if (section.includes("CHORUS") && dna.chorusMelody?.length) {
      return dna.chorusMelody;
    }
    if (section === "PRE-CHORUS" && dna.preChorusMelody?.length) {
      return dna.preChorusMelody;
    }
    if (section === "BRIDGE" && dna.bridgeMelody?.length) {
      return dna.bridgeMelody;
    }
    if (dna.verseMelody?.length) {
      return dna.verseMelody;
    }
    return dna.melodyMotif || [0, 3, 7, 10, 7, 5, 3, 2];
  }

  private getTrackSectionMidiNotes(track: Track, section: string): number[] {
    const root = track.musicalDna.rootNote || 64;
    const raw = this.getTrackSectionMelodyArray(track, section).filter((n) => n !== -99);
    const notes = raw.length > 0 ? raw : [0, 3, 5, 7, 5, 3];
    return notes.slice(0, 12).map((semi) => root + semi);
  }

  private getVocalCacheKey(
    artistId: string,
    vocalTag: string,
    section: string,
    bpm: number,
    melodyKey: string,
    text: string
  ): string {
    return `${artistId}|${vocalTag}|${section}|${bpm}|${melodyKey}|${text.trim()}`;
  }

  private async fetchVocalBuffer(
    artistId: string,
    vocalTag: string,
    section: string,
    bpm: number,
    midiNotes: number[],
    text: string
  ): Promise<AudioBuffer | null> {
    if (typeof window === "undefined") return null;
    this.initContext();
    if (!this.ctx) return null;

    const cleanText = text.replace(/\[.*?\]/g, "").trim();
    if (!cleanText) return null;

    const melodyStr = midiNotes.join(",");
    const key = this.getVocalCacheKey(artistId, vocalTag, section, bpm, melodyStr, cleanText);
    const cached = this.vocalBufferCache.get(key);
    if (cached) return cached;

    const existingPromise = this.vocalLoadingPromises.get(key);
    if (existingPromise) return existingPromise;

    const promise = (async () => {
      try {
        const storedApiKey =
          typeof window !== "undefined"
            ? window.localStorage.getItem("komposer_gemini_api_key") || ""
            : "";
        const params = new URLSearchParams({
          text: cleanText,
          artistId,
          vocal: vocalTag,
          section,
          bpm: String(bpm),
          melody: melodyStr,
        });
        if (storedApiKey.trim()) {
          params.set("apiKey", storedApiKey.trim());
        }
        const res = await fetch(`/api/vocal?${params.toString()}`);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(arrayBuf.slice(0));
        this.vocalBufferCache.set(key, decoded);
        return decoded;
      } catch {
        return null;
      } finally {
        this.vocalLoadingPromises.delete(key);
      }
    })();

    this.vocalLoadingPromises.set(key, promise);
    return promise;
  }

  public async fetchTrackAudioBuffer(track: Track): Promise<AudioBuffer | null> {
    if (!track.audioUrl || typeof window === "undefined") return null;
    this.initContext();
    if (!this.ctx) return null;

    const cached = this.trackAudioBufferCache.get(track.id);
    if (cached) return cached;

    const existing = this.trackAudioLoadingPromises.get(track.id);
    if (existing) return existing;

    const promise = (async () => {
      try {
        const res = await fetch(track.audioUrl!);
        if (!res.ok) return null;
        const arrayBuf = await res.arrayBuffer();
        if (!this.ctx) return null;
        const decoded = await this.ctx.decodeAudioData(arrayBuf.slice(0));
        this.trackAudioBufferCache.set(track.id, decoded);
        if (decoded.duration > 5) {
          track.duration = Math.round(decoded.duration);
        }
        this.vocalTotalCount = track.lyrics.length || 8;
        this.vocalReadyCount = this.vocalTotalCount;
        this.emit();
        return decoded;
      } catch (err) {
        console.warn("Failed to decode DB track audio:", err);
        return null;
      } finally {
        this.trackAudioLoadingPromises.delete(track.id);
      }
    })();

    this.trackAudioLoadingPromises.set(track.id, promise);
    return promise;
  }

  private stopTrackAudioSource() {
    if (this.activeTrackAudioSource) {
      try {
        this.activeTrackAudioSource.onended = null;
        this.activeTrackAudioSource.stop();
        this.activeTrackAudioSource.disconnect();
      } catch {
        // ignore already stopped
      }
      this.activeTrackAudioSource = null;
    }
  }

  private async startTrackAudioPlayback(track: Track, offsetSeconds: number = 0) {
    this.stopTrackAudioSource();
    const buffer = await this.fetchTrackAudioBuffer(track);
    if (!buffer || !this.isPlaying || this.currentTrack?.id !== track.id || !this.ctx || !this.masterGain) {
      return;
    }
    this.stopTrackAudioSource();
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.connect(this.masterGain);
    const safeOffset = Math.max(0, Math.min(offsetSeconds, Math.max(0, buffer.duration - 0.05)));
    this.activeTrackAudioSource = src;
    src.start(0, safeOffset);
  }

  /**
   * Public pre-rendering method used by ComposeStudioModal so newly composed tracks
   * load their DB-stored Google Gemini (Lyria) audio stream or synthesize vocal stems.
   */
  public async preloadTrackVocalsWithProgress(
    track: Track,
    onProgress?: (ready: number, total: number, vocalMember: string, section: string) => void
  ): Promise<void> {
    if (typeof window === "undefined") return;
    this.initContext();
    const total = track.lyrics.length || 8;
    this.vocalTotalCount = total;

    if (track.audioUrl) {
      onProgress?.(Math.max(1, Math.floor(total / 2)), total, "Google Gemini (Lyria)", "DB AUDIO STREAM");
      await this.fetchTrackAudioBuffer(track);
      this.vocalReadyCount = total;
      onProgress?.(total, total, "Google Gemini (Lyria)", "COMPLETE");
      this.emit();
      return;
    }

    this.vocalReadyCount = 0;
    this.emit();

    for (let i = 0; i < total; i++) {
      const line = track.lyrics[i];
      if (i === 0) line.time = 0;
      const artistId = this.getLineArtistId(track, i, line);
      const midiNotes = this.getTrackSectionMidiNotes(track, line.section);
      onProgress?.(i + 1, total, line.vocal, line.section);

      const buf = await this.fetchVocalBuffer(
        artistId,
        line.vocal,
        line.section,
        track.bpm,
        midiNotes,
        line.line
      );

      if (buf && buf.duration > 1.2) {
        if (i + 1 < track.lyrics.length) {
          track.lyrics[i + 1].time = Number((line.time + buf.duration + 0.35).toFixed(1));
        } else {
          track.duration = Math.max(32, Math.ceil(line.time + buf.duration + 1.6));
        }
      }

      this.vocalReadyCount = i + 1;
      this.emit();
    }
  }

  private async preloadTrackVocals(track: Track) {
    if (typeof window === "undefined") return;
    if (track.audioUrl) {
      this.vocalTotalCount = track.lyrics.length || 8;
      this.vocalReadyCount = this.vocalTotalCount;
      this.emit();
      await this.fetchTrackAudioBuffer(track);
      return;
    }

    this.vocalTotalCount = track.lyrics.length;
    this.vocalReadyCount = 0;
    this.emit();

    for (let i = 0; i < track.lyrics.length; i++) {
      if (this.currentTrack?.id !== track.id) return;
      const line = track.lyrics[i];
      if (i === 0) line.time = 0;
      const artistId = this.getLineArtistId(track, i, line);
      const midiNotes = this.getTrackSectionMidiNotes(track, line.section);

      const buf = await this.fetchVocalBuffer(
        artistId,
        line.vocal,
        line.section,
        track.bpm,
        midiNotes,
        line.line
      );

      if (buf && buf.duration > 1.2) {
        if (i + 1 < track.lyrics.length) {
          track.lyrics[i + 1].time = Number((line.time + buf.duration + 0.35).toFixed(1));
        } else {
          track.duration = Math.max(32, Math.ceil(line.time + buf.duration + 1.6));
        }
      }

      this.vocalReadyCount = i + 1;
      this.emit();

      // If user is already playing and we just decoded the currently active lyric line, trigger it!
      if (
        this.isPlaying &&
        this.currentTrack?.id === track.id &&
        this.getActiveLyricIndex() === i &&
        this.lastTriggeredLyricIndex !== i
      ) {
        const offset = Math.max(0, this.currentTime - line.time);
        if (offset < 2.2) {
          this.lastTriggeredLyricIndex = i;
          this.triggerVocalForLine(i, offset);
        }
      }
    }
  }

  private stopActiveVocals() {
    this.stopTrackAudioSource();
    this.activeVocalSources.forEach((src) => {
      try {
        src.stop();
        src.disconnect();
      } catch {
        // ignore already stopped
      }
    });
    this.activeVocalSources.clear();
  }

  public loadTrack(track: Track, autoPlay: boolean = true) {
    const isSameTrack = this.currentTrack?.id === track.id;
    this.currentTrack = track;
    if (!isSameTrack) {
      this.stopActiveVocals();
      this.currentTime = 0;
      this.stepIndex = 0;
      this.stepAccumulator = 0;
      this.lastTriggeredLyricIndex = -1;
      this.activeVocalArtistId = track.artists[0] || "newjeans";
      this.preloadTrackVocals(track);
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
      this.lastTriggeredLyricIndex = -1;
    }

    this.isPlaying = true;
    this.lastTickTime = performance.now();

    if (this.currentTrack.audioUrl) {
      this.startTrackAudioPlayback(this.currentTrack, this.currentTime);
    } else {
      if (this.vocalTotalCount === 0) {
        this.preloadTrackVocals(this.currentTrack);
      }

      // Trigger current lyric line if starting mid-line
      const activeIdx = this.getActiveLyricIndex();
      if (activeIdx >= 0 && activeIdx !== this.lastTriggeredLyricIndex) {
        const line = this.currentTrack.lyrics[activeIdx];
        const offset = Math.max(0, this.currentTime - line.time);
        if (offset < 3.5) {
          this.lastTriggeredLyricIndex = activeIdx;
          this.triggerVocalForLine(activeIdx, offset);
        }
      }
    }

    if (this.timerId !== null) {
      window.clearInterval(this.timerId);
    }
    this.timerId = window.setInterval(() => this.tick(), 25);
    this.emit();
  }

  public pause() {
    this.isPlaying = false;
    this.stopActiveVocals();
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
    this.stopActiveVocals();
    this.currentTime = Math.max(0, Math.min(seconds, this.currentTrack.duration));
    const stepDuration = 60 / this.currentTrack.bpm / 4;
    this.stepIndex = Math.floor(this.currentTime / stepDuration);
    this.stepAccumulator = 0;
    this.lastTriggeredLyricIndex = -1;

    if (this.isPlaying) {
      if (this.currentTrack.audioUrl) {
        this.startTrackAudioPlayback(this.currentTrack, this.currentTime);
      } else {
        const activeIdx = this.getActiveLyricIndex();
        if (activeIdx >= 0) {
          const line = this.currentTrack.lyrics[activeIdx];
          const offset = Math.max(0, this.currentTime - line.time);
          this.lastTriggeredLyricIndex = activeIdx;
          this.triggerVocalForLine(activeIdx, offset);
        }
      }
    }
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
      vocalMixMode: this.vocalMixMode,
      vocalReadyCount: this.vocalReadyCount,
      vocalTotalCount: this.vocalTotalCount,
      activeVocalArtistId: this.activeVocalArtistId,
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

  private getActiveLyricIndex(): number {
    if (!this.currentTrack || !this.currentTrack.lyrics.length) return -1;
    let idx = 0;
    for (let i = 0; i < this.currentTrack.lyrics.length; i++) {
      if (this.currentTime >= this.currentTrack.lyrics[i].time) {
        idx = i;
      } else {
        break;
      }
    }
    return idx;
  }

  private getSectionMelodyArray(section: string): number[] {
    if (!this.currentTrack) return [0, 3, 7, 10, 7, 5, 3, 2];
    return this.getTrackSectionMelodyArray(this.currentTrack, section);
  }

  /**
   * Triggers the TD-PSOLA pitch-synthesized K-POP member vocal for the given lyric line,
   * locked to the exact MIDI melody notes of the section.
   */
  private async triggerVocalForLine(lyricIndex: number, offsetSeconds: number = 0) {
    if (!this.currentTrack || !this.ctx || !this.vocalBusGain) return;
    const track = this.currentTrack;
    const line = track.lyrics[lyricIndex];
    if (!line) return;

    const nextLineTime = track.lyrics[lyricIndex + 1]?.time ?? track.duration;
    const slotDuration = Math.max(2.5, nextLineTime - line.time);

    const artistId = this.getLineArtistId(track, lyricIndex, line);
    this.activeVocalArtistId = artistId;
    const midiNotes = this.getTrackSectionMidiNotes(track, line.section);

    const buffer = await this.fetchVocalBuffer(
      artistId,
      line.vocal,
      line.section,
      track.bpm,
      midiNotes,
      line.line
    );
    if (!buffer || !this.isPlaying || this.currentTrack?.id !== track.id) return;

    const isChorus = line.section.includes("CHORUS");
    const isRap = line.section.includes("RAP");
    const sectionMelody = this.getSectionMelodyArray(line.section).filter((n) => n !== -99);

    // Stop any previous vocal source before starting the new line so two vocals never overlap
    this.stopActiveVocals();

    // Play primary member pitch-locked lead vocal (single clean vocal per part)
    this.playProcessedVocalBuffer(
      buffer,
      artistId,
      sectionMelody,
      slotDuration,
      offsetSeconds,
      isChorus ? 1.12 : 1.0,
      0,
      isRap
    );

    // Play subtle Formant Synth Vocal Harmonizer locked to the vocal phrasing
    if (offsetSeconds < 0.4) {
      this.scheduleVocalFormantHarmony(line.section, sectionMelody, Math.min(buffer.duration, slotDuration));
    }
  }

  private playProcessedVocalBuffer(
    buffer: AudioBuffer,
    artistId: string,
    _melodySemitones: number[],
    slotDuration: number,
    offsetSeconds: number,
    gainLevel: number,
    extraHarmonicCents: number = 0,
    isRap: boolean = false,
    delayStartSeconds: number = 0
  ) {
    if (!this.ctx || !this.vocalBusGain || !this.currentTrack) return;
    if (offsetSeconds >= buffer.duration) return;

    const dsp = ARTIST_VOCAL_DSP[artistId] || ARTIST_VOCAL_DSP.newjeans;
    const startTime = this.ctx.currentTime + 0.015 + delayStartSeconds;

    // Keep playbackRate = 1.0 unless the buffer overflows the entire lyric slot,
    // because TD-PSOLA on /api/vocal has already locked F0 to the exact MIDI notes!
    const maxSlot = Math.max(3.5, slotDuration * 0.94);
    const playbackRate = buffer.duration > maxSlot ? Math.min(1.18, buffer.duration / maxSlot) : 1.0;
    const effectiveDuration = (buffer.duration - offsetSeconds) / playbackRate;

    const source = this.ctx.createBufferSource();
    source.buffer = buffer;
    source.playbackRate.setValueAtTime(playbackRate, startTime);
    if (extraHarmonicCents !== 0) {
      source.detune.setValueAtTime(extraHarmonicCents, startTime);
    }

    // Subtle studio vocal presence & air chain
    const hpFilter = this.ctx.createBiquadFilter();
    hpFilter.type = "highpass";
    hpFilter.frequency.setValueAtTime(135, startTime);

    const formantFilter = this.ctx.createBiquadFilter();
    formantFilter.type = "peaking";
    formantFilter.frequency.setValueAtTime(dsp.formantFreq, startTime);
    formantFilter.Q.value = 1.2;
    formantFilter.gain.value = 3.2;

    const leadGain = this.ctx.createGain();
    leadGain.gain.setValueAtTime(0.01, startTime);
    leadGain.gain.linearRampToValueAtTime(gainLevel, startTime + 0.035);
    leadGain.gain.setValueAtTime(gainLevel, startTime + Math.max(0.05, effectiveDuration - 0.12));
    leadGain.gain.linearRampToValueAtTime(0.001, startTime + effectiveDuration);

    source.connect(hpFilter);
    hpFilter.connect(formantFilter);
    formantFilter.connect(leadGain);
    leadGain.connect(this.vocalBusGain);

    if (this.delayNode) {
      const vocalSend = this.ctx.createGain();
      vocalSend.gain.value = isRap ? 0.12 : 0.24;
      leadGain.connect(vocalSend);
      vocalSend.connect(this.delayNode);
    }

    this.activeVocalSources.add(source);
    source.onended = () => {
      this.activeVocalSources.delete(source);
    };

    source.start(startTime, offsetSeconds);
  }

  /**
   * Subtle pitch-locked formant synth that doubles the vocal melody contour
   * so the spoken/sung vocal blends seamlessly into the musical key of the track.
   */
  private scheduleVocalFormantHarmony(section: string, melodyNotes: number[], duration: number) {
    if (!this.ctx || !this.vocalBusGain || !this.currentTrack) return;
    const dna = this.currentTrack.musicalDna;
    const stepDuration = 60 / this.currentTrack.bpm / 2; // 8th note vocal phrasing
    const steps = Math.min(10, Math.floor(duration / stepDuration));
    const isChorus = section.includes("CHORUS");

    for (let i = 0; i < steps; i++) {
      const noteOffset = melodyNotes[i % melodyNotes.length];
      if (noteOffset === undefined || noteOffset === -99) continue;

      const t = this.ctx.currentTime + 0.02 + i * stepDuration;
      const midi = dna.rootNote + noteOffset + (isChorus ? 12 : 0);
      const freq = midiToFreq(midi);

      const osc = this.ctx.createOscillator();
      const formant1 = this.ctx.createBiquadFilter();
      const gain = this.ctx.createGain();

      osc.type = "sawtooth";
      osc.frequency.setValueAtTime(freq * 0.995, t);
      osc.frequency.exponentialRampToValueAtTime(freq, t + 0.03);

      // Vowel 'Ah/Eh' formant filter
      formant1.type = "bandpass";
      formant1.frequency.setValueAtTime(isChorus ? 1150 : 920, t);
      formant1.Q.value = 3.2;

      const level = isChorus ? 0.075 : 0.05;
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(level, t + 0.025);
      gain.gain.exponentialRampToValueAtTime(0.001, t + stepDuration * 0.92);

      osc.connect(formant1);
      formant1.connect(gain);
      gain.connect(this.vocalBusGain);

      osc.start(t);
      osc.stop(t + stepDuration);
    }
  }

  private tick() {
    if (!this.isPlaying || !this.currentTrack || !this.ctx) return;
    const now = performance.now();
    const dt = (now - this.lastTickTime) / 1000;
    this.lastTickTime = now;

    this.currentTime += dt;
    this.stepAccumulator += dt;

    const activeLyricIdx = this.getActiveLyricIndex();

    if (this.currentTrack.audioUrl) {
      // Playing complete Google Gemini (Lyria) audio stream from DB: only update active artist badge
      if (activeLyricIdx >= 0 && activeLyricIdx !== this.lastTriggeredLyricIndex) {
        this.lastTriggeredLyricIndex = activeLyricIdx;
        const line = this.currentTrack.lyrics[activeLyricIdx];
        if (line) {
          this.activeVocalArtistId = this.getLineArtistId(this.currentTrack, activeLyricIdx, line);
        }
      }
    } else {
      // Legacy procedural playback fallback
      if (activeLyricIdx >= 0 && activeLyricIdx !== this.lastTriggeredLyricIndex) {
        this.lastTriggeredLyricIndex = activeLyricIdx;
        const line = this.currentTrack.lyrics[activeLyricIdx];
        const offset = Math.max(0, this.currentTime - line.time);
        if (offset < 1.5) {
          this.triggerVocalForLine(activeLyricIdx, offset);
        }
      }

      const stepDuration = 60 / this.currentTrack.bpm / 4; // 16th note

      while (this.stepAccumulator >= stepDuration) {
        this.stepAccumulator -= stepDuration;
        this.triggerStep(this.stepIndex, stepDuration);
        this.stepIndex++;
      }
    }

    if (this.currentTime >= this.currentTrack.duration) {
      if (this.isRepeat) {
        this.stopActiveVocals();
        this.currentTime = 0;
        this.stepIndex = 0;
        this.lastTriggeredLyricIndex = -1;
        if (this.currentTrack.audioUrl) {
          this.startTrackAudioPlayback(this.currentTrack, 0);
        }
      } else {
        this.pause();
        this.currentTime = 0;
        this.lastTriggeredLyricIndex = -1;
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
    if (!this.ctx || !this.currentTrack || !this.instGain) return;

    const dna = this.currentTrack.musicalDna;
    const section = this.getCurrentSection();

    const stepInBar = step % 16;
    const barIndex = Math.floor(step / 16);
    const isFourthBarFill = barIndex % 4 === 3;

    // Apply artist-specific swing micro-timing on odd 16th notes!
    const swingRatio = dna.swingAmount ?? 0.08;
    const swingDelay = stepInBar % 2 === 1 ? stepDuration * swingRatio : 0;
    const now = this.ctx.currentTime + 0.01 + swingDelay;

    const chordOffsets =
      dna.chordProgression[barIndex % dna.chordProgression.length] || [0, 3, 7, 10];
    const rootMidi = dna.rootNote + chordOffsets[0];

    const isChorus = section.includes("CHORUS");
    const isPreChorus = section === "PRE-CHORUS";
    const isRap = section.includes("RAP");
    const isIntroOrOutro = section === "INTRO" || section === "OUTRO";
    const isBridge = section === "BRIDGE";

    // Determine active archetype (blend Artist 1 & Artist 2 in Collab tracks)
    const activeArchetype =
      this.currentTrack.isCollab &&
      dna.secondaryArchetype &&
      (isPreChorus || isRap || (isChorus && stepInBar >= 8))
        ? dna.secondaryArchetype
        : dna.synthArchetype;

    // 1. IRREGULAR ARTIST-SPECIFIC DRUMS & BEAT SWITCHES
    if (!isIntroOrOutro && !isBridge) {
      this.scheduleIrregularDrums(
        now,
        stepInBar,
        stepDuration,
        activeArchetype,
        section,
        isChorus,
        isFourthBarFill
      );
    } else if (isBridge) {
      // Atmospheric rimshot / shaker on irregular steps in Bridge
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 12 || (isFourthBarFill && stepInBar >= 12)) {
        this.playHiHat(now, stepInBar === 12, 0.09);
      }
    } else if (section === "INTRO") {
      if (stepInBar === 0 || stepInBar === 3 || stepInBar === 6 || stepInBar === 10 || stepInBar === 12) {
        this.playHiHat(now, stepInBar === 10, 0.09);
      }
    }

    // 2. RHYTHMIC CHORD STABS / PADS (Varied per artist archetype)
    const chordTrigger =
      activeArchetype === "uk_garage" || activeArchetype === "jersey_club"
        ? stepInBar === 0 || stepInBar === 3 || stepInBar === 7 || stepInBar === 10 || stepInBar === 14
        : activeArchetype === "hyperpop" || activeArchetype === "boom_bap"
          ? stepInBar === 0 || stepInBar === 6 || (isChorus && stepInBar === 12)
          : stepInBar === 0 || (isChorus && stepInBar === 8);

    if (chordTrigger) {
      const stabDuration =
        activeArchetype === "uk_garage" || activeArchetype === "jersey_club"
          ? stepDuration * 2.4
          : stepInBar === 0
            ? stepDuration * (isChorus ? 7 : 12)
            : stepDuration * 4.5;
      this.playChord(now, dna.rootNote, chordOffsets, stabDuration, activeArchetype, isChorus);
    }

    // 3. IRREGULAR BASSLINE & 808 GLIDES
    if (!isBridge && section !== "OUTRO") {
      this.scheduleBass(
        now,
        stepInBar,
        rootMidi - 24,
        stepDuration,
        dna.bassGroove,
        isChorus,
        dna.beatSwitchMode === "halftime_verse2" || dna.beatSwitchMode === "hyper_drop"
      );
    }

    // 4. DIVERSE SECTION-BY-SECTION MELODY & COUNTER-MELODY
    const sectionMelody = this.getSectionMelodyArray(section);
    const noteSemitone = sectionMelody[stepInBar % sectionMelody.length];

    if (noteSemitone !== undefined && noteSemitone !== -99) {
      // Look ahead to see if next step is a rest (-99) to vary note sustain length naturally
      const nextStepNote = sectionMelody[(stepInBar + 1) % sectionMelody.length];
      const sustainMultiplier = nextStepNote === -99 ? (isChorus ? 2.1 : 2.5) : 1.15;

      // Octave shift by section for dynamic contrast
      const octaveShift = isChorus ? 12 : isBridge ? 12 : isPreChorus ? 0 : 0;
      const leadMidi = dna.rootNote + noteSemitone + octaveShift;

      // Previous note for pitch glide / portamento
      const prevSemitone = sectionMelody[(stepInBar + 15) % sectionMelody.length];
      const prevMidi =
        prevSemitone !== undefined && prevSemitone !== -99
          ? dna.rootNote + prevSemitone + octaveShift
          : undefined;

      this.playLeadNote(
        now,
        leadMidi,
        stepDuration * sustainMultiplier,
        activeArchetype,
        isChorus,
        undefined,
        prevMidi
      );

      // If Collab Chorus or Pre-Chorus, layer partner artist counter-melody harmony
      if ((isChorus || isPreChorus) && this.currentTrack.isCollab && dna.secondaryArchetype) {
        const thirdInterval = dna.scale === "major" ? 4 : 3;
        const fifthInterval = 7;
        const harmonyOffset = stepInBar % 4 === 0 ? fifthInterval : thirdInterval;
        this.playLeadNote(
          now,
          leadMidi + harmonyOffset,
          stepDuration * 1.4,
          dna.secondaryArchetype,
          false,
          0.055
        );
      }
    }
  }

  private scheduleIrregularDrums(
    time: number,
    stepInBar: number,
    stepDuration: number,
    archetype: string,
    section: string,
    isChorus: boolean,
    isFourthBarFill: boolean
  ) {
    if (!this.currentTrack) return;
    const dna = this.currentTrack.musicalDna;

    // Beat Switch Mode handling (e.g., aespa hyper-drop half-time or Stray Kids/BLACKPINK halftime switch)
    const isHalfTimeSwitch =
      (dna.beatSwitchMode === "hyper_drop" || dna.beatSwitchMode === "halftime_verse2") &&
      section.includes("RAP");
    const isBreakdownSwitch =
      dna.beatSwitchMode === "breakbeat_chorus" && (section === "PRE-CHORUS" || isChorus);

    // End-of-4-bar Drum Fill (steps 12..15 of every 4th bar)
    if (isFourthBarFill && stepInBar >= 12) {
      if (dna.beatSwitchMode === "band_buildup" || archetype === "rock_band") {
        // Live band tom & snare roll fill
        this.playTomFill(time, stepInBar - 12, 0.34);
        this.playSnare(time, 0.24);
        return;
      } else if (stepInBar === 13 || stepInBar === 14 || stepInBar === 15) {
        // Syncopated K-POP stutter snare/kick fill before drop
        this.playSnare(time, 0.2 + (stepInBar - 12) * 0.04);
        if (stepInBar === 15) this.playKick(time, 0.42);
        return;
      }
    }

    // 1. KICK PATTERN (16-step artist signature pattern)
    if (dna.kickPattern && dna.kickPattern.length === 16) {
      let kickVal = dna.kickPattern[stepInBar];
      if (isHalfTimeSwitch) {
        // Half-time heavy stomping kick on 0, 7, 10
        kickVal = stepInBar === 0 || stepInBar === 7 || stepInBar === 10 ? 1 : 0;
      } else if (isBreakdownSwitch) {
        // Syncopated Jersey/Mixxpop bounce
        kickVal =
          stepInBar === 0 || stepInBar === 4 || stepInBar === 8 || stepInBar === 11 || stepInBar === 14
            ? 1
            : 0;
      }

      if (kickVal > 0) {
        this.playKick(time, (isChorus ? 0.44 : 0.36) * kickVal);
      }
    } else {
      if (stepInBar === 0 || stepInBar === 6 || stepInBar === 10) {
        this.playKick(time, 0.38);
      }
    }

    // 2. SNARE & GHOST-NOTE PATTERN
    if (dna.snarePattern && dna.snarePattern.length === 16) {
      let snareVal = dna.snarePattern[stepInBar];
      if (isHalfTimeSwitch) {
        // Half-time snare on beat 3 (step 8) + ghost note on 15
        snareVal = stepInBar === 8 ? 1 : stepInBar === 15 ? 0.5 : 0;
      }
      if (snareVal > 0) {
        // snareVal === 0.5 plays a subtle ghost snare/rimshot!
        const level = snareVal < 1 ? 0.11 : isChorus ? 0.28 : 0.21;
        this.playSnare(time, level);
      }
    } else if (stepInBar === 4 || stepInBar === 12) {
      this.playSnare(time, isChorus ? 0.26 : 0.19);
    }

    // 3. HI-HAT PATTERN (including 32nd-note trap rolls when value === 2!)
    if (dna.hiHatPattern && dna.hiHatPattern.length === 16) {
      const hhVal = dna.hiHatPattern[stepInBar];
      if (hhVal === 2) {
        // Rapid 32nd-note / triplet trap hi-hat roll!
        this.playHiHat(time, false, 0.13);
        this.playHiHat(time + stepDuration * 0.5, false, 0.1);
      } else if (hhVal > 0) {
        const isOpen = stepInBar === 2 || stepInBar === 10 || stepInBar === 14;
        this.playHiHat(time, isOpen, (isChorus ? 0.13 : 0.09) * hhVal);
      }
    } else if (stepInBar % 2 === 0) {
      this.playHiHat(time, stepInBar === 10, 0.09);
    }
  }

  private playTomFill(time: number, fillStep: number, level: number) {
    if (!this.ctx || !this.instGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    // Descending tom pitches across steps 12, 13, 14, 15
    const startFreq = [190, 160, 130, 105][fillStep % 4] || 140;
    osc.type = "triangle";
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.55, time + 0.14);

    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.16);

    osc.connect(gain);
    gain.connect(this.instGain);
    osc.start(time);
    osc.stop(time + 0.17);
  }

  private scheduleBass(
    time: number,
    stepInBar: number,
    bassMidi: number,
    stepDuration: number,
    groove: string,
    isChorus: boolean,
    has808Glide: boolean = false
  ) {
    if (!this.ctx || !this.instGain || !this.currentTrack) return;

    const kickPattern = this.currentTrack.musicalDna.kickPattern;
    let trigger = false;
    let noteLen = stepDuration * 1.8;
    let pitchOffset = 0;

    if (groove === "garage_sub" || groove === "bouncy") {
      trigger =
        stepInBar === 0 ||
        stepInBar === 3 ||
        stepInBar === 7 ||
        stepInBar === 10 ||
        stepInBar === 14;
      if (stepInBar === 7) pitchOffset = 7;
      if (stepInBar === 14) pitchOffset = 12;
    } else if (groove === "sustained_808") {
      trigger = stepInBar === 0 || stepInBar === 6 || stepInBar === 10 || stepInBar === 14;
      noteLen = stepInBar === 14 ? stepDuration * 1.8 : stepDuration * 3.8;
      if (stepInBar === 14) pitchOffset = 12;
    } else if (groove === "driving_8th") {
      trigger = stepInBar % 2 === 0 || stepInBar === 15;
      noteLen = stepDuration * 1.45;
      if (stepInBar === 6) pitchOffset = 7;
      if (stepInBar === 14 || stepInBar === 15) pitchOffset = 12;
    } else {
      // syncopated_slap or lock to irregular kick pattern
      trigger =
        kickPattern?.[stepInBar]
          ? kickPattern[stepInBar] > 0
          : stepInBar === 0 || stepInBar === 3 || stepInBar === 7 || stepInBar === 10 || stepInBar === 14;
      if (stepInBar === 3 || stepInBar === 11) pitchOffset = 7;
      if (stepInBar === 14) pitchOffset = 12;
    }

    if (!trigger) return;

    const osc = this.ctx.createOscillator();
    const filter = this.ctx.createBiquadFilter();
    const gain = this.ctx.createGain();

    osc.type = groove === "sustained_808" ? "triangle" : "sawtooth";
    const targetFreq = midiToFreq(bassMidi + pitchOffset);

    if (has808Glide && (stepInBar === 10 || stepInBar === 14)) {
      // Signature 808 upward/downward pitch slide
      osc.frequency.setValueAtTime(targetFreq * 1.35, time);
      osc.frequency.exponentialRampToValueAtTime(targetFreq, time + stepDuration * 1.2);
    } else {
      osc.frequency.setValueAtTime(targetFreq, time);
    }

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(isChorus ? 560 : 360, time);
    filter.frequency.exponentialRampToValueAtTime(115, time + noteLen);

    const peak = isChorus ? 0.25 : 0.19;
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.014);
    gain.gain.exponentialRampToValueAtTime(0.001, time + noteLen);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instGain);

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
    if (!this.ctx || !this.instGain) return;

    offsets.forEach((semi, idx) => {
      if (!this.ctx || !this.instGain) return;
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
      osc.detune.setValueAtTime((idx - 1.5) * 7, time);

      filter.type = "lowpass";
      filter.frequency.setValueAtTime(isChorus ? 2100 : 1250, time);

      const level = isChorus ? 0.055 : 0.042;
      gain.gain.setValueAtTime(0.001, time);
      gain.gain.linearRampToValueAtTime(level, time + 0.035);
      gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(this.instGain);
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
    customGain?: number,
    glideFromMidi?: number
  ) {
    if (!this.ctx || !this.instGain) return;

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
    const startFreq = glideFromMidi ? midiToFreq(glideFromMidi) : targetFreq * 0.992;
    osc.frequency.setValueAtTime(startFreq, time);
    osc.frequency.exponentialRampToValueAtTime(targetFreq, time + 0.04);

    filter.type = "bandpass";
    filter.frequency.setValueAtTime(isChorus ? 1950 : 1400, time);
    filter.Q.value = 1.5;

    const peak = customGain ?? (isChorus ? 0.105 : 0.075);
    gain.gain.setValueAtTime(0.001, time);
    gain.gain.linearRampToValueAtTime(peak, time + 0.018);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration);

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(this.instGain);
    if (this.delayNode) {
      gain.connect(this.delayNode);
    }

    osc.start(time);
    osc.stop(time + duration + 0.03);
  }

  private playKick(time: number, level: number) {
    if (!this.ctx || !this.instGain) return;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();

    osc.type = "sine";
    osc.frequency.setValueAtTime(142, time);
    osc.frequency.exponentialRampToValueAtTime(40, time + 0.11);

    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.22);

    osc.connect(gain);
    gain.connect(this.instGain);

    osc.start(time);
    osc.stop(time + 0.24);
  }

  private playSnare(time: number, level: number) {
    if (!this.ctx || !this.instGain) return;

    const bufferSize = Math.floor(this.ctx.sampleRate * 0.14);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
      data[i] = Math.random() * 2 - 1;
    }

    const noise = this.ctx.createBufferSource();
    noise.buffer = buffer;

    const filter = this.ctx.createBiquadFilter();
    filter.type = "highpass";
    filter.frequency.setValueAtTime(850, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + 0.14);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.instGain);

    noise.start(time);
    noise.stop(time + 0.15);
  }

  private playHiHat(time: number, isOpen: boolean, level: number) {
    if (!this.ctx || !this.instGain) return;

    const dur = isOpen ? 0.16 : 0.042;
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
    filter.frequency.setValueAtTime(6600, time);

    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(level, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + dur);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.instGain);

    noise.start(time);
    noise.stop(time + dur + 0.01);
  }
}

export const audioEngine = new KomposerAudioEngine();
