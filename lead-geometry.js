import * as THREE from 'three';
// One existing visible lead, folded down to the board. No new pin count or
// electrical assignment; dimensions follow the illustrative package envelope.
export function createGullwingLeadGeometry(width=.013,rise=.045){
  // One closed outline avoids overlapping coplanar faces at the bends.
  const points=[[.036,rise-.004],[.036,rise+.004],[-.004,rise+.004],[-.004,.006],[-.024,.006],[-.024,0],[.004,0],[.004,rise-.004]],shape=new THREE.Shape();points.forEach(([z,y],i)=>i?shape.lineTo(-z,y):shape.moveTo(-z,y));shape.closePath();
  return new THREE.ExtrudeGeometry(shape,{depth:width,bevelEnabled:false}).translate(0,0,-width/2).rotateY(Math.PI/2);
}
