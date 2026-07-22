# Definitive word-clip renderer: MeloTTS garbles isolated short inputs, so each
# word tries variants in order, each Whisper-verified before acceptance:
#   v1 "X。"        -> clean single utterance (works for most multi-syllable)
#   v2 "X，X。"      -> word spoken twice (always clean speech; marked in
#                       zh-audio-doubles.json so the pitch-contour UI skips it)
# Writes straight into public/audio/zh. Resumable via zh-words-v2-state.json.
# Usage: PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python python scripts/render-zh-words-v2.py
import json
import os
import re
import wave

import numpy as np
import whisper
import librosa
from pypinyin import lazy_pinyin
from tqdm import tqdm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
AUDIO = os.path.join(ROOT, 'public', 'audio', 'zh')
STATE = os.path.join(ROOT, 'scripts', 'zh-words-v2-state.json')
DOUBLES = os.path.join(ROOT, 'src', 'data', 'zh-audio-doubles.json')

def word_items():
    items = []
    with open(os.path.join(ROOT, 'src', 'data', 'zh-hsk.json'), encoding='utf-8') as f:
        items += json.load(f)['items']
    with open(os.path.join(ROOT, 'src', 'data', 'zh-survival-items.json'), encoding='utf-8') as f:
        items += json.load(f)
    return items

def base_pinyin(text):
    return lazy_pinyin(re.sub(r'[^一-鿿]', '', text))

def save_wav(path, audio, rate):
    pcm = (np.clip(audio, -1, 1) * 32767).astype(np.int16)
    with wave.open(path, 'wb') as w:
        w.setnchannels(1)
        w.setsampwidth(2)
        w.setframerate(rate)
        w.writeframes(pcm.tobytes())

def trim_silence(a, rate):
    win = int(rate * 0.01)
    n = len(a) // win
    if n == 0:
        return a
    env = np.abs(a[: n * win]).reshape(n, win).mean(axis=1)
    thresh = max(env.max() * 0.015, 1e-4)
    idx = np.where(env > thresh)[0]
    if len(idx) == 0:
        return a
    pad = int(0.06 * rate)
    return a[max(0, idx[0] * win - pad) : min(len(a), (idx[-1] + 1) * win + pad)]

def main():
    state = {'done': [], 'doubles': [], 'failed': []}
    if os.path.exists(STATE):
        with open(STATE, encoding='utf-8') as f:
            state = json.load(f)
    done = set(state['done'])
    todo = [it for it in word_items() if it['id'] not in done]
    print(f'{len(todo)} words to render ({len(done)} done)', flush=True)
    if not todo:
        print('ALL-WORDS-DONE')
        return

    from melo.api import TTS
    tts = TTS(language='ZH', device='auto')
    spk = tts.hps.data.spk2id['ZH']
    asr = whisper.load_model('medium')
    tmp = os.path.join(ROOT, 'scripts', '.word-tmp.wav')

    def render(text):
        tts.tts_to_file(text, spk, tmp, speed=0.9, quiet=True)
        with wave.open(tmp, 'rb') as w:
            rate = w.getframerate()
            a = np.frombuffer(w.readframes(w.getnframes()), dtype=np.int16).astype(np.float32) / 32768.0
        return a, rate

    def verified(a, rate, want):
        a16 = librosa.resample(a, orig_sr=rate, target_sr=16000)
        gap = np.zeros(6400, dtype=np.float32)
        heard = asr.transcribe(np.concatenate([gap, a16, gap, a16, gap]), language='zh',
                               fp16=True, temperature=0.0,
                               condition_on_previous_text=False)['text']
        got = base_pinyin(heard)
        return any(got[i : i + len(want)] == want for i in range(len(got) - len(want) + 1))

    progress = tqdm(todo, desc='words-v2', unit='word', mininterval=2)
    for n, it in enumerate(progress):
        word = it['hanzi'].replace(' ', '')
        want = base_pinyin(word)
        target = os.path.join(AUDIO, it['id'] + '.wav')
        ok = False
        try:
            a, rate = render(f'{word}。')
            a = librosa.resample(a, orig_sr=rate, target_sr=22050)
            a = trim_silence(a, 22050)
            if verified(a, 22050, want):
                save_wav(target, a, 22050)
                ok = True
            else:
                a, rate = render(f'{word}，{word}。')
                a = librosa.resample(a, orig_sr=rate, target_sr=22050)
                a = trim_silence(a, 22050)
                if verified(a, 22050, want):
                    save_wav(target, a, 22050)
                    state['doubles'].append(it['id'])
                    ok = True
        except Exception as ex:
            tqdm.write(f'ERROR {it["id"]} {repr(ex)[:70]}')
        if not ok:
            state['failed'].append({'id': it['id'], 'hanzi': word})
        state['done'].append(it['id'])
        if (n + 1) % 10 == 0:
            progress.set_postfix(doubles=len(state['doubles']), failed=len(state['failed']))
            with open(STATE, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False)
            with open(DOUBLES, 'w', encoding='utf-8') as f:
                json.dump(sorted(set(state['doubles'])), f, ensure_ascii=False)

    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False)
    with open(DOUBLES, 'w', encoding='utf-8') as f:
        json.dump(sorted(set(state['doubles'])), f, ensure_ascii=False)
    print(f"chunk done: {len(state['doubles'])} doubles, {len(state['failed'])} failed", flush=True)
    for fl in state['failed'][:15]:
        print('FAILED:', fl['id'], fl['hanzi'])

if __name__ == '__main__':
    main()
