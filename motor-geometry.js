import * as THREE from 'three';

// Open cooling slots in the existing bell envelope, with actual inner walls.
// One indexed buffer, rather than one mesh for every vent and bridge.
export function createMotorBellGeometry(){
  const p=[],indices=[],segments=96,r=.247,inner=.235;
  function quad(a,b,c,d){const i=p.length/3;p.push(...a,...b,...c,...d);indices.push(i,i+1,i+2,i,i+2,i+3);}
  const point=(a,y,radius)=>[Math.cos(a)*radius,y,Math.sin(a)*radius];
  for(let i=0;i<segments;i++){
    const a=i*Math.PI*2/segments,b=(i+1)*Math.PI*2/segments;
    const solid=i%8<3;
    for(const [lo,hi] of solid?[[-.095,.095]]:[[-.095,-.038],[.038,.095]]){
      quad(point(a,lo,r),point(a,hi,r),point(b,hi,r),point(b,lo,r));
      quad(point(b,lo,inner),point(b,hi,inner),point(a,hi,inner),point(a,lo,inner));
      for(const y of [lo,hi]){const pts=[point(a,y,inner),point(a,y,r),point(b,y,r),point(b,y,inner)];quad(...(y===lo?pts:pts.reverse()));}
    }
    if(solid){for(const [angle,reverse] of [[a,false],[b,true]]){const pts=[point(angle,-.038,inner),point(angle,.038,inner),point(angle,.038,r),point(angle,-.038,r)];if((reverse?i%8===2:i%8===0))quad(...(reverse?pts.reverse():pts));}}
  }
  const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(p,3));g.setIndex(indices);g.computeVertexNormals();return g;
}
