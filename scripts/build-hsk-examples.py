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
    items = list(deck['items'])

    # Also cover survival-deck words/chunks (curated sentences win at runtime,
    # so these only fill the gaps).
    survival = os.path.join(ROOT, 'scripts', '.content-build', 'zh-survival.js')
    surv_json = os.path.join(ROOT, 'src', 'data', 'zh-survival-items.json')
    if os.path.exists(surv_json):
        with open(surv_json, encoding='utf-8') as f:
            items += json.load(f)

    def find_best(word):
        # Tiered: short readable sentence first, then progressively longer.
        for max_len in (16, 24, 60):
            for cmn, eng, attr in pairs:
                if word in cmn and len(cmn) > len(word) + 1:
                    han_len = len(re.sub(r'[^一-鿿]', '', cmn))
                    if 3 <= han_len <= max_len:
                        return (cmn, eng, attr)
        return None

    out, missing = {}, []
    for item in items:
        word = item['hanzi'].replace(' ', '')
        best = find_best(word)
        if not best:
            missing.append(f"{item['id']}:{word}")
            continue
        cmn, eng, attr = best
        out[item['id']] = {
            'hanzi': cmn,
            'pinyin': to_pinyin(cmn),
            'gloss': eng,
            'attribution': attr.replace('CC-BY 2.0 (France) Attribution: ', ''),
        }

    # Hand-authored supplements (words absent from the corpus) override nothing,
    # they only fill remaining holes.
    supp = os.path.join(ROOT, 'src', 'data', 'zh-examples-authored.json')
    if os.path.exists(supp):
        with open(supp, encoding='utf-8') as f:
            for k, v in json.load(f).items():
                if k not in out:
                    v.setdefault('pinyin', to_pinyin(v['hanzi']))
                    out[k] = v

    with open(OUT, 'w', encoding='utf-8') as f:
        json.dump(out, f, ensure_ascii=False)
    print(f'matched {len(out)}/{len(items)} words')
    print('still missing:', ' '.join(missing) if missing else 'none')

if __name__ == '__main__':
    main()
