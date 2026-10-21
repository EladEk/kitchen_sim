import {ELECTRICAL_LAYOUT,furnitureForSettings,editableFurniture} from './home-model.mjs';
import {ELECTRICAL_KINDS,electricalPlanMarkers} from './home-electrical.mjs';
import {ElectricalFixtureGlyph} from './KitchenElectrical.jsx';

export function FurnitureFrontMarkers({settings,roomId,scale}){
 if(settings.cleanView)return null;
 return <g className="hs-furniture-fronts" pointerEvents="none">{furnitureForSettings(settings).filter(f=>f.roomId===roomId&&editableFurniture(f)).map(f=>{
  const y=f.d*scale/2-1.2;return <g key={f.id} data-furniture-front={f.id} transform={`translate(${f.position[0]*scale} ${f.position[1]*scale}) rotate(${-f.rotation*180/Math.PI})`}><title>{settings.lang==='he'?(f.kind==='bed'?'צד הרגליים':'חזית / צד הגישה'):(f.kind==='bed'?'Foot of bed':'Front / access side')}</title><line x1={-f.w*scale*.32} x2={f.w*scale*.32} y1={y} y2={y} stroke="#244f61" strokeWidth="1.4"/><path d={`M -2 ${y-3} L 2 ${y-3} L 0 ${y+.7} Z`} fill="#244f61" stroke="#fff" strokeWidth=".35"/></g>;
 })}</g>;
}
export function FurnitureRoomServices({settings,roomId,scale,onSelect,selectedId}){
 if(settings.cleanView)return null;
 return <g className="hs-furniture-services">{electricalPlanMarkers(ELECTRICAL_LAYOUT.points.filter(p=>p.roomId===roomId)).map(({point:p,x,z})=><g key={p.id} data-room-service={p.id}><line x1={p.position[0]*scale} y1={p.position[2]*scale} x2={x*scale} y2={z*scale} stroke={ELECTRICAL_KINDS[p.kind].color} strokeWidth=".6" opacity=".75" pointerEvents="none"/><circle cx={p.position[0]*scale} cy={p.position[2]*scale} r=".9" fill={ELECTRICAL_KINDS[p.kind].color} pointerEvents="none"/><g transform={`translate(${x*scale} ${z*scale}) scale(.065)`}><ElectricalFixtureGlyph point={p} x={0} y={0} settings={{...settings,showElectricalLabels:false,selectedElectricalId:selectedId}} onSelect={onSelect}/></g></g>)}</g>;
}
