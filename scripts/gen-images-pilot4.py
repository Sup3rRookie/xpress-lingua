# Style pilot 4: pixel-art subjects (style A) on purple backgrounds (style B),
# with a programmatic chunky pixel frame for perfect consistency.
# Two variants per concept: framed and frameless.
import os

import torch
from diffusers import StableDiffusionXLPipeline
from PIL import Image, ImageDraw

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img-pilot')

PILOT = [
    ('coffee', 'a steaming cup of coffee'),
    ('taxi', 'a yellow taxi cab, side view'),
    ('doctor', 'a smiling doctor in a white coat with a stethoscope, upper body'),
    ('apple', 'a single shiny red apple'),
    ('panda', 'a giant panda bear sitting'),
    ('key', 'a single golden door key'),
]

NEG = ('blurry, photo, realistic, multiple objects, pattern, tiled, cluttered, '
       'busy background, text, watermark, deformed, cropped, cut off, partial, out of frame')

VIOLET = (139, 92, 246)
CYAN = (34, 211, 238)
DEEP = (23, 19, 49)

def add_frame(img):
    # Chunky double pixel border: deep base, violet outer, cyan inner accent.
    s = img.size[0]
    framed = Image.new('RGB', (s, s), DEEP)
    framed.paste(img, (0, 0))
    d = ImageDraw.Draw(framed)
    u = s // 64  # frame unit scales with image
    for i in range(u):
        d.rectangle([i, i, s - 1 - i, s - 1 - i], outline=DEEP)
    for i in range(u, 2 * u):
        d.rectangle([i, i, s - 1 - i, s - 1 - i], outline=VIOLET)
    for i in range(2 * u, 2 * u + max(1, u // 2)):
        d.rectangle([i, i, s - 1 - i, s - 1 - i], outline=CYAN)
    # pixel corner studs
    stud = 3 * u
    for cx, cy in [(0, 0), (s - stud, 0), (0, s - stud), (s - stud, s - stud)]:
        d.rectangle([cx, cy, cx + stud - 1, cy + stud - 1], fill=VIOLET)
        d.rectangle([cx + u, cy + u, cx + stud - 1 - u, cy + stud - 1 - u], fill=CYAN)
    return framed

def main():
    os.makedirs(OUT, exist_ok=True)
    pipe = StableDiffusionXLPipeline.from_pretrained(
        'stabilityai/stable-diffusion-xl-base-1.0',
        torch_dtype=torch.float16,
        variant='fp16',
        use_safetensors=True,
    )
    pipe.load_lora_weights('nerijs/pixel-art-xl')
    pipe.enable_model_cpu_offload()

    for name, concept in PILOT:
        img = pipe(
            f'pixel art, {concept}, single object, whole subject fully visible with '
            f'margin around it, centered, flat dark purple background, '
            f'video game item icon, clean silhouette',
            negative_prompt=NEG,
            num_inference_steps=28,
            guidance_scale=7.5,
            height=1024,
            width=1024,
        ).images[0].resize((512, 512))
        img.save(os.path.join(OUT, f'{name}-plain.png'))
        add_frame(img).save(os.path.join(OUT, f'{name}-framed.png'))
        print('done', name, flush=True)

    rows = '\n'.join(
        f'<div class="r"><span class="t">{n}</span>'
        f'<div class="c"><img src="img-pilot/{n}-framed.png?v=4"><span>framed</span></div>'
        f'<div class="c"><img src="img-pilot/{n}-plain.png?v=4"><span>no frame</span></div></div>'
        for n, _ in PILOT
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Style pilot 4</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:760px;margin:20px auto;text-align:center}}
.r{{display:flex;gap:12px;align-items:center;background:#171331;border-radius:12px;padding:10px;margin:10px 0}}
.t{{width:80px;font-size:14px}}
.c{{flex:1}}
img{{width:100%;border-radius:8px;image-rendering:auto}}
.c span{{font-size:12px;color:#A9A3C9}}</style></head><body>
<h1>Pilot 4: pixel subjects, purple background</h1>
<p>Left: with the branded pixel frame. Right: frameless. Reply: framed / no frame / changes.</p>
{rows}</body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PILOT4-READY')

if __name__ == '__main__':
    main()
