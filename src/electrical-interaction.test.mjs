import test,{after} from 'node:test';
import assert from 'node:assert/strict';
import {mkdir,mkdtemp,writeFile,rm,readFile} from 'node:fs/promises';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {join} from 'node:path';
import {spawnSync} from 'node:child_process';
import React from 'react';
import {renderToStaticMarkup} from 'react-dom/server';
import {rolldown} from 'rolldown';
import postcss from 'postcss';
import * as THREE from 'three';
import {KITCHEN_ELECTRICAL_POINTS as P,kitchenElectricalSelection,kitchenElectricalPageSelection,kitchenElectricalFocusSettings} from './kitchen-electrical.mjs';
import {ELECTRICAL_EXCLUSIONS} from './home-electrical.mjs';
import {layoutElectricalCallouts,electricalPhotoCrop,electricalPhotoAnchors} from './electrical-ui.mjs';
import {DEFAULTS,getModule,WINDOW} from './model.mjs';
import {ROOMS,FURNITURE,ELECTRICAL_LAYOUT,editableFurniture,WATER_LAYOUT,normalizeHomeSettings,getFurniture,editHomeYard,yardForSettings} from './home-model.mjs';
import {SERVICE_COLORS} from './service-colors.mjs';
import {HOME_PRODUCTS} from './home-products.mjs';
import {catalogueSource} from './harash-catalog.mjs';
import {FLOOR_ORDER_ROWS,floorOrderForRoom,FINISH_SCHEDULE_VERSION} from './home-finish-schedule.mjs';
import {createKitchen} from './scene.js';
import {createHomeScene} from './home-scene.js';
import {ELECTRICAL_ROOM_REVIEWS} from './electrical-video-review.mjs';

// Compile the actual React components for server/handler checks, without a
// browser or preview server. React stays external so hooks use one runtime.
const root=fileURLToPath(new URL('../',import.meta.url)),cache=join(root,'node_modules/.cache');
await mkdir(cache,{recursive:true});const temp=await mkdtemp(join(cache,'electrical-ui-'));
after(()=>rm(temp,{recursive:true,force:true}));
const exports={DocumentAccessProvider:'DocumentAccess.jsx',DocumentGate:'DocumentAccess.jsx',ProtectedImage:'DocumentAccess.jsx',BuildingControls:'BuildingControls.jsx',BuildingEntry:'BuildingControls.jsx',SunlightControls:'SunlightControls.jsx',LightingInspector:'HomeLighting.jsx',LightingFacts:'HomeLighting.jsx',EntranceServiceFacts:'EntranceServices.jsx',EntryServiceInspector:'EntranceServices.jsx',EntranceServicesPlan:'EntranceServices.jsx',PlanningTools:'PlanningTools.jsx',HistoryButtons:'PlanningTools.jsx',LightControls:'LightControls.jsx',YardWorkspace:'YardWorkspace.jsx',DesignEvidence:'DesignEvidence.jsx',FurnitureAssistance:'FurnitureAssistance.jsx',FurnitureSizeEditor:'FurnitureSizeEditor.jsx',FurnitureFrontMarkers:'FurniturePlanGuides.jsx',FurnitureRoomServices:'FurniturePlanGuides.jsx',ElectricalFixtureGlyph:'KitchenElectrical.jsx',YardPlan:'YardPlan.jsx',HomeYardEditor:'HomeYardEditor.jsx',HomeFurnitureEditor:'HomeWorkspaceControls.jsx',HomeViewChooser:'HomeWorkspaceControls.jsx',HomePrimaryActions:'HomeWorkspaceControls.jsx',furnitureEditorSelection:'HomeWorkspaceControls.jsx',FurniturePositionControls:'FurniturePositionControls.jsx',WalkingControls:'WalkingControls.jsx',HoldButton:'WalkingControls.jsx',KitchenElectricalCompare:'KitchenElectricalCompare.jsx',ElectricalMarkerButtons:'ElectricalCallouts.jsx',ElectricalPhoto:'ElectricalPhoto.jsx',HomeSources:'HomeProducts.jsx',ProductCards:'HomeProducts.jsx',CatalogueMatch:'CatalogueMatch.jsx',KitchenElectricalViewControls:'KitchenElectrical.jsx',FloorPlan:'PlanViews.jsx',Elevation:'PlanViews.jsx',ModelView:'ModelView.jsx',HomePlan:'HomePlan.jsx',WaterPointDetails:'WaterPoints.jsx',WaterGlyph:'WaterPoints.jsx',KitchenElectricalPanel:'KitchenElectrical.jsx',RenderControls:'RenderControls.jsx',VrControls:'VrControls.jsx',FloorSpecification:'FloorSpecification.jsx',FloorSchedule:'FloorSchedule.jsx',SinkSpecification:'SinkSpecification.jsx',ElectricalFacts:'HomeElectrical.jsx',SceneRestoreControls:'SceneInterface.jsx',SceneUiLayer:'SceneInterface.jsx',restoreInterfaceOnEscape:'SceneInterface.jsx'};
const input=Object.entries(exports).map(([name,file])=>`export {${name}} from ${JSON.stringify(join(root,'src',file))};`).join('\n')+`\nexport {default as KitchenApp} from ${JSON.stringify(join(root,'src/KitchenApp.jsx'))};\nexport {default as HomeApp} from ${JSON.stringify(join(root,'src/HomeApp.jsx'))};`;
const bundler=await rolldown({input:'electrical:test',platform:'node',external:id=>/^(react|react-dom|three)(\/|$)/.test(id),transform:{jsx:'react-jsx'},plugins:[{name:'component-tests',resolveId(id){if(id==='electrical:test')return '\0entry';if(id.endsWith('.css'))return '\0css'},load(id){if(id==='\0entry')return input;if(id==='\0css')return ''}}]});
const output=await bundler.generate({format:'esm'});await bundler.close();
for(const chunk of output.output)await writeFile(join(temp,chunk.fileName),chunk.type==='chunk'?chunk.code:chunk.source);
const bundlePath=join(temp,output.output.find(chunk=>chunk.type==='chunk'&&chunk.isEntry).fileName);const UI=await import(pathToFileURL(bundlePath));
const render=(Component,props)=>renderToStaticMarkup(React.createElement(Component,props));
const walk=(node,visit)=>{if(!node||typeof node!=='object')return;visit(node);React.Children.forEach(node.props?.children,c=>walk(c,visit));};
// Parse the actual rendered markup, accounting for hidden/inert ancestors.
// This is a DOM visibility contract check, not a browser layout/screenshot test.
const uiNodes=html=>{
 const code=String.raw`import sys,json
from html.parser import HTMLParser
class UI(HTMLParser):
 def __init__(self):
  super().__init__();self.nodes=[];self.stack=[]
 def handle_starttag(self,tag,attrs):
  a=dict(attrs);n={'tag':tag,'attrs':a,'parents':self.stack.copy(),'hidden':'hidden' in a or 'inert' in a or any(self.nodes[i]['hidden'] for i in self.stack)}
  self.nodes.append(n)
  if tag not in {'input','img','br','hr','meta','link','source','area','base','col','embed','param','track','wbr'}:self.stack.append(len(self.nodes)-1)
 def handle_endtag(self,tag):
  for j in range(len(self.stack)-1,-1,-1):
   if self.nodes[self.stack[j]]['tag']==tag:self.stack=self.stack[:j];break
 def handle_startendtag(self,tag,attrs):
  self.handle_starttag(tag,attrs);self.handle_endtag(tag)
p=UI();p.feed(sys.stdin.read());print(json.dumps(p.nodes))`;
 const r=spawnSync('python',['-c',code],{input:html,encoding:'utf8',maxBuffer:8*1024*1024});assert.equal(r.status,0,r.stderr);return JSON.parse(r.stdout);
};
const hasClass=(n,c)=>(n.attrs.class||'').split(/\s+/).includes(c);
const visibleUiControls=nodes=>nodes.filter(n=>!n.hidden&&['button','a','select','input','textarea'].includes(n.tag)&&!n.parents.some(i=>nodes[i].tag==='svg'));

