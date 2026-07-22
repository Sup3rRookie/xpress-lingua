# Repairs flagged word clips. For each bad clip, tries render variants and
# keeps the first one Whisper verifies as the correct reading:
#   v1: "word。"           (sentence-final punctuation nudges prosody/G2P)
#   v2: "word，word。"      -> silence-split, keep the SECOND occurrence
#   v3: "word，word，word。" -> keep the MIDDLE occurrence
# Usage: python scripts/fix-audio.py <piper-dir> <voice.onnx>
import json
import os
import re
import subprocess
import sys
import tempfile
import wave

import numpy as np
import whisper
from pypinyin import lazy_pinyin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'public', 'audio', 'zh')

def load_wav(path):
    with wave.open(path, 'rb') as w:
        rate = w.getframerate()
        data = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16)
    return data.astype(np.float32) / 32768.0, rate

def save_wav(path, audio, rate):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())

def to_16k(audio, rate):
    if rate == 16000:
        return audio
    import librosa
    return librosa.resample(audio, orig_sr=rate, target_sr=16000)

def base_pinyin(text):
    return ''.join(lazy_pinyin(re.sub(r'[^一-鿿]', '', text)))

def render(piper_exe, voice, text, out_path):
    p = subprocess.run(
        [piper_exe, '--model', voice, '--output_file', out_path],
        input=text.encode('utf-8'), capture_output=True, timeout=60,
    )
    return p.returncode == 0 and os.path.exists(out_path)

def segments(audio, rate, min_gap_s=0.18, thresh_ratio=0.02):
    # Split on silence runs longer than min_gap_s.
    win = int(rate * 0.01)
    n = len(audio) // win
    env = np.abs(audio[: n * win]).reshape(n, win).mean(axis=1)
    thresh = max(env.max() * thresh_ratio, 1e-4)
    voiced = env > thresh
    segs, start = [], None
    gap = 0
    min_gap = int(min_gap_s / 0.01)
    for i, v in enumerate(voiced):
        if v:
            if start is None:
                start = i
            gap = 0
        else:
            if start is not None:
                gap += 1
                if gap >= min_gap:
                    segs.append((start, i - gap + 1))
                    start, gap = None, 0
    if start is not None:
        segs.append((start, n))
    pad = int(0.06 * rate)
    out = []
    for a, b in segs:
        s = max(0, a * win - pad)
        e = min(len(audio), b * win + pad)
        out.append(audio[s:e])
    return out

def verify(model, audio, rate, want_pinyin):
    a16 = to_16k(audio, rate)
    gap = np.zeros(6400, dtype=np.float32)
    doubled = np.concatenate([gap, a16, gap, a16, gap])
    heard = model.transcribe(doubled, language='zh', fp16=False, temperature=0.0,
                             condition_on_previous_text=False)['text']
    return want_pinyin in base_pinyin(heard), heard.strip()

def main():
    piper_dir, voice = sys.argv[1], sys.argv[2]
    piper_exe = os.path.join(piper_dir, 'piper.exe')
    with open(os.path.join(ROOT, 'scripts', 'audio-flags.json'), encoding='utf-8') as f:
        flags = json.load(f)

    model = whisper.load_model('small')
    fixed, unfixable = [], []
    fixes_path = os.path.join(ROOT, 'scripts', 'audio-fixes.json')
    if os.path.exists(fixes_path):
        with open(fixes_path, encoding='utf-8') as f:
            prev = json.load(f)
        fixed, unfixable = prev.get('fixed', []), prev.get('unfixable', [])
    done_ids = {x['id'] for x in fixed} | {x['id'] for x in unfixable}
    flags = [fl for fl in flags if fl['id'] not in done_ids]
    print(f'{len(flags)} flags to process this run ({len(done_ids)} already done)', flush=True)
    tmpdir = tempfile.mkdtemp()

    from tqdm import tqdm
    progress = tqdm(flags, desc='repair', unit='clip', mininterval=2)
    for n, fl in enumerate(progress):
        word = fl['hanzi'].replace(' ', '')
        want = base_pinyin(word)
        target = os.path.join(AUDIO, fl['id'] + '.wav')
        done = False

        variants = [
            (f'{word}。', None),
            (f'{word}，{word}。', 1),
            (f'{word}，{word}，{word}。', 1),
        ]
        for vi, (text, seg_idx) in enumerate(variants):
            tmp = os.path.join(tmpdir, 'cand.wav')
            if not render(piper_exe, voice, text, tmp):
                continue
            audio, rate = load_wav(tmp)
            if seg_idx is None:
                cand = audio
            else:
                segs = segments(audio, rate)
                expected = text.count('，') + 1
                if len(segs) != expected:
                    continue
                cand = segs[seg_idx]
            ok, heard = verify(model, cand, rate, want)
            if ok:
                save_wav(target, cand, rate)
                fixed.append({'id': fl['id'], 'hanzi': word, 'variant': vi + 1})
                done = True
                break
        if not done:
            unfixable.append({'id': fl['id'], 'hanzi': word, 'want': fl['want']})
        if (n + 1) % 5 == 0:
            progress.set_postfix(fixed=len(fixed), unfixable=len(unfixable))
            with open(fixes_path, 'w', encoding='utf-8') as f:
                json.dump({'fixed': fixed, 'unfixable': unfixable}, f, ensure_ascii=False, indent=1)

    with open(os.path.join(ROOT, 'scripts', 'audio-fixes.json'), 'w', encoding='utf-8') as f:
        json.dump({'fixed': fixed, 'unfixable': unfixable}, f, ensure_ascii=False, indent=1)
    print(f'DONE: {len(fixed)} fixed, {len(unfixable)} unfixable')
    for u in unfixable[:20]:
        print('UNFIXABLE:', u['id'], u['hanzi'], u['want'])

if __name__ == '__main__':
    main()
