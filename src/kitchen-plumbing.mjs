import {LONG} from './model.mjs';
const sink=LONG.find(m=>m.id==='sink');
export const KITCHEN_SINK_PLUMBING=Object.freeze({cabinetId:sink.id,position:[(sink.x+sink.w/2)/1000,.55,.055],normal:[0,1],spacing:.08,sourcePage:1,sourceRect:[.613,.539,.033,.032],heightInferred:true});