test('hide-all keeps walking arrows and restore available while hiding other controls in every view',()=>{
 const old=globalThis.localStorage;
 try{
  for(const lang of ['he','en'])for(const cleanView of [false,true]){
   for(const mode of ['overview','room','walk','plan']){
    globalThis.localStorage={getItem:()=>JSON.stringify({schema:2,...normalizeHomeSettings({lang,cleanView,labels:true,showElectrical:true})})};
    const nodes=uiNodes(render(UI.HomeApp,{initialMode:mode})),controls=visibleUiControls(nodes),scene=nodes.find(n=>hasClass(n,mode==='plan'?'hs-plan-stage':'hs-model'));
    assert(scene&&!scene.hidden,`${mode}: the house remains mounted and visible`);
    if(cleanView){assert.equal(controls.length,mode==='walk'?5:1,`${mode}: only restore and walking arrows remain`);assert.equal(controls.filter(n=>'data-scene-ui-restore' in n.attrs).length,1);}
    else{assert.equal(controls.length,mode==='walk'?11:7,'two selectors and three primary actions, plus header and optional walking arrows');assert(!controls.some(n=>'data-scene-ui-restore' in n.attrs));}
    for(const c of ['hs-header','hs-footer','hs-simple-topbar','hs-simple-actions'])assert.equal(nodes.find(n=>hasClass(n,c)).hidden,cleanView,`${mode}: ${c}`);
    for(const c of ['hs-sidebar','hs-simple-panel'])assert(nodes.find(n=>hasClass(n,c)).hidden,`${c} stays closed until requested`);
    if(mode==='walk'){
     for(const c of ['hs-walk-controls','hs-walk-pad']){const pads=nodes.filter(n=>hasClass(n,c));assert.equal(pads.length,1,'one stable pad in both UI states');assert.equal(pads[0].hidden,false);}
     for(const c of ['hs-exit-walk','hs-minimap','hs-walk-crosshair'])assert(!nodes.some(n=>hasClass(n,c)),`${c} does not crowd the default walk view`);
     assert(nodes.find(n=>hasClass(n,'hs-walk-map-slot')).hidden,'compact pad never adds a map/caption');
     const arrows=controls.filter(n=>hasClass(n,'hs-hold'));assert.equal(arrows.length,4);assert.deepEqual(arrows.map(n=>n.attrs['aria-label']),lang==='he'?['קדימה','צעד שמאלה','אחורה','צעד ימינה']:['Forward','Step left','Back','Step right']);
    }else assert(!nodes.some(n=>hasClass(n,'hs-walk-controls')));

   }
   for(const view of ['perspective','plan','elevation','return']){
    globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{...DEFAULTS,lang,view,cleanView,dimensions:true,labels:true,showElectricalLabels:true}})};
    const nodes=uiNodes(render(UI.KitchenApp,{})),controls=visibleUiControls(nodes),scene=nodes.find(n=>hasClass(n,'scene-container'));
    assert(scene&&!scene.hidden,`${view}: canvas or drawing remains outside the hidden UI layer`);
    if(cleanView){assert.equal(controls.length,1,`${view}: zoom and camera controls also disappear`);assert('data-scene-ui-restore' in controls[0].attrs);}
    else assert(controls.length>10);
    for(const c of ['header','sidebar','page-footer','viewer-top','zoom-controls','viewer-bottom','kitchen-render-display'])assert.equal(nodes.find(n=>hasClass(n,c)).hidden,cleanView,`${view}: ${c}`);
   }
  }
 }finally{globalThis.localStorage=old;}
});

test('walking arrows keep hold/release/cancel behavior with the interface hidden and the map cannot leak through',()=>{
 const moves=[],tree=UI.WalkingControls({lang:'he',cleanView:true,minimap:React.createElement('button',{},'Map'),onMove:(...args)=>moves.push(args)}),buttons=[];
 walk(tree,n=>{if(n.type===UI.HoldButton)buttons.push(UI.HoldButton(n.props));});assert.equal(buttons.length,4);
 for(const button of buttons){
  const direction=button.props.className.split('hs-hold-')[1],events=[],event={pointerId:17,preventDefault(){events.push('prevent');},currentTarget:{setPointerCapture(id){events.push(id);}}};
  for(const end of ['onPointerUp','onPointerCancel','onLostPointerCapture']){
   button.props.onPointerDown(event);button.props[end]();assert.deepEqual(moves.splice(0),[[direction,true],[direction,false]],`${direction}: ${end} stops movement`);
  }
  assert.deepEqual(events,['prevent',17,'prevent',17,'prevent',17]);
 }
 for(const cleanView of [true,false]){
  const nodes=uiNodes(render(UI.WalkingControls,{lang:'en',cleanView,minimap:React.createElement('button',{},'Map'),onMove(){}}));
  assert.equal(visibleUiControls(nodes).length,cleanView?4:5);assert.equal(nodes.find(n=>n.tag==='span'&&n.parents.some(i=>hasClass(nodes[i],'hs-walk-pad'))).hidden,cleanView);assert.equal(nodes.find(n=>hasClass(n,'hs-walk-map-slot')).hidden,cleanView);
 }
});

