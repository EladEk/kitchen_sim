// Room-by-room transcription of Harash order 31/151388, dated 16/09/2026.
// Page rectangles identify the actual order line, not a nearby waste/spare row.
export const FINISH_SCHEDULE_VERSION=26;
const rect=y=>[271/595,(y-4)/842,304/595,16.8/842];
const row=(id,rooms,he,en,productId,finishId,page,y)=>({id,rooms,he,en,productId,finishId,source:'harash',page,rect:rect(y),basis:'order-line'});
export const FLOOR_ORDER_ROWS=[
 row('public-floor',['living','kitchen'],'סלון ומטבח','Living room & kitchen','dry-floor','ordered-white',1,426.7),
 row('master-floor',['master'],'חדר הורים','Main bedroom','dry-floor','ordered-white',1,567.1),
 row('bedrooms-floor',['bedroom-a','bedroom-b','bedroom-c'],'חדרים 1, 2 וחדר העבודה','Bedrooms 1, 2 & home office','dry-floor','ordered-white',1,706.9),
 row('safe-room-floor',['safe-room'],'ממ״ד','Safe room','dry-floor','ordered-white',2,396.1),
 row('bathroom-floor',['bathroom'],'חדר רחצה כללי','General bathroom','wet-floor','ordered-wet',2,685.3),
 row('ensuite-floor',['ensuite'],'רחצת הורים — שטח החדר','Main bathroom — room floor','wet-floor','ordered-wet',4,296.5),
 row('ensuite-shower-floor',[],'פינת מקלחת ההורים','Main shower area','shower-floor',null,4,352.9),
 row('powder-floor',['powder'],'שירותי אורחים','Guest WC','wet-floor','ordered-wet',4,684.7),
 row('laundry-floor',['laundry'],'חדר שירות','Utility room','wet-floor','ordered-wet',5,412.9),
 row('terrace-floor',['terrace'],'מרפסת מרוצפת','Paved terrace','terrace-floor','ordered-terrace',2,535.9)
];
export const floorOrderEvidence=id=>FLOOR_ORDER_ROWS.find(r=>r.id===id)||null;
export function floorOrderForRoom(id){
 if(id==='hall')return {...FLOOR_ORDER_ROWS[0],rooms:['hall'],he:'מסדרון — המשך החלל הציבורי',en:'Hall — continuation of public floor',basis:'continuity'};
 return FLOOR_ORDER_ROWS.find(r=>r.rooms.includes(id))||null;
}
export const orderedFinishForRoom=id=>floorOrderForRoom(id)?.finishId||'ordered-white';
export const CLADDED_ROOM_IDS=['bathroom','ensuite','powder'];
export const roomHasOrderedCladding=id=>CLADDED_ROOM_IDS.includes(id);
export function migrateHomeFloorSchedule(value={}){
 if(!value||typeof value!=='object')value={};
 if(value.finishScheduleVersion===FINISH_SCHEDULE_VERSION)return value;
 const rooms=Object.fromEntries(Object.entries(value.rooms||{}).map(([id,room])=>[id,{...room,...(floorOrderForRoom(id)?{floor:orderedFinishForRoom(id)}:{})}]));
 return {...value,finishScheduleVersion:FINISH_SCHEDULE_VERSION,rooms};
}
export function migrateKitchenFloorSchedule(settings={}){
 if(!settings||typeof settings!=='object'||Array.isArray(settings))settings={};
 return {...settings,...(settings.finishScheduleVersion===FINISH_SCHEDULE_VERSION?{}:{floor:'harash'}),finishScheduleVersion:FINISH_SCHEDULE_VERSION};
}
