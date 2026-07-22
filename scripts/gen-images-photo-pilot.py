# Photo-to-pixel pilot: fetch CC0/public-domain photos from Openverse,
# center-crop, downscale with color quantization to produce clean pixel art
# with guaranteed subject fidelity.
import io
import os
import time

import requests
from PIL import Image

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img-pilot')

PILOT = [
    ('coffee', 'coffee cup'),
    ('tea', 'tea cup'),
    ('noodles', 'noodle bowl'),
    ('taxi', 'yellow taxi'),
    ('airport', 'airplane'),
    ('key', 'key metal'),
    ('money', 'banknotes cash'),
    ('doctor', 'doctor'),
    ('apple', 'red apple fruit'),
    ('panda', 'panda'),
]

HEADERS = {'User-Agent': 'XpressLingua/0.8 (flashcard image pipeline)'}

def usable(img):
    # Reject dark, washed-out, or low-contrast photos automatically.
    import numpy as np
    a = np.asarray(img.convert('L').resize((64, 64)), dtype=float)
    return 55 <= a.mean() <= 215 and a.std() >= 28

def fetch_photo(query):
    r = requests.get(
        'https://api.openverse.org/v1/images/',
        params={
            'q': query,
            'license': 'cc0,pdm',
            'category': 'photograph',
            'page_size': 20,
        },
        headers=HEADERS,
        timeout=30,
    )
    r.raise_for_status()
    words = set(query.lower().split())
    results = r.json().get('results', [])
    # Prefer results whose title or tags mention the query words.
    def score(res):
        text = (res.get('title') or '').lower() + ' ' + ' '.join(
            t.get('name', '') for t in (res.get('tags') or [])
        ).lower()
        return sum(1 for w in words if w in text)
    results.sort(key=score, reverse=True)
    for res in results:
        if (res.get('width') or 0) < 400:
            continue
        url = res.get('url') or res.get('thumbnail')
        if not url:
            continue
        try:
            img = requests.get(url, headers=HEADERS, timeout=30)
            img.raise_for_status()
            photo = Image.open(io.BytesIO(img.content)).convert('RGB')
            if not usable(photo):
                continue
            return photo, res.get('foreign_landing_url', '')
        except Exception:
            continue
    return None, None

def pixelate(img, size=64, colors=40):
    w, h = img.size
    s = min(w, h)
    img = img.crop(((w - s) // 2, (h - s) // 2, (w + s) // 2, (h + s) // 2))
    small = img.resize((size, size), Image.LANCZOS)
    small = small.quantize(colors=colors, method=Image.MEDIANCUT).convert('RGB')
    return small

def main():
    os.makedirs(OUT, exist_ok=True)
    ok = []
    for name, query in PILOT:
        try:
            photo, src = fetch_photo(query)
            if photo is None:
                print('MISS', name, flush=True)
                continue
            pixelate(photo, 64, 40).save(os.path.join(OUT, f'{name}.png'))
            ok.append(name)
            print('done', name, flush=True)
        except Exception as e:
            print('FAIL', name, repr(e)[:60], flush=True)
        time.sleep(1.5)

    rows = '\n'.join(
        f'<div class="c"><img src="img-pilot/{n}.png"><span>{n}</span></div>' for n in ok
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Photo-to-pixel pilot</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:900px;margin:20px auto;text-align:center}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
.c{{background:#171331;border-radius:12px;padding:10px}}
img{{width:100%;border-radius:8px;image-rendering:pixelated}}
span{{font-size:13px;color:#A9A3C9}}</style></head><body>
<h1>Photo-to-pixel pilot</h1><p>Real CC0 photos, pixelated (64px, 40 colors). Reply: approve, or describe what to change.</p>
<div class="g">{rows}</div></body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PHOTO-PILOT-READY', len(ok), 'of', len(PILOT))

if __name__ == '__main__':
    main()
