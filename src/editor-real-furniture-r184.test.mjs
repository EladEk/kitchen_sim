import test from 'node:test';import assert from 'node:assert/strict';
import {EDITOR_MODELS,editorModelHeight} from '../public-view/apartment-editor-scene.mjs';
import {FURNITURE_TYPES,normalizeWorkspace,updateUnit,emptyWorkspace} from '../public-view/apartment-editing.mjs';
import {FURNITURE_CATEGORIES} from '../public-view/furniture-catalog.mjs';
import {COMPLETE_FURNITURE_KINDS} from './complete-furniture.mjs';
import {dimensionedFurnitureParts} from './dimensioned-furniture.mjs';
const DECOR=['plant','succulent','rug','curtain','ceiling_lamp','cushions'];
test('every editor kind drawn with a real model maps to a model in the furniture library',()=>{
 for(const [kind,model] of Object.entries(EDITOR_MODELS)){assert.ok(FURNITURE_TYPES[kind],kind);assert.ok(COMPLETE_FURNITURE_KINDS.includes(model),`${kind}->${model}`);}
});
test('decor kinds are placeable, categorised and keep a box fallback for picking/collision',()=>{
 const decor=FURNITURE_CATEGORIES.find(c=>c.id==='decor');assert.equal(decor.he,'עיצוב ואביזרים');
 for(const kind of DECOR){assert.ok(decor.kinds.includes(kind),kind);assert.ok(EDITOR_MODELS[kind],kind);const [w,d,h]=FURNITURE_TYPES[kind].size;
  const parts=dimensionedFurnitureParts({kind,w:w/100,d:d/100,h:h/100,yaw:0,x:0,z:0});assert.ok(parts.length>0,kind);}
});
test('a seeded decor layout survives validation and the rug renders thin',()=>{
 const items=DECOR.map((kind,i)=>{const [w,d,h]=FURNITURE_TYPES[kind].size;return {id:'t'+i,kind,x:2+i*.1,z:2,yaw:0,w:w/100,d:d/100,h:h/100,...(FURNITURE_TYPES[kind].base?{y:FURNITURE_TYPES[kind].base/100}:{})};});
 const ws=normalizeWorkspace(updateUnit(emptyWorkspace(),'4102:0:4',items));assert.equal(ws.units['4102:0:4'].items.length,DECOR.length);
 assert.ok(editorModelHeight({kind:'rug',h:.2})<=.015);assert.equal(editorModelHeight({kind:'sofa',h:.8}),.8);
});