test('furniture movement controls expose all directions, rotation/reset and plan selection at the saved position',()=>{
 const moves=[],steps=[],item=getFurniture('safe-bed'),tree=UI.FurniturePositionControls({item,lang:'he',step:.1,onStep:n=>steps.push(n),onMove:command=>moves.push(command)});
 walk(tree,n=>{if(n.type==='button')n.props.onClick();if(n.type==='select')n.props.onChange({target:{value:'.25'}});});
 assert.deepEqual(moves,[{dx:0,dz:-.1},{dx:-.1,dz:0},{dx:0,dz:.1},{dx:.1,dz:0},{rotate:true},{reset:true}]);assert.deepEqual(steps,[.25]);
 assert.equal(UI.FurniturePositionControls({item:getFurniture('living-sofa'),lang:'he'}),null);
 const selected=[],settings=normalizeHomeSettings(),plan=UI.HomePlan({settings,selectedRoom:'safe-room',onFurniture:id=>selected.push(id)}),rects=[];
 walk(plan,n=>{if(n.props?.['data-furniture-id']===item.id)rects.push(n);});assert.equal(rects.length,1);assert.equal(rects[0].props.role,'button');rects[0].props.onClick({stopPropagation(){}});assert.deepEqual(selected,[item.id]);
 const clean=UI.HomePlan({settings:{...settings,cleanView:true},selectedRoom:'safe-room',onFurniture:id=>selected.push(id)});walk(clean,n=>{if(n.props?.['data-furniture-id']===item.id){assert.equal(n.props.role,undefined);n.props.onClick({stopPropagation(){}});}});assert.equal(selected.length,1,'clean view never exposes furniture edit targets');
 const html=render(UI.FurniturePositionControls,{item,lang:'en',onStep(){},onMove(){},error:'door'});assert(html.includes('role="status"'));assert(html.includes('Keep the doorway clear'));
});

test('the home has one optional panel and three primary actions, with a focused furniture editor',()=>{
 const old=globalThis.localStorage;
 try{
  for(const lang of ['he','en'])for(const panel of ['rooms','options','furniture','yard']){
   globalThis.localStorage={getItem:()=>JSON.stringify(normalizeHomeSettings({lang}))};
   const html=render(UI.HomeApp,{initialRoom:'safe-room',initialMode:'walk',initialPanel:panel}),nodes=uiNodes(html),panels=nodes.filter(n=>hasClass(n,'hs-simple-panel')&&!n.hidden);
   assert.equal(panels.length,1);assert.equal(panels[0].attrs['data-active-panel'],panel);
   for(const [name,visible] of [['hs-sidebar',panel==='rooms'],['hs-simple-options',panel==='options'],['hs-simple-editor',panel==='furniture'],['hs-yard-editor',panel==='yard']])assert.equal(!nodes.find(n=>hasClass(n,name)).hidden,visible,`${panel}: only the chosen panel content is visible`);
   assert(!nodes.some(n=>hasClass(n,'hs-display-dock')||hasClass(n,'hs-space-title')),'no legacy overlapping title/dock');
   const walking=nodes.find(n=>hasClass(n,'hs-walk-controls'));if(walking)assert(walking.hidden,'walking pad yields to a panel');
   if(panel==='furniture'){
    const plan=nodes.find(n=>hasClass(n,'hs-plan')),items=nodes.filter(n=>'data-furniture-id' in n.attrs);
    assert.equal(plan.attrs['data-furniture-edit'],'true');assert.equal(plan.attrs.role,'group');
    assert(items.every(n=>getFurniture(n.attrs['data-furniture-id']).roomId==='safe-room'));
    const group=nodes.findIndex(n=>hasClass(n,'hs-furniture-picker')),choices=nodes.filter(n=>n.tag==='button'&&n.parents.includes(group));
    assert.equal(choices.length,3);assert.equal(choices.filter(n=>n.attrs['aria-pressed']==='true').length,1);
    assert(html.includes(lang==='he'?'10 ס״מ בכל לחיצה':'10 cm per press'));
    assert(!visibleUiControls(nodes).some(n=>n.attrs['aria-label']===(lang==='he'?'צעד הזזה':'Movement step')),'fixed arrow step needs no extra dropdown');
    const serviceIds=nodes.filter(n=>n.attrs['data-room-service']).map(n=>n.attrs['data-room-service']);assert.deepEqual(serviceIds,ELECTRICAL_LAYOUT.points.filter(p=>p.roomId==='safe-room').map(p=>p.id));assert(!html.includes('water-plan-markers'),'furniture editing shows electrical points without water clutter');
   }
  }
 }finally{globalThis.localStorage=old;}
});

test('furniture entry chooses an editable bedroom and makes room/item selection explicit',()=>{
 const chosen=[],moves=[],room='safe-room',bed=getFurniture('safe-bed'),settings=normalizeHomeSettings();
 for(const r of ROOMS){const next=UI.furnitureEditorSelection(r.id);assert(editableFurniture(getFurniture(next.itemId)));if(FURNITURE.some(f=>f.roomId===r.id&&editableFurniture(f)))assert.equal(next.roomId,r.id);}
 assert.equal(UI.furnitureEditorSelection('living',bed.id).itemId,bed.id);
 const editor=UI.HomeFurnitureEditor({settings,roomId:room,itemId:bed.id,lang:'he',onSelect:id=>chosen.push(id),onMove:v=>moves.push(v)});
 walk(editor,n=>{if(n.type==='button')n.props.onClick();if(n.type===UI.FurniturePositionControls)walk(UI.FurniturePositionControls(n.props),c=>{if(c.type==='button')c.props.onClick();});});
 assert.deepEqual(chosen,FURNITURE.filter(f=>f.roomId===room&&editableFurniture(f)).map(f=>f.id));
 assert.deepEqual(moves,[{dx:0,dz:-.1},{dx:-.1,dz:0},{dx:0,dz:.1},{dx:.1,dz:0},{rotate:true},{reset:true}]);
 const selected=[],tree=UI.HomeViewChooser({mode:'plan',roomId:room,editing:true,lang:'he',onRoom:id=>selected.push(id),onMode(){throw Error('editor has no view switch');}});
 walk(tree,n=>{if(n.type==='select'){assert.equal(n.props['aria-label'],'בחירת חדר');n.props.onChange({target:{value:'bedroom-a'}});}});assert.deepEqual(selected,['bedroom-a']);
 const namesOff=normalizeHomeSettings({labels:true}),namesOn=normalizeHomeSettings({...namesOff,showRoomNames:true});
 assert.equal(namesOff.showRoomNames,false);assert.equal(namesOn.showRoomNames,true);assert.equal(namesOn.labels,true,'old saved label preference is retained independently');
});

