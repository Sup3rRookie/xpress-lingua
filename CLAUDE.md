# XpressLingua — agent notes

Speaking-first language app. Full product spec lives in the `project-language-fluency-app` memory file.

## Hard rules
- Commit messages: `feat:` / `fix:` / `chore:` / `doc:` prefix, one brief line. **No Co-Authored-By lines.**
- README must always carry the current **version + tech stack** label; bump both together.
- Reading/writing instruction is out of scope forever — audio is the source of truth, notation (pinyin/romaji/Arabizi) is a scaffold.
- Every card interaction must require speaking aloud; never add silent-tap recall paths.

## Architecture
- Expo (React Native + TypeScript), web-first; stores later via EAS.
- `src/data/` deck content (typed), `src/lib/` srs (ts-fsrs + AsyncStorage), audio (expo-speech), pinyin utils, recorder (web MediaRecorder).
- No backend yet — local-first. Azure keys must never ship client-side when scoring lands (serverless proxy).

## Environment
- Node via nvm-windows: `nvm use 22.11.0` (system default was Node 14 — do not use).
