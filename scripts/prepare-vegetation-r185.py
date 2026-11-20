#!/usr/bin/env python3
"""R185 vegetation impostor atlases from CC0 Poly Haven plants.
1. node scripts/vegetation-impostors/render.mjs jacaranda_tree .site-private/veg-out/jacaranda_tree.png 512
   node scripts/vegetation-impostors/render.mjs searsia_lucida .site-private/veg-out/searsia_lucida.png 512 searsia_lucida_c_LOD0
2. python3 scripts/prepare-vegetation-r185.py
Bleeds colour into transparent texels (no dark halos in mips), writes a WebP
fallback and an ETC1S+alpha KTX2 (y-flipped to match image UV orientation)."""
import json,os,subprocess,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1];src=root/'.site-private/veg-out';out=root/'public-view/assets/vegetation-r185';out.mkdir(parents=True,exist_ok=True)
encoder=Path(os.environ.get('BASISU',root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'))
ATLASES={'jacaranda_tree':{'stem':'tree_jacaranda','R':12.452695198059082,'H':19.663563786000015},'searsia_lucida':{'stem':'shrub_searsia','R':0.769549115896225,'H':1.696638688184321,'node':'searsia_lucida_c_LOD0'}}
rows=[]
def box(x,r):
 # Separable box blur with edge padding.
 for axis in (0,1):
  p=np.pad(x,[(r+1,r) if i==axis else (0,0) for i in range(2)],mode='edge');c=np.cumsum(p,axis=axis)
  x=(np.take(c,range(2*r+1,c.shape[axis]),axis=axis)-np.take(c,range(0,c.shape[axis]-2*r-1),axis=axis))/(2*r+1)
 return x
for name,a in ATLASES.items():
 im=Image.open(src/(name+'.png')).convert('RGBA');px=np.asarray(im).astype(np.float32);alpha=px[...,3]/255
 # Hard-ish edge: impostors are alpha-tested at .5; keep soft coverage for alphaToCoverage.
 rgb=px[...,:3]*alpha[...,None];w=alpha.copy()
 acc_rgb,acc_w=rgb.copy(),w.copy()
 for radius in (2,4,8,16,32):
  b=lambda x:box(x,radius)
  br=np.stack([b(rgb[...,c]) for c in range(3)],-1);bw=b(w)
  fill=(acc_w<1e-3)&(bw>1e-4);acc_rgb[fill]=br[fill];acc_w[fill]=bw[fill]
 colour=np.where(alpha[...,None]>0,px[...,:3],acc_rgb/np.maximum(acc_w,1e-4)[...,None])
 colour[acc_w<1e-4]=np.average(px[...,:3][alpha>.5],axis=0)
 result=Image.fromarray(np.concatenate([np.clip(colour,0,255),px[...,3:4]],-1).astype(np.uint8),'RGBA')
 webp=out/(a['stem']+'.webp');result.save(webp,quality=88,method=6)
 png=src/(a['stem']+'.png');result.save(png);dest=out/(a['stem']+'.ktx2')
 r=subprocess.run([str(encoder),'-file',str(png),'-ktx2','-mipmap','-y_flip','-q','200','-output_file',str(dest),'-no_multithreading'],stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(r.stdout.decode()[-1500:])
 rows.append({'source':name,**({'node':a['node']} if 'node' in a else {}),'webp':webp.name,'ktx2':dest.name,'size':result.size,'tiles':['side 0deg','side 60deg','side 120deg','top'],'radius_m':a['R'],'height_m':a['H'],'render_sha256':hashlib.sha256((src/(name+'.png')).read_bytes()).hexdigest(),'webp_bytes':webp.stat().st_size,'ktx2_bytes':dest.stat().st_size})
(out/'MANIFEST.json').write_text(json.dumps({'revision':185,'provenance':'SOURCES.json','codec':'Basis Universal ETC1S with alpha, complete mip chain, y-flipped','layout':'2x2 atlas: top-left side 0deg, top-right side 60deg, bottom-left side 120deg, bottom-right top view; orthographic, tile spans [-R,R] x [0,H] (sides) and [-R,R]^2 (top)','atlases':rows},indent=1)+'\n')
print(json.dumps(rows,indent=0))