test('actual home CSS reserves separate scene, toolbar and panel rows at phone, tablet and desktop sizes',async()=>{
 const css=postcss.parse((await Promise.all(['src/home.css','src/render-controls.css','src/home-workspace.css'].map(file=>readFile(join(root,file),'utf8')))).join('\n'));
 const value=(nodes,index,property,width,height)=>{
  let winner={weight:-1,value:undefined};
  const simple=(i,s)=>i>=0&&/^(\.[\w-]+)+$/.test(s)&&s.slice(1).split('.').every(c=>hasClass(nodes[i],c));
  const matches=(i,tokens,t)=>{if(!simple(i,tokens[t]))return false;if(!t)return true;const parents=nodes[i].parents;if(tokens[t-1]==='>')return parents.length>0&&matches(parents.at(-1),tokens,t-2);return parents.some(p=>matches(p,tokens,t-1));};
  css.walkRules(rule=>{
   for(let p=rule.parent;p;p=p.parent)if(p.type==='atrule'&&p.name==='media'){
    const bounds=[...p.params.matchAll(/(min|max)-(width|height):\s*(\d+)px/g)];
    if(!bounds.length||bounds.some(([,kind,axis,n])=>kind==='min'?(axis==='width'?width:height)<Number(n):(axis==='width'?width:height)>Number(n)))return;
   }
   for(const selector of rule.selectors){const tokens=selector.trim().replaceAll('>',' > ').split(/\s+/);if(!matches(index,tokens,tokens.length-1))continue;const specificity=(selector.match(/\.[\w-]+/g)||[]).length;rule.walkDecls(property,decl=>{const weight=specificity+(decl.important?1000:0);if(weight>=winner.weight)winner={weight,value:decl.value};});}
  });return winner.value;
 };
 const old=globalThis.localStorage;
 try{
  for(const panel of [null,'rooms','options','furniture','yard'])for(const mode of ['overview','room','walk','plan'])for(const cleanView of [false,true]){
   globalThis.localStorage={getItem:()=>JSON.stringify(normalizeHomeSettings({cleanView}))};
   const nodes=uiNodes(render(UI.HomeApp,{initialMode:mode,initialPanel:panel})),index=name=>nodes.findIndex(n=>hasClass(n,name));
   for(const [width,height] of [[320,640],[393,852],[768,1024],[932,430],[1280,800]]){
    assert.equal(value(nodes,index('hs-stage'),'display',width,height),'grid');
    const scene=index(mode==='plan'||['furniture','yard'].includes(panel)?'hs-plan-stage':'hs-model');
    assert.equal(value(nodes,scene,'position',width,height),'relative');assert.equal(value(nodes,scene,'grid-row',width,height),cleanView?'1':'2');
    if(!cleanView){
     assert.equal(value(nodes,index('hs-simple-topbar'),'grid-row',width,height),'1');
     assert.equal(value(nodes,index('hs-simple-panel'),'grid-row',width,height),panel&&width>=900?'2':'3');
     assert.equal(value(nodes,index('hs-simple-actions'),'grid-row',width,height),panel&&width>=900?'3':'4');
    }
    assert.equal(value(nodes,index('hs-sidebar'),'position',width,height),'static');
    const pad=index('hs-walk-controls');if(pad>=0){assert.equal(value(nodes,pad,'position',width,height),'relative');assert.equal(value(nodes,pad,'grid-row',width,height),cleanView?'1':'2');}
   }
  }
 }finally{globalThis.localStorage=old;}
 assert.match(css.toString(),/\.hs-app \[hidden\],\.app \[hidden\]\{display:none!important\}/,'native hidden wins over mobile display rules');
});

test('furniture size form uses centimetres and guides show rotating fronts plus only the room’s source-backed electrical points',()=>{
 const settings=normalizeHomeSettings({showElectrical:false}),item=getFurniture('safe-storage',settings),moves=[],formTree=UI.FurnitureSizeEditor({item,lang:'he',onMove:c=>moves.push(c)});let form;
 walk(formTree,n=>{if(n.type==='form')form=n;});form.props.onSubmit({preventDefault(){},currentTarget:{elements:{namedItem:k=>({value:{w:'140',d:'55',h:'220'}[k]})}}});assert.deepEqual(moves,[{dimensions:{w:1.4,d:.55,h:2.2}}]);
 const fronts=render(UI.FurnitureFrontMarkers,{settings,roomId:'safe-room',scale:30});assert(fronts.includes('data-furniture-front="safe-storage"'));assert(fronts.includes('rotate(-90)'));assert(fronts.includes('צד הרגליים'));
 const selected=[],tree=UI.FurnitureRoomServices({settings,roomId:'safe-room',scale:30,onSelect:id=>selected.push(id)});walk(tree,n=>{if(n.type===UI.ElectricalFixtureGlyph)UI.ElectricalFixtureGlyph(n.props).props.onClick({stopPropagation(){}});});
 assert.deepEqual(selected,ELECTRICAL_LAYOUT.points.filter(p=>p.roomId==='safe-room').map(p=>p.id));
 const plan=render(UI.HomePlan,{settings,focusRoom:'safe-room',selectedRoom:'safe-room',onFurniture(){},onFurnitureMove(){},onInspect(){}});assert(plan.includes('hs-furniture-services'));assert(plan.includes('hs-furniture-fronts'));assert(plan.includes('fill="#d83f3f"'));assert(!/>S\d+<\/text>/.test(plan),'service IDs stay in accessible titles/details, not large plan labels');
 const clean={...settings,cleanView:true};assert.equal(render(UI.FurnitureFrontMarkers,{settings:clean,roomId:'safe-room',scale:30}),'');assert.equal(render(UI.FurnitureRoomServices,{settings:clean,roomId:'safe-room',scale:30}),'');
});

