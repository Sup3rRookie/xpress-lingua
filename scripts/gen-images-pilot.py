# Pixel-art image pilot: renders 10 sample flashcard images locally with a
# pixel-art Stable Diffusion model so the founder can approve the style
# before mass generation.
# Usage: python scripts/gen-images-pilot.py
import os

import torch
from diffusers import StableDiffusionPipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img-pilot')

PILOT = [
    ('coffee', 'a cup of coffee'),
    ('tea', 'a cup of chinese tea'),
    ('noodles', 'a bowl of noodles with chopsticks'),
    ('taxi', 'a yellow taxi car'),
    ('airport', 'an airport with a plane'),
    ('key', 'a golden key'),
    ('money', 'banknotes and coins'),
    ('doctor', 'a friendly doctor'),
    ('apple', 'a red apple'),
    ('panda', 'a cute panda bear'),
]

def main():
    os.makedirs(OUT, exist_ok=True)
    pipe = StableDiffusionPipeline.from_pretrained(
        'PublicPrompts/All-In-One-Pixel-Model',
        torch_dtype=torch.float16,
        safety_checker=None,
    ).to('cuda')
    for name, concept in PILOT:
        img = pipe(
            f'pixelsprite, {concept}, pixel art, 16-bit videogame style, '
            f'vibrant colors, simple dark background, centered',
            negative_prompt='blurry, photo, realistic, text, watermark, deformed',
            num_inference_steps=25,
            guidance_scale=7.5,
            height=512,
            width=512,
        ).images[0]
        img.save(os.path.join(OUT, f'{name}.png'))
        print('done', name, flush=True)

    rows = '\n'.join(
        f'<div class="c"><img src="img-pilot/{n}.png"><span>{n}</span></div>' for n, _ in PILOT
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Image style pilot</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:900px;margin:20px auto;text-align:center}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
.c{{background:#171331;border-radius:12px;padding:10px}}
img{{width:100%;border-radius:8px;image-rendering:pixelated}}
span{{font-size:13px;color:#A9A3C9}}</style></head><body>
<h1>Pixel art pilot</h1><p>10 samples. Reply with a verdict: approve, or describe what to change.</p>
<div class="g">{rows}</div></body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PILOT-READY')

if __name__ == '__main__':
    main()
