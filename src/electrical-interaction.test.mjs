import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {rolldown} from 'rolldown';
import * as THREE from 'three';
import {KITCHEN_ELECTRICAL_POINTS as P,kitchenElectricalSelection,kitchenElectricalPageSelection,kitchenElectricalFocusSettings} from './kitchen-electrical.mjs';
import {ELECTRICAL_EXCLUSIONS} from './home-electrical.mjs';
import {layoutElectricalCallouts,electricalPhotoCrop,electricalPhotoAnchors} from './electrical-ui.mjs';
import {DEFAULTS,getModule} from './model.mjs';
import {WATER_LAYOUT,normalizeHomeSettings} from './home-model.mjs';
import {SERVICE_COLORS} from './service-colors.mjs';
import {HOME_PRODUCTS} from './home-products.mjs';
import {catalogueSource} from './harash-catalog.mjs';
import {FLOOR_ORDER_ROWS,floorOrderForRoom,FINISH_SCHEDULE_VERSION} from './home-finish-schedule.mjs';
import {createKitchen} from './scene.js';
import {ELECTRICAL_ROOM_REVIEWS} from './electrical-video-review.mjs';

// Compile the actual React components for server/handler checks, without a
// browser or preview server. React stays external so hooks use one runtime.
const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'node_modules/.cache');
await mkdir(cache,{recursive:true});const temp=await mkdtemp(join(cache,'electrical-ui-'));
after(()=>rm(temp,{recursive:true,force:true}));
const exports={KitchenElectricalCompare:'KitchenElectricalCompare.jsx',ElectricalMarkerButtons:'ElectricalCallouts.jsx',ElectricalPhoto:'ElectricalPhoto.jsx',HomeSources:'HomeProducts.jsx',ProductCards:'HomeProducts.jsx',CatalogueMatch:'CatalogueMatch.jsx',KitchenElectricalViewControls:'KitchenElectrical.jsx',FloorPlan:'PlanViews.jsx',Elevation:'PlanViews.jsx',ModelView:'ModelView.jsx',HomePlan:'HomePlan.jsx',WaterPointDetails:'WaterPoints.jsx',WaterGlyph:'WaterPoints.jsx',KitchenElectricalPanel:'KitchenElectrical.jsx',RenderControls:'RenderControls.jsx',FloorSpecification:'FloorSpecification.jsx',FloorSchedule:'FloorSchedule.jsx',SinkSpecification:'SinkSpecification.jsx',ElectricalFacts:'HomeElectrical.jsx'};
const input=Object.entries(exports).map(([name,file])=>`export {${name}} from ${JSON.stringify(join(root,'src',file))};`).join('\n')+`\nexport {default as KitchenApp} from ${JSON.stringify(join(root,'src/KitchenApp.jsx'))};\nexport {default as HomeApp} from ${JSON.stringify(join(root,'src/HomeApp.jsx'))};`;
const bundler=await rolldown({input:'electrical:test',platform:'node',external:id=>/^(react|react-dom|three)(\/|$)/.test(id),transform:{jsx:'react-jsx'},plugins:[{name:'component-tests',resolveId(id){if(id==='electrical:test')return '\0entry';if(id.endsWith('.css'))return '\0css'},load(id){if(id==='\0entry')return input;if(id==='\0css')return ''}}]});
const output=await bundler.generate({format:'esm'});await bundler.close();
const bundlePath=join(temp,'components.mjs');await writeFile(bundlePath,output.output[0].code);const UI=await import(pathToFileURL(bundlePath));
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);React.Children.forEach(node.props?.children,c=>walk(c,visit));};

