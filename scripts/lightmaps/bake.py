# R188 baked-lightmap pilot, step 2 (Blender 4.2, headless):
#   blender -b --python scripts/lightmaps/bake.py -- <apartment.json> <out_dir> [size] [samples]
# Builds the extracted apartment, packs ONE lightmap UV atlas over all receivers
# (Smart UV Project, uniform texel density), and bakes with Cycles under a
# uniform white sky (orientation-agnostic, so the same bake serves every
# rotated/reflected copy of the building):
#   indirect.png  diffuse irradiance (direct sky + bounces, no albedo), scaled
#   ao.png        ambient occlusion (0.6 m)
# plus uv2.json: per receiver key, the per-vertex lightmap UVs.
import bpy,bmesh,json,sys,os,math
argv=sys.argv[sys.argv.index('--')+1:];src,out=argv[0],argv[1];size=int(argv[2]) if len(argv)>2 else 1024;samples=int(argv[3]) if len(argv)>3 else 64
os.makedirs(out,exist_ok=True);data=json.load(open(src))
bpy.ops.wm.read_factory_settings(use_empty=True);scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=samples;scene.cycles.use_denoising=False
world=bpy.data.worlds.new('sky');scene.world=world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs['Color'].default_value=(1,1,1,1);world.node_tree.nodes['Background'].inputs['Strength'].default_value=1.0
def rgb(c):return ((c>>16&255)/255,(c>>8&255)/255,(c&255)/255)
def material(colour,bake_image=None):
 m=bpy.data.materials.new('m');m.use_nodes=True;b=m.node_tree.nodes['Principled BSDF'];r,g,bl=rgb(colour);lin=lambda v:v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4
 b.inputs['Base Color'].default_value=(lin(r),lin(g),lin(bl),1);b.inputs['Roughness'].default_value=.9
 if bake_image:t=m.node_tree.nodes.new('ShaderNodeTexImage');t.image=bake_image;m.node_tree.nodes.active=t
 return m
def build(meshes,name,mat,weld=False):
 bm=bmesh.new();ranges=[];tris=[];src_layer=bm.faces.layers.int.new('src')
 for k,mm in enumerate(meshes):
  p=mm['positions'];base=len(bm.verts);vs=[bm.verts.new((p[i],-p[i+2],p[i+1])) for i in range(0,len(p),3)];bm.verts.ensure_lookup_table()
  idx=mm['index'] or list(range(len(vs)))
  for i in range(0,len(idx),3):
   try:fc=bm.faces.new((vs[idx[i]],vs[idx[i+1]],vs[idx[i+2]]));fc[src_layer]=len(tris);tris.append((k,True))
   except ValueError:tris.append((k,False))
  ranges.append((base,len(vs)))
 if weld:bmesh.ops.remove_doubles(bm,verts=bm.verts,dist=2e-4)
 me=bpy.data.meshes.new(name);bm.to_mesh(me);bm.free();ob=bpy.data.objects.new(name,me);scene.collection.objects.link(ob);
 if mat:me.materials.append(mat)
 build.tris=tris;return ob,ranges
receivers=[m for m in data['meshes'] if m['receiver']];occluders=[m for m in data['meshes'] if not m['receiver']]
for i,m in enumerate(occluders):
 ob,_=build([m],f'occ{i}',material(m['colour']))
img=bpy.data.images.new('lm',size,size,float_buffer=True)
rec,ranges=build(receivers,'receivers',None,weld=True);recTris=build.tris
# One material per receiver colour, all writing the same bake image.
cols={};rec.data.materials.clear()
for k,m in enumerate(receivers):
 if m['colour'] not in cols:cols[m['colour']]=len(cols);rec.data.materials.append(material(m['colour'],img))
