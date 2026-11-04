import test from 'node:test';
import assert from 'node:assert/strict';
import {createSceneBusyOverlay} from './scene-busy-overlay.mjs';
class Element{constructor(){this.children=[];this.attributes={};}append(...nodes){this.children.push(...nodes);for(const n of nodes)n.parent=this;}setAttribute(k,v){this.attributes[k]=v;}remove(){if(this.parent)this.parent.children=this.parent.children.filter(n=>n!==this);}}
test('renderer status is readable, updates one node, clears on completion and cannot reattach after disposal',()=>{
 const previous=globalThis.document;globalThis.document={createElement:()=>new Element()};
 try{const host=new Element(),loading=createSceneBusyOverlay(host);loading.show('Preparing','Computing light');assert.equal(host.children.length,1);const node=host.children[0];assert.equal(node.attributes.role,'status');assert.equal(node.attributes['aria-busy'],'true');loading.show('Rendering first image');assert.equal(host.children.length,1);assert.equal(node.children[1].textContent,'Rendering first image');loading.hide();assert.equal(host.children.length,0);loading.show('Working');assert.equal(host.children.length,1);loading.dispose();loading.dispose();loading.show('stale');assert.equal(host.children.length,0);}finally{globalThis.document=previous;}
});
