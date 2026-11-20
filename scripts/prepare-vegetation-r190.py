#!/usr/bin/env python3
"""R190 vegetation textures (edge-clean impostors + hedge atlas).
1. node scripts/vegetation-impostors/render.mjs ... (R185 tree/shrub renders, see prepare-vegetation-r185.py)
   node scripts/vegetation-impostors/render-hedge.mjs color .site-private/veg-out/hedge_color.png
   node scripts/vegetation-impostors/render-hedge.mjs normal .site-private/veg-out/hedge_normal.png
2. python3 scripts/prepare-vegetation-r190.py
Edge fix: every texel that is not fully opaque takes the colour bled from the
opaque interior (so antialiased/mip-filtered edges never pull in the dark
render background), and alpha is steepened around the 0.5 cut-off so the
alpha-tested silhouette is crisp at every mip."""
import json,os,subprocess,hashlib
from pathlib import Path
from PIL import Image
import numpy as np
root=Path(__file__).resolve().parents[1];src=root/'.site-private/veg-out'
encoder=Path(os.environ.get('BASISU',root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'))
def box(x,r):
 for axis in (0,1):
  p=np.pad(x,[(r+1,r) if i==axis else (0,0) for i in range(2)],mode='edge');c=np.cumsum(p,axis=axis)
  x=(np.take(c,range(2*r+1,c.shape[axis]),axis=axis)-np.take(c,range(0,c.shape[axis]-2*r-1),axis=axis))/(2*r+1)
 return x
def bleed(rgb,solid):
 acc_rgb=np.where(solid[...,None],rgb,0.);acc_w=solid.astype(np.float32);w=acc_w.copy();base=acc_rgb.copy()
 for radius in (1,2,4,8,16,32,64):
  bw=box(w,radius);fill=(acc_w<1e-3)&(bw>1e-4)
  if fill.any():
   br=np.stack([box(base[...,c],radius) for c in range(3)],-1);acc_rgb[fill]=br[fill]/bw[fill][...,None];acc_w[fill]=1
 acc_rgb[acc_w<1e-3]=rgb[solid].mean(0) if solid.any() else 128
 return acc_rgb
def clean(path,steep=True,normal=False):
 px=np.asarray(Image.open(path).convert('RGBA')).astype(np.float32);a=px[...,3]/255
 solid=a>=.9;rgb=np.where(solid[...,None],px[...,:3],bleed(px[...,:3],solid))
 if normal:
  n=rgb/127.5-1;n/=np.maximum(np.linalg.norm(n,axis=-1,keepdims=True),1e-4);rgb=(n+1)*127.5
 alpha=np.clip((a-.5)*2.5+.5,0,1) if steep else a
 return Image.fromarray(np.concatenate([np.clip(rgb,0,255),alpha[...,None]*255],-1).round().astype(np.uint8),'RGBA')
def encode(im,dest,linear=False,alpha=True):
 tmp=src/(dest.stem+'-enc.png');(im if alpha else im.convert('RGB')).save(tmp)
 r=subprocess.run([str(encoder),'-file',str(tmp),'-ktx2','-mipmap','-y_flip','-q','200','-output_file',str(dest),'-no_multithreading']+(['-linear'] if linear else []),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(r.stdout.decode()[-1500:])
rows=[]
# R185 impostors, edge-cleaned in place (same layout, same file names).
old=root/'public-view/assets/vegetation-r185'
for name,stem in (('jacaranda_tree','tree_jacaranda'),('searsia_lucida','shrub_searsia')):
 im=clean(src/(name+'.png'));im.save(old/(stem+'.webp'),quality=88,method=6);encode(im,old/(stem+'.ktx2'))
 rows.append({'atlas':stem,'render_sha256':hashlib.sha256((src/(name+'.png')).read_bytes()).hexdigest(),'webp_bytes':(old/(stem+'.webp')).stat().st_size,'ktx2_bytes':(old/(stem+'.ktx2')).stat().st_size})
m=json.loads((old/'MANIFEST.json').read_text());m['edgeCleanup']={'revision':190,'script':'scripts/prepare-vegetation-r190.py','atlases':rows};(old/'MANIFEST.json').write_text(json.dumps(m,indent=1)+'\n')
# R190 hedge atlas: colour+alpha 1024 px, normal 512 px.
out=root/'public-view/assets/vegetation-r190';out.mkdir(parents=True,exist_ok=True);hedge=[]
c=clean(src/'hedge_color.png');c.save(out/'hedge_color.webp',quality=88,method=6);encode(c,out/'hedge_color.ktx2')
n=clean(src/'hedge_normal.png',steep=False,normal=True).convert('RGB').resize((512,512),Image.Resampling.LANCZOS);n.save(out/'hedge_normal.webp',quality=90,method=6);encode(n,out/'hedge_normal.ktx2',linear=True,alpha=False)
for f in ('hedge_color','hedge_normal'):hedge.append({'texture':f,'render_sha256':hashlib.sha256((src/(f+'.png')).read_bytes()).hexdigest(),'webp_bytes':(out/(f+'.webp')).stat().st_size,'ktx2_bytes':(out/(f+'.ktx2')).stat().st_size})
(out/'MANIFEST.json').write_text(json.dumps({'revision':190,'provenance':'SOURCES.json','codec':'Basis Universal ETC1S (colour with alpha; normal linear), complete mip chain, y-flipped','layout':'1024x1024: top 1024x640 = front view, x 0..2 m, y 0..1.3 m; bottom 1024x384 = top view, x 0..2 m, z -0.4..0.4 m; both wrap horizontally','textures':hedge},indent=1)+'\n')
print(json.dumps({'impostors':rows,'hedge':hedge},indent=0))
