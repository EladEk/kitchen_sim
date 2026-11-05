import {lightColour} from './lighting-controls.mjs';
import * as THREE from 'three';
import {OUTDOOR_KITCHEN} from './home-products.mjs';

// Metric Hercules assembly from the supplied product sheet: 80 + 150 + 80 cm,
// about 70 cm deep. Cabinet height and internal hardware are illustrative.
export function buildOutdoorKitchen({f,parent,box,cylinder,mat,resources,motions,picks,settings}){
 const metal=mat('#232724',{metalness:.5,roughness:.48}),stone=mat('#363a35',{roughness:.85}),steel=mat('#aeb7b3',{metalness:.8,roughness:.28}),black=mat('#121a16'),inside=mat('#61685e'),glass=mat('#72929c',{transparent:true,opacity:.3,metalness:.12,roughness:.1,depthWrite:false}),led=mat(lightColour(4000),{emissive:lightColour(4000),emissiveIntensity:settings.lampsOn===false?0:.45});
 const opened=new Set(settings.openParts),data={action:'furniture',furnitureId:f.id},part=key=>({action:'part',furnitureId:f.id,partId:`${f.id}:${key}`});
 const bodyTop=.86,base=.10,depth=OUTDOOR_KITCHEN.depth;
 parent.userData.productId='hercules';
 function module(id,x,w){const g=new THREE.Group();g.position.x=x;g.userData.moduleWidth=w;g.userData.moduleId=id;parent.add(g);box(0,base,0,w,.035,depth,metal,g,data);box(0,.48,-depth/2+.012,w,.75,.024,metal,g,data);for(const xx of [-w/2+.01,w/2-.01])box(xx,.48,0,.02,.75,depth,metal,g,data);for(const xx of [-w/2+.08,w/2-.08])for(const z of [-.25,.25])cylinder(xx,.045,z,.025,.08,black,g);return g;}
 const sink=module('sink',-1.15,.8),grill=module('grill',0,1.5),fridge=module('fridge',1.15,.8);
 function door(key,hingeX,width,height=.72,y=.12,material=metal,direction=-1){const p=new THREE.Group();p.position.set(hingeX,y,depth/2+.012);p.rotation.y=opened.has(`${f.id}:${key}`)?direction*1.5:0;parent.add(p);motions.push({id:`${f.id}:${key}`,object:p,axis:'rotation',property:'y',target:p.rotation.y,closedTarget:0,openTarget:direction*1.5});const sign=direction<0?1:-1;box(sign*width/2,height/2,0,width-.005,height,.026,material,p,part(key));box(sign*width/2,height-.04,.021,width-.05,.014,.024,steel,p,part(key));return p;}
 door('sink-left',-1.55,.4);door('sink-right',-.75,.4,.72,.12,metal,1);
 door('grill-left',-.75,.5,.63);door('grill-right',.75,.5,.63,.12,metal,1);door('storage',.75,.28);
 for(let i=0;i<2;i++){const key=`grill-drawer-${i}`,g=new THREE.Group(),y=.61-i*.31;g.position.set(0,y,opened.has(`${f.id}:${key}`)?.42:0);parent.add(g);motions.push({id:`${f.id}:${key}`,object:g,axis:'position',property:'z',target:g.position.z,closedTarget:0,openTarget:.42});box(0,.02,.362,.49,.29,.025,metal,g,part(key));box(0,.11,.38,.43,.014,.025,steel,g,part(key));box(0,-.1,0,.45,.02,.6,inside,g,part(key));for(const x of [-.225,.225])box(x,.0,0,.015,.22,.59,inside,g,part(key));box(0,.0,-.29,.45,.22,.018,inside,g,part(key));}
 // Worktops and the actual sink opening; the bowl dimensions are illustrative.
 const top=.88;for(const [x,w] of [[-.75-.0875,.175],[-1.55+.0875,.175]])box(x,top,0,w,.04,.7,stone,parent,data);
 box(-1.15,top,-.265,.45,.04,.17,stone,parent,data);box(-1.15,top,.285,.45,.04,.13,stone,parent,data);
 for(const x of [-1.38,-.92])box(x,.89,.035,.018,.02,.42,steel,parent,data);for(const z of [-.175,.245])box(-1.15,.89,z,.48,.02,.018,steel,parent,data);
 box(-1.15,.71,.035,.43,.016,.39,steel,parent,data);for(const x of [-1.365,-.935])box(x,.8,.035,.018,.18,.4,steel,parent,data);for(const z of [-.16,.23])box(-1.15,.8,z,.43,.18,.018,steel,parent,data);cylinder(-1.15,.723,.04,.025,.008,black,parent);
 box(1.15,top,0,.8,.04,.7,stone,parent,data);box(.52,top,0,.46,.04,.7,stone,parent,data);
 cylinder(-1.15,1.09,-.25,.018,.43,black,parent,data);
 const arc=new THREE.CatmullRomCurve3([new THREE.Vector3(-1.15,1.16,-.25),new THREE.Vector3(-1.15,1.42,-.22),new THREE.Vector3(-1.15,1.46,-.06),new THREE.Vector3(-1.15,1.21,.06)]),tube=new THREE.TubeGeometry(arc,28,.014,8,false);resources.push(tube);parent.add(new THREE.Mesh(tube,black));cylinder(-1.15,1.17,.06,.021,.12,metal,parent,data);
 cylinder(-1.15,.55,-.03,.022,.3,steel,parent);
 // Six-burner Gusto grill, rear burner, side hob and hinged hood.
 box(0,.83,.33,1.5,.15,.055,metal,parent,data);box(-.24,.93,0,1.02,.06,.58,steel,parent,data);
 for(let i=0;i<28;i++)box(-.725+i*.036,.971,0,.012,.016,.52,black,parent,data);
 box(-.24,1.02,-.26,.88,.065,.035,steel,parent,data);
 for(let i=0;i<8;i++){const knob=cylinder(-.65+i*1.3/7,.84,.374,.025,.022,steel,parent,data);knob.rotation.x=Math.PI/2;const center=cylinder(-.65+i*1.3/7,.84,.388,.018,.008,black,parent,data);center.rotation.x=Math.PI/2;}
 box(.51,.91,0,.36,.02,.43,steel,parent,data);cylinder(.51,.93,0,.11,.02,black,parent,data);for(const x of [.42,.60])box(x,.955,0,.012,.025,.27,metal,parent,data);
 const lid=new THREE.Group();lid.position.set(-.24,.99,-.29);lid.rotation.x=opened.has(`${f.id}:grill-lid`)?-1.32:0;parent.add(lid);motions.push({id:`${f.id}:grill-lid`,object:lid,axis:'rotation',property:'x',target:lid.rotation.x,closedTarget:0,openTarget:-1.32});
 const hoodGeo=new THREE.CylinderGeometry(.29,.29,1.05,32,1,true,0,Math.PI);hoodGeo.rotateZ(Math.PI/2);hoodGeo.translate(0,0,.29);resources.push(hoodGeo);const hood=new THREE.Mesh(hoodGeo,metal);hood.userData=part('grill-lid');hood.material.side=THREE.DoubleSide;hood.castShadow=true;lid.add(hood);picks.push(hood);
 for(const x of [-.525,.525]){const geo=new THREE.CircleGeometry(.29,32,0,Math.PI);geo.rotateY(Math.PI/2);geo.translate(x,0,.29);resources.push(geo);const end=new THREE.Mesh(geo,metal);end.userData=part('grill-lid');lid.add(end);picks.push(end);}
 box(0,.07,.603,.86,.027,.027,steel,lid,part('grill-lid'));for(const x of [-.40,.40])box(x,.07,.58,.025,.025,.06,steel,lid,part('grill-lid'));
 const warm=mat(lightColour(4000),{emissive:lightColour(4000),emissiveIntensity:settings.lampsOn===false?0:opened.has(`${f.id}:grill-lid`)?1:.1});for(const x of [-.43,.43])box(x,.025,.30,.025,.012,.06,warm,lid);
 // Glass-door refrigerator and adjacent storage within the 80 cm unit.
 for(const x of [1.045,1.535])box(x,.48,0,.02,.73,.63,black,parent,data);box(1.29,.48,-.305,.5,.73,.02,black,parent,data);for(const y of [.12,.84])box(1.29,y,0,.5,.025,.63,black,parent,data);for(const y of [.20,.40,.60])box(1.29,y,.03,.45,.012,.52,steel,parent,data);box(1.29,.80,-.26,.43,.015,.02,led,parent,data);
 for(const x of [1.16,1.29,1.42]){cylinder(x,.28,.1,.035,.14,mat('#6b7757'),parent);cylinder(x,.38,.1,.013,.08,black,parent);}
 const leaf=door('fridge',1.55,.52,.72,.12,glass,1);for(const xx of [-.51,-.01])box(xx,.36,.013,.024,.72,.03,steel,leaf,part('fridge'));for(const y of [.014,.708])box(-.26,y,.013,.52,.025,.03,steel,leaf,part('fridge'));box(-.055,.37,.04,.018,.3,.025,steel,leaf,part('fridge'));
 box(.89,.45,-.03,.23,.02,.56,inside,parent,data);
 for(const x of [-1.45,-.86,-.65,.65,.85,1.45])box(x,.07,.345,.035,.10,.035,metal,parent);
}