test('owner corrections remove K05 everywhere and retain eight sockets plus the separate K09 preparation',()=>{
 assert.deepEqual(P.map(p=>p.label),['K01','K02','K03','K04','K06','K07','K08','K09','K10']);
 assert(P.filter(p=>p.label!=='K09').every(p=>p.kind==='outlet'));
 assert.equal(P.find(p=>p.label==='K09').kind,'preparation');
 assert(ELECTRICAL_EXCLUSIONS.some(p=>p.label==='K05'));
 for(const label of ['K06','K07','K08'])assert.equal(P.find(p=>p.label===label).identificationSource,'owner-clarification');
});

test('model, point selector and source-page changes always resolve an actual rectangle for the same ID',()=>{
 for(const p of P){for(const requested of [undefined,1,2,999]){const state=kitchenElectricalSelection(p.id,requested);assert.equal(state.point.id,p.id);assert(p.evidence.some(e=>e.page===state.page));assert.equal(state.source.page,state.page);assert.equal(state.wall,p.wall);}}
 assert.equal(kitchenElectricalSelection('electrical-K08',2).page,21,'fall back to the latest visible evidence when the requested photo does not show this point');
 assert.equal(kitchenElectricalSelection('electrical-K02',1).page,1,'secondary evidence is retained');
 assert.equal(kitchenElectricalPageSelection('electrical-K08',2).point.id,'electrical-K01');
 assert.equal(kitchenElectricalPageSelection('electrical-K02',1).point.id,'electrical-K02');
});

test('crowded source labels remain separate 44×44 pixel targets on phone-sized photographs',()=>{
 for(const page of [1,2])for(const width of [280,360,680]){
  const entries=P.flatMap(point=>point.evidence.filter(e=>e.page===page).map(e=>({point,rect:e.rect}))),height=width*.75;
  const anchors=electricalPhotoAnchors(entries,electricalPhotoCrop(null,false),width,height),layout=layoutElectricalCallouts(anchors,{width,height,selectedId:entries.at(-1).point.id});
  assert.equal(layout.length,entries.length,`all source IDs fit at ${width}px`);
  for(const a of layout){assert(a.width>=44&&a.height>=44);assert(a.x-a.width/2>=0&&a.x+a.width/2<=width);assert(a.y-a.height/2>=0&&a.y+a.height/2<=height);for(const b of layout.filter(b=>b.id!==a.id))assert(Math.abs(a.x-b.x)>=a.width+6||Math.abs(a.y-b.y)>=a.height+6);}
 }
 const tight=layoutElectricalCallouts(P.map(p=>({id:p.id,x:100,y:120})),{width:220,height:120,selectedId:'electrical-K09'});assert(tight.some(p=>p.id==='electrical-K09'),'the active point wins if the viewport cannot fit every label');
});

test('point zoom is derived from original photo rectangles, including the unaltered K09 source',()=>{
 for(const p of P)for(const e of p.evidence){const before=JSON.stringify(e.rect),crop=electricalPhotoCrop(e.rect,true),[x,y,w,h]=e.rect;assert(x>=crop.x&&y>=crop.y&&x+w<=crop.x+crop.width&&y+h<=crop.y+crop.height);assert(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=1&&crop.y+crop.height<=1);const a=electricalPhotoAnchors([{point:p,rect:e.rect}],crop,360,270)[0];assert(a.visible&&a.x>=0&&a.x<=360&&a.y>=0&&a.y<=270);assert.equal(JSON.stringify(e.rect),before);}
 assert.deepEqual(P.find(p=>p.label==='K09').evidence.find(e=>e.page===1).rect,[.87,.522,.024,.027]);
});

test('actual label buttons identify and select each independent ID without forwarding a canvas/cabinet gesture',()=>{
 const selected=[],tree=UI.ElectricalMarkerButtons({points:P,selectedId:'electrical-K07',lang:'he',onSelect:id=>selected.push(id)}),buttons=[];
 walk(tree,n=>{if(n.type==='button')buttons.push(n);});assert.equal(buttons.length,9);
 let stopped=0;for(const b of buttons){assert(b.props['aria-label'].includes(b.props['data-electrical-id'].replace('electrical-','')));b.props.onPointerDown({stopPropagation(){stopped++}});b.props.onClick({stopPropagation(){stopped++}});}
 assert.deepEqual(selected,P.map(p=>p.id));assert.equal(stopped,18);assert.equal(buttons.filter(b=>b.props['aria-pressed']).length,1);
});

