# Renders the English meanings used by Episode mode into public/audio/en/<id>.mp3.
# Browser speech synthesis for English is machine-dependent and often sounds flat
# and robotic, so the meaning line gets the same pre-rendered neural treatment as
# the study languages. Speed is 1.0: this is the learner's own language and only
# carries meaning, so it should sound normal rather than slowed for copying.
# Reads scripts/.en-entries.json (built by scripts/build-en-entries.js).
# Usage: PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python PYTHONIOENCODING=utf-8 \
#        python scripts/render-en.py [--speaker EN-US] [--limit N]
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio', 'en')
STATE_JSON = os.path.join(ROOT, 'scripts', 'en-render-state.json')
SILENCE_PEAK_DB = -30.0
DEFAULT_SPEAKER = 'EN-AU'  # others: EN-US, EN-BR, EN_INDIA, EN-Default


def entries():
    with open(os.path.join(ROOT, 'scripts', '.en-entries.json'), encoding='utf-8') as f:
        return json.load(f)


def peak_db(path):
    r = subprocess.run([FFMPEG, '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if 'max_volume' in line:
            return float(line.split('max_volume:')[1].replace('dB', '').strip())
    return 0.0


def text_hash(text, speaker):
    return hashlib.sha1((speaker + '|' + text).encode('utf-8')).hexdigest()[:16]


def load_state():
    if not os.path.exists(STATE_JSON):
        return {}
    try:
        with open(STATE_JSON, encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def save_state(state):
    with open(STATE_JSON, 'w', encoding='utf-8') as f:
        json.dump(state, f, sort_keys=True)


def main():
    os.makedirs(OUT, exist_ok=True)
    speaker = (
        sys.argv[sys.argv.index('--speaker') + 1] if '--speaker' in sys.argv else DEFAULT_SPEAKER
    )
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    state = load_state()
    all_entries = entries()

    def stale(e):
        mp3 = os.path.join(OUT, e['id'] + '.mp3')
        if not os.path.exists(mp3):
            return True
        # The hash covers the speaker too, so switching accent re-renders the set.
        h = text_hash(e['text'], speaker)
        return state.get(e['id'], h) != h

    todo = [e for e in all_entries if stale(e)]
    for e in all_entries:
        if e['id'] not in state and os.path.exists(os.path.join(OUT, e['id'] + '.mp3')):
            state[e['id']] = text_hash(e['text'], speaker)
    if limit:
        todo = todo[:limit]
    print(f'{len(todo)} en clips to render this run (speaker={speaker})', flush=True)
    if not todo:
        save_state(state)
        print('ALL RENDERED')
        return

    from melo.api import TTS
    from tqdm import tqdm

    model = TTS(language='EN', device='auto')
    spk = model.hps.data.spk2id[speaker]
    fails = 0
    for e in tqdm(todo, desc='en', unit='clip', mininterval=3):
        wav = os.path.join(tempfile.gettempdir(), 'en_' + e['id'] + '.wav')
        mp3 = os.path.join(OUT, e['id'] + '.mp3')
        try:
            model.tts_to_file(e['text'], spk, wav, speed=1.0, quiet=True)
            subprocess.run(
                [FFMPEG, '-y', '-loglevel', 'error', '-i', wav,
                 '-ac', '1', '-ar', '24000', '-b:a', '64k', mp3],
                check=True,
            )
            if peak_db(mp3) <= SILENCE_PEAK_DB:
                os.remove(mp3)
                state.pop(e['id'], None)
                fails += 1
                tqdm.write(f'SILENT {e["id"]} "{e["text"]}" (dropped -> TTS fallback)')
            else:
                state[e['id']] = text_hash(e['text'], speaker)
        except Exception as ex:
            fails += 1
            if os.path.exists(mp3):
                os.remove(mp3)
            state.pop(e['id'], None)
            tqdm.write(f'RENDER-FAIL {e["id"]} {repr(ex)[:90]}')
        finally:
            if os.path.exists(wav):
                os.remove(wav)
    save_state(state)
    print(f'done ({len(todo)} attempted, {fails} failed)')


if __name__ == '__main__':
    main()
