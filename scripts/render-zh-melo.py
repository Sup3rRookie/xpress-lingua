# Full local MeloTTS render of every Mandarin clip (words + all sentences)
# into a staging dir. Resumable: skips clips already rendered there.
# Usage: PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python python scripts/render-zh-melo.py <staging-dir> [--limit N]
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

def entries():
    out = []
    with open(os.path.join(ROOT, 'content', 'zh-manifest.json'), encoding='utf-8') as f:
        out += json.load(f)['entries']  # survival + curated sentences + HSK words
    with open(os.path.join(ROOT, 'src', 'data', 'zh-hsk-examples.json'), encoding='utf-8') as f:
        for k, v in json.load(f).items():
            out.append({'id': 'hske-' + k, 'text': v['hanzi']})
    return out

def main():
    staging = sys.argv[1]
    limit = None
    if '--limit' in sys.argv:
        limit = int(sys.argv[sys.argv.index('--limit') + 1])
    os.makedirs(staging, exist_ok=True)

    todo = [e for e in entries() if not os.path.exists(os.path.join(staging, e['id'] + '.wav'))]
    if limit:
        todo = todo[:limit]
    print(f'{len(todo)} clips to render this run', flush=True)
    if not todo:
        print('ALL RENDERED')
        return

    from melo.api import TTS
    from tqdm import tqdm
    model = TTS(language='ZH', device='auto')  # cuda when available
    spk = model.hps.data.spk2id['ZH']
    for e in tqdm(todo, desc='render', unit='clip', mininterval=2):
        try:
            model.tts_to_file(e['text'], spk, os.path.join(staging, e['id'] + '.wav'),
                              speed=0.9, quiet=True)
        except Exception as ex:
            tqdm.write(f'RENDER-FAIL {e["id"]} {repr(ex)[:80]}')
    print(f'chunk done ({len(todo)} attempted)')

if __name__ == '__main__':
    main()