test('comparison renders the selected model wall and real JPEG, synchronized highlighted IDs, zoom and original-file link',async()=>{
 for(const p of P)for(const lang of ['he','en']){
  const state=kitchenElectricalSelection(p.id),html=render(UI.KitchenElectricalCompare,{settings:{...DEFAULTS,lang,showElectricalLabels:true},selectedId:p.id,page:state.page,onSelect(){},onPage(){},onFocus(){}});
  assert(html.includes(`src="${state.source.image}"`));assert(html.includes(`href="${state.source.image}"`));assert(html.includes(`data-source-page="${state.page}"`));assert(html.includes(`data-selected-point="${p.id}"`));assert(html.includes(`aria-label="${p.wall} wall elevation to scale"`));
  assert.equal((html.match(/class="electrical-callout is-selected"/g)||[]).length,2,'one active model target and one active photo target');assert(html.includes('electrical-photo-outline is-selected'));
  assert(!html.includes('electrical-K05'));assert(!html.includes('>K05<'));const bytes=await readFile(join(root,'public',state.source.image));assert.equal(bytes[0],0xff);assert.equal(bytes[1],0xd8);
  if(p.relocation){assert(html.includes('data-role="observed-origin"'));assert(html.includes(lang==='he'?'165 ס״מ':'165 cm'));assert(html.includes('≈ 115 cm'));}
 }
});

