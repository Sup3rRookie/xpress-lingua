# Audits every WORD clip: Whisper-transcribes it, converts both transcription and
# the expected hanzi to base pinyin (tone-insensitive first pass), and flags
# mismatches — catches Piper picking the wrong heteronym reading in isolation.
# Usage: python scripts/verify-audio.py [--limit N] [--ids id1,id2]
import json
import os
import re
import sys
import wave

import numpy as np
import whisper
from pypinyin import Style, lazy_pinyin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'public', 'audio', 'zh')

def load_wav_16k(path):
    with wave.open(path, 'rb') as w:
        rate = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    audio = data.astype(np.float32) / 32768.0
    if rate != 16000:
        import librosa
        audio = librosa.resample(audio, orig_sr=rate, target_sr=16000)
    return audio

def base_pinyin(text):
    han = re.sub(r'[^一-鿿]', '', text)
    return lazy_pinyin(han)  # no tones — Whisper hears syllables reliably, tones less so

def tone_pinyin(text):
    han = re.sub(r'[^一-鿿]', '', text)
    return lazy_pinyin(han, style=Style.TONE3, neutral_tone_with_five=True)

def main():
    limit = None
    only_ids = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    if '--ids' in sys.argv:
        only_ids = set(sys.argv[sys.argv.index('--ids') + 1].split(','))

    items = []
    with open(os.path.join(ROOT, 'src', 'data', 'zh-hsk.json'), encoding='utf-8') as f:
        items += json.load(f)['items']
    with open(os.path.join(ROOT, 'src', 'data', 'zh-survival-items.json'), encoding='utf-8') as f:
        items += json.load(f)

    if only_ids:
        items = [it for it in items if it['id'] in only_ids]
    if limit:
        items = items[:limit]

    # Resumable: skip already-checked ids; flags accumulate across runs.
    checked_path = os.path.join(ROOT, 'scripts', 'audio-checked.json')
    flags_path = os.path.join(ROOT, 'scripts', 'audio-flags.json')
    checked = set()
    flags = []
    if '--fresh' not in sys.argv:
        if os.path.exists(checked_path):
            with open(checked_path, encoding='utf-8') as f:
                checked = set(json.load(f))
        if os.path.exists(flags_path):
            with open(flags_path, encoding='utf-8') as f:
                flags = json.load(f)
    items = [it for it in items if it['id'] not in checked]
    print(f'{len(items)} clips to check this run ({len(checked)} already done)', flush=True)

    model = whisper.load_model('small')
    for n, it in enumerate(items):
        path = os.path.join(AUDIO, it['id'] + '.wav')
        if not os.path.exists(path):
            continue
        clip = load_wav_16k(path)
        # Whisper hallucinates on sub-second clips: play the word twice with
        # silence padding so it has real evidence.
        gap = np.zeros(6400, dtype=np.float32)
        audio = np.concatenate([gap, clip, gap, clip, gap])
        heard = model.transcribe(audio, language='zh', fp16=False, temperature=0.0,
                                 condition_on_previous_text=False)['text']
        want = ''.join(base_pinyin(it['hanzi']))
        got = ''.join(base_pinyin(heard))
        ok = want in got
        if not ok:
            flags.append({'id': it['id'], 'hanzi': it['hanzi'],
                          'want': ' '.join(tone_pinyin(it['hanzi'])), 'heard': heard.strip(),
                          'heard_py': got})
        checked.add(it['id'])
        if (n + 1) % 20 == 0:
            with open(checked_path, 'w', encoding='utf-8') as f:
                json.dump(sorted(checked), f)
            with open(flags_path, 'w', encoding='utf-8') as f:
                json.dump(flags, f, ensure_ascii=False, indent=1)
            print(f'{n+1}/{len(items)} checked, {len(flags)} flagged total', flush=True)

    with open(checked_path, 'w', encoding='utf-8') as f:
        json.dump(sorted(checked), f)
    with open(flags_path, 'w', encoding='utf-8') as f:
        json.dump(flags, f, ensure_ascii=False, indent=1)
    print(f'DONE: {len(checked)} checked total, {len(flags)} flagged → scripts/audio-flags.json')
    for fl in flags[:15]:
        print(fl['id'], fl['hanzi'], 'want:', fl['want'], '| heard:', fl['heard'])

if __name__ == '__main__':
    main()
