# R183 scanned PBR additions: interior painted plaster and the kitchen worktop.
# Sources (CC0) are downloaded to .site-private/pbr-r183-src (not committed);
# this writes JPEG fallbacks and Basis KTX2 (ETC1S colour/roughness, UASTC
# normals, full mips, multiple-of-four sizes for WebGPU) to public-view/assets/pbr-r183.
from pathlib import Path
from PIL import Image, ImageStat
import subprocess,json,hashlib
root=Path(__file__).resolve().parent.parent
src=root/'.site-private/pbr-r183-src';out=root/'public-view/assets/pbr-r183';out.mkdir(exist_ok=True)
tmp=root/'.site-private/pbr-encode-r183';tmp.mkdir(parents=True,exist_ok=True)
import os
encoder=Path(os.environ.get('BASISU',root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'))
jobs=[('painted_plaster_wall_nor_gl.jpg','plaster_nor_gl','normal',1024),('painted_plaster_wall_rough.jpg','plaster_rough','roughness',512),
      ('Marble014_1K-JPG_Color.jpg','worktop_diff','color',1024),('Marble014_1K-JPG_NormalGL.jpg','worktop_nor_gl','normal',1024),('Marble014_1K-JPG_Roughness.jpg','worktop_rough','roughness',512)]
rows=[]
for name,stem,channel,size in jobs:
 im=Image.open(src/name).convert('RGB');im.thumbnail((size,size),Image.Resampling.LANCZOS)
 if channel=='color':
  # Remove the mean tint: the selected stone colour stays the albedo authority.
  mean=ImageStat.Stat(im).mean;im=Image.merge('RGB',tuple(c.point(lambda v,m=m:min(255,round(236*v/max(1,m)))) for c,m in zip(im.split(),mean)))
 jpg=out/(stem+'.jpg');im.save(jpg,quality=85)
 png=tmp/(stem+'.png');im.save(png);dest=out/(stem+'.ktx2')
 args=[str(encoder),'-file',str(png),'-ktx2','-mipmap','-output_file',str(dest),'-no_multithreading']
 args+=['-uastc','-uastc_level','1','-uastc_rdo_l','1.5','-linear'] if channel=='normal' else ['-q','180']+([] if channel=='color' else ['-linear'])
 r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(r.stdout.decode()[-1500:])
 rows.append({'source':name,'jpeg':jpg.name,'ktx2':dest.name,'channel':channel,'size':im.size,'source_sha256':hashlib.sha256((src/name).read_bytes()).hexdigest(),'jpeg_bytes':jpg.stat().st_size,'ktx2_bytes':dest.stat().st_size})
(out/'MANIFEST.json').write_text(json.dumps({'revision':183,'provenance':'SOURCES.json','codec':'Basis Universal ETC1S colour/roughness, UASTC linear normals, complete mip chain','textures':rows},indent=1)+'\n')
print(json.dumps(rows,indent=0))
