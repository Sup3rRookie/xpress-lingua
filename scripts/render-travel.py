# Renders native MeloTTS audio for the travel sentences straight into
# public/audio/zh/<id>.wav (resumable: skips clips already there).
# Usage: PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION=python python scripts/render-travel.py [--limit N]
import json
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio', 'zh')


def entries():
    with open(os.path.join(ROOT, 'src', 'data', 'zh-travel-sentences.json'), encoding='utf-8') as f:
        return [{'id': s['id'], 'text': s['hanzi']} for s in json.load(f)['sentences']]


def main():
    os.makedirs(OUT, exist_ok=True)
    # --slow renders a slower re-synthesis (id + "-slow") so the "Slow" button keeps
    # correct Mandarin tones (slowing playback rate would lower pitch and break them).
    slow = '--slow' in sys.argv
    suffix = '-slow' if slow else ''
    speed = 0.6 if slow else 0.9
    limit = int(sys.argv[sys.argv.index('--limit') + 1]) if '--limit' in sys.argv else None
    todo = [e for e in entries() if not os.path.exists(os.path.join(OUT, e['id'] + suffix + '.wav'))]
    if limit:
        todo = todo[:limit]
    print(f'{len(todo)} travel clips to render this run (speed={speed})', flush=True)
    if not todo:
        print('ALL RENDERED')
        return

    from melo.api import TTS
    from tqdm import tqdm

    model = TTS(language='ZH', device='auto')  # cuda when available
    spk = model.hps.data.spk2id['ZH']
    for e in tqdm(todo, desc='travel' + suffix, unit='clip', mininterval=2):
        try:
            model.tts_to_file(e['text'], spk, os.path.join(OUT, e['id'] + suffix + '.wav'),
                              speed=speed, quiet=True)
        except Exception as ex:
            tqdm.write(f'RENDER-FAIL {e["id"]} {repr(ex)[:80]}')
    print(f'done ({len(todo)} attempted)')


if __name__ == '__main__':
    main()
