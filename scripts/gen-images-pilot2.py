# Pixel-art pilot #2: SDXL base + pixel-art-xl LoRA (subject-faithful sprites).
# Runs on 8GB VRAM via cpu offload. Writes over public/img-pilot and the page.
import os

import torch
from diffusers import StableDiffusionXLPipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img-pilot')

PILOT = [
    ('coffee', 'a cup of coffee'),
    ('tea', 'a cup of chinese tea'),
    ('noodles', 'a bowl of noodles with chopsticks'),
    ('taxi', 'a yellow taxi car'),
    ('airport', 'an airplane at an airport'),
    ('key', 'a golden key'),
    ('money', 'a stack of banknotes and coins'),
    ('doctor', 'a friendly doctor in a white coat'),
    ('apple', 'a red apple'),
    ('panda', 'a cute panda bear'),
]

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
            f'pixel art, {concept}, simple, flat colors, centered, dark background',
            negative_prompt='blurry, photo, realistic, 3d render, text, watermark',
            num_inference_steps=25,
            guidance_scale=7.0,
            height=1024,
            width=1024,
        ).images[0]
        img.resize((512, 512)).save(os.path.join(OUT, f'{name}.png'))
        print('done', name, flush=True)

    rows = '\n'.join(
        f'<div class="c"><img src="img-pilot/{n}.png"><span>{n}</span></div>' for n, _ in PILOT
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Image style pilot 2</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:900px;margin:20px auto;text-align:center}}
.g{{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:14px}}
.c{{background:#171331;border-radius:12px;padding:10px}}
img{{width:100%;border-radius:8px;image-rendering:pixelated}}
span{{font-size:13px;color:#A9A3C9}}</style></head><body>
<h1>Pixel art pilot 2 (SDXL)</h1><p>Reply: approve, or describe what to change.</p>
<div class="g">{rows}</div></body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PILOT2-READY')

if __name__ == '__main__':
    main()
