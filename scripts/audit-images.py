# Contrastive CLIP audit of generated card images. An image survives only if
# CLIP thinks it depicts its concept BETTER than generic decoys (potted plant,
# sphere, abstract blob) — catches the meaningless filler SDXL produces for
# abstract words. Dropped images move to scripts/.img-dropped for records.
import json
import os
import re
import shutil

import torch
from PIL import Image
from tqdm import tqdm
from transformers import CLIPModel, CLIPProcessor

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
IMG = os.path.join(ROOT, 'public', 'img', 'zh')
DROPPED = os.path.join(ROOT, 'scripts', '.img-dropped')

def concept_of(gloss):
    c = gloss.split(';')[0]
    c = re.sub(r'\(.*?\)', '', c).strip().rstrip('.,!?')
    return c

def main():
    os.makedirs(DROPPED, exist_ok=True)
    items = {}
    with open(os.path.join(ROOT, 'src', 'data', 'zh-hsk.json'), encoding='utf-8') as f:
        for it in json.load(f)['items']:
            items[it['id']] = it
    with open(os.path.join(ROOT, 'scripts', '.surv-full.json'), encoding='utf-8') as f:
        for it in json.load(f):
            items[it['id']] = it

    device = 'cuda' if torch.cuda.is_available() else 'cpu'
    clip = CLIPModel.from_pretrained('openai/clip-vit-base-patch32').to(device).eval()
    proc = CLIPProcessor.from_pretrained('openai/clip-vit-base-patch32')

    DECOYS = [
        'a small potted plant, pixel art',
        'a plain sphere, pixel art',
        'an abstract blob shape, pixel art',
        'a random decorative object, pixel art',
    ]

    files = [f for f in os.listdir(IMG) if f.endswith('.webp')]
    kept, dropped = 0, []
    for f in tqdm(files, desc='img-audit', unit='img', mininterval=3):
        wid = f[:-5]
        it = items.get(wid)
        if not it:
            continue
        concept = concept_of(it['gloss'])
        img = Image.open(os.path.join(IMG, f)).convert('RGB')
        texts = [f'pixel art of {concept}'] + DECOYS
        with torch.no_grad():
            inputs = proc(text=texts, images=img, return_tensors='pt', padding=True).to(device)
            logits = clip(**inputs).logits_per_image.softmax(dim=1)[0]
        if logits[0].item() >= 0.45:
            kept += 1
        else:
            shutil.move(os.path.join(IMG, f), os.path.join(DROPPED, f))
            dropped.append({'id': wid, 'concept': concept, 'p': round(logits[0].item(), 3)})

    with open(os.path.join(ROOT, 'scripts', 'img-dropped.json'), 'w', encoding='utf-8') as f:
        json.dump(dropped, f, ensure_ascii=False, indent=1)
    print(f'kept {kept}, dropped {len(dropped)} -> scripts/img-dropped.json')

if __name__ == '__main__':
    main()
