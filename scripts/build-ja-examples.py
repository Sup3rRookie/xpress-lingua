# Matches each JLPT word to a short real example sentence from Tatoeba
# (CC-BY, via the ManyThings jpn-eng compilation; attribution preserved).
# Romaji via pykakasi. Prefers the shortest sentence that contains the word.
# Usage: python scripts/build-ja-examples.py <path-to-jpn.txt>
import json
import os
import re
import sys

import pykakasi
from tqdm import tqdm

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'src', 'data', 'ja-jlpt-examples.json')
kks = pykakasi.kakasi()

def romaji(text):
    jp = re.sub(r'[^ぁ-んァ-ヶ一-鿿ー々]', '', text)
    return ' '.join(t['hepburn'] for t in kks.convert(text)).strip()

def jp_len(text):
    return len(re.sub(r'[^ぁ-んァ-ヶ一-鿿ー々]', '', text))

def main():
    src = sys.argv[1]
    pairs = []
    with open(src, encoding='utf-8') as f:
        for line in f:
            p = line.rstrip('\n').split('\t')
            if len(p) >= 3:
                pairs.append((p[1], p[0], p[2]))  # (japanese, english, attr)
    pairs.sort(key=lambda x: jp_len(x[0]))  # shortest first

    # Index sentences by the characters they contain for a fast first pass.
    with open(os.path.join(ROOT, 'src', 'data', 'ja-jlpt.json'), encoding='utf-8') as f:
        items = json.load(f)['items']

    out, misses = {}, 0
    for it in tqdm(items, desc='ja-examples', unit='word', mininterval=3):
        word = it['hanzi']
        # Try the full word, then its kanji stem (drop trailing kana like る/う).
        stems = [word]
        stem = re.sub(r'[ぁ-ん]+$', '', word)
        if stem and stem != word and len(stem) >= 1:
            stems.append(stem)
        best = None
        for cand in stems:
            for jp, eng, attr in pairs:
                if cand in jp and jp_len(jp) > jp_len(cand) and 3 <= jp_len(jp) <= 22:
                    best = (jp, eng, attr)
                    break
            if best:
                break
        if not best:
            misses += 1
            continue
        jp, eng, attr = best
        out[it['id']] = {
            'hanzi': jp,
            'pinyin': romaji(jp),
            'gloss': eng,
            'attribution': attr.replace('CC-BY 2.0 (France) Attribution: ', ''),
        }

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'matched {len(out)}/{len(items)} JLPT words ({misses} without a sentence)')

if __name__ == '__main__':
    main()
