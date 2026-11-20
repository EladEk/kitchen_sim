# R189 interior porcelain floors and wall tiles: polished-surface relief and
# wipe/smudge roughness variation (colour stays the selected finish), and a
# Poly Haven laminate/parquet scan for any wood floor finish (grain neutralised).
# Sources (CC0) are downloaded to .site-private/pbr-r189-src (not committed);
# this writes JPEG fallbacks and Basis KTX2 (ETC1S colour/roughness, UASTC
# normals, full mips, multiple-of-four sizes for WebGPU) to public-view/assets/pbr-r189.
from pathlib import Path
from PIL import Image, ImageStat
import subprocess,json,hashlib
root=Path(__file__).resolve().parent.parent
src=root/'.site-private/pbr-r189-src';out=root/'public-view/assets/pbr-r189';out.mkdir(exist_ok=True)
tmp=root/'.site-private/pbr-encode-r189';tmp.mkdir(parents=True,exist_ok=True)
import os
encoder=Path(os.environ.get('BASISU',root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'))
jobs=[('Terrazzo005_1K-JPG_NormalGL.jpg','porcelain_nor_gl','normal',512),('Terrazzo005_1K-JPG_Roughness.jpg','porcelain_rough','roughness',512),
      ('laminate_floor_03_diff_1k.jpg','parquet_diff','color',1024),('laminate_floor_03_nor_gl_1k.jpg','parquet_nor_gl','normal',512),('laminate_floor_03_rough_1k.jpg','parquet_rough','roughness',512)]
rows=[]
for name,stem,channel,size in jobs:
 im=Image.open(src/name).convert('RGB');im.thumbnail((size,size),Image.Resampling.LANCZOS)
 if channel=='color':
  # Remove the mean tint: the selected stone colour stays the albedo authority.
  mean=ImageStat.Stat(im).mean;im=Image.merge('RGB',tuple(c.point(lambda v,m=m:min(255,round(236*v/max(1,m)))) for c,m in zip(im.split(),mean)))
 if channel=='roughness':
  # Multiplied by the material roughness at runtime: centre the map on a
  # factor near 1 (walls) / .8 (polished stone) and keep its variation.
  target,gain={'porcelain_rough':(226,1.5),'parquet_rough':(235,1.0)}[stem];im=im.convert('L');mean=ImageStat.Stat(im).mean[0];im=im.point(lambda v:max(0,min(255,round(target+(v-mean)*gain)))).convert('RGB')
 jpg=out/(stem+'.jpg');im.save(jpg,quality=85)
 png=tmp/(stem+'.png');im.save(png);dest=out/(stem+'.ktx2')
 args=[str(encoder),'-file',str(png),'-ktx2','-mipmap','-output_file',str(dest),'-no_multithreading']
 args+=['-uastc','-uastc_level','1','-uastc_rdo_l','1.5','-linear'] if channel=='normal' else ['-q','180']+([] if channel=='color' else ['-linear'])
 r=subprocess.run(args,stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(r.stdout.decode()[-1500:])
 rows.append({'source':name,'jpeg':jpg.name,'ktx2':dest.name,'channel':channel,'size':im.size,'source_sha256':hashlib.sha256((src/name).read_bytes()).hexdigest(),'jpeg_bytes':jpg.stat().st_size,'ktx2_bytes':dest.stat().st_size})
(out/'MANIFEST.json').write_text(json.dumps({'revision':189,'provenance':'SOURCES.json','codec':'Basis Universal ETC1S colour/roughness, UASTC linear normals, complete mip chain','textures':rows},indent=1)+'\n')
print(json.dumps(rows,indent=0))
