// Opening the floor selector is a UI action. Scene preparation is needed only
// when approaching a lift or moving to another floor, then it must complete.
export function createElevatorActions({context,landing,queue,move,open,close,pause,status,available=()=>true}){
 const show=current=>{pause();open(current);return true;};
 function ride(floor,id,{approach=false,chooseFloor=false}={}){
  if(!available())return false;
  const current=context(id);if(!current||!approach&&!current.near)return false;
  const pose=landing(current.building,floor,current.id);
  if(!pose){status('לא נמצאה נקודת יציאה פנויה מהמעלית.');return false;}
  close();
  queue(floor===current.floor?'עובר ללובי המעלית…':'נוסע במעלית לקומה '+floor+'…',()=>move(pose),{
   onPrepared:()=>{if(!chooseFloor||!available())return;const arrived=context(current.id);if(arrived?.near&&arrived.building===current.building&&arrived.floor===floor)show(arrived);}
  });
  return true;
 }
 function call(id){
  if(!available())return false;
  const current=context(id);if(!current)return false;
  return current.near?show(current):ride(current.floor,current.id,{approach:true,chooseFloor:true});
 }
 return {open:call,ride};
}
