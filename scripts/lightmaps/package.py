#!/usr/bin/env python3
"""R188 lightmap pilot, step 3: compress the Blender bake for the browser.
python3 scripts/lightmaps/package.py <bake_dir> <floor> <unit>
Writes public-view/assets/lightmaps-r188/f<floor>-u<unit>/{indirect,ao}.{ktx2,png}
and uv2.json (per receiver key: per-corner UV1 in de-indexed triangle order)."""
import json,os,sys,subprocess,hashlib
from pathlib import Path
from PIL import Image
root=Path(__file__).resolve().parents[2];bake=Path(sys.argv[1]);floor,unit=sys.argv[2],sys.argv[3]
out=root/f'public-view/assets/lightmaps-r188/f{floor}-u{unit}';out.mkdir(parents=True,exist_ok=True)
enc=os.environ.get('BASISU',str(root/'node_modules/@gpu-tex-enc/basis/bin/linux-x64/basisu'))
rows=[]
for name,linear in (('indirect',False),('ao',True)):
 im=Image.open(bake/(name+'.png')).convert('L' if linear else 'RGB');png=out/(name+('.png' if linear else '.jpg'));im.save(png,optimize=True,**({} if linear else {'quality':90}))
 tmp=bake/(name+'-enc.png');im.convert('RGB').save(tmp);dest=out/(name+'.ktx2')
 r=subprocess.run([enc,'-file',str(tmp),'-ktx2','-mipmap','-y_flip','-q','220','-output_file',str(dest),'-no_multithreading']+(['-linear'] if linear else []),stdout=subprocess.PIPE,stderr=subprocess.STDOUT)
 if r.returncode:raise RuntimeError(r.stdout.decode()[-1200:])
 rows.append({'name':name,'size':im.size,'colorSpace':'linear' if linear else 'srgb','png_bytes':png.stat().st_size,'ktx2_bytes':dest.stat().st_size})
uv=json.load(open(bake/'uv2.json'));(out/'uv2.json').write_text(json.dumps({'revision':188,'floor':int(floor),'unit':int(unit),'size':uv['size'],'samples':uv['samples'],'irradianceScale':uv['irradianceScale'],'irradianceMean':uv['irradianceMean'],'receivers':uv['receivers']},separators=(',',':')))
(out/'MANIFEST.json').write_text(json.dumps({'revision':188,'baker':'Blender 4.2.3 LTS Cycles (CPU), uniform white sky, DIFFUSE direct+indirect without albedo, AO 0.6 m','floor':int(floor),'unit':int(unit),'receivers':len(uv['receivers']),'textures':rows,'uv2_sha256':hashlib.sha256((out/'uv2.json').read_bytes()).hexdigest()},indent=1)+'\n')
print(json.dumps(rows))
