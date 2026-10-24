export function measurePoints(a,b){
 if(![a,b].every(p=>Array.isArray(p)&&p.length===3&&p.every(Number.isFinite)))return null;
 const delta=a.map((v,i)=>b[i]-v);
 return {distance:Math.hypot(...delta),horizontal:Math.hypot(delta[0],delta[2]),height:Math.abs(delta[1]),approximate:true};
}
export function appendMeasurePoint(points,point){if(!Array.isArray(point)||point.length!==3||!point.every(Number.isFinite))return points;return points.length>=2?[point]:[...points,point];}
