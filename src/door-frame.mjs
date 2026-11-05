import {BoxGeometry} from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
import {metricSurfaceUVs} from './metric-surface-geometry.mjs';
// Metric three-sided jamb, door stop, architrave and fine outer moulding.
// Rows are local to the opening; clear passage and leaf hinges stay unchanged.
export function doorFrameRows({width,height,depth=.12,cut=false}={}){
 const rows=[],rail=(x,y,z,w,h,d,part)=>rows.push({box:[x,y,z,w,h,d],part});
 const addU=(z,w,d,part)=>{for(const sign of [-1,1])rail(sign*width/2,height/2,z,w,height,d,part);if(!cut)rail(0,height+w/2,z,width+w,w,d,part);};
 addU(0,.026,depth,'door-jamb');
 addU(-.026,.013,.018,'door-stop');
 for(const sign of [-1,1]){
  addU(sign*(depth/2+.008),.065,.016,'door-casing');
  addU(sign*(depth/2+.018),.046,.006,'door-casing-step');
 }
 return rows;
}
export function doorFrameGeometry(options){
 const pieces=doorFrameRows(options).map(({box:[x,y,z,w,h,d]})=>new BoxGeometry(w,h,d).translate(x,y,z));
 const geometry=mergeGeometries(pieces,false);for(const piece of pieces)piece.dispose();metricSurfaceUVs(geometry);return geometry;
}
