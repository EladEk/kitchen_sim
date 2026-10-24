// Only restore a missed facade opening when the actual CAD OPENING strokes
// cover a structural wall gap. PORCH/screen strokes cannot become glazing.
import {readFileSync,writeFileSync} from 'node:fs';
import {BUILDING_TRACE as trace} from '../src/building-trace.mjs';
import {BUILDING_INTERIORS} from '../src/building-interiors.mjs';
import {connectedWallRuns,wallFootprint} from '../src/building-geometry.mjs';
const source=JSON.parse(readFileSync('scripts/facade-source-edges.json')),added=[];
for(const floor of trace.floors.filter(f=>f.level>0)){
 for(const path of floor.envelope)path.openings=path.openings.filter(o=>!o.restored);
 const inside=BUILDING_INTERIORS.floors[floor.level],walls=connectedWallRuns(inside,floor),edges=source.floors.find(f=>f.level===floor.level).edges;
 for(const [pathIndex,path] of floor.envelope.entries())for(const [edge,a] of path.polygon.entries()){
  const b=path.polygon[(edge+1)%path.polygon.length],normal=Math.abs(a[0]-b[0])<.01?0:1,axis=1-normal,lo=Math.min(a[axis],b[axis]),hi=Math.max(a[axis],b[axis]),line=a[normal],at=v=>normal===0?[line,v]:[v,line],intervals=[];
  for(const w of walls){const box=wallFootprint(w),n=normal===0?'X':'Z',along=axis===0?'X':'Z';if(line>=box['min'+n]-.14&&line<=box['max'+n]+.14)intervals.push([box['min'+along],box['max'+along]]);}
  for(const o of path.openings.filter(o=>o.edge===edge))intervals.push([Math.min(o.a[axis],o.b[axis]),Math.max(o.a[axis],o.b[axis])]);
  for(const d of inside.doors)if(Math.abs(d.hinge[normal]-d.closed[normal])<.01&&Math.abs(d.hinge[normal]-line)<.35)intervals.push([Math.min(d.hinge[axis],d.closed[axis])-.08,Math.max(d.hinge[axis],d.closed[axis])+.08]);
  const merged=[];for(const [s,t]of intervals.map(([s,t])=>[Math.max(s,lo),Math.min(t,hi)]).filter(([s,t])=>t>s).sort((a,b)=>a[0]-b[0])){if(merged.length&&s<=merged.at(-1)[1]+.015)merged.at(-1)[1]=Math.max(merged.at(-1)[1],t);else merged.push([s,t]);}
  let cursor=lo;for(const [s,t]of [...merged,[hi,hi]]){const width=s-cursor;if(width>.42&&width<3.8){
   const matches=edges.filter(e=>e.kind==='opening'&&Math.abs(e.a[normal]-e.b[normal])<.01&&Math.abs((e.a[normal]+e.b[normal])/2-line)<.27&&Math.min(Math.max(e.a[axis],e.b[axis]),s)-Math.max(Math.min(e.a[axis],e.b[axis]),cursor)>.15);
   // A sliding pair is drawn as separate half-width panels. Require two
   // independently located CAD tracks to cover the whole gap collectively;
   // demanding one long stroke on each panel split a real slider into windows.
   const tracks=new Map();for(const e of matches){const key=Math.round((e.a[normal]+e.b[normal])/2/.015);if(!tracks.has(key))tracks.set(key,[]);tracks.get(key).push([Math.max(cursor,Math.min(e.a[axis],e.b[axis])),Math.min(s,Math.max(e.a[axis],e.b[axis]))]);}
   const covered=[...tracks.values()].filter(spans=>{let end=cursor,total=0;for(const [a,b]of spans.sort((a,b)=>a[0]-b[0])){total+=Math.max(0,b-Math.max(a,end));end=Math.max(end,b);}return total>width*.8;});
   if(covered.length>=2&&new Set(matches.map(e=>e.path)).size>=2){const o={edge,a:at(cursor),b:at(s),kind:width>1.85?'slider':'window',basis:'pdf-wall-gap',sourceOpeningPaths:[...new Set(matches.map(e=>e.path))],restored:true};path.openings.push(o);added.push({level:floor.level,path:pathIndex,...o});}
  }cursor=Math.max(cursor,t);}
 }
}
writeFileSync('src/building-trace.mjs','// Registered building traces; facade repairs retain source CAD opening paths.\nexport const BUILDING_TRACE='+JSON.stringify(trace)+';\n');
writeFileSync('qa/facade-restored-openings.json',JSON.stringify({sourceSha256:source.sourceSha256,added},null,2)+'\n');console.log(JSON.stringify({restored:added.length,perFloor:trace.floors.map(f=>added.filter(o=>o.level===f.level).length)}));