test('yard editing stays in the one-panel workspace, exposes dimensions and dragging, and hide-all removes every editor control',()=>{
 const old=globalThis.localStorage;
 try{
  for(const lang of ['he','en'])for(const cleanView of [false,true]){
   globalThis.localStorage={getItem:()=>JSON.stringify(normalizeHomeSettings({lang,cleanView}))};
   const html=render(UI.HomeApp,{initialPanel:'yard'}),nodes=uiNodes(html),plan=nodes.find(n=>hasClass(n,'hs-yard-plan'));if(cleanView)assert(!plan);else assert(plan&&!plan.hidden);assert(nodes.some(n=>hasClass(n,'hs-model')&&!n.hidden),'yard editing has a live 3D view');
   assert.equal(nodes.filter(n=>hasClass(n,'hs-simple-panel')&&!n.hidden).length,cleanView?0:1);
   if(cleanView){assert.equal(visibleUiControls(nodes).length,1);assert(!html.includes('hs-yard-reserves'));}
   else{assert(html.includes('data-yard-id="shed"'));assert(html.includes('data-yard-id="pergola"'));assert(html.includes('hs-yard-reserves'));assert(html.includes(lang==='he'?'החלת שינויים':'Apply changes'));}
  }
  const changes=[],editor=UI.HomeYardEditor({settings:normalizeHomeSettings(),selectedId:'fence',onSelect(){},onChange:c=>changes.push(c)});let form;walk(editor,n=>{if(n.type==='form')form=n;});form.props.onSubmit({preventDefault(){},currentTarget:{elements:{namedItem:k=>({value:k==='color'?'#445544':'180'})}}});assert.deepEqual(changes,[{dimensions:{h:1.8},color:'#445544'}]);
 }finally{globalThis.localStorage=old;}
});

test('actual kitchen CSS keeps toolbars in flow at phone, tablet and desktop widths despite the hide-all wrapper',async()=>{
 const css=postcss.parse((await Promise.all(['src/styles.css','src/render-controls.css','src/kitchen-viewer-layout.css'].map(file=>readFile(join(root,file),'utf8')))).join('\n'));
 // Match class-only selectors against the real rendered ancestor tree. This
 // checks the cascade that previously missed controls inside SceneUiLayer;
 // it does not substitute for browser pixel/layout verification.
 const matches=(nodes,index,selector)=>{
  const tokens=selector.trim().replaceAll('>',' > ').split(/\s+/),simple=(i,s)=>/^(\.[\w-]+)+$/.test(s)&&s.slice(1).split('.').every(c=>hasClass(nodes[i],c));
  const visit=(i,t)=>{if(!simple(i,tokens[t]))return false;if(t===0)return true;const parents=nodes[i].parents;if(tokens[t-1]==='>')return parents.length>0&&visit(parents.at(-1),t-2);return parents.some(p=>visit(p,t-1));};
  return visit(index,tokens.length-1);
 };
 const value=(nodes,index,property,width)=>{
  let winner={weight:-1,value:undefined};
  css.walkRules(rule=>{
   for(let parent=rule.parent;parent;parent=parent.parent)if(parent.type==='atrule'&&parent.name==='media'){
    const bounds=[...parent.params.matchAll(/(min|max)-width:\s*(\d+)px/g)];
    if(!bounds.length||bounds.some(([,kind,n])=>kind==='min'?width<Number(n):width>Number(n)))return;
   }
   for(const selector of rule.selectors){if(!matches(nodes,index,selector))continue;const specificity=(selector.match(/\.[\w-]+/g)||[]).length;
    rule.walkDecls(property,decl=>{const weight=specificity+(decl.important?1000:0);if(weight>=winner.weight)winner={weight,value:decl.value};});
   }
  });return winner.value;
 };
 const old=globalThis.localStorage;
 try{
  for(const lang of ['he','en'])for(const view of ['perspective','plan','elevation','return'])for(const showElectrical of [false,true]){
   globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{...DEFAULTS,lang,view,showElectrical,cleanView:false}})};
   const nodes=uiNodes(render(UI.KitchenApp,{})),scene=nodes.findIndex(n=>hasClass(n,'scene-container'));
   for(const width of [320,393,768,1280]){
    for(const name of ['viewer-top','scene-toolbelt','kitchen-render-display','zoom-controls','viewer-bottom','mobile-customize']){
     const index=nodes.findIndex(n=>hasClass(n,name));assert.equal(value(nodes,index,'position',width),'static',`${lang}/${view}/${showElectrical}/${width}: ${name} reserves its own space`);
    }
    assert.equal(value(nodes,scene,'position',width),'relative','the model occupies its own layout row');
    assert.equal(value(nodes,scene,'grid-row',width),'2');
    for(const [name,row] of [['kitchen-top-controls','1'],['kitchen-bottom-controls','3']])assert.equal(value(nodes,nodes.findIndex(n=>hasClass(n,name)),'grid-row',width),row);
    if(showElectrical&&width<=760){const index=nodes.findIndex(n=>hasClass(n,'electrical-view-controls'));assert.equal(value(nodes,index,'display',width),'grid');assert.equal(value(nodes,index,'grid-template-columns',width),'repeat(2,minmax(0,1fr))');}
   }
  }
 }finally{globalThis.localStorage=old;}
});

