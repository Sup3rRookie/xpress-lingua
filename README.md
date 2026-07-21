# ⚡ XpressLingua

> **v0.1.0** | **Tech stack:** Expo SDK 57 (React Native 0.86 + TypeScript) · ts-fsrs · expo-speech · AsyncStorage · web-first, app stores via EAS

Speak first. A speaking/listening-first language app — you cannot pass a card without opening your mouth.

## What it does (v0.1.0)

- 🇨🇳 **Mandarin Survival Deck** — 60 high-frequency phrases across 5 real-life scenarios (greetings, money, food, taxi, rescue phrases), chunk-based, not word lists
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
| v0.1.x | Mandarin survival deck, speak-to-flip loop, FSRS, record & compare |
| v0.2.x | Azure AI pronunciation scoring, tone-pair minimal games, listen-and-shadow phase, daily reminder notifications |
| v0.3.x | Japanese + Spanish packs, generated flashcard images, "voice time capsule" |
| v0.4.x | Egyptian Arabic pack (Arabizi notation), remaining languages, content pipeline (Azure Neural TTS pre-generation) |
| v1.0 | App Store + Play Store via EAS, accounts/sync, freemium (unlimited pronunciation scoring + AI roleplay premium) |

## Conventions

- Commits: `feat:` `fix:` `chore:` `doc:` — brief and concise
- README stays labelled with current **version + tech stack**