test('the additional kitchen photo tab selects the same photographed ID and renders the new source without reviving occluded points',()=>{
 const pages=[],props={settings:{...DEFAULTS,lang:'he'},selectedId:'electrical-K09',page:21,onSelect(){},onPage:n=>pages.push(n),onFocus(){}},tree=UI.KitchenElectricalCompare(props),buttons=[];
 walk(tree,n=>{if(n.type==='button')buttons.push(n);});const tabs=buttons.filter(b=>b.props['aria-pressed']!==undefined);assert.equal(tabs.length,3);tabs.forEach(b=>b.props.onClick());assert.deepEqual(pages,[1,2,21]);assert.equal(tabs.filter(b=>b.props['aria-pressed']).length,1);
 const html=render(UI.KitchenElectricalCompare,props);assert(html.includes('kitchen-hall-277903.jpg'));assert(html.includes('המבט הנוסף'));assert(html.includes('H02'));assert(html.includes('165 cm'));assert(html.includes('≈ 115 cm'));assert.equal((html.match(/class="electrical-photo-outline/g)||[]).length,4);
 const gallery=render(UI.HomeSources,{sourceId:'electrical-survey',page:21,lang:'he',electricalSelectedId:'electrical-H02',onPage(){},onSourceId(){}});assert(gallery.includes('data-selected-point="electrical-H02"'));assert.equal((gallery.match(/class="electrical-photo-outline/g)||[]).length,5);assert(gallery.includes('שקע גבוה מימין לפתח המסדרון'));assert(!gallery.includes('>K07<'));
});

test('the source gallery and kitchen shell render the real photo viewer and an always available comparison entry',()=>{
 const source=render(UI.HomeSources,{sourceId:'electrical-survey',page:1,lang:'he',onPage(){},onSourceId(){}});assert(source.includes('src="/house/photos/photo-1.jpg"'));assert(source.includes('electrical-photo-frame'));assert(!source.includes('electrical-K05'));
 const old=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify({settings:{...DEFAULTS,lang:'he',showElectrical:true}})};
 try{const html=render(UI.KitchenApp,{});assert(html.includes('השוואה לצילום'));assert(html.includes('electrical-point-picker'));assert(!html.includes('value="electrical-K05"'));}finally{globalThis.localStorage=old;}
});

test('each room review opens its actual annotated source and video interval while outdoor reviews retain photo-only evidence',()=>{
 for(const row of ELECTRICAL_ROOM_REVIEWS){
  const calls=[],props={roomId:row.roomId,lang:'he',settings:normalizeHomeSettings(),onChange(){},onInspect(){},onSource:(...args)=>calls.push(args)},tree=UI.ElectricalFacts(props),html=render(UI.ElectricalFacts,props),blocks=[];
  walk(tree,n=>{if(n.props?.['data-reviewed-room'])blocks.push(n);});assert.equal(blocks.length,1);assert.equal(blocks[0].props['data-reviewed-room'],row.roomId);
  const buttons=[],links=[];walk(blocks[0],n=>{if(n.type==='button')buttons.push(n);if(n.type==='a')links.push(n);});
  assert.equal(links.length,row.second==null?0:1);if(row.second!=null)assert.equal(links[0].props.href,`/house/photos/walkthrough.mp4#t=${row.second}`);
  assert.equal(buttons.length,row.page?1:0);if(row.page){buttons[0].props.onClick();assert.deepEqual(calls,[['electrical-survey',row.page]]);}
  assert(html.includes('electrical-video-review'));assert(!html.includes('undefined'));
 }
 const whole=render(UI.ElectricalFacts,{compact:true,lang:'he',settings:normalizeHomeSettings(),onChange(){},onInspect(){},onSource(){}});
 assert.equal((whole.match(/data-reviewed-room=/g)||[]).length,ELECTRICAL_ROOM_REVIEWS.length);assert(!whole.includes('class="electrical-video-review" open'),'the whole-house review is collapsed initially');
 for(const [page,id,filename] of [[22,'electrical-B03','frame-15.jpg'],[23,'electrical-A01','frame-16.5.jpg'],[24,'electrical-M04','frame-24.jpg'],[25,'electrical-O01','frame-28.jpg']]){
  const gallery=render(UI.HomeSources,{sourceId:'electrical-survey',page,lang:'he',electricalSelectedId:id,onPage(){},onSourceId(){}});assert(gallery.includes(filename));assert(gallery.includes(`data-selected-point="${id}"`));
 }
 const hvacSource=render(UI.HomeSources,{sourceId:'site-photos',page:11,lang:'he',onPage(){},onSourceId(){}});assert(hvacSource.includes('kitchen-hall-277903.jpg'));assert(!hvacSource.includes('photo-11.jpg'));assert(hvacSource.includes('הגריל הגדול'));
});

test('names are off by default while the plan/elevations keep real device glyphs, and optional compact IDs stay independently selectable',()=>{
 for(const labels of [false,true]){
  const settings={...DEFAULTS,lang:'he',showElectrical:true,showElectricalLabels:labels};
  for(const [Component,props,count] of [[UI.FloorPlan,{},9],[UI.Elevation,{wall:'long'},5],[UI.Elevation,{wall:'short'},4]]){
   const html=render(Component,{settings,onSelect(){},onElectricalSelect(){},...props});assert.equal((html.match(/class="electrical-fixture-glyph"/g)||[]).length,count);
   assert.equal(html.includes('class="electrical-callouts'),labels);assert.equal(html.includes('class="electrical-callout-face"'),labels);
   if(!labels)assert(!/>K\d+<\/text>/.test(html),'no visible electrical ID text is drawn in the clean view');
  }
  const model=render(UI.ModelView,{settings,onSelect(){},onElectricalSelect(){}});assert.equal(model.includes('class="electrical-callouts'),labels);
 }
});

test('the clean-view controls expose all cabinet modes, keep optional names off, and route individual point selection',()=>{
 const changes=[],selected=[],tree=UI.KitchenElectricalViewControls({settings:{...DEFAULTS,lang:'he'},onChange:(...args)=>changes.push(args),onSelect:id=>selected.push(id),pointPicker:true}),inputs=[],selects=[];
 walk(tree,n=>{if(n.type==='input')inputs.push(n);if(n.type==='select')selects.push(n);});assert.equal(inputs.length,2);assert.equal(inputs[0].props.checked,false);assert.equal(inputs[1].props.checked,true);inputs[0].props.onChange({target:{checked:true}});
 const cabinet=selects.find(n=>n.props.value==='solid'),picker=selects.find(n=>n.props.className==='electrical-point-picker');assert(cabinet&&picker);const options=[];walk(cabinet,n=>{if(n.type==='option')options.push(n.props.value);});assert.deepEqual(options,['solid','translucent','hidden']);
 inputs[1].props.onChange({target:{checked:false}});cabinet.props.onChange({target:{value:'translucent'}});cabinet.props.onChange({target:{value:'hidden'}});picker.props.onChange({target:{value:'electrical-K09'}});picker.props.onChange({target:{value:'water-W01'}});assert.deepEqual(changes,[['showElectricalLabels',true],['showWater',false],['cabinetVisibility','translucent'],['cabinetVisibility','hidden']]);assert.deepEqual(selected,['electrical-K09','water-W01']);
});

test('cabinet visibility affects only the furnishings in both diagram views and survives actual app restore',()=>{
 for(const mode of ['solid','translucent','hidden']){
  const settings={...DEFAULTS,lang:'he',showElectrical:true,cabinetVisibility:mode};
  for(const Component of [UI.FloorPlan,UI.Elevation]){const html=render(Component,{settings,onSelect(){},onElectricalSelect(){}});assert(html.includes(mode==='hidden'?'style="opacity:1;display:none"':mode==='translucent'?'style="opacity:0.24"':'style="opacity:1"'));assert(html.includes('class="electrical-fixture-glyph"'));assert(html.includes('width="390"'),'window stays in the drawing');}
  const old=globalThis.localStorage;globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings})};
  try{const html=render(UI.KitchenApp,{});assert(html.includes(`value="${mode}" selected=""`));assert(html.includes('שמות הנקודות'));assert(!html.includes('electrical-quick-picker'));}finally{globalThis.localStorage=old;}
 }
});

test('K09 proposal sits on the lift-up compartment inner side, above the oven and shelf, with an independent accessible lift-up flap',()=>{
 const context=new Proxy({},{get:(o,k)=>o[k]||(()=>{}),set:(o,k,v)=>(o[k]=v,true)});globalThis.document={createElement:()=>({width:512,height:512,getContext:()=>context})};
 const p=P.find(p=>p.label==='K09'),oven=getModule('oven');assert(p.relocation&&p.relocation.status==='proposal');assert.equal(p.relocation.accessPart,'oven:lift-up');assert(p.height>1.489+.085/2);assert(p.height+.085/2<1.871);assert(p.height+.085/2<oven.h/1000);assert.equal(p.observedHeight,1.15);assert(p.position[0]>oven.x/1000&&p.position[0]<(oven.x+oven.w)/1000);assert(p.position[2]>.1&&p.position[2]<oven.d/1000-.09);
 const scene=createKitchen({...DEFAULTS,showElectrical:true,openParts:['oven:lift-up']});
 try{scene.group.updateMatrixWorld(true);const node=scene.electricalGroups.get(p.id),plate=node.children.find(n=>n.userData.part==='electrical-faceplate'),b=new THREE.Box3().setFromObject(plate);assert(b.max.x<(oven.x+oven.w-18)/1000);assert(b.min.y>1.489);assert(b.max.y<1.871);assert(b.min.y>1.468,'connection is outside the oven body');assert(scene.openingObjects.has('oven:top-door'));assert(scene.openingObjects.has('oven:lift-up'));
  const meshes=[];scene.moduleGroups.get('oven').traverse(o=>{if(o.isMesh){meshes.push(o);if(o.userData.part==='HL-lift-arm')assert(!b.intersectsBox(new THREE.Box3().setFromObject(o)),'faceplate clears both lift arms');}});
  const from=new THREE.Vector3(...node.userData.inspectionView.from),direction=node.position.clone().sub(from),ray=new THREE.Raycaster(from,direction.clone().normalize(),0,direction.length()-.02);assert.equal(ray.intersectObjects(meshes,false).length,0,'the focus camera sees the connection through the open flap without crossing the oven or a door');
 }
 finally{scene.dispose();}
});

test('showing K09 access opens only its flap and preserves every existing independent door/drawer state',()=>{
 const state={...DEFAULTS,base:'oak',openParts:['sink:door-left','island-1:drawer-0']},focused=kitchenElectricalFocusSettings(state,'electrical-K09');
 assert.deepEqual(focused.openParts,['sink:door-left','island-1:drawer-0','oven:lift-up']);assert.equal(focused.base,'oak');assert.equal(focused.showElectrical,true);assert.equal(focused.view,'perspective');assert.equal(focused.selected,null);assert(!focused.openParts.includes('oven:top-door'));assert(!focused.openParts.includes('oven:oven-door'));
 assert.deepEqual(kitchenElectricalFocusSettings(focused,'electrical-K09').openParts,focused.openParts);assert.deepEqual(kitchenElectricalFocusSettings(state,'electrical-K06').openParts,state.openParts);assert.strictEqual(kitchenElectricalFocusSettings(state,'electrical-K05'),state);
});


test('water details expose actual photo evidence or fixture-layout estimates and the plan water symbols can be toggled independently',()=>{
 for(const point of WATER_LAYOUT.points){const html=render(UI.WaterPointDetails,{point,lang:'he'});assert(html.includes(point.status==='observed'?'נראה בצילום':'חיבור משוער'));if(point.evidence.length)assert(html.includes(`data-selected-point="${point.id}"`));else assert(html.includes('אין צילום שמאמת'));}
 for(const showWater of [true,false]){const settings={...DEFAULTS,lang:'he',showElectrical:true,showWater,cabinetVisibility:'hidden'};for(const Component of [UI.FloorPlan,UI.Elevation]){const html=render(Component,{settings,onElectricalSelect(){}});assert.equal(html.includes('data-water-id="water-W01"'),showWater);assert(html.includes(`fill="${SERVICE_COLORS.outlet}"`));}const home=render(UI.HomePlan,{settings:normalizeHomeSettings({showWater}),selectedRoom:'bathroom'});assert.equal(home.includes('data-water-id="water-W03"'),showWater);}
 const selected=[],tree=UI.WaterGlyph({point:WATER_LAYOUT.points[0],x:10,y:10,lang:'he',onSelect:()=>selected.push('water-W01')});tree.props.onKeyDown({key:'Enter'});assert.deepEqual(selected,['water-W01']);
 const point=WATER_LAYOUT.points[0],panel=render(UI.KitchenElectricalPanel,{point,lang:'he'});assert(panel.includes('water-point-details'));assert(panel.includes('מזעור הפרטים'));assert(panel.includes('data-selected-point="water-W01"'));
});


test('the same corrected kitchen water point is selected in the real source photo and model comparison',()=>{
 const point=WATER_LAYOUT.points.find(p=>p.label==='W01'),html=render(UI.KitchenElectricalCompare,{settings:{...DEFAULTS,lang:'he',showElectrical:true},selectedId:point.id,page:1,onSelect(){},onPage(){},onFocus(){}});
 assert(html.includes('data-selected-point="water-W01"'));assert(html.includes('data-water-id="water-W01"'));assert(html.includes('selected=""'));assert(html.includes('photo-1.jpg'));assert(html.includes('מתחת לכיור'));assert(html.includes('water-W01'));
});

test('render-quality and clean-view controls work in both apps and saved preferences restore',()=>{
 const changes=[],tree=UI.RenderControls({settings:{lang:'he',renderQuality:'realistic',cleanView:false},onChange:(...v)=>changes.push(v)});walk(tree,n=>{if(n.type==='select')n.props.onChange({target:{value:'light'}});if(n.type==='button')n.props.onClick();});assert.deepEqual(changes,[['renderQuality','light'],['cleanView',true]]);
 const old=globalThis.localStorage;try{globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{...DEFAULTS,lang:'he',renderQuality:'light',cleanView:true}})};const kitchen=render(UI.KitchenApp,{});assert(kitchen.includes('is-clean'));assert(kitchen.includes('value="light" selected=""'));assert(kitchen.includes('הצגת הפקדים'));
 globalThis.localStorage={getItem:()=>JSON.stringify({schema:2,lang:'he',renderQuality:'light',cleanView:true})};const home=render(UI.HomeApp,{});assert(home.includes('hs-app is-clean'));assert(home.includes('value="light" selected=""'));assert(home.includes('הצגת הפקדים'));}finally{globalThis.localStorage=old;}
});


