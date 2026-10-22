import {ArrowUp,ArrowLeft,ArrowDown,ArrowRight} from 'lucide-react';
import {useEffect,useRef,useState} from 'react';
import {joystickVector} from './joystick.mjs';
import './walking-joystick.css';

export function HoldButton({move,label,icon:Icon,onMove}){
 return <button className={`hs-hold hs-hold-${move}`} aria-label={label} title={label} onPointerDown={e=>{e.preventDefault();e.currentTarget.setPointerCapture(e.pointerId);onMove(move,true);}} onPointerUp={()=>onMove(move,false)} onPointerCancel={()=>onMove(move,false)} onLostPointerCapture={()=>onMove(move,false)}><Icon size={21}/></button>;
}

export function WalkingJoystick({lang,onMove}){
 const active=useRef(null),latest=useRef(onMove),[knob,setKnob]=useState({x:0,y:0});latest.current=onMove;
 const stop=()=>{active.current=null;setKnob({x:0,y:0});latest.current('joystick',{x:0,y:0});};
 useEffect(()=>{const blur=()=>stop(),visibility=()=>{if(document.hidden)stop();};window.addEventListener('blur',blur);document.addEventListener('visibilitychange',visibility);return()=>{window.removeEventListener('blur',blur);document.removeEventListener('visibilitychange',visibility);latest.current('joystick',{x:0,y:0});};},[]);
 const move=e=>{if(active.current!==e.pointerId)return;const b=e.currentTarget.getBoundingClientRect(),dx=e.clientX-b.left-b.width/2,dy=e.clientY-b.top-b.height/2,l=Math.hypot(dx,dy),s=Math.min(44,l)/(l||1);setKnob({x:dx*s,y:dy*s});latest.current('joystick',joystickVector(dx,dy));};
 return <div className="hs-walk-joystick" role="group" tabIndex={0} aria-label={lang==='he'?'ג׳ויסטיק להליכה — גרירה לתנועה, גרירת המסך לסיבוב המבט':'Walking joystick — drag to move, drag the scene to look'} onPointerDown={e=>{if(active.current!==null)return;e.preventDefault();e.stopPropagation();active.current=e.pointerId;e.currentTarget.setPointerCapture(e.pointerId);move(e);}} onPointerMove={move} onPointerUp={stop} onPointerCancel={stop} onLostPointerCapture={stop} onKeyDown={e=>{const directions={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};if(directions[e.key]){e.preventDefault();e.stopPropagation();const [x,y]=directions[e.key];setKnob({x:x*38,y:y*38});latest.current('joystick',{x,y});}}} onKeyUp={stop} onBlur={stop}><span className="hs-joystick-axis hs-joystick-horizontal"/><span className="hs-joystick-axis hs-joystick-vertical"/><span className="hs-joystick-knob" style={{transform:`translate(${knob.x}px,${knob.y}px)`}}/><span className="hs-joystick-label" aria-hidden="true">{lang==='he'?'תנועה':'MOVE'}</span></div>;
}

// Mobile joystick and desktop pad remain outside the hide-all layer.
export function WalkingControls({lang,cleanView,minimap,onMove,compact=false,hidden=false}){
 const he=lang==='he';
 return <div className="hs-walk-controls" hidden={hidden}><WalkingJoystick lang={lang} onMove={onMove}/><div className="hs-walk-pad" role="group" aria-label={he?'בקרות הליכה':'Walking controls'}><HoldButton move="forward" icon={ArrowUp} label={he?'קדימה':'Forward'} onMove={onMove}/><HoldButton move="left" icon={ArrowLeft} label={he?'צעד שמאלה':'Step left'} onMove={onMove}/><HoldButton move="back" icon={ArrowDown} label={he?'אחורה':'Back'} onMove={onMove}/><HoldButton move="right" icon={ArrowRight} label={he?'צעד ימינה':'Step right'} onMove={onMove}/><span hidden={cleanView||compact}>W A S D</span></div><div className="hs-walk-map-slot" hidden={cleanView||compact}>{minimap}</div></div>;
}
