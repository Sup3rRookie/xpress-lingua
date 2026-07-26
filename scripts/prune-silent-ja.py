# MeloTTS-JP emits silence for some isolated short tokens (single kanji/kana,
# counter placeholders). A silent-but-valid mp3 never triggers the app's onerror
# TTS fallback, so the card would play nothing. This scans every ja clip's peak
# volume, and with --apply deletes the too-quiet ones and records their ids in
# src/data/ja-audio-suspect.json so the app falls back to browser TTS for them.
# Usage: python scripts/prune-silent-ja.py            (dry run: distribution only)
#        python scripts/prune-silent-ja.py --apply -30 (delete peak <= -30 dB)
import json
import os
import subprocess
import sys
from concurrent.futures import ProcessPoolExecutor

import imageio_ffmpeg

FF = imageio_ffmpeg.get_ffmpeg_exe()
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'audio', 'ja')
SUSPECT_JSON = os.path.join(ROOT, 'src', 'data', 'ja-audio-suspect.json')


def peak_db(fname):
    path = os.path.join(OUT, fname)
    r = subprocess.run([FF, '-i', path, '-af', 'volumedetect', '-f', 'null', '-'],
                       capture_output=True, text=True)
    for line in r.stderr.splitlines():
        if 'max_volume' in line:
            return fname[:-4], float(line.split('max_volume:')[1].replace('dB', '').strip())
    return fname[:-4], 0.0  # no reading -> treat as loud (keep)


def main():
    files = [f for f in os.listdir(OUT) if f.endswith('.mp3')]
    print(f'scanning {len(files)} clips...', flush=True)
    with ProcessPoolExecutor(max_workers=8) as ex:
        peaks = list(ex.map(peak_db, files, chunksize=32))
    peaks.sort(key=lambda x: x[1])

    buckets = {}
    for _, db in peaks:
        b = '<=-60' if db <= -60 else '-60..-45' if db <= -45 else '-45..-30' if db <= -30 \
            else '-30..-20' if db <= -20 else '-20..-10' if db <= -10 else '>-10'
        buckets[b] = buckets.get(b, 0) + 1
    print('peak dB distribution:')
    for b in ['<=-60', '-60..-45', '-45..-30', '-30..-20', '-20..-10', '>-10']:
        print(f'  {b:10} {buckets.get(b, 0)}')
    print('quietest 20:', [(i, round(d, 1)) for i, d in peaks[:20]])
    print('loudest 3:', [(i, round(d, 1)) for i, d in peaks[-3:]])

    if '--apply' in sys.argv:
        thr = float(sys.argv[sys.argv.index('--apply') + 1])
        doomed = [i for i, d in peaks if d <= thr]
        for i in doomed:
            os.remove(os.path.join(OUT, i + '.mp3'))
        with open(SUSPECT_JSON, 'w', encoding='utf-8') as f:
            json.dump(sorted(doomed), f, ensure_ascii=False, indent=0)
        print(f'DELETED {len(doomed)} clips (peak <= {thr} dB); wrote {SUSPECT_JSON}')


if __name__ == '__main__':
    main()
