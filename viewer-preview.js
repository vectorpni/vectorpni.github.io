import * as THREE from 'three';
import {getPartSourceMeshes,instancePartMeshes} from './viewer-instancing.js';

// Preview transforms/materials are private; vertex buffers and textures remain
// owned by the main viewer. Never dispose those shared GPU resources here.
export function createPreviewPart(group) {
  const object=new THREE.Group(),materials=new Map(),id=group.userData.part;
  object.userData.part=id;
  const single=['motors','props','esc'].includes(id);
  for(const source of getPartSourceMeshes(group)){
    if(single&&!(source.position.x>1&&source.position.z>1))continue;
    const clone=source.clone(true),original=source.material;
    if(!materials.has(original)){const m=original.clone();m.emissive?.set('#000000');m.emissiveIntensity=0;materials.set(original,m);}
    clone.material=materials.get(original);object.add(clone);
  }
  const bounds=new THREE.Box3().setFromObject(object),sphere=bounds.getBoundingSphere(new THREE.Sphere());object.position.sub(bounds.getCenter(new THREE.Vector3()));
  const meshes=[...object.children];instancePartMeshes({[id]:object},meshes,{disposeDeduplicatedGeometry:false});
  return {object,sphere,dispose(){
    const owned=new Set();for(const source of getPartSourceMeshes(object))owned.add(source.material);
    object.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh)owned.add(o.material);});owned.forEach(m=>m.dispose());
  }};
}
