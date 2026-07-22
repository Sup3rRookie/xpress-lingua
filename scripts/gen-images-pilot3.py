# Style pilot 3: two SDXL variants per concept, side by side.
#   A: pixel-art LoRA, prompted for a single clear centered subject
#   B: plain SDXL cartoon flat-icon style
import os

import torch
from diffusers import StableDiffusionXLPipeline

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img-pilot')

PILOT = [
    ('coffee', 'a steaming cup of coffee'),
    ('tea', 'a chinese teacup with green tea'),
    ('noodles', 'a bowl of noodles with chopsticks'),
    ('taxi', 'a yellow taxi cab, side view'),
    ('airport', 'a passenger airplane taking off'),
    ('key', 'a single golden door key'),
    ('money', 'a stack of paper banknotes'),
    ('doctor', 'a smiling doctor in a white coat with a stethoscope'),
    ('apple', 'a single shiny red apple'),
    ('panda', 'a giant panda bear sitting'),
]

NEG = 'blurry, photo, realistic, multiple objects, cluttered, busy background, text, watermark, deformed, cropped'

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
            f'pixel art, {concept}, single object, centered, simple flat dark background, '
            f'clean silhouette, video game item icon',
            negative_prompt=NEG,
            num_inference_steps=28,
            guidance_scale=7.5,
            height=1024,
            width=1024,
        ).images[0]
        img.resize((512, 512)).save(os.path.join(OUT, f'{name}-a.png'))
        print('done A', name, flush=True)

    pipe.unload_lora_weights()
    for name, concept in PILOT:
        img = pipe(
            f'cute cartoon illustration of {concept}, flat design icon, single object, '
            f'centered, simple dark purple background, bold outlines, vibrant colors',
            negative_prompt=NEG,
            num_inference_steps=28,
            guidance_scale=7.5,
            height=1024,
            width=1024,
        ).images[0]
        img.resize((512, 512)).save(os.path.join(OUT, f'{name}-b.png'))
        print('done B', name, flush=True)

    rows = '\n'.join(
        f'<div class="r"><span class="t">{n}</span>'
        f'<div class="c"><img src="img-pilot/{n}-a.png"><span>A pixel</span></div>'
        f'<div class="c"><img src="img-pilot/{n}-b.png"><span>B cartoon</span></div></div>'
        for n, _ in PILOT
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Style pilot 3</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:760px;margin:20px auto;text-align:center}}
.r{{display:flex;gap:12px;align-items:center;background:#171331;border-radius:12px;padding:10px;margin:10px 0}}
.t{{width:80px;font-size:14px}}
.c{{flex:1}}
img{{width:100%;border-radius:8px}}
.c span{{font-size:12px;color:#A9A3C9}}</style></head><body>
<h1>Style pilot 3</h1><p>Same concept, two styles. Reply "A", "B", or describe changes.</p>
{rows}</body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PILOT3-READY')

if __name__ == '__main__':
    main()
