"""R153 photoreal surface scans: download CC0 sources, prepare tint-neutral albedo,
encode KTX2 + JPEG fallbacks and record provenance and mean linear albedo.

Usage: python3 scripts/prepare-pbr-r153.py
Requires Pillow + numpy and the basisu binary from @gpu-tex-enc/basis (npm ci).
"""
from pathlib import Path
from PIL import Image
import numpy as np, subprocess, json, hashlib, urllib.request, zipfile, io

root=Path(__file__).resolve().parent.parent
encoder=root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'
out=root/'public-view/assets/pbr-r153';out.mkdir(parents=True,exist_ok=True)
cache=root/'.site-private/pbr-r153-src';cache.mkdir(parents=True,exist_ok=True)
PH='https://dl.polyhaven.org/file/ph-assets/Textures/jpg/1k/{a}/{a}_{c}_1k.jpg'
ACG='https://ambientcg.com/get?file={a}_1K-JPG.zip'
# name, source, asset, physical width (m), {channel: (source channel, output px, contrast)}
SETS=[
 ('plaster_grey_04','Poly Haven','plaster_grey_04',1.5,{'color':('diff',1024,.3,(10,.15))}),
 ('white_plaster_02','Poly Haven','white_plaster_02',1.0,{'color':('diff',1024,.25,(12,.15))}),
 ('marble_012','ambientCG','Marble012',1.6,{'color':('Color',1024,.45)}),
 ('smooth_concrete_floor','Poly Haven','smooth_concrete_floor',2.0,{'color':('diff',1024,.22,(28,.3)),'normal':('nor_gl',512,None),'roughness':('rough',512,None)}),
]
def fetch(url,dest):
 if not dest.exists():
  req=urllib.request.Request(url,headers={'User-Agent':'HomeStudio-asset-prep'})
  dest.write_bytes(urllib.request.urlopen(req,timeout=60).read())
 return dest
def source_file(src,asset,ch):
 if src=='Poly Haven':
  url=PH.format(a=asset,c=ch);return fetch(url,cache/f'{asset}_{ch}_1k.jpg'),url
 url=ACG.format(a=asset);z=fetch(url,cache/f'{asset}_1K-JPG.zip')
 name=f'{asset}_1K-JPG_{ch}.jpg';dest=cache/name
 if not dest.exists():dest.write_bytes(zipfile.ZipFile(z).read(name))
 return dest,url+'#'+name
def periodic_blur(a,sigma):
 # FFT Gaussian wraps at the edges, so seamless scans stay seamless.
 fy=np.fft.fftfreq(a.shape[0])[:,None];fx=np.fft.fftfreq(a.shape[1])[None,:]
 return np.real(np.fft.ifft2(np.fft.fft2(a)*np.exp(-2*(np.pi*sigma)**2*(fx*fx+fy*fy))))
def linear(a):return np.where(a<=.04045,a/12.92,((a+.055)/1.055)**2.4)
sources=[];textures=[]
for name,src,asset,metres,channels in SETS:
 entry={'asset':asset,'source':src,'official_page':('https://polyhaven.com/a/'+asset) if src=='Poly Haven' else 'https://ambientcg.com/view?id='+asset,'license':'CC0-1.0','license_source':'https://polyhaven.com/license' if src=='Poly Haven' else 'https://docs.ambientcg.com/license/','physical_width_m':metres,'files':[]}
 for channel,spec in channels.items():
  ch,size,contrast=spec[:3];highpass=spec[3] if len(spec)>3 else None
  path,url=source_file(src,asset,ch);raw=path.read_bytes()
  im=Image.open(path).convert('RGB');im=im.resize((size,size),Image.Resampling.LANCZOS)
  row={'channel':channel,'url':url,'source_sha256':hashlib.sha256(raw).hexdigest(),'size':[size,size]}
  if channel=='color':
   # Neutralize the scan tint (mean -> sRGB 224, greyscale, as compress-pbr.py) and keep
   # only a restrained share of its local variation: the finish colour chosen in
   # the model stays the albedo authority, the scan adds grain and mottling.
   a=np.asarray(im).astype(np.float64);lum=(a*[.2126,.7152,.0722]).sum(2,keepdims=True);lm=lum.mean()
   if highpass:
    # Painted walls are uniform at room scale: suppress weathering stains (low
    # frequencies) and keep the fine plaster/roller grain.
    radius,keep=highpass;blur=periodic_blur(lum[...,0],radius)[...,None]
    lum=lum-blur*(1-keep)+lm*(1-keep)
   dev=(lum-lm)/max(1,lm)*contrast
   # Grey detail only, with headroom so highlights do not clip above white.
   b=np.clip(224*(1+dev),0,255).repeat(3,2);im=Image.fromarray(b.round().astype(np.uint8))
   row['colorMean']=[round(float(v),6) for v in linear(np.asarray(im)/255.).reshape(-1,3).mean(0)]
   row['contrast']=contrast
   if highpass:row['highpass_blur_px_and_low_frequency_kept']=list(highpass)
  stem=f'{name}_{channel}';jpg=out/(stem+'.jpg');im.save(jpg,quality=88,optimize=True)
  png=cache/(stem+'.png');im.save(png);ktx=out/(stem+'.ktx2')
  args=[str(encoder),'-file',str(png),'-ktx2','-mipmap','-output_file',str(ktx),'-no_multithreading']
  args+=['-uastc','-uastc_level','1','-uastc_rdo_l','1.0','-linear'] if channel=='normal' else ['-q','190']+([] if channel=='color' else ['-linear'])
  r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  if r.returncode:raise RuntimeError(r.stdout.decode()[-1500:])
  for f in (jpg,ktx):row[f.suffix[1:]]={'path':str(f.relative_to(root)),'bytes':f.stat().st_size,'sha256':hashlib.sha256(f.read_bytes()).hexdigest()}
  entry['files'].append(row);textures.append(row)
 sources.append(entry)
(out/'SOURCES.json').write_text(json.dumps({'revision':153,'purpose':'Photoreal wall, ceiling, floor and cement surface detail. CC0 scans only; finish colours remain authoritative.','preparation':'Albedo neutralized to greyscale sRGB mean 224 with reduced local contrast; colorMean is the linear mean of the prepared map for tint-preserving gain. Normals OpenGL tangent space (UASTC), roughness linear (ETC1S), colour sRGB (ETC1S). JPEG fallbacks match the KTX2 sources.','assets':sources},indent=1)+'\n')
print('Prepared',len(textures),'maps;',sum(t['ktx2']['bytes'] for t in textures),'KTX2 bytes,',sum(t['jpg']['bytes'] for t in textures),'JPEG bytes')
for t in textures:
 if 'colorMean' in t:print(t['ktx2']['path'],t['colorMean'])
