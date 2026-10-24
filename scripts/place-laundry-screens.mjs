import {readFileSync,writeFileSync} from 'node:fs';
const source=JSON.parse(readFileSync('scripts/facade-source-edges.json'));
// All screen faces use the actual outer PORCH mouth. Moving the southern
// screen to the safe-room corner at z=11.64 detached its inner post from walls.
const anchors=[
 {id:'north-west',a:[2.50,-14.956],b:[2.50,-13.254]},
 {id:'north-east',a:[20.898,-14.956],b:[20.898,-13.254]},
 {id:'south-west',a:[8.499,9.045],b:[10.198,9.045]},
 {id:'south-east',a:[13.198,9.045],b:[14.899,9.045]},
 {id:'west',a:[3.95,-2.715],b:[3.95,-1.555]},
 {id:'east',a:[19.448,-10.354],b:[19.448,-9.194]},
 {id:'west-return',a:[3.95,-1.555],b:[4.648,-1.555]},
 {id:'east-return',a:[18.748,-10.354],b:[19.448,-10.354]}
];
const rows=[],failures=[];
for(const level of [1,2,3,4,5,6])for(const target of anchors){
 const normal=Math.abs(target.a[0]-target.b[0])<.01?0:1,axis=1-normal,length=Math.abs(target.b[axis]-target.a[axis]),mid=(target.a[axis]+target.b[axis])/2;
 const candidates=source.floors.find(f=>f.level===level).edges.filter(e=>e.kind==='screen'&&Math.abs(e.a[normal]-e.b[normal])<.01).map(e=>({e,score:Math.abs((e.a[normal]+e.b[normal])/2-target.a[normal])*2+Math.abs((e.a[axis]+e.b[axis])/2-mid)+Math.abs(Math.abs(e.b[axis]-e.a[axis])-length)})).sort((a,b)=>a.score-b.score);
 const match=candidates[0];if(!match||match.score>.60){failures.push({level,id:target.id,score:match?.score});continue;}
 const e=match.e;let a=[...e.a],b=[...e.b];if(a[axis]>b[axis])[a,b]=[b,a];
 const sourceA=[...a],sourceB=[...b];
 rows.push({level,id:target.id,a,b,sourceA,sourceB,page:source.floors.find(f=>f.level===level).page,sourcePath:e.path,sourceLayer:e.layer,outerPlaneFromPhoto:false,placementBasis:'pdf-porch-mouth'});
}
if(failures.length)throw Error(JSON.stringify(failures));
writeFileSync('src/laundry-screen-layout.mjs','// Actual CAD PORCH mouths, including attached side returns.\nexport const LAUNDRY_SCREEN_LAYOUT='+JSON.stringify(rows)+';\n');
console.log(JSON.stringify({screensAndReturns:rows.length,floors:6}));
