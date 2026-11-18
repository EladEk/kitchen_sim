import {NodeBuilder} from 'three/webgpu';
import {normalView,normalViewGeometry,normalWorldGeometry,positionView,positionWorld} from 'three/tsl';

// Evaluate the actual TSL arithmetic graph, rather than reimplementing the
// finish formulas in tests. Unknown operations fail closed. Derivatives use
// explicit planar pixel footprints; this is not a substitute for GPU QA.
const components=value=>Array.isArray(value)?value:value?.toArray?value.toArray():[value];
const builtins=new Set([positionWorld,positionView,normalWorldGeometry,normalViewGeometry,normalView]);
const zip=(fn,...values)=>{
 const arrays=values.map(components),length=Math.max(...arrays.map(v=>v.length));
 const result=Array.from({length},(_,i)=>fn(...arrays.map(v=>v.length===1?v[0]:v[i])));
 return length===1?result[0]:result;
};
const operators={'+':(a,b)=>a+b,'-':(a,b)=>a-b,'*':(a,b)=>a*b,'/':(a,b)=>a/b,'%':(a,b)=>a-b*Math.floor(a/b),'>':(a,b)=>a>b,'>=':(a,b)=>a>=b,'<':(a,b)=>a<b,'<=':(a,b)=>a<=b,'==':(a,b)=>a===b,'!=':(a,b)=>a!==b,'&&':(a,b)=>a&&b,'||':(a,b)=>a||b};
const methods={abs:Math.abs,sin:Math.sin,cos:Math.cos,floor:Math.floor,fract:x=>x-Math.floor(x),max:Math.max,min:Math.min,pow:Math.pow,sign:Math.sign,negate:x=>-x,oneMinus:x=>1-x,
 clamp:(x,a,b)=>Math.max(a,Math.min(b,x)),mix:(a,b,t)=>a+(b-a)*t,step:(a,x)=>x<a?0:1,
 smoothstep:(a,b,x)=>{const t=Math.max(0,Math.min(1,(x-a)/(b-a)));return t*t*(3-2*t);}};

export function expandTSLGraph(roots,material){
 const builder=new NodeBuilder(null,null);builder.material=material;
 const seen=new Set(),pending=[...roots];
 while(pending.length){
  const node=pending.pop();if(!node?.isNode||seen.has(node))continue;seen.add(node);
  if(builtins.has(node))continue;
  if(node.isShaderCallNodeInternal)pending.push(node.getOutputNode(builder));
  pending.push(...node.getChildren());
 }
 return [...seen];
}

export function evaluateTSL(root,{material,position=[0,0,0],normal=[0,1,0],viewNormal=[0,0,1],viewPosition=[0,0,-2],dx=[.0002,0,0],dy=[0,0,.0002],inputs=new Map(),derivatives=new Map()}={}){
 const builder=new NodeBuilder(null,null);builder.material=material;
 function sample(at){
  const cache=new Map(),values=new Map([[positionWorld,at],[normalWorldGeometry,normal],[normalViewGeometry,viewNormal],[normalView,viewNormal],[positionView,viewPosition],...inputs]);
  function read(node){
   if(values.has(node))return values.get(node);
   if(cache.has(node))return cache.get(node);
   const type=node.constructor.name;
   let value;
   if(node.isConstNode||node.isUniformNode)value=node.value?.toArray?node.value.toArray():node.value;
   else if(node.isVarNode)value=read(node.node);
   else if(node.isMaterialReferenceNode)value=material[node.property]?.toArray?material[node.property].toArray():material[node.property];
   else if(node.isShaderCallNodeInternal)value=read(node.getOutputNode(builder));
   else if(node.isStackNode){if(node.nodes.length)throw Error('Imperative TSL is not supported by the arithmetic evaluator');value=read(node.outputNode);}
   else if(node.isSplitNode){const source=components(read(node.node)),v=[...node.components].map(c=>source['xyzw'.indexOf(c)]);value=v.length===1?v[0]:v;}
   else if(type==='JoinNode')value=node.nodes.flatMap(n=>components(read(n)));
   else if(type==='ConvertNode'){
    const source=components(read(node.node)),size=Number(node.convertTo.match(/vec(\d)/)?.[1]||1);
    value=size===1?source[0]:Array.from({length:size},(_,i)=>source.length===1?source[0]:source[i]);
   }
   else if(type==='ConditionalNode')value=read(read(node.condNode)?node.ifNode:node.elseNode);
   else if(node.isOperatorNode){const fn=operators[node.op];if(!fn)throw Error('Unsupported TSL operator '+node.op);value=zip(fn,read(node.aNode),read(node.bNode));}
   else if(node.isMathNode){
    const {method}=node;
    if(method==='dFdx'||method==='dFdy'){
     const supplied=derivatives.get(node.aNode)?.[method];
     if(supplied!==undefined)value=supplied;
     else{
      const delta=method==='dFdx'?dx:dy;
      const before=sample(at.map((v,i)=>v-delta[i]/2))(node.aNode),after=sample(at.map((v,i)=>v+delta[i]/2))(node.aNode);
      value=zip((a,b)=>a-b,after,before);
     }
    }else{
     const a=read(node.aNode),b=node.bNode?read(node.bNode):null,c=node.cNode?read(node.cNode):null;
     if(method==='length')value=Math.hypot(...components(a));
     else if(method==='normalize'){const length=Math.hypot(...components(a));value=zip(v=>v/length,a);}
     else if(method==='dot')value=components(zip((x,y)=>x*y,a,b)).reduce((sum,v)=>sum+v,0);
     else if(method==='cross'){const [x,y,z]=a,[u,v,w]=b;value=[y*w-z*v,z*u-x*w,x*v-y*u];}
     else{const fn=methods[method];if(!fn)throw Error('Unsupported TSL method '+method);value=zip(fn,a,...(b===null?[]:[b]),...(c===null?[]:[c]));}
    }
   }else throw Error('Unsupported TSL node '+type);
   cache.set(node,value);return value;
  }
  return read;
 }
 return sample(position)(root);
}
