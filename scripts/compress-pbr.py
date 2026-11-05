from pathlib import Path
from PIL import Image, ImageStat
import subprocess,json,hashlib
root=Path(__file__).resolve().parent.parent
encoder=root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'
out=root/'public-view/assets/pbr-r113';out.mkdir(exist_ok=True)
tmp=root/'.site-private/pbr-encode';tmp.mkdir(parents=True,exist_ok=True)
rows=[]
for folder in ['pbr-r104','grass-r105']:
 for src in sorted((root/'public-view/assets'/folder).glob('*')):
  if src.suffix.lower() not in ['.jpg','.png']:continue
  im=Image.open(src).convert('RGB');source_size=im.size;im.thumbnail((1024,1024))
  # Basis may encode NPOT inputs, but WebGPU ASTC/ETC2 allocation requires
  # the base level to align to its 4x4 texel blocks. Resize all channels alike;
  # changing only the container header would corrupt the mip chain and UVs.
  aligned=tuple(max(4,((n+3)//4)*4) for n in im.size)
  if im.size!=aligned:im=im.resize(aligned,Image.Resampling.LANCZOS)
  color='diff' in src.stem or src.stem=='color';normal='nor_gl' in src.stem or src.stem=='normal'
  if color and folder!='grass-r105':
   mean=ImageStat.Stat(im).mean;channels=im.split();im=Image.merge('RGB',tuple(c.point(lambda v,m=m:min(255,round(236*v/max(1,m)))) for c,m in zip(channels,mean)))
  path=tmp/(src.stem+'.png');im.save(path)
  dest=out/(src.stem+'.ktx2');args=[str(encoder),'-file',str(path),'-ktx2','-mipmap','-output_file',str(dest),'-no_multithreading']
  args+=['-uastc','-uastc_level','1','-linear'] if normal else ['-q','180']+([] if color else ['-linear'])
  result=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
  if result.returncode:raise RuntimeError(result.stdout.decode()[-1500:])
  rows.append({'source':str(src.relative_to(root)),'output':str(dest.relative_to(root)),'channel':'color' if color else 'normal' if normal else 'roughness','source_sha256':hashlib.sha256(src.read_bytes()).hexdigest(),'sha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'source_size':source_size,'size':im.size})
(out/'MANIFEST.json').write_text(json.dumps({'revision':119,'source_provenance':['../pbr-r104/SOURCES.json','../grass-r105/SOURCES.json'],'codec':'Basis Universal ETC1S color/roughness, UASTC linear normals, complete mip chain','dimension_preparation':'All channels resampled to common multiple-of-four base dimensions before encoding for WebGPU ASTC/ETC2; original source photographs are unchanged.','color_preparation':'Neutralized scan albedo using the existing material controller method; grass retains original albedo. Product photographs are unchanged.','textures':rows},indent=2))
print('Compressed',len(rows),'maps;',sum(r['bytes'] for r in rows),'bytes')