srcattr=rec.data.attributes['src'].data
for p in rec.data.polygons:p.material_index=cols[receivers[recTris[srcattr[p.index].value][0]]['colour']]
uv=rec.data.uv_layers.new(name='lm');rec.data.uv_layers.active=uv
def unwrap(only=None):
 bpy.context.view_layer.objects.active=rec;rec.select_set(True)
 if only is not None:
  for p in rec.data.polygons:p.select=only[p.index]
 bpy.ops.object.mode_set(mode='EDIT')
 if only is None:bpy.ops.mesh.select_all(action='SELECT')
 bpy.ops.uv.smart_project(angle_limit=math.radians(60),island_margin=0.003,area_weight=0.0,correct_aspect=True,scale_to_bounds=False)
 bpy.ops.uv.pack_islands(margin=0.003,rotate=True,rotate_method='CARDINAL',shape_method='AABB',scale=True,margin_method='FRACTION')
 bpy.ops.object.mode_set(mode='OBJECT')
 if only is not None:
  lm=rec.data.uv_layers['lm']
  for p in rec.data.polygons:
   if not only[p.index]:
    for li in p.loop_indices:lm.data[li].uv=(0.001,0.001)
unwrap()
def bake(kind,file,**kw):
 for p in img.pixels[:0]:pass
 bpy.ops.object.select_all(action='DESELECT');rec.select_set(True);bpy.context.view_layer.objects.active=rec
 bpy.ops.object.bake(type=kind,margin=4,margin_type='EXTEND',use_clear=True,**kw)
 px=list(img.pixels);return px
# Pass 1: coarse AO to find triangles buried inside walls/slabs; they get no
# atlas space (their UV collapses to a corner texel) before the real bake.
scene.world.light_settings.distance=.6
full=img;img=bpy.data.images.new('probe',256,256,float_buffer=True)
for m in rec.data.materials:m.node_tree.nodes.active.image=img
probe=bake('AO','probe');lm=rec.data.uv_layers['lm'];visible=[]
for p in rec.data.polygons:
 u=sum(lm.data[li].uv[0] for li in p.loop_indices)/3;v=sum(lm.data[li].uv[1] for li in p.loop_indices)/3;x=min(255,max(0,int(u*256)));y=min(255,max(0,int(v*256)))
 visible.append(probe[(y*256+x)*4]>.03)
print('VISIBLE',sum(visible),'of',len(visible))
img=full
for m in rec.data.materials:m.node_tree.nodes.active.image=img
unwrap(visible)
scene.render.bake.use_pass_color=False;scene.render.bake.use_pass_direct=True;scene.render.bake.use_pass_indirect=True
irr=bake('DIFFUSE','indirect',pass_filter={'DIRECT','INDIRECT'})
ao=bake('AO','ao')
# Encode: irradiance scaled so the 99th percentile maps to 1 (stored), sRGB-ish gamma.
vals=sorted(irr[i] for i in range(0,len(irr),4*7));scale=max(1e-4,vals[int(len(vals)*.99)]);mean=sum(vals)/len(vals)
def save(px,name,gamma):
 im=bpy.data.images.new(name,size,size);im.pixels=[(min(1,max(0,v/scale)) if gamma else v)**(1/2.2 if gamma else 1) if (i%4)!=3 else 1 for i,v in enumerate(px)] if gamma else [v if (i%4)!=3 else 1 for i,v in enumerate(px)]
 im.filepath_raw=os.path.join(out,name+'.png');im.file_format='PNG';im.save()
save(irr,'indirect',True);save(ao,'ao',False)
# Per-corner UVs (non-indexed triangle order) back to receiver keys; the
# runtime de-indexes the same geometry, so island seams need no shared vertex.
me=rec.data;uv=me.uv_layers['lm'];srcattr=me.attributes['src'].data;corner={}
for p in me.polygons:corner[srcattr[p.index].value]=[c for li in p.loop_indices for c in (round(uv.data[li].uv[0],5),round(uv.data[li].uv[1],5))]
uvs={m['key']:[] for m in receivers};bad=0
for t,(k,ok) in enumerate(recTris):
 c=corner.get(t)
 if not ok or c is None or len(c)!=6:c=[0.001]*6;bad+=1
 uvs[receivers[k]['key']]+=c
json.dump({'size':size,'samples':samples,'irradianceScale':scale,'irradianceMean':mean,'skippedTriangles':bad,'receivers':uvs},open(os.path.join(out,'uv2.json'),'w'))
print('BAKED',len(receivers),'receivers; skipped triangles',bad,'scale',scale,'mean',mean)
