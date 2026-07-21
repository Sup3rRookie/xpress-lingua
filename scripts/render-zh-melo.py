# Local CPU render with MeloTTS (MIT) — interim audio until the Colab/Qwen3 pass.
# Usage: python scripts/render-zh-melo.py [--limit N]
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MANIFEST = os.path.join(ROOT, 'content', 'zh-manifest.json')
OUT = os.path.join(ROOT, 'public', 'audio', 'zh')

def main():
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])

    with open(MANIFEST, encoding='utf-8') as f:
        entries = json.load(f)['entries']
    if limit:
        entries = entries[:limit]
    os.makedirs(OUT, exist_ok=True)

    from melo.api import TTS
    model = TTS(language='ZH', device='cpu')
    spk = model.hps.data.spk2id['ZH']

    done = 0
    for e in entries:
        wav = os.path.join(OUT, e['id'] + '.wav')
        if os.path.exists(wav):
            done += 1
            continue
        model.tts_to_file(e['text'], spk, wav, speed=0.9, quiet=True)
        done += 1
        if done % 10 == 0:
            print(f"{done}/{len(entries)}")
    print(f"done: {done} clips in {OUT}")

if __name__ == '__main__':
    main()
