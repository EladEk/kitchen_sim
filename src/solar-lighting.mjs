// NOAA's approximate solar-position equations, evaluated at Israel civil time.
// https://gml.noaa.gov/grad/solcalc/solareqns.PDF
export const SOLAR_SOURCE='https://gml.noaa.gov/grad/solcalc/solareqns.PDF';
const rad=Math.PI/180,clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export function israelDate(now=new Date()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).map(p=>[p.type,p.value]));return `${p.year}-${p.month}-${p.day}`;
}
export const SOLAR_SITE={cityHe:'אופקים',cityEn:'Ofakim',plot:'1410',building:'4102',apartment:'4',source:'/house/house-plan.pdf',northImage:'/house/solar-north.png',northBearing:135};
export function solarDefaults(){return {date:israelDate(),minutes:12*60,latitude:31.31,longitude:34.62,northBearing:SOLAR_SITE.northBearing};}
export function normalizeSolar(value){
 const base=solarDefaults(),v=value&&typeof value==='object'?value:{};
 const stamp=typeof v.date==='string'&&/^20\d\d-\d\d-\d\d$/.test(v.date)?new Date(v.date+'T12:00:00Z'):null;
 const date=stamp&&Number.isFinite(stamp.getTime())&&stamp.toISOString().slice(0,10)===v.date?v.date:base.date;
 return {date,minutes:Number.isFinite(v.minutes)?clamp(Math.round(v.minutes),0,1439):base.minutes,latitude:Number.isFinite(v.latitude)?clamp(v.latitude,-89,89):base.latitude,longitude:Number.isFinite(v.longitude)?clamp(v.longitude,-180,180):base.longitude,northBearing:Number.isFinite(v.northBearing)?((v.northBearing%360)+360)%360:base.northBearing};
}
export function israelUtcOffset(date,minutes){
 // Iterate UTC -> civil time, so winter/summer offsets come from the timezone
 // database rather than a hardcoded season. UI solar hours are local clock time.
 const [y,m,d]=date.split('-').map(Number),wall=Date.UTC(y,m-1,d,Math.floor(minutes/60),minutes%60);let utc=wall-2*3600000,offset=2;
 for(let i=0;i<3;i++){const p=Object.fromEntries(new Intl.DateTimeFormat('en-GB',{timeZone:'Asia/Jerusalem',year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(utc)).map(p=>[p.type,p.value]));offset=(Date.UTC(+p.year,+p.month-1,+p.day,+p.hour,+p.minute)-utc)/3600000;utc=wall-offset*3600000;}
 return offset;
}
export function solarPosition(value){
 const s=normalizeSolar(value),[year,month,day]=s.date.split('-').map(Number),days=year%4===0&&(year%100!==0||year%400===0)?366:365,doy=(Date.UTC(year,month-1,day)-Date.UTC(year,0,0))/86400000;
 const hour=s.minutes/60,gamma=2*Math.PI/days*(doy-1+(hour-12)/24),offset=israelUtcOffset(s.date,s.minutes);
 const equation=229.18*(.000075+.001868*Math.cos(gamma)-.032077*Math.sin(gamma)-.014615*Math.cos(2*gamma)-.040849*Math.sin(2*gamma));
 const declination=.006918-.399912*Math.cos(gamma)+.070257*Math.sin(gamma)-.006758*Math.cos(2*gamma)+.000907*Math.sin(2*gamma)-.002697*Math.cos(3*gamma)+.00148*Math.sin(3*gamma);
 const ha=(s.minutes+equation+4*s.longitude-60*offset)/4-180,lat=s.latitude*rad,h=ha*rad;
 const elevation=Math.asin(clamp(Math.sin(lat)*Math.sin(declination)+Math.cos(lat)*Math.cos(declination)*Math.cos(h),-1,1))/rad;
 const azimuth=(Math.atan2(Math.sin(h),Math.cos(h)*Math.sin(lat)-Math.tan(declination)*Math.cos(lat))/rad+180+360)%360;
 const relative=(azimuth-s.northBearing)*rad,e=elevation*rad;
 return {...s,azimuth,elevation,utcOffset:offset,aboveHorizon:elevation>0,direction:[Math.sin(relative)*Math.cos(e),Math.sin(e),-Math.cos(relative)*Math.cos(e)]};
}
export const lampsOnly=settings=>['night','evening'].includes(settings.light);
export function daylightState(settings){
 const sun=solarPosition(settings.solar),amount=lampsOnly(settings)?0:clamp(Math.sin(sun.elevation*rad),0,1);
 return {sun,amount,intensity:amount>0?3*Math.sqrt(amount):0,sky:amount*.65,environment:amount*.22,background:lampsOnly(settings)||sun.elevation<-6?'#030508':sun.elevation<=0?'#343a48':'#e3e9e9'};
}
export const SHARED_LIGHT_SETTINGS=['solar','light','lampsOn','lightControls','buildingShadows'];
