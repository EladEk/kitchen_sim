import test from 'node:test';
import assert from 'node:assert/strict';
import {createSoftGeometry} from './soft-furnishings.mjs';

test('cloth has a shaped silhouette and folds, finite normals and a bounded measured footprint',()=>{
 for(const kind of ['cushion','duvet']){const g=createSoftGeometry(1.8,.15,1.2,{kind}),p=g.attributes.position,n=g.attributes.normal;assert(p.count<=240,'shared cloth geometry stays in the district memory budget');assert.equal(g.parameters.width,1.8);assert.equal(g.parameters.depth,1.2);assert(Math.abs(g.boundingBox.max.x-g.boundingBox.min.x-1.8)<.00001);assert(Math.abs(g.boundingBox.max.z-g.boundingBox.min.z-1.2)<.00001);let top=[];
  for(let i=0;i<p.count;i++){assert(Math.abs(p.getX(i))<=.90001);assert(Math.abs(p.getY(i))<=.07501);assert(Math.abs(p.getZ(i))<=.60001);assert(Number.isFinite(n.getX(i)+n.getY(i)+n.getZ(i)));if(p.getY(i)>.045&&Math.abs(p.getX(i))<.7&&Math.abs(p.getZ(i))<.45)top.push(p.getY(i));}
  assert(Math.max(...top)-Math.min(...top)>.001,'the top cannot be a single flat plastic slab');g.dispose();
 }
});
