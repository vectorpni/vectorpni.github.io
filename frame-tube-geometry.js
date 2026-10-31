import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';
// Preserve the existing outside skin and UVs. Wall thickness is illustrative;
// no manufacturer thickness is available for this reconstruction.
export function createHollowTubeGeometry(outer,height,segments=12,inner=outer*.76){
  const outside=new THREE.CylinderGeometry(outer,outer,height,segments,1,true),inside=new THREE.CylinderGeometry(inner,inner,height,segments,1,true),normal=inside.attributes.normal,index=inside.index.array;
  for(let i=0;i<normal.count;i++)normal.setXYZ(i,-normal.getX(i),-normal.getY(i),-normal.getZ(i));
  for(let i=0;i<index.length;i+=3){const b=index[i+1];index[i+1]=index[i+2];index[i+2]=b;}
  const upper=new THREE.RingGeometry(inner,outer,segments).rotateX(-Math.PI/2).translate(0,height/2,0),lower=new THREE.RingGeometry(inner,outer,segments).rotateX(Math.PI/2).translate(0,-height/2,0);
  const g=mergeGeometries([outside,inside,upper,lower],false);for(const part of [outside,inside,upper,lower])part.dispose();return g;
}
