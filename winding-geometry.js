import * as THREE from 'three';
// A rounded rectangular loop clears the tooth's rectangular section. Display
// dimensions only: neither the turn count nor the winding scheme is a BOM.
export const windingDimensions={halfToothWidth:.0175,halfToothHeight:.045,halfLoopWidth:.026,halfLoopHeight:.0535,wireRadius:.0045,cornerRadius:.008};
export function createWindingLoopGeometry(){
  const {halfLoopWidth:w,halfLoopHeight:h,cornerRadius:r,wireRadius}=windingDimensions,p=new THREE.Path();
  p.moveTo(-w+r,-h);p.lineTo(w-r,-h);p.quadraticCurveTo(w,-h,w,-h+r);p.lineTo(w,h-r);p.quadraticCurveTo(w,h,w-r,h);p.lineTo(-w+r,h);p.quadraticCurveTo(-w,h,-w,h-r);p.lineTo(-w,-h+r);p.quadraticCurveTo(-w,-h,-w+r,-h);
  class Loop extends THREE.Curve{getPoint(t,target=new THREE.Vector3()){const v=p.getPoint(t);return target.set(v.x,v.y,0);}}
  return new THREE.TubeGeometry(new Loop(),32,wireRadius,8,true);
}
