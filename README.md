<div align="center">

# 🎵 KOMPOSER
### Next-Gen AI K-POP Studio & Musical DNA Synthesis

[![Next.js](https://img.shields.io/badge/Next.js-15.1.7-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Google Gemini](https://img.shields.io/badge/Google%20Gemini-4%20Argon%20%2F%20Lyria-orange?style=flat-square&logo=google)](https://deepmind.google/technologies/gemini/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3.4-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-WAL%20Mode-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)
[![License: MIT](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

**Democratizing high-production K-POP music creation through frontier reasoning, multimodal reference orchestration, real-member vocal allocation, and automated verification loops.**

*100% Solo-Engineered for the Google AI & DeepMind Hackathon*

[✨ Live Demo](#-quick-start) • [📽️ Demo Video](https://www.youtube.com/watch?v=nykei1nmXfk) • [🏗️ Architecture](#-system-architecture) • [🚀 Features](#-key-features)

</div>

---

## 📖 Overview

**Komposer** is an end-to-end, production-ready AI music workstation tailored specifically for the hyper-stylized architecture of modern K-POP. 

While existing generative audio tools (e.g., Suno, Udio) act as monolithic "black boxes" that generate lo-fi audio without structural control, Komposer leverages **Gemini 4 Argon’s 1M context and frontier reasoning** to break song creation down into steerable architectural layers:
- **Cross-Artist Musical DNA Blending:** Micro-timing swing, 16-step polyrhythmic groove matrices, and signature beat-switch modes.
- **Real-Member Vocal Timbre Routing:** Assigning actual idol member personas (lead vocal, high belting, rhythmic rap, sub-vocal, group harmony).
- **Multimodal Reference Ingestion:** YouTube video metadata & audio vibe extraction.
- **Resilient Hybrid Audio Engine:** Combining high-fidelity AI audio generation with an offline-capable client-side Web Audio API DSP polyphonic synthesizer.

---

## ✨ Key Features

- **🎛️ Collaborative Musical DNA Blender**  
  Blend iconic artists (e.g., aespa’s metallic hyperpop × NewJeans’ Y2K 2-step garage) with a granular ratio slider (10% to 90%). The system mathematically interpolates chord progressions, drum velocity grids, and scale degrees.
- **🎤 Real-Member Vocal Persona Routing**  
  Accurately routes parts to real idol group members (e.g., Karina's low-tone rap, Winter's 3-octave high belt, Felix's cavernous sub-bass chant) with bilingual Korean/English lyrics.
- **📻 YouTube Reference Ingestion**  
  Extracts tempo, genre, and production trends directly from YouTube URLs to guide the composition prompt.
- **🎨 Dynamic Generative Album Cover**  
  Procedurally generates theme-adaptive SVG visual art based on artist palettes, concept keywords, and cyber-chrome / Y2K aesthetics.
- **⏱️ Synchronized Interactive Lyrics Player**  
  Real-time word-by-word synced playback with active singer badges, waveform audio visualizers, and vocal isolation modes (*Full Mix / Vocal Boost / Instrumental*).
- **👤 Creator Hub & Social Discovery**  
  Integrated like/play tracking, personal music preference tuning, and instant track sharing.

---

## 🏗️ System Architecture

```mermaid
flowchart TD
    User["User Studio Input\n(Artist DNA, Collab Ratio, YouTube Ref, Mood)"] --> Controller["Next.js Composition Controller\n(/api/compose)"]
    Controller --> Argon["Gemini 4 Argon Reasoning Engine\n(Topliner, Lyricist, Groove Architect)"]
    
    subgraph VerificationLoop ["Gemini Verification & Self-Correction Loop"]
        Argon --> SchemaCheck{"Strict Schema &\nStructure Validation"}
        SchemaCheck -- "Violates Constraints / Missing" --> Correction["Self-Correction Agent\n(Regenerate Pitch Matrices & Roster)"]
        Correction --> SchemaCheck
        SchemaCheck -- "Validated" --> HarmonyCheck{"Harmonic & BPM Integrity Check\n(Rest intervals & scale offsets)"}
        HarmonyCheck -- "Passed" --> ValidPayload["Production-Ready Song Blueprint"]
    end
    
    ValidPayload --> AudioEngine["Hybrid Audio Pipeline"]
    AudioEngine --> Lyria["Google DeepMind Audio Model / Lyria Generation"]
    AudioEngine --> WebAudioDSP["Browser Web Audio API Polyphonic Synthesizer\n(Formant Filters, Detune, Vibrato, Chorus)"]
    
    ValidPayload --> Artwork["Generative SVG Album Art Engine"]
    ValidPayload --> DB[("SQLite Database\n(Audio BLOBs + Metadata)")]
    
    DB --> UI["Interactive Player & Discovery Feed\n(Synced Lyrics, Waveform Visualizer)"]
