// Seat the existing four screw heads on the existing diagonal ESC envelope.
// These are reconstruction coordinates, not dimensions from a manufacturer.
export function escFastenerSeat(cx,cz,angle,index){
  const x=index%2?.12:-.12,z=index>1?.07:-.07,c=Math.cos(angle),s=Math.sin(angle),dx=c*x+s*z,dz=-s*x+c*z;
  let top=.46+.17/2;
  for(let fin=0;fin<9;fin++){
    const fz=dz-(fin-4)*.025,localX=c*dx-s*fz,localZ=s*dx+c*fz;
    if(Math.abs(localX)<.34/2&&Math.abs(localZ)<.011/2)top=Math.max(top,.56+(fin%2)*.004+.018/2);
  }
  return {x:cx+dx,y:top+.023/2,z:cz+dz,top};
}
