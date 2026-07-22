# Style pilot 5: pixel subjects, three big-tech launch background styles.
#   s1 studio  - dark studio, soft spotlight glow, floating product look
#   s2 aurora  - smooth cyan/violet/magenta gradient backdrop
#   s3 light   - bright minimal studio, soft shadow (matches light card faces)
import os

import torch
from diffusers import StableDiffusionXLPipeline

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

STYLES = {
    's1': ('dark charcoal studio background, soft circular spotlight glow behind the subject, '
           'product launch keynote lighting, subtle floor reflection, dramatic, premium'),
    's2': ('smooth aurora gradient background, cyan to violet to magenta, soft glowing backdrop, '
           'tech launch event style, premium'),
    's3': ('clean bright light gray studio background, soft drop shadow under the subject, '
           'minimal, premium product photography style'),
}

NEG = ('blurry, photo, realistic, multiple objects, pattern, tiled, cluttered, '
      'text, watermark, deformed, cropped, cut off, partial, out of frame, frame, border')

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
        for sid, bg in STYLES.items():
            img = pipe(
                f'pixel art, {concept}, single object, whole subject fully visible with '
                f'margin around it, centered, {bg}',
                negative_prompt=NEG,
                num_inference_steps=28,
                guidance_scale=7.5,
                height=1024,
                width=1024,
            ).images[0].resize((512, 512))
            img.save(os.path.join(OUT, f'{name}-{sid}.png'))
        print('done', name, flush=True)

    rows = '\n'.join(
        f'<div class="r"><span class="t">{n}</span>'
        + ''.join(
            f'<div class="c"><img src="img-pilot/{n}-{sid}.png?v=5"><span>{sid} {label}</span></div>'
            for sid, label in [('s1', 'studio'), ('s2', 'aurora'), ('s3', 'light')]
        )
        + '</div>'
        for n, _ in PILOT
    )
    html = f"""<!DOCTYPE html><html><head><meta charset="utf-8"><title>Style pilot 5</title><style>
body{{background:#0E0B1E;color:#F4F2FF;font-family:sans-serif;max-width:900px;margin:20px auto;text-align:center}}
.r{{display:flex;gap:10px;align-items:center;background:#171331;border-radius:12px;padding:10px;margin:10px 0}}
.t{{width:70px;font-size:14px}}
.c{{flex:1}}
img{{width:100%;border-radius:8px}}
.c span{{font-size:12px;color:#A9A3C9}}</style></head><body>
<h1>Pilot 5: launch-event backgrounds</h1>
<p>s1 studio spotlight, s2 aurora gradient, s3 clean light. Reply with the style id or changes.</p>
{rows}</body></html>"""
    with open(os.path.join(ROOT, 'public', 'image-pilot.html'), 'w', encoding='utf-8') as f:
        f.write(html)
    print('PILOT5-READY')

if __name__ == '__main__':
    main()
