import * as THREE from 'three';
// Two stacked openings in an existing twin connector housing. Outer envelope
// follows the model; it is not a dimensioned manufacturer's connector drawing.
export function createTwinSocketGeometry(w=.27,h=.18,d=.2){
  const rounded=(x,y,width,height,r)=>{const s=new THREE.Shape();s.moveTo(x+r,y);s.lineTo(x+width-r,y);s.quadraticCurveTo(x+width,y,x+width,y+r);s.lineTo(x+width,y+height-r);s.quadraticCurveTo(x+width,y+height,x+width-r,y+height);s.lineTo(x+r,y+height);s.quadraticCurveTo(x,y+height,x,y+height-r);s.lineTo(x,y+r);s.quadraticCurveTo(x,y,x+r,y);return s;};
  const s=rounded(-w/2,-h/2,w,h,.009);
  for(const y of [-.042,.042]){const opening=rounded(-w/2+.012,y-.031,w-.024,.062,.003);s.holes.push(opening);}
  const g=new THREE.ExtrudeGeometry(s,{depth:d,bevelEnabled:true,bevelSize:.001,bevelThickness:.001,bevelSegments:1,curveSegments:4});g.translate(0,0,-d/2);return g;
}
