# ⚡ XpressLingua

> **v0.4.0** | **Tech stack:** Expo SDK 57 (React Native 0.86 + TypeScript) · ts-fsrs · open-source TTS (Piper local / MeloTTS + Qwen3-TTS via Colab) · expo-speech fallback · expo-linear-gradient · sql.js + fflate (Anki import) · Google Fonts (Baloo 2, Instrument Sans, Space Grotesk, Noto Sans SC) · AsyncStorage + IndexedDB · web-first, app stores via EAS

Speak first. A speaking/listening-first language app — you cannot pass a card without opening your mouth.

**Design:** "Neon Court" — dark-first playful-premium: violet-tinted near-black, violet→cyan gradients, light flashcards that pop, chunky pressed-edge buttons, tiered celebrations (card flip, XP pops, confetti), reduce-motion respected.

## What it does (v0.4.0)

- 🀄 **HSK Ladder (1–4)** — 1,156 HSK-aligned words as a second built-in deck, frequency-sorted within each level, sequential level unlocking (finish HSK 1 to open HSK 2), full audio
- 🔊 **1,322 pre-rendered audio clips** — every phrase, sentence, and HSK word has real Mandarin audio (open-source TTS, zero API cost, works offline); browser TTS is only a fallback. Colab notebook in `content/` upgrades quality with MeloTTS/Qwen3-TTS at will

- 📥 **Anki .apkg import** — bring any Anki deck: unzips + parses the SQLite collection in-browser, auto-maps fields (phrase/pronunciation/meaning/audio), imports bundled native-speaker audio into IndexedDB, per-deck language selection. Tested against a real 500-note HSK-1 deck with 498 audio files.
- 📖 **Sentences** — words in action: curated example sentences that unlock as you learn their pieces, an example sentence on every card back, and a "Mix it up" generator that builds fresh natural sentences from YOUR learned words (substitution frames, never AI-slop)
- 🔒 **Scenario progression** — start with Greetings & Basics; each scenario unlocks by completing the previous one
- ⚡ **Daily pace setting** — Relaxed 5 / Standard 8 / Fast 15 / Beast 25 new cards per day (with an honest review-debt warning)

- 🇨🇳 **Mandarin Survival Deck** — 120 high-frequency phrases across 10 real-life scenarios (greetings, money, food, taxi, rescue phrases, time, family, feelings, hotel, small talk), chunk-based, not word lists — plus one-click import of the 500-word HSK-1 deck for volume
- 🗣️ **Speak-to-flip flashcards** — front shows emoji + meaning; you say it in Mandarin *out loud* before flipping
- 🎨 **Tone-colored pinyin** — Pleco-style colors (T1 red, T2 green, T3 blue, T4 purple, neutral gray); hanzi shown small (reading not required)
- 🔊 **Native TTS** — normal + slow playback (browser/device voices for now; Azure Neural pre-generated audio planned)
- 🎙️ **Record & compare** — record your take, play it against the native audio (web)
- 🧠 **FSRS spaced repetition** — the modern Anki scheduler via ts-fsrs; 8 new cards/day cap
- 🔥 **Streaks + Conversations Unlocked** — progress per scenario, phrases-spoken counter

## Run it

```bash
nvm use 22.11.0   # Node 18+ required
npm install
npm run web       # opens in your browser
```

## Roadmap

| Version | Scope |
|---|---|
| v0.1.x ✅ | Mandarin survival deck, speak-to-flip loop, FSRS, record & compare |
| v0.2.x ✅ | "Neon Court" visual redesign: card flip, chunky buttons, confetti celebrations, bento home |
| v0.3.x ✅ | Anki .apkg import, sentence library + generator, scenario gating, daily pace setting |
| v0.4.x ✅ | Open-source TTS pipeline (Piper/Colab), 1,322 bundled audio clips, HSK 1–4 ladder deck |
| v0.5.x | Open-source pronunciation scoring (wav2vec2 + pitch contour), tone-pair minimal games, listen-and-shadow phase, daily reminder notifications |
| v0.6.x | Japanese + Spanish packs (same pipeline: Qwen3-TTS / Chatterbox), generated flashcard images, "voice time capsule" |
| v0.7.x | Egyptian Arabic pack (Habibi-TTS EGY, Arabizi notation), Korean, French, Levantine |
| v1.0 | App Store + Play Store via EAS, accounts/sync, freemium (unlimited pronunciation scoring + AI roleplay premium) |

## Conventions

- Commits: `feat:` `fix:` `chore:` `doc:` — brief and concise
- README stays labelled with current **version + tech stack**
