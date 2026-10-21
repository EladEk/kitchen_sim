// Estimate broad illumination separately from the photographed small flecks.
// A plane cannot remove the phone photo's bright centre / dark perimeter.
// Fit a quadratic plus a smooth residual field; apply one neutral RGB gain.
// Original image bytes are never altered; this is not calibrated reflectance.
export const PHOTO_LIGHTING_GAIN_MIN=.4;
export const PHOTO_LIGHTING_GAIN_MAX=2.5;
const linear=Array.from({length:256},(_,v)=>{v/=255;return v<=.04045?v/12.92:((v+.055)/1.055)**2.4;});
const srgb=v=>Math.round(255*(v<=.0031308?v*12.92:1.055*v**(1/2.4)-.055));
const basis=(u,v)=>[1,u,v,u*u,u*v,v*v];
function solve(matrix,rhs){
 const a=matrix.map((row,i)=>[...row,rhs[i]]),n=rhs.length;
 for(let k=0;k<n;k++){
  let pivot=k;for(let i=k+1;i<n;i++)if(Math.abs(a[i][k])>Math.abs(a[pivot][k]))pivot=i;
  if(Math.abs(a[pivot][k])<1e-12)return [rhs[0]/matrix[0][0],0,0,0,0,0];
  [a[k],a[pivot]]=[a[pivot],a[k]];const scale=a[k][k];for(let j=k;j<=n;j++)a[k][j]/=scale;
  for(let i=0;i<n;i++)if(i!==k){const f=a[i][k];for(let j=k;j<=n;j++)a[i][j]-=f*a[k][j];}
 }
 return a.map(row=>row[n]);
}
function smoothField(input,size){
 // Three box passes approximate a broad Gaussian. Reflected boundaries avoid
 // painting a dark border or importing pixels from the opposite tile edge.
 const radius=Math.max(1,Math.round(size/18)),span=2*radius+1;
 const reflect=i=>i<0?-i-1:i>=size?2*size-i-1:i;
 let field=input;
 for(let pass=0;pass<3;pass++){
  const horizontal=new Float64Array(size*size),output=new Float64Array(size*size);
  for(let y=0;y<size;y++){
   let sum=0;for(let k=-radius;k<=radius;k++)sum+=field[y*size+reflect(k)];
   for(let x=0;x<size;x++){horizontal[y*size+x]=sum/span;sum+=field[y*size+reflect(x+radius+1)]-field[y*size+reflect(x-radius)];}
  }
  for(let x=0;x<size;x++){
   let sum=0;for(let k=-radius;k<=radius;k++)sum+=horizontal[reflect(k)*size+x];
   for(let y=0;y<size;y++){output[y*size+x]=sum/span;sum+=horizontal[reflect(y+radius+1)*size+x]-horizontal[reflect(y-radius)*size+x];}
  }
  field=output;
 }
 return field;
}
export function prepareFloorPhoto(pixels,size){
 if(pixels.length!==size*size*4||size<2)throw Error('Invalid floor photograph dimensions');
 const matrix=Array.from({length:6},()=>Array(6).fill(0)),rhs=Array(6).fill(0);
 // Equal-area block averages prevent fine printed chips from driving the fit.
 const bins=Math.min(32,size),sums=new Float64Array(bins*bins),counts=new Uint32Array(bins*bins);let mean=0;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,l=.2126*linear[pixels[i]]+.7152*linear[pixels[i+1]]+.0722*linear[pixels[i+2]],b=Math.floor(y*bins/size)*bins+Math.floor(x*bins/size);
  sums[b]+=l;counts[b]++;mean+=l;
 }
 mean/=size*size;
 for(let y=0;y<bins;y++)for(let x=0;x<bins;x++){
  const b=y*bins+x,f=basis((x+.5)/bins-.5,(y+.5)/bins-.5),l=sums[b]/counts[b];
  for(let i=0;i<6;i++){rhs[i]+=f[i]*l;for(let j=0;j<6;j++)matrix[i][j]+=f[i]*f[j];}
 }
 const coefficients=solve(matrix,rhs),residual=new Float64Array(size*size);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,u=(x+.5)/size-.5,v=(y+.5)/size-.5,c=coefficients,plane=c[0]+c[1]*u+c[2]*v+c[3]*u*u+c[4]*u*v+c[5]*v*v;
  residual[y*size+x]=(.2126*linear[pixels[i]]+.7152*linear[pixels[i+1]]+.0722*linear[pixels[i+2]])-plane;
 }
 const broadResidual=smoothField(residual,size),color=new Uint8Array(pixels),low=PHOTO_LIGHTING_GAIN_MIN,high=PHOTO_LIGHTING_GAIN_MAX;
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const i=(y*size+x)*4,u=(x+.5)/size-.5,v=(y+.5)/size-.5,c=coefficients;
  const illumination=c[0]+c[1]*u+c[2]*v+c[3]*u*u+c[4]*u*v+c[5]*v*v+broadResidual[y*size+x],gain=Math.max(low,Math.min(high,mean/Math.max(.0001,illumination)));
  for(let channel=0;channel<3;channel++)color[i+channel]=Math.min(255,srgb(linear[pixels[i+channel]]*gain));
 }
 return {color,lightingCorrection:{method:'bounded-quadratic-and-low-frequency-light-field',maxGain:high,minGain:low,calibrated:false}};
}