test('product controls expose the real owner tile photo, SKU label and Vegas Casablanca source instead of a generic sample',()=>{
 const floor=render(UI.FloorSpecification,{productId:'dry-floor',lang:'he'});assert(floor.includes('MI402439-tile.jpg'));assert(floor.includes('MI402439-label.jpg'));assert(floor.includes('הטקסטורה מהצילום שלך'));assert(!floor.includes('interior-atlas'));assert(floor.includes('השוואת הטקסטורה לצילום'));assert(floor.includes('data-material-status="loading"'));assert(floor.includes('אותה טקסטורה המשמשת בהדמיה לפני תאורת החדר'));assert(floor.includes('<canvas'));
 const sink=render(UI.SinkSpecification,{lang:'he'});assert(sink.includes('Vegas 70'));assert(sink.includes('קזבלנקה'));assert(sink.includes('vegas-70-casablanca.jpg'));assert(sink.includes('gome1981.co.il'));assert(sink.includes('אין כאן תבנית לחיתוך שיש'));
 const gallery=render(UI.HomeSources,{sourceId:'ordered-product-photos',page:2,lang:'he',onSourceId(){},onPage(){}});assert(gallery.includes('MI402439-tile.jpg'));assert(gallery.includes('המק״ט מאומת במדבקה'));assert(!gallery.includes('undefined#page='));
});

