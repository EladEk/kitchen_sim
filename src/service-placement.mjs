// Position a fixture connection on its back wall, rather than floating inside
// the fixture. A wall-linked estimate is still not an observed rough-in.
export function fixtureConnection(f,offset,walls,openings=[]){
 const [lx,height,lz]=offset,c=Math.cos(f.rotation),s=Math.sin(f.rotation),position=[f.position[0]+lx*c+lz*s,height,f.position[1]-lx*s+lz*c],normal=[s,c];
 const candidates=[];
 for(const wall of walls){const vertical=Math.abs(wall.a[0]-wall.b[0])<1e-6,axis=vertical?0:2,along=position[vertical?2:0],from=wall.a[vertical?1:0],to=wall.b[vertical?1:0],faceAxis=wall.a[vertical?0:1];
  if(Math.abs(normal[vertical?0:1])<.9||along<from+.03||along>to-.03)continue;
  const side=normal[vertical?0:1]>0?1:-1,face=faceAxis+side*(wall.thickness/2+.018),distance=(position[axis]-face)*side;
  if(distance<-.12||distance>.55)continue;
  if(openings.some(o=>o.wallId===wall.id&&along>o.start-.045&&along<o.end+.045&&height>o.sill-.045&&height<o.sill+o.height+.045))continue;
  candidates.push({wall,vertical,side,face,distance:Math.abs(distance)});
 }
 candidates.sort((a,b)=>a.distance-b.distance);const best=candidates[0];
 if(!best)return {position,normal,placementBasis:'fixture-back'};
 position[best.vertical?0:2]=best.face;
 return {position,normal:best.vertical?[best.side,0]:[0,best.side],wallId:best.wall.id,side:best.side,placementBasis:'fixture-back-wall'};
}

export function servicePlacementIssues(p,walls,openings=[]){
 const position=p.observedPosition||p.position,height=p.observedHeight||p.height,wall=walls.find(w=>w.id===p.wallId);
 if(!wall)return p.placementBasis==='fixture-back'?[]:['missing-wall'];
 const vertical=Math.abs(wall.a[0]-wall.b[0])<1e-6,along=position[vertical?2:0],issues=[];
 if(along<wall.a[vertical?1:0]-.001||along>wall.b[vertical?1:0]+.001)issues.push('outside-wall-span');
 for(const o of openings.filter(o=>o.wallId===wall.id))if(along>o.start&&along<o.end&&height>o.sill&&height<o.sill+o.height)issues.push(`inside-opening:${o.id}`);
 return issues;
}