test('Escape restores the interface before the walk/inspection exit handlers and hiding labels preserves the saved settings',()=>{
 const order=[],state={mode:'walk',position:[4,1.62,9],yaw:.7,openDoors:['bed-b'],openParts:['sink:door-left'],cleanView:true},before=JSON.stringify(state);
 UI.restoreInterfaceOnEscape({key:'Enter',preventDefault(){throw Error('unexpected')},stopImmediatePropagation(){throw Error('unexpected')}},()=>{throw Error('unexpected')});
 UI.restoreInterfaceOnEscape({key:'Escape',preventDefault(){order.push('prevent')},stopImmediatePropagation(){order.push('capture')}},()=>{order.push('restore');state.cleanView=false;});
 assert.deepEqual(order,['prevent','capture','restore']);assert.equal(JSON.stringify({...state,cleanView:true}),before);
 const settings=normalizeHomeSettings({cleanView:true,labels:true,showElectrical:true,showWater:true}),snapshot=JSON.stringify(settings),html=render(UI.HomePlan,{settings,selectedRoom:'living',onSelect(){}});
 assert(!html.includes('<text'));assert(!html.includes('electrical-H02'));assert(!html.includes('water-plan-markers'));assert(html.includes('<line'));assert(html.includes('<polygon'));assert.equal(JSON.stringify(settings),snapshot);
 const restored=render(UI.HomePlan,{settings:{...settings,cleanView:false},selectedRoom:'living',onSelect(){}});assert(restored.includes('<text'));assert(restored.includes('H02'));
});

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
 const pages=[],props={settings:{...DEFAULTS,lang:'he'},selectedId:'electrical-K09',page:21,onSelect(){},onPage:n=>pages.push(n),onFocus(){}},gated=UI.KitchenElectricalCompare(props),tree=gated.props.children.type(gated.props.children.props),buttons=[];
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
  for(const Component of [UI.FloorPlan,UI.Elevation]){const html=render(Component,{settings,onSelect(){},onElectricalSelect(){}});assert(html.includes(mode==='hidden'?'style="opacity:1;display:none"':mode==='translucent'?'style="opacity:0.24"':'style="opacity:1"'));assert(html.includes('class="electrical-fixture-glyph"'));assert(html.includes(`width="${WINDOW.width}"`),'window stays in the drawing');}
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
 globalThis.localStorage={getItem:()=>JSON.stringify({schema:2,lang:'he',renderQuality:'light',cleanView:true})};const home=render(UI.HomeApp,{});assert(uiNodes(home).some(n=>hasClass(n,'hs-app')&&hasClass(n,'is-clean')));assert(home.includes('value="light" selected=""'));assert(home.includes('הצגת הפקדים'));}finally{globalThis.localStorage=old;}
});

