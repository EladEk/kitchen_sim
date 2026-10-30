import {DISTRICT} from './district-layout.mjs';

const STORAGE='home-studio-district-doors-v1';
export function publicDoorAncestor(object,stop=null){for(let p=object;p&&p!==stop;p=p.parent)if(p.userData.tourDoor)return p;return null;}
export function publicDoorCatalog(source){const doors=new Map();source.traverse(o=>{const d=o.userData.tourDoor;if(!d)return;if(doors.has(d.id))throw Error('Duplicate public door: '+d.id);if(!['rotation','position'].includes(d.axis)||!['x','y','z'].includes(d.property)||![d.open,d.closed].every(Number.isFinite))throw Error('Invalid public door pose');doors.set(d.id,o);});return doors;}

// One live set of hinges serves the selected building. Other buildings keep
// compact Boolean overrides and instanced context poses, not cloned houses.
export function createDistrictDoorController({model,variants=new Map(),storage=globalThis.localStorage,onChange=()=>{}}){
 const catalogs=new Map([...new Set([model,...variants.values()])].map(s=>[s,publicDoorCatalog(s)])),states=new Map(),active=new Map(),surfaces=new Map();let disposed=false;
 for(const [source,catalog] of catalogs){const meshes=[];for(const root of catalog.values())root.traverse(o=>{if(o.isMesh)meshes.push(o);});surfaces.set(source,meshes);}
 const sourceFor=id=>variants.get(id)||model,catalogFor=id=>catalogs.get(sourceFor(id));
 try{const raw=storage?.getItem(STORAGE);if(raw&&raw.length<262144){const value=JSON.parse(raw);for(const b of DISTRICT){const entries=value?.[b.id];if(!entries||typeof entries!=='object')continue;const map=new Map();for(const [id,root] of catalogFor(b.id)){const v=entries[id];if(typeof v==='boolean'&&v!==root.userData.tourDoor.defaultOpen)map.set(id,v);}if(map.size)states.set(b.id,map);}}}catch{}
 const isOpen=(building,id)=>{const root=catalogFor(building)?.get(id);return root?states.get(building)?.get(id)??root.userData.tourDoor.defaultOpen:null;};
 function apply(root,opened){const d=root.userData.tourDoor;root[d.axis][d.property]=opened?d.open:d.closed;root.updateMatrix();}
 function persist(){try{storage?.setItem(STORAGE,JSON.stringify(Object.fromEntries([...states].map(([id,map])=>[id,Object.fromEntries(map)]))));}catch{}}
 return {
  sourceFor,isOpen,
  setSourceVisibility(source,visible){for(const mesh of surfaces.get(source)||[])mesh.visible=visible;},
  activate(building,source=sourceFor(building)){if(disposed||active.get(source)===building)return false;for(const [id,root] of catalogs.get(source)||[])apply(root,isOpen(building,id));active.set(source,building);source.updateWorldMatrix(true,true);return true;},
  onSelect(data,building){if(disposed||data?.action!=='district-door'||!DISTRICT.some(b=>b.id===building))return false;const source=sourceFor(building),root=catalogFor(building).get(data.doorId);if(!root)return false;if(active.get(source)!==building)for(const [id,r] of catalogs.get(source))apply(r,isOpen(building,id));const opened=!isOpen(building,data.doorId);if(!states.has(building))states.set(building,new Map());const map=states.get(building);if(opened===root.userData.tourDoor.defaultOpen)map.delete(data.doorId);else map.set(data.doorId,opened);if(!map.size)states.delete(building);apply(root,opened);active.set(source,building);source.updateWorldMatrix(true,true);persist();onChange({building,doorId:data.doorId,source});return true;},
  initializeCollisions(rebuild){for(const building of states.keys()){const source=sourceFor(building);for(const [id,root] of catalogs.get(source))apply(root,isOpen(building,id));active.set(source,building);source.updateWorldMatrix(true,true);rebuild(building,source);}},
  get stats(){return {templates:catalogs.size,doors:catalogs.get(model)?.size||0,overrides:[...states.values()].reduce((n,m)=>n+m.size,0)};},
  dispose(){if(disposed)return;disposed=true;catalogs.clear();states.clear();active.clear();surfaces.clear();model=null;variants=new Map();storage=null;onChange=()=>{};}
 };
}
