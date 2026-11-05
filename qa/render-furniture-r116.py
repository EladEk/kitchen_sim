"""Offline review of the actual decoded GLB; run with Blender --background."""
import bpy, json, sys, math
from pathlib import Path
from mathutils import Vector
args=sys.argv[sys.argv.index('--')+1:]
asset,manifest,output=map(Path,args)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(asset))
records={r['id']:r for r in json.loads(manifest.read_text())['models']}
roots={o.name:o for o in list(bpy.context.scene.objects) if o.parent is None}
selected=['sofa','bed-double','bed-single','armchair','dining-chair','barstool','coffee','dining','desk','office-chair','nightstand','plant','media','tv','faucet']
for name,root in roots.items():
 if name not in selected:
  root.hide_render=True
  for o in root.children_recursive:o.hide_render=True
for i,name in enumerate(selected):
 root=roots[name];dims=records[name]['nativeDimensions'];root.scale.x*=dims[0];root.scale.y*=dims[2];root.scale.z*=dims[1];root.location.x=(i%3)*3.5;root.location.y=-(i//3)*3.2
 bpy.ops.object.text_add(location=(root.location.x-1.2,root.location.y-1.05,.012),rotation=(0,0,0));text=bpy.context.object;text.data.body=name;text.data.size=.23
 for o in [root]+list(root.children_recursive):
  if o.type=='MESH':
   for p in o.data.polygons:p.use_smooth=True
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,-.015));plane=bpy.context.object
mat=bpy.data.materials.new('Review neutral floor');mat.diffuse_color=(.23,.25,.24,1);plane.data.materials.append(mat)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=20;scene.cycles.use_denoising=True
scene.world.color=(.25,.25,.25)
for location,power,size in [((3,-4,12),2600,10),((-5,2,8),1800,8),((10,-7,5),1200,7)]:
 bpy.ops.object.light_add(type='AREA',location=location);light=bpy.context.object;light.data.energy=power;light.data.shape='DISK';light.data.size=size;light.rotation_euler=(Vector((3,-6,0))-light.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.object.camera_add(location=(14,-24,24));camera=bpy.context.object;camera.rotation_euler=(Vector((3.4,-6,0))-camera.location).to_track_quat('-Z','Y').to_euler();camera.data.type='ORTHO';camera.data.ortho_scale=19;scene.camera=camera
scene.render.resolution_x=1600;scene.render.resolution_y=1800;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG';scene.render.filepath=str(output);scene.view_settings.view_transform='AgX'
bpy.ops.wm.save_as_mainfile(filepath=str(output.with_suffix('.blend')))
bpy.ops.render.render(write_still=True)