test('Oculus VR entry reflects real support/busy/error states, starts only on click, and appears only in 3D views',()=>{
 for(const lang of ['he','en'])for(const status of ['checking','ready','requesting','presenting','unsupported','error']){
  let calls=0;const tree=UI.VrControls({state:{status,reason:status==='unsupported'?'policy':status==='error'?'permission':undefined},lang,onToggle:()=>calls++}),buttons=[];
  walk(tree,n=>{if(n.type==='button')buttons.push(n);});assert.equal(calls,0);assert.equal(buttons.length,1);assert.equal(buttons[0].props.disabled,['checking','requesting','unsupported'].includes(status));assert.equal(buttons[0].props['aria-pressed'],status==='presenting');
  if(!buttons[0].props.disabled){buttons[0].props.onClick();assert.equal(calls,1);}
  const html=render(UI.VrControls,{state:{status},lang,onToggle(){}});assert(html.includes('Oculus'));assert(html.includes('WebXR'));assert(!html.includes('undefined'));
 }
 const old=globalThis.localStorage;try{
  globalThis.localStorage={getItem:()=>null};for(const mode of ['overview','room','walk','plan']){const html=render(UI.HomeApp,{initialMode:mode});assert.equal(html.includes('class="vr-controls"'),mode!=='plan');}
  for(const view of ['perspective','plan','elevation','return']){globalThis.localStorage={getItem:()=>JSON.stringify({modelRevision:7,settings:{...DEFAULTS,view}})};const html=render(UI.KitchenApp,{});assert.equal(html.includes('class="vr-controls"'),view==='perspective');}
 }finally{globalThis.localStorage=old;}
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


test('choosing a fence colour immediately changes the plan and real fence material without submitting or remounting the dimensions form',()=>{
 let settings=normalizeHomeSettings();
 const editor=()=>UI.HomeYardEditor({settings,selectedId:'fence',onSelect(){},onChange:command=>{const r=editHomeYard(settings,'fence',command);assert(!r.error);settings=r.settings;}});
 const fields=tree=>{const found={};walk(tree,n=>{if(n.type==='form')found.form=n;if(n.type==='input'&&n.props.type==='color')found.colour=n;});return found;};
 const original=yardForSettings(settings).garden.fence.color,initial=fields(editor()),key=initial.form.key;
 for(const color of ['#eeeeee','#223344']){
  const current=fields(editor());assert.equal(typeof current.colour.props.onChange,'function');
  current.colour.props.onChange({currentTarget:{value:color}});
  assert.equal(settings.yardDesign.fence.color,color,'no form submission is required');
  const next=fields(editor());assert.equal(next.form.key,key,'colour changes must not recreate the native picker or discard draft dimensions');assert.equal(next.colour.props.value,color);
  settings=normalizeHomeSettings(JSON.parse(JSON.stringify(settings)));assert.equal(yardForSettings(settings).garden.fence.color,color);
  const plan=render(UI.YardPlan,{settings,selectedId:'fence',onSelect(){},onMove(){}});assert(plan.includes(`stroke="${color}"`));
  const scene=createHomeScene(settings);try{let slats=0,posts=0;scene.group.traverse(mesh=>{if(['horizontal-fence-slat','fence-post'].includes(mesh.userData.part)){assert.equal('#'+mesh.material.color.getHexString(),color);mesh.userData.part==='fence-post'?posts++:slats++;}});assert(slats>0&&posts>0);}finally{scene.dispose();}
 }
 settings=editHomeYard(settings,'fence',{reset:true}).settings;assert.equal(fields(editor()).colour.props.value,original);
});

test('individual light controls edit only their own saved point and reveal a hidden light layer for manual preview',()=>{
 const point={id:'lighting-K-L01',he:'תאורת מטבח',en:'Kitchen light'},other={enabled:false,brightness:15,kelvin:2700},settings={...DEFAULTS,lang:'he',showLighting:false,lightControls:{'lighting-S-L01':other}},changes=[];
 const tree=UI.LightControls({point,settings,onChange:(k,v)=>changes.push([k,v])});let toggle,brightness,temperature;
 walk(tree,n=>{if(n.type==='input'&&n.props.type==='checkbox')toggle=n;if(n.type==='input'&&n.props.type==='range')brightness=n;if(n.type==='select')temperature=n;});
 assert(toggle&&brightness&&temperature);brightness.props.onChange({target:{value:'42'}});assert.equal(changes[0][0],'showLighting');assert.equal(changes[0][1],true);assert.equal(changes[1][0],'lightControls');assert.equal(changes[1][1][point.id].brightness,42);assert.deepEqual(changes[1][1]['lighting-S-L01'],other);
 changes.length=0;temperature.props.onChange({target:{value:'4000'}});assert.equal(changes.at(-1)[1][point.id].kelvin,4000);
 changes.length=0;toggle.props.onChange({target:{checked:false}});assert.equal(changes.length,1);assert.equal(changes[0][1][point.id].enabled,false);
});

test('planning actions stay inside the existing panel, expose offline alternatives/printing and hide with all controls',()=>{
 const history={canUndo:true,canRedo:false,undo(){},redo(){}},pair={home:normalizeHomeSettings(),kitchen:DEFAULTS};
 const html=render(UI.PlanningTools,{lang:'he',history,getPair:()=>pair,onLoad(){},onReport(){}});assert(html.includes('חלופות, ביטול ודף תכנון'));assert(html.includes('שמירת חלופה חדשה'));assert(html.includes('PDF'));assert(html.includes('ייצוא גיבוי חלופות'));assert(html.includes('ייבוא גיבוי חלופות'));assert(/maxlength="80"/i.test(html));assert(!html.includes('position:fixed'));
 const calls=[],tree=UI.HistoryButtons({history:{...history,undo:()=>calls.push('undo'),redo:()=>calls.push('redo')},lang:'he'}),buttons=[];walk(tree,n=>{if(n.type==='button')buttons.push(n);});assert(!buttons[0].props.disabled);assert(buttons[1].props.disabled);buttons[0].props.onClick();assert.deepEqual(calls,['undo']);
 const old=globalThis.localStorage;try{globalThis.localStorage={getItem:()=>JSON.stringify(normalizeHomeSettings({cleanView:true}))};const nodes=uiNodes(render(UI.HomeApp,{initialPanel:'options'}));assert.equal(visibleUiControls(nodes).length,1);}finally{globalThis.localStorage=old;}
});

test('furniture assistance reports clearances and its snap toggle without adding floating item labels',()=>{
 const settings=normalizeHomeSettings(),changes=[],tree=UI.FurnitureAssistance({settings,id:'bed-a',onChange:(...c)=>changes.push(c)});let checkbox;walk(tree,n=>{if(n.type==='input')checkbox=n;});assert(checkbox.props.checked);checkbox.props.onChange({target:{checked:false}});assert.deepEqual(changes,[['furnitureSnap',false]]);
 const html=render(UI.HomePlan,{settings,focusRoom:'bedroom-a',selectedFurnitureId:'bed-a'});assert(html.includes('furniture-clearance-guides'));assert(html.includes('hs-furniture-fronts'));assert(html.includes('data-room-service='));assert(!html.includes('object-label'));
 const evidence=render(UI.DesignEvidence,{item:{lighting:true,positionInferred:true},settings,lang:'he'});assert(evidence.includes('נצפה בצילום'));assert(evidence.includes('הערכה במודל'));
});

test('entry cabinet controls stay in the existing inspector, expose separate leaves, and compare against the actual entrance media',async()=>{
 const {ENTRANCE_SERVICES:E}=await import('./home-model.mjs'),c=E.cabinets[1],settings=normalizeHomeSettings(),chosen=[],parts=[],sources=[];
 const facts=UI.EntranceServiceFacts({lang:'he',onInspect:(...args)=>chosen.push(args),onSource:(...args)=>sources.push(args)});walk(facts,n=>{if(n.type==='button')n.props.onClick();});assert.deepEqual(chosen,E.cabinets.map(c=>[c.id,true]));assert.deepEqual(sources,[['entry-services',3]]);
 const props={element:c,settings,lang:'he',minimized:false,onMinimize(){},onClose(){},onPart:id=>parts.push(id),onOpenCabinet:id=>chosen.push(id),onFocus(){},onSource:(...args)=>sources.push(args)},tree=UI.EntryServiceInspector(props),html=render(UI.EntryServiceInspector,props);assert(html.includes('data-entry-cabinet="entry-hot-water"'));assert(html.includes('298242.jpg'));assert(html.includes('לא קריאים'));assert(html.includes('פתיחה ומבט פנימה'));
 walk(tree,n=>{if(n.type==='button'&&n.props['aria-pressed']!==undefined)n.props.onClick();});assert.deepEqual(parts,c.parts.map(p=>p.id));
 const open=render(UI.EntryServiceInspector,{...props,settings:normalizeHomeSettings({openParts:c.parts.map(p=>p.id)})});assert(open.includes('סגירת שתי הדלתות'));
 const meters=render(UI.EntryServiceInspector,{...props,element:E.cabinets[2]});assert(meters.includes('מונה עליון מסומן 4'));assert(meters.includes('מונה תחתון מסומן 3'));assert(meters.includes('298252.jpg'));assert(meters.includes('פתח ניקוז'));assert(!meters.includes('התכולה לא ידועה'));assert(!meters.includes('מיכל לבן'));
 const plan=render(UI.HomePlan,{settings});for(const c of E.cabinets)assert(plan.includes(`data-entry-cabinet="${c.id}"`));
 const video=render(UI.HomeSources,{sourceId:'entry-services',page:10,lang:'he',onSourceId(){},onPage(){}});assert(video.includes('298240.mp4'));assert(video.includes('5.6'));assert(!video.includes('32 שנ׳'));assert(!video.includes('עותק תצוגה מוקטן'));
 const photo=render(UI.HomeSources,{sourceId:'entry-services',page:2,lang:'he',onSourceId(){},onPage(){}});assert(photo.includes('298242.jpg'));assert(photo.includes('ראש המיכל'));assert(photo.includes('ברכוש המשותף'));
 const meterSource=render(UI.HomeSources,{sourceId:'entry-services',page:4,lang:'he',onSourceId(){},onPage(){}});assert(meterSource.includes('298252.jpg'));assert(meterSource.includes('מכסה כחול סגור'));assert(meterSource.includes('תג 3'));
 const english=render(UI.EntryServiceInspector,{...props,element:E.cabinets[2],lang:'en'});assert(english.includes('Upper meter marked 4'));assert(english.includes('Lower meter marked 3'));assert(!english.includes('Contents are unknown'));
 const clean=render(UI.HomeApp,{initialPanel:'options'});assert(clean.includes('entry-service-facts'));assert(!clean.includes('entry-service-inspector'));
});

test('sun controls route civil time, darkness and shared 4000K settings through the existing panel',()=>{
 const settings=normalizeHomeSettings({lightControls:{'lighting-S-L01':{enabled:false,brightness:20,kelvin:2700}}}),changes=[],tree=UI.SunlightControls({settings,onChange:(...args)=>changes.push(args)}),html=render(UI.SunlightControls,{settings,onChange(){}}),fields=[],buttons=[];
 walk(tree,n=>{if(n.type==='input')fields.push(n);if(n.type==='button')buttons.push(n);});
 const text=n=>React.Children.toArray(n.props.children).filter(v=>typeof v==='string').join('');
 buttons.find(n=>text(n)==='מנורות בלבד').props.onClick();assert.deepEqual(changes.pop(),['light','night']);
 fields.find(n=>n.props.type==='time').props.onChange({target:{value:'11:15'}});const time=changes.pop();assert.equal(time[0],'solar');assert.equal(time[1].minutes,675);assert.equal(time[1].northBearing,135);
 fields.find(n=>n.props.type==='date').props.onChange({target:{value:'2026-12-21'}});assert.equal(changes.pop()[1].date,'2026-12-21');
 fields.find(n=>n.props['aria-label']==='שעה ביום').props.onChange({target:{value:'960'}});assert.equal(changes.pop()[1].minutes,960);
 buttons.find(n=>text(n).includes('כל המנורות')).props.onClick();const all=changes.pop();assert.equal(all[0],'lightControls');assert(Object.values(all[1]).every(p=>p.kelvin===4000));assert.equal(all[1]['lighting-S-L01'].enabled,false);assert.equal(all[1]['lighting-S-L01'].brightness,20);
 assert(html.includes('solar-north.png'));assert(html.includes('מגרש 1410'));assert(html.includes('UTC+'));assert(html.includes('type="time"'));assert(!html.includes('position:fixed'));
 const home=render(UI.HomeApp,{initialPanel:'options'});assert(home.includes('sunlight-controls'));
});

test('temporary lamp inspector and plan never present undocumented lamps as photographed points',async()=>{
 const {LIGHTING_LAYOUT}=await import('./home-model.mjs'),point=LIGHTING_LAYOUT.points.find(p=>p.simulation),settings=normalizeHomeSettings(),html=render(UI.LightingInspector,{point,settings,lang:'he',onClose(){},onChange(){}});
 assert(html.includes('מנורה זמנית בסימולטור'));assert(html.includes('תיעוד אמיתי'));assert(!html.includes('electrical-photo-image'));assert(!html.includes('נצפה בצילום'));assert(html.includes('4000K'));
 const english=render(UI.LightingInspector,{point,settings,lang:'en',onClose(){},onChange(){}});assert(english.includes('Temporary simulator lamp'));assert(english.includes('future')||english.includes('becomes available'));
 const plan=render(UI.HomePlan,{settings});assert(plan.includes('lighting-SIM-B1'));assert(plan.includes('#8a65ac'));
 const observed=render(UI.LightingInspector,{point:LIGHTING_LAYOUT.points[0],settings,lang:'he',onClose(){},onChange(){}});assert(observed.includes('photo-1.jpg'));assert(observed.includes('נצפה בצילום'));
});


test('the whole-building view has only a floor/view chooser, an in-flow apartment entry and one optional sources panel',()=>{
 const old=globalThis.localStorage;
 try{
  for(const cleanView of [false,true]){
   globalThis.localStorage={getItem:()=>JSON.stringify(normalizeHomeSettings({cleanView}))};
   const html=render(UI.HomeApp,{initialMode:'building'}),nodes=uiNodes(html),entries=nodes.filter(n=>hasClass(n,'building-tourbar')&&!n.hidden);assert.equal(entries.length,cleanView?0:1);
   assert.equal(nodes.filter(n=>hasClass(n,'hs-simple-panel')&&!n.hidden).length,0);if(cleanView)assert.equal(visibleUiControls(nodes).length,1);
   else{assert(html.includes('בחירת דירה, קומה או חדר'));assert(html.includes('כניסה לסיור'));assert(html.includes('unit:43:8'));assert(!html.includes('hs-projection-labels'));}
  }
  const changes=[],modes=[],sources=[],chooser=UI.HomeViewChooser({mode:'building',roomId:'living',lang:'he',buildingLevel:9,onDestination:v=>changes.push(v),onBuildingLevel:v=>changes.push(v),onMode:v=>modes.push(v)});let first;walk(chooser,n=>{if(n.type==='select'&&n.props['aria-label']==='בחירת דירה, קומה או חדר')first=n;});first.props.onChange({target:{value:'floor:6'}});assert.deepEqual(changes,['floor:6']);
  const controls=UI.BuildingControls({settings:normalizeHomeSettings({buildingLevel:6}),mode:'building',onChange:(...v)=>changes.push(v),onMode:v=>modes.push(v),onSource:(...v)=>sources.push(v)});walk(controls,n=>{if(n.props?.className==='building-source-button')n.props.onClick();});assert.deepEqual(sources,[['building-plan',8]]);
  const evidence=render(UI.BuildingControls,{settings:normalizeHomeSettings(),mode:'building',onChange(){},onMode(){},onSource(){}});assert(evidence.includes('אין חתך גבהים'));assert(evidence.includes('/house/exterior/reference-3.jpg'));assert(evidence.includes('/house/garden/reference-2.jpg'));
 }finally{globalThis.localStorage=old;}
});


test('source viewers never render photos or PDF previews before the real server session has been checked',()=>{
 const content=React.createElement(UI.DocumentAccessProvider,null,React.createElement(UI.HomeSources,{sourceId:'plan',lang:'he',onPage(){},onSourceId(){}})),html=renderToStaticMarkup(content);
 assert(html.includes('מסמכים ותמונות מוגנים'));assert(!html.includes('src="/house/'));assert(!html.includes('house-plan.jpg'));assert(!html.includes('Welcome1'));
 const thumbnail=renderToStaticMarkup(React.createElement(UI.DocumentAccessProvider,null,React.createElement(UI.ProtectedImage,{src:'/house/photos/photo-1.jpg',alt:'Original'})));assert(thumbnail.includes('document-image-lock'));assert(!thumbnail.includes('<img'));
 const material=renderToStaticMarkup(React.createElement(UI.DocumentAccessProvider,null,React.createElement(UI.ProtectedImage,{src:'/materials/runtime/MI402439-sample.png',alt:'Rendering material'})));assert(material.includes('<img'));
});
