import {forwardRef,useEffect,useImperativeHandle,useRef} from 'react';
import {ELECTRICAL_KINDS} from './home-electrical.mjs';
import {layoutElectricalCallouts,nearestElectricalAnchors} from './electrical-ui.mjs';
import './electrical.css';

export function selectSvgElectricalPoint(svg,positions,event,onSelect){
 const matrix=svg?.getScreenCTM();if(!matrix||!onSelect)return;
 const anchors=positions.map(({point:p,x,y})=>{const v=new DOMPoint(x,y).matrixTransform(matrix);return {id:p.id,x:v.x,y:v.y};});
 const point=nearestElectricalAnchors({x:event.clientX,y:event.clientY},anchors,22)[0];
 if(point){event.stopPropagation();onSelect(point.id);}
}

// Fixed CSS-pixel buttons, independent of 3D zoom and SVG drawing scale.
export function ElectricalMarkerButtons({points,selectedId,lang,onSelect,buttonRef,lineRef}){
 return <>{points.map(p=>{const name=p.relocation&&!p.photoEvidence?(lang==='he'?p.relocation.he:p.relocation.en):(lang==='he'?p.he:p.en);return <button key={p.id} ref={el=>buttonRef?.(p.id,el)} className={`electrical-callout ${p.id===selectedId?'is-selected':''}`} style={{'--point-color':ELECTRICAL_KINDS[p.kind].color,visibility:'hidden'}} data-electrical-id={p.id} aria-label={`${p.label} · ${name}`} aria-pressed={p.id===selectedId} title={name} onPointerDown={e=>e.stopPropagation()} onClick={e=>{e.stopPropagation();onSelect?.(p.id);}}><span className="electrical-callout-face"><bdi>{p.label}</bdi><small>{p.relocation?(lang==='he'?(p.photoEvidence?'מקור':'מוצע'):(p.photoEvidence?'Original':'Proposed')):lang==='he'?(p.kind==='outlet'?'שקע':p.kind==='control'?'מפסק?':'הכנה'):(p.kind==='outlet'?'Socket':p.kind==='control'?'Switch?':'Prep')}</small></span></button>;})}<svg className="electrical-callout-lines" aria-hidden="true">{points.map(p=><g key={p.id} ref={el=>lineRef?.(p.id,el)} style={{visibility:'hidden',color:ELECTRICAL_KINDS[p.kind].color}}><line/><circle r="2"/></g>)}</svg></>;
}

export const ElectricalCallouts=forwardRef(function ElectricalCallouts({points,selectedId,lang,onSelect,className=''},ref){
 const buttons=useRef(new Map()),lines=useRef(new Map()),selection=useRef(selectedId);selection.current=selectedId;
 useImperativeHandle(ref,()=>({update(anchors,width,height,options={}){
  const layout=layoutElectricalCallouts(anchors,{width,height,selectedId:selection.current,...options}),visible=new Set(layout.map(p=>p.id));
  for(const [id,el] of buttons.current)if(el)el.style.visibility=visible.has(id)?'visible':'hidden';
  for(const [id,el] of lines.current)if(el)el.style.visibility=visible.has(id)?'visible':'hidden';
  for(const p of layout){const el=buttons.current.get(p.id),g=lines.current.get(p.id);if(el){el.style.left=`${p.x}px`;el.style.top=`${p.y}px`;}if(g){const [line,dot]=g.children;line.setAttribute('x1',p.anchorX);line.setAttribute('y1',p.anchorY);line.setAttribute('x2',p.x);line.setAttribute('y2',p.y);dot.setAttribute('cx',p.anchorX);dot.setAttribute('cy',p.anchorY);}}
 }}),[]);
 return <div className={`electrical-callouts ${className}`}><ElectricalMarkerButtons points={points} selectedId={selectedId} lang={lang} onSelect={onSelect} buttonRef={(id,el)=>el?buttons.current.set(id,el):buttons.current.delete(id)} lineRef={(id,el)=>el?lines.current.set(id,el):lines.current.delete(id)}/></div>;
});

export function SvgElectricalCallouts({svgRef,points,positions,selectedId,lang,onSelect,zoom,bounds:calloutBounds}){
 const overlay=useRef();
 useEffect(()=>{
  const svg=svgRef.current;if(!svg)return;
  const update=()=>{const matrix=svg.getScreenCTM(),bounds=svg.parentElement.getBoundingClientRect();if(!matrix)return;const anchors=positions.map(({point:p,x,y})=>{const v=new DOMPoint(x,y).matrixTransform(matrix);return {id:p.id,x:v.x-bounds.left,y:v.y-bounds.top};});overlay.current?.update(anchors,bounds.width,bounds.height,calloutBounds);};
  const observer=new ResizeObserver(update);observer.observe(svg.parentElement);update();
  // CSS zoom has a short transition; keep leaders attached throughout it.
  let frame,start=performance.now();const settle=()=>{update();if(performance.now()-start<260)frame=requestAnimationFrame(settle);};frame=requestAnimationFrame(settle);
  return()=>{observer.disconnect();cancelAnimationFrame(frame);};
 },[svgRef,positions,selectedId,zoom,calloutBounds]);
 return <ElectricalCallouts ref={overlay} points={points} selectedId={selectedId} lang={lang} onSelect={onSelect}/>;
}
