# Production flashcard image generation.
# Style: s3 clean light studio (user-selected), s1 dark studio as retry fallback.
# Every image is CLIP-verified against its concept; failures retry with new
# seeds/style, persistent failures keep their emoji.
# Resumable via scripts/img-state.json. Output: public/img/zh/<id>.webp (256px).
import json
import os
import re

import torch
from diffusers import StableDiffusionXLPipeline
from PIL import Image
from tqdm import tqdm
from transformers import CLIPModel, CLIPProcessor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
OUT = os.path.join(ROOT, 'public', 'img', 'zh')
STATE = os.path.join(ROOT, 'scripts', 'img-state.json')

S3 = ('clean bright light gray studio background, soft drop shadow under the subject, '
      'minimal, premium product photography style')
S1 = ('dark charcoal studio background, soft circular spotlight glow behind the subject, '
      'product launch keynote lighting, premium')
NEG = ('blurry, photo, realistic, multiple objects, pattern, tiled, cluttered, '
      'text, watermark, deformed, cropped, cut off, partial, out of frame, frame, border')

# Function words and grammar items get no image (emoji stays).
SKIP_GLOSS = re.compile(
    r'particle|classifier|measure word|auxiliary|conjunction|preposition|'
    r'\bprefix\b|\bsuffix\b|interjection|grammat|\(used', re.I)

def concept_of(gloss):
    c = gloss.split(';')[0]
    c = re.sub(r'\(.*?\)', '', c).strip().rstrip('.,!?')
    return c

def items():
    out = []
    with open(os.path.join(ROOT, 'src', 'data', 'zh-hsk.json'), encoding='utf-8') as f:
        out += json.load(f)['items']
    import subprocess
    subprocess.run(['node', '-e',
                    "const {zhSurvival}=require('./scripts/.content-build/zh-survival.js');"
                    "require('fs').writeFileSync('scripts/.surv-full.json',"
                    "JSON.stringify(zhSurvival.items))"], cwd=ROOT, check=True, shell=True)
    with open(os.path.join(ROOT, 'scripts', '.surv-full.json'), encoding='utf-8') as f:
        out += json.load(f)
    return [it for it in out
            if not SKIP_GLOSS.search(it['gloss']) and len(concept_of(it['gloss'])) >= 3]

def main():
    os.makedirs(OUT, exist_ok=True)
    state = {'done': [], 'failed': []}
    if os.path.exists(STATE):
        with open(STATE, encoding='utf-8') as f:
            state = json.load(f)
    done = set(state['done'])
    todo = [it for it in items() if it['id'] not in done]
    print(f'{len(todo)} images to generate ({len(done)} done)', flush=True)
    if not todo:
        print('ALL-IMAGES-DONE')
        return

    pipe = StableDiffusionXLPipeline.from_pretrained(
        'stabilityai/stable-diffusion-xl-base-1.0',
        torch_dtype=torch.float16, variant='fp16', use_safetensors=True)
    pipe.load_lora_weights('nerijs/pixel-art-xl')
    pipe.enable_model_cpu_offload()
    pipe.set_progress_bar_config(disable=True)

    clip = CLIPModel.from_pretrained('openai/clip-vit-base-patch32')
    clip_proc = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')
    clip.eval()

    def clip_ok(img, concept):
        with torch.no_grad():
            inputs = clip_proc(text=[f'pixel art of {concept}'], images=img,
                               return_tensors='pt', padding=True)
            ie = clip.get_image_features(pixel_values=inputs['pixel_values'])
            te = clip.get_text_features(input_ids=inputs['input_ids'],
                                        attention_mask=inputs['attention_mask'])
            sim = torch.nn.functional.cosine_similarity(ie, te).item()
        return sim >= 0.26, sim

    progress = tqdm(todo, desc='images', unit='img', mininterval=5)
    for n, it in enumerate(progress):
        concept = concept_of(it['gloss'])
        saved = False
        attempts = [(S3, None), (S3, 1234), (S1, None)]
        for style, seed in attempts:
            gen = torch.Generator().manual_seed(seed) if seed else None
            img = pipe(
                f'pixel art, {concept}, single object, whole subject fully visible '
                f'with margin around it, centered, {style}',
                negative_prompt=NEG, num_inference_steps=25, guidance_scale=7.5,
                height=1024, width=1024, generator=gen,
            ).images[0]
            ok, sim = clip_ok(img, concept)
            if ok:
                img.resize((256, 256), Image.LANCZOS).save(
                    os.path.join(OUT, f"{it['id']}.webp"), 'WEBP', quality=82)
                saved = True
                break
        if not saved:
            state['failed'].append({'id': it['id'], 'concept': concept, 'sim': round(sim, 3)})
        state['done'].append(it['id'])
        if (n + 1) % 10 == 0:
            progress.set_postfix(failed=len(state['failed']))
            with open(STATE, 'w', encoding='utf-8') as f:
                json.dump(state, f, ensure_ascii=False)

    with open(STATE, 'w', encoding='utf-8') as f:
        json.dump(state, f, ensure_ascii=False)
    print(f"chunk done, failed so far: {len(state['failed'])}", flush=True)

if __name__ == '__main__':
    main()
