import {SERVICE_COLORS} from './service-colors.mjs';
import {KITCHEN_SINK_PLUMBING} from './kitchen-plumbing.mjs';
import {fixtureConnection} from './service-placement.mjs';

export const WATER_STYLE={he:'נקודת מים',en:'Water point',color:SERVICE_COLORS.water,symbol:'W'};
export const waterVisible=(p,settings)=>settings.showElectrical!==false&&settings.showWater!==false;

export function createWaterLayout({point,walls,furniture,kitchenAnchor,openings=[]}){
 const points=[];
 function add(id,roomId,position,normal,he,en,extra={}){points.push({id:`water-${id}`,label:id,kind:'water',water:true,roomId,position,normal,height:position[1],width:.09,boxHeight:.085,depth:.018,positionInferred:true,dimensionsInferred:true,evidence:[],...extra,he,en});}
 function observed(id,roomId,wallId,along,side,height,he,en,page,rect){const wall=walls.find(w=>w.id===wallId),vertical=Math.abs(wall.a[0]-wall.b[0])<.001,station=vertical?point(606,along)[1]:point(along,45.7)[0],offset=side*(wall.thickness/2+.033),position=vertical?[wall.a[0]+offset,height,station]:[station,height,wall.a[1]+offset];add(id,roomId,position,vertical?[side,0]:[0,side],he,en,{status:'observed',page,source:'electrical-survey',wallId,evidence:[{page,rect}]});}
 // The R21 source box incorrectly overlapped K07. The water loop is beneath
 // K06 at the sink, above its drain; K05 stays retired as an electrical ID.
 const sink=KITCHEN_SINK_PLUMBING,[sx,sy,sz]=sink.position;
 add('W01','kitchen',[kitchenAnchor[0]-sx,sy,kitchenAnchor[1]-sz],[0,-1],'הכנת מים מתחת לכיור — מהצילום','Water preparation beneath sink — photographed',{status:'observed',page:1,source:'electrical-survey',wallId:'wet-north',side:-1,fixtureId:'sink',clusterSpacing:sink.spacing,placementBasis:'photo-and-sink-cabinet',evidence:[{page:1,rect:[...sink.sourceRect]}]});
 observed('W02','garden','wet-east',486,1,.7,'ברזי מים במבואת השירות — מהצילום','Service-porch water taps — photographed',18,[.13,.614,.085,.043]);
 const refs={vanity:[0,.55,-.15],'wall-basin':[0,.55,-.15],'wall-toilet':[0,.55,-.15],tub:[-.55,1.05,-.35],shower:[-.18,1.05,-.4],washer:[0,.7,-.34],'outdoor-kitchen':[-1.15,.55,-.26]};
 for(const f of furniture){if(!refs[f.kind]||f.id==='dryer')continue;const placement=fixtureConnection(f,refs[f.kind],walls,openings),{position,normal}=placement;
  const name=f.kind==='vanity'||f.kind==='wall-basin'?['חיבור מים לכיור','Basin water connection']:f.kind==='wall-toilet'?['הזנת מים למכל הדחה סמוי','Concealed cistern water supply']:f.kind==='tub'?['חיבור מים לאמבטיה','Bath water connection']:f.kind==='shower'?['חיבור מים למקלחת','Shower water connection']:f.kind==='washer'?['חיבור מים למכונת הכביסה','Washing-machine water connection']:['חיבור מים לכיור במטבח החוץ','Outdoor-kitchen sink water connection'];
  add(`W${String(points.length+1).padStart(2,'0')}`,f.roomId,position,normal,...name,{...placement,status:'layout',fixtureId:f.id,source:f.kind==='outdoor-kitchen'?'hercules':f.kind==='washer'?'apartment-spec':'harash',page:f.kind==='outdoor-kitchen'?1:f.kind==='washer'?30:f.roomId==='ensuite'?4:f.roomId==='powder'?5:3});
 }
 return {points,noteHe:'נקודות בצילום מסומנות לפי מה שנראה. יתר החיבורים מסומנים לפי פריסת הכלים בהדמיה; מקום ההכנה והגובה בפועל אינם מדודים.',noteEn:'Photo points follow visible evidence. Other connections follow the modeled fixtures; actual rough-in locations and heights are unmeasured.'};
}

export function localKitchenWater(points,kitchenAnchor){return points.filter(p=>p.roomId==='kitchen').map(p=>({...p,homePosition:[...p.position],position:[kitchenAnchor[0]-p.position[0],p.position[1],kitchenAnchor[1]-p.position[2]],normal:[-p.normal[0],-p.normal[1]],wall:'long'}));}