test('each catalogue comparison opens the identified product page and renders the exact source image and bounded highlight',()=>{
 for(const product of HOME_PRODUCTS)for(const lang of ['he','en']){
  const selected=[],tree=UI.CatalogueMatch({productId:product.id,lang,onSource:p=>selected.push(p)}),buttons=[];walk(tree,n=>{if(n.type==='button')buttons.push(n);});
  assert.equal(buttons.length,product.catalogue.refs?.length||0);buttons.forEach(b=>b.props.onClick());
  for(const [i,r] of (product.catalogue.refs||[]).entries()){
   assert.deepEqual(selected[i],catalogueSource(product.id,i));const html=render(UI.CatalogueMatch,{productId:product.id,lang});assert(html.includes(`src="${r.image}"`));assert(html.includes(`/house/harash-catalog.pdf#page=${r.page}`));assert(html.includes(`data-match-status="${product.catalogue.status}"`));
   const source=render(UI.HomeSources,{sourceId:'harash-catalog',page:r.page,catalogueProductId:product.id,catalogueReference:i,lang,onSourceId(){},onPage(){}});assert(source.includes(`src="/house/harash-catalog-${r.page}.jpg"`));assert(source.includes(`data-catalogue-highlight="${product.id}"`));assert(source.includes(`href="/house/harash-catalog.pdf#page=${r.page}"`));
  }
 }
});

