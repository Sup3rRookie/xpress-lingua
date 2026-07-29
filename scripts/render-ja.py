# Renders native MeloTTS Japanese audio into public/audio/ja/<id>.mp3.
# Japanese needs MeCab/fugashi (fixed locally: `pip install --user --force-reinstall
# fugashi` + unidic_lite). Output is mp3 (via bundled ffmpeg) so the full JLPT set
# stays small enough to ship. Resumable: skips clips already present.
# Reads scripts/.ja-entries.json (built by scripts/build-ja-entries.js).
# --slow renders a slower re-synthesis (id + "-slow") for shadowing. It is a real
# re-synthesis, not slowed playback, so the pitch accent stays natural. Ids already
# in ja-audio-suspect.json are skipped: the engine cannot voice them at any speed,
# and both buttons should fall back to TTS together.
# Usage: PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python PYTHONIOENCODING=utf-8 \
#        python scripts/render-ja.py [--slow] [--limit N]
import hashlib
import json
import os
import subprocess
import sys
import tempfile

import imageio_ffmpeg

FFMPEG = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio', 'ja')
SUSPECT_JSON = os.path.join(ROOT, 'src', 'data', 'ja-audio-suspect.json')
STATE_JSON = os.path.join(ROOT, 'scripts', 'ja-render-state.json')
# MeloTTS-JP emits (valid but) silent audio for some isolated short tokens. A
# silent mp3 never trips the app's onerror TTS fallback, so reject anything this
# quiet: drop the file and count it a failure rather than shipping silence.
SILENCE_PEAK_DB = -30.0


def entries():
    with open(os.path.join(ROOT, 'scripts', '.ja-entries.json'), encoding='utf-8') as f:
        return json.load(f)


def suspect_ids():
    if not os.path.exists(SUSPECT_JSON):
        return set()
    with open(SUSPECT_JSON, encoding='utf-8') as f:
        return set(json.load(f))


def text_hash(text):
    return hashlib.sha1(text.encode('utf-8')).hexdigest()[:16]


def load_state():
    # clip key -> hash of the text it was rendered from. Resuming on file
    # existence alone means editing a sentence keeps its old clip forever, which
    # silently ships audio saying something the deck no longer contains.
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


def peak_db(path):
    r = subprocess.run([FFMPEG, '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if 'max_volume' in line:
            return float(line.split('max_volume:')[1].replace('dB', '').strip())
    return 0.0  # no reading -> assume audible, keep


def main():
    os.makedirs(OUT, exist_ok=True)
    slow = '--slow' in sys.argv
    suffix = '-slow' if slow else ''
    speed = 0.6 if slow else 0.9
    # Skip known-unvoiceable ids at BOTH speeds. Their clips are deliberately
    # absent so the app falls back to TTS; without this a resumable rerun keeps
    # retrying them, and a borderline one can sneak back a clip that SUSPECT
    # suppresses anyway.
    skip = suspect_ids()
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    state = load_state()

    def stale(e):
        if e['id'] in skip:
            return False
        key = e['id'] + suffix
        if not os.path.exists(os.path.join(OUT, key + '.mp3')):
            return True
        # Untracked clips are assumed to match (seeds the state on first run);
        # a tracked clip whose text has since changed is re-rendered.
        h = text_hash(e['text'])
        return state.get(key, h) != h

    all_entries = entries()
    todo = [e for e in all_entries if stale(e)]
    # Record the text behind every clip already on disk, so a later edit to one of
    # them is detected instead of being resumed past.
    for e in all_entries:
        key = e['id'] + suffix
        if key not in state and os.path.exists(os.path.join(OUT, key + '.mp3')):
            state[key] = text_hash(e['text'])
    if limit:
        todo = todo[:limit]
    print(f'{len(todo)} ja clips to render this run (speed={speed}, skipped {len(skip)} '
          f'unvoiceable)', flush=True)
    if not todo:
        save_state(state)
        print('ALL RENDERED')
        return

    from melo.api import TTS
    from tqdm import tqdm

    model = TTS(language='JP', device='auto')  # cuda when available
    spk = model.hps.data.spk2id['JP']
    fails = 0
    for e in tqdm(todo, desc='ja' + suffix, unit='clip', mininterval=3):
        wav = os.path.join(tempfile.gettempdir(), 'ja_' + e['id'] + suffix + '.wav')
        mp3 = os.path.join(OUT, e['id'] + suffix + '.mp3')
        try:
            model.tts_to_file(e['text'], spk, wav, speed=speed, quiet=True)
            subprocess.run(
                [FFMPEG, '-y', '-loglevel', 'error', '-i', wav,
                 '-ac', '1', '-ar', '24000', '-b:a', '64k', mp3],
                check=True,
            )
            if peak_db(mp3) <= SILENCE_PEAK_DB:  # silent synth -> don't ship it
                os.remove(mp3)
                state.pop(e['id'] + suffix, None)
                fails += 1
                tqdm.write(f'SILENT {e["id"]} "{e["text"]}" (dropped -> TTS fallback)')
            else:
                state[e['id'] + suffix] = text_hash(e['text'])
        except Exception as ex:
            fails += 1
            if os.path.exists(mp3):
                os.remove(mp3)  # never leave a half-written mp3 that a rerun would skip
            state.pop(e['id'] + suffix, None)
            tqdm.write(f'RENDER-FAIL {e["id"]} {repr(ex)[:90]}')
        finally:
            if os.path.exists(wav):
                os.remove(wav)
    save_state(state)
    print(f'done ({len(todo)} attempted, {fails} failed)')


if __name__ == '__main__':
    main()
