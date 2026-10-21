// Only visible luminaires/temporary lamp holders are recorded here. Red ceiling
// caps, vents and sprinklers are deliberately excluded. Coordinates are estimates.
export const LIGHTING_STYLE={he:'נקודת תאורה',en:'Lighting point',color:'#af862d',symbol:'L'};
const ref=(id,image,he,en,extra={})=>({id,image,he,en,...extra});
export const LIGHTING_REFERENCES=[
 ref('public','/house/photos/photo-1.jpg','תקרת המטבח והחלל הציבורי','Kitchen and public-space ceiling'),
 ref('kitchen-video','/house/electrical/kitchen-hall-277903.jpg','המטבח — צילום נוסף וסרטון','Kitchen — additional photo and video',{second:1.5}),
 ref('bed-b','/house/photos/photo-4.jpg','חדר מצולם — בית מנורה בתקרה','Photographed bedroom — ceiling lamp holder'),
 ref('master','/house/photos/photo-6.jpg','חדר הורים — תאורה באזור השינה','Main bedroom — sleeping-area light',{second:23.5}),
 ref('office','/house/photos/photo-7.jpg','חדר עבודה — בית מנורה בתקרה','Office — ceiling lamp holder',{second:28}),
 ref('safe','/house/photos/photo-9.jpg','ממ״ד — בית מנורה בתקרה','Safe room — ceiling lamp holder',{second:19.5}),
 ref('facade','/house/garden/reference-1.jpg','גופי תאורה עגולים בחזית הגינה','Round garden-facade luminaires'),
 ref('side','/house/exterior/reference-4.jpg','תאורת קיר לצד חלון הממ״ד','Wall light beside safe-room window'),
 ref('entry','/house/entry-services/298241.jpg','שני גופים שקועים במבואה המשותפת','Two recessed lights in the common entrance')
];
const ev=(source,rect)=>({source,rect});
const ceiling=(label,roomId,pdf,he,en,evidence,extra={})=>({id:`lighting-${label}`,label,roomId,pdf,mount:'ceiling',height:2.75,drop:.24,he,en,evidence,...extra});
const wall=(label,roomId,wallId,along,side,he,en,evidence)=>({id:`lighting-${label}`,label,roomId,wallId,along,side,mount:'wall',height:2.45,he,en,evidence});
export const LIGHTING_OBSERVATIONS=[
 ceiling('L01','living',[1102,103],'תאורה ליד הכניסה','Light near entrance',[ev('public',[.014,.173,.029,.055])]),
 ceiling('L02','living',[916,215],'תאורה בחלל הציבורי','Public-space light',[ev('public',[.267,.098,.026,.07])]),
 ceiling('K-L01','kitchen',[1200,251],'תאורה ליד הקיר הקצר','Light beside short kitchen wall',[ev('public',[.474,.235,.022,.04])]),
 ceiling('K-L02','kitchen',[1018,315],'תאורה לצד קיר העבודה','Light beside work wall',[ev('public',[.698,.122,.026,.062]),ev('kitchen-video',[.398,.307,.026,.064])]),
 ceiling('B-L01','bedroom-b',[713,543],'בית מנורה בחדר שינה 2','Bedroom 2 lamp holder',[ev('bed-b',[.385,.014,.037,.094])],{roomInferred:true}),
 ceiling('M-L01','master',[730,827],'תאורה באזור השינה של ההורים','Main-bedroom sleeping-area light',[ev('master',[.351,.074,.025,.068])]),
 ceiling('O-L01','bedroom-c',[901,823],'בית מנורה בחדר העבודה','Office lamp holder',[ev('office',[.365,0,.054,.084])],{roomInferred:true}),
 ceiling('S-L01','safe-room',[976,606],'בית מנורה בממ״ד','Safe-room lamp holder',[ev('safe',[.386,0,.053,.1])]),
 ceiling('E-L01','living',[1175,79],'תאורה שקועה במבואת הכניסה — ליד הדלת','Entrance recessed light — near door',[ev('entry',[.73,.112,.042,.018])],{height:2.55,drop:.06,recessed:true,commonEntry:true}),
 ceiling('E-L02','living',[1250,79],'תאורה שקועה במבואת הכניסה — לצד הארונות','Entrance recessed light — beside cabinets',[ev('entry',[.664,.06,.047,.023])],{height:2.55,drop:.06,recessed:true,commonEntry:true}),
 wall('T-L01','terrace','patio-west',176,-1,'תאורת חוץ מעל היציאה לסלון','Outdoor light above living-room slider',[ev('facade',[.482,.185,.031,.043])]),
 wall('G-L01','garden','west',490,-1,'תאורת חזית ליד חדר שינה 1','Facade light beside bedroom 1',[ev('facade',[.9,.208,.021,.039])]),
 wall('G-L03','garden','safe-south',968,1,'תאורת קיר לצד חלון הממ״ד','Wall light beside safe-room window',[ev('side',[.485,.247,.033,.057])]),
 wall('G-L04','garden','wet-east',584,1,'תאורת קיר מעל אזור המזגנים','Wall light above AC area',[ev('side',[.841,.262,.021,.049])])
];
export const LIGHTING_SIMULATIONS=[
 ['SIM-B1','bedroom-a',[715,381]],['SIM-H','hall',[851,559]],['SIM-BATH','bathroom',[1010,425]],['SIM-UTILITY','laundry',[1120,405]],['SIM-WC','powder',[851,365]],['SIM-ENSUITE','ensuite',[661,686]]
].map(([label,roomId,pdf])=>ceiling(label,roomId,pdf,'מנורה זמנית בסימולטור — ללא תיעוד','Temporary simulator lamp — not documented',[],{simulation:true,status:'simulated',drop:.06}));
export const ALL_LIGHTING_DEFINITIONS=[...LIGHTING_OBSERVATIONS,...LIGHTING_SIMULATIONS];
export function createLightingLayout(point,walls){
 return {points:ALL_LIGHTING_DEFINITIONS.map(o=>{
  let position,normal=[0,0],vertical=false;
  if(o.mount==='ceiling'){const [x,z]=point(...o.pdf);position=[x,o.height,z];}
  else {const w=walls.find(w=>w.id===o.wallId);if(!w)throw Error(`Missing lighting wall ${o.wallId}`);vertical=Math.abs(w.a[0]-w.b[0])<.001;const offset=o.side*(w.thickness/2+.04);position=vertical?[w.a[0]+offset,o.height,point(606,o.along)[1]]:[point(o.along,45.7)[0],o.height,w.a[1]+offset];normal=vertical?[o.side,0]:[0,o.side];}
  return {...o,kind:'lighting',lighting:true,position,normal,vertical,positionInferred:true,dimensionsInferred:true,status:o.simulation?'simulated':'observed'};
 }),notLocated:LIGHTING_SIMULATIONS.map(p=>p.roomId),note:'Observed connections retain source evidence; six undocumented rooms use clearly identified temporary simulator lights awaiting real documentation. Positions and dimensions are estimates.'};
}
export const lightingVisible=(p,settings)=>settings.showLighting!==false&&(!p.roomInferred||settings.electricalInferred!==false);
export const lightingReference=id=>LIGHTING_REFERENCES.find(r=>r.id===id);
export const localKitchenLighting=(points,anchor)=>points.filter(p=>p.roomId==='kitchen').map(p=>({...p,position:[anchor[0]-p.position[0],p.height,anchor[1]-p.position[2]],normal:[-p.normal[0],-p.normal[1]]}));
