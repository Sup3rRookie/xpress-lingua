# Builds the JLPT ladder deck (N5-N3) from open-anki-jlpt-decks CSVs (MIT).
# Romaji via pykakasi (build tool only). Frequency-sorted within each level
# using the OpenSubtitles ja list (sorting tool only, not shipped).
# NOTE: item ids are position-based; never change the sort or ids detach
# from learner FSRS progress.
# Usage: python scripts/build-ja-jlpt.py <dir-with-jlpt-nX.csv-and-ja_full.txt>
import csv
import json
import os
import re
import sys

import pykakasi

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
kks = pykakasi.kakasi()

LEVELS = [('n5', 'JLPT N5', '🌱'), ('n4', 'JLPT N4', '🌿'), ('n3', 'JLPT N3', '🌳')]

def romaji(kana):
    # Multi-reading entries (なん；なに) keep only the first reading.
    kana = re.split(r'[；;、,/／]', kana)[0].strip()
    return ' '.join(t['hepburn'] for t in kks.convert(kana)).strip()

def main():
    src = sys.argv[1]
    ranks = {}
    with open(os.path.join(src, 'ja_full.txt'), encoding='utf-8') as f:
        for i, line in enumerate(f):
            w = line.split(' ')[0]
            if w not in ranks:
                ranks[w] = i

    surv = re.findall(r"hanzi: '([^']+)'", open(
        os.path.join(ROOT, 'src', 'data', 'ja-survival.ts'), encoding='utf-8').read())
    seen = set(surv)

    scenarios = [{'id': lid, 'title': t, 'emoji': e} for lid, t, e in LEVELS]
    items = []
    for lid, _, emoji in LEVELS:
        rows = []
        with open(os.path.join(src, f'jlpt-{lid}.csv'), encoding='utf-8') as f:
            for row in csv.DictReader(f):
                expr = (row['expression'] or '').strip()
                if not expr or expr in seen:
                    continue
                seen.add(expr)
                rows.append(row)
        rows.sort(key=lambda r: ranks.get(r['expression'].strip(),
                                          ranks.get(r['reading'].strip(), 999999)))
        for i, row in enumerate(rows):
            items.append({
                'id': f'{lid}-{i:03d}',
                'scenario': lid,
                'type': 'word',
                'hanzi': row['expression'].strip(),
                'pinyin': romaji(row['reading'].strip()),
                'gloss': (row['meaning'] or '').strip()[:110],
                'emoji': emoji,
            })

    out = {'scenarios': scenarios, 'items': items}
    with open(os.path.join(ROOT, 'src', 'data', 'ja-jlpt.json'), 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    counts = {lid: sum(1 for it in items if it['scenario'] == lid) for lid, _, _ in LEVELS}
    print('wrote ja-jlpt.json:', counts, 'total', len(items))

if __name__ == '__main__':
    main()