test('the complete product inventory exposes all 19 catalogue outcomes and preserves order and owner-photo links',()=>{
 const html=render(UI.ProductCards,{roomId:'kitchen',productIds:HOME_PRODUCTS.map(p=>p.id),lang:'he',onSource(){}});
 for(const p of HOME_PRODUCTS){assert(html.includes(`data-product-id="${p.id}"`));assert(html.includes(`data-catalogue-product="${p.id}"`));}
 assert(html.includes('כל מוצרי הדירה'));assert(html.includes('משפחת מוצר בלבד'));assert(html.includes('בחירה לא מאומתת'));assert(html.includes('MI402439-tile.jpg'));assert(html.includes('vegas-70-casablanca.jpg'));assert(html.includes('פתיחת השורה במפרט'));
 for(const id of ['wet-floor','terrace-floor']){const floor=render(UI.FloorSpecification,{productId:id,lang:'he'});assert(floor.includes('/materials/harash/'));assert(floor.includes('catalog-product-photo'));}
 const kitchen=render(UI.SinkSpecification,{lang:'he'});assert(kitchen.includes('VR001221'));assert(kitchen.includes('harash-catalog.pdf#page=39'));
});


test('room flooring controls open the room-specific order line and show both R10 room and R11 shower specifications',()=>{
 for(const row of FLOOR_ORDER_ROWS){
  const selected=[],roomId=row.rooms[0],props={productId:row.productId,roomId,evidenceId:row.id,lang:'he',onSource:p=>selected.push(p)},html=render(UI.FloorSpecification,props),tree=UI.FloorSpecification(props),buttons=[];walk(tree,n=>{if(n.type==='button')buttons.push(n);});
  buttons.at(-1).props.onClick();assert.equal(selected.at(-1).page,row.page);assert.equal(selected.at(-1).orderEvidenceId,row.id);assert(html.includes(`data-order-page="${row.page}"`));
  const source=render(UI.HomeSources,{sourceId:'harash',page:row.page,orderEvidenceId:row.id,lang:'he',onSourceId(){},onPage(){}});assert(source.includes(`src="/house/harash-products-${row.page}.jpg"`));assert(source.includes(`data-catalogue-highlight="${row.id}"`));
 }
 const ensuite=render(UI.FloorSpecification,{productId:'wet-floor',roomId:'ensuite',lang:'he'});assert(ensuite.includes('YUCLCE33'));assert(ensuite.includes('YUCLAC33'));assert(ensuite.includes('33 × 30'));assert(ensuite.includes('30 × 30'));
 const table=render(UI.FloorSchedule,{lang:'he',onSource(){}});for(const row of FLOOR_ORDER_ROWS)assert(table.includes(`data-floor-order-row="${row.id}"`));assert(table.includes('אין עבורו שורה נפרדת'));
});

test('actual app restoration corrects old floor choices and removes dry-room cladding while retaining other saved preferences',()=>{
 const old=globalThis.localStorage;
 try{
  globalThis.localStorage={getItem:()=>JSON.stringify({schema:2,lang:'he',renderQuality:'light',cleanView:true,rooms:{living:{floor:'oak',wall:'ordered-mona'}}})};
  const home=render(UI.HomeApp,{});assert(home.includes('is-clean'));assert(home.includes('value="light" selected=""'));assert(!home.includes('Mona 25×75'));
  globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{lang:'he',floor:'cool',base:'oak',cleanView:true}})};
  const kitchen=render(UI.KitchenApp,{});assert(kitchen.includes('is-clean'));assert(kitchen.includes('data-floor-finish="harash"'));
  globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{...DEFAULTS,lang:'he',floor:'cool',finishScheduleVersion:FINISH_SCHEDULE_VERSION}})};
  assert(render(UI.KitchenApp,{}).includes('data-floor-finish="cool"'),'newly saved explicit trial finishes remain available');
 }finally{globalThis.localStorage=old;}
});
