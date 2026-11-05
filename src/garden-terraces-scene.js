import * as THREE from 'three';
import {GARDEN_TERRACES} from './garden-terraces.mjs';
import {createSurfacePalette,metricSurfaceUVs} from './surface-materials.mjs';
import {installFloorCourses} from './building-finish-shaders.mjs';
import {installBuildingSurfaceUVs} from './building-surface-uvs.mjs';

export function buildGardenTerraces({parent,resources,units=[1,2,3],variantSlot=null}){
 const surface=createSurfacePalette(resources),material=surface('cement','#d2c6b2',{roughness:.89,side:THREE.DoubleSide});
 installFloorCourses(material,{tile:[.6,.6],joint:.004});installBuildingSurfaceUVs(material);
 for(const terrace of GARDEN_TERRACES.filter(t=>units.includes(t.unit))){
  const shape=new THREE.Shape(terrace.polygon.map(([x,z])=>new THREE.Vector2(x,-z))),geometry=new THREE.ShapeGeometry(shape);geometry.rotateX(-Math.PI/2);metricSurfaceUVs(geometry);resources.push(geometry);
  const mesh=new THREE.Mesh(geometry,material);mesh.position.y=.008;mesh.receiveShadow=true;
  mesh.userData={part:'building-garden-terrace',unit:terrace.unit,buildingFloor:0,baseline:true,navigationSurface:true,source:'building-plan',page:3,sourceDrawing:terrace.sourceDrawing,finishInferred:true,...(variantSlot?{variantSlot}:{})};parent.add(mesh);
 }
}
