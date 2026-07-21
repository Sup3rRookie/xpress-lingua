# Matches each HSK deck word to a real example sentence from the Tatoeba
# corpus (CC-BY, via the ManyThings cmn-eng compilation; per-sentence
# attribution preserved). Prefers short sentences so beginners can read them.
# Usage: python scripts/build-hsk-examples.py <path-to-cmn.txt>
import json
import os
import re
import sys

from pypinyin import Style, pinyin

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DECK = os.path.join(ROOT, 'src', 'data', 'zh-hsk.json')
OUT = os.path.join(ROOT, 'src', 'data', 'zh-hsk-examples.json')

def to_pinyin(text):
    han_only = re.sub(r'[^一-鿿]', '', text)
    return ' '.join(s[0] for s in pinyin(han_only, style=Style.TONE))

def main():
    src = sys.argv[1]
    pairs = []
    with open(src, encoding='utf-8') as f:
        for line in f:
            parts = line.rstrip('\n').split('\t')
            if len(parts) >= 3:
                eng, cmn, attr = parts[0], parts[1], parts[2]
                pairs.append((cmn, eng, attr))
    # Sort by Chinese length so the first substring hit is the shortest sentence.
    pairs.sort(key=lambda p: len(p[0]))

    with open(DECK, encoding='utf-8') as f:
        deck = json.load(f)

    out, misses = {}, 0
    for item in deck['items']:
        word = item['hanzi']
        best = None
        for cmn, eng, attr in pairs:
            # Skip degenerate matches: sentence must be longer than the word itself
            # and short enough to read (4-16 hanzi).
            if word in cmn and len(cmn) > len(word) + 1:
                han_len = len(re.sub(r'[^一-鿿]', '', cmn))
                if 3 <= han_len <= 16:
                    best = (cmn, eng, attr)
                    break
        if not best:
            misses += 1
            continue
        cmn, eng, attr = best
        out[item['id']] = {
            'hanzi': cmn,
            'pinyin': to_pinyin(cmn),
            'gloss': eng,
            'attribution': attr.replace('CC-BY 2.0 (France) Attribution: ', ''),
        }

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'matched {len(out)}/{len(deck["items"])} HSK words ({misses} without a sentence)')

if __name__ == '__main__':
    main()
