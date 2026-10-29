import * as THREE from 'three';
import {getPartSourceMeshes,instancePartMeshes} from './viewer-instancing.js';

// CPU vertex arrays and pixel sources are immutable and shared. Geometry and
// Texture wrappers must be private to each renderer: their dispose listeners
// otherwise retain closed WebGL renderers through the main scene's resources.
export function createPreviewPart(group) {
  const object=new THREE.Group(),materials=new Map(),geometries=new Map(),textures=new Map(),id=group.userData.part;
  object.userData.part=id;
  const geometryFor=source=>{
    if(!geometries.has(source)){
      const g=new THREE.BufferGeometry();g.index=source.index;g.indirect=source.indirect;
      g.attributes={...source.attributes};g.morphAttributes={...source.morphAttributes};g.morphTargetsRelative=source.morphTargetsRelative;
      g.groups=source.groups.map(group=>({...group}));g.setDrawRange(source.drawRange.start,source.drawRange.count);
      g.boundingBox=source.boundingBox?.clone()||null;g.boundingSphere=source.boundingSphere?.clone()||null;
      geometries.set(source,g);
    }
    return geometries.get(source);
  };
  const single=['motors','props','esc'].includes(id);
  for(const source of getPartSourceMeshes(group)){
    if(single&&!(source.position.x>1&&source.position.z>1))continue;
    const clone=source.clone(true),original=source.material;
    if(!materials.has(original)){
      const m=original.clone();m.emissive?.set('#000000');m.emissiveIntensity=0;
      for(const [key,value]of Object.entries(m))if(value?.isTexture){if(!textures.has(value))textures.set(value,value.clone());m[key]=textures.get(value);}
      materials.set(original,m);
    }
    clone.geometry=geometryFor(source.geometry);clone.material=materials.get(original);object.add(clone);
  }
  const bounds=new THREE.Box3().setFromObject(object),sphere=bounds.getBoundingSphere(new THREE.Sphere());object.position.sub(bounds.getCenter(new THREE.Vector3()));
  const meshes=[...object.children];instancePartMeshes({[id]:object},meshes,{disposeDeduplicatedGeometry:false});
  return {object,sphere,dispose(){
    const owned=new Set();for(const source of getPartSourceMeshes(object))owned.add(source.material);
    object.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh)owned.add(o.material);});owned.forEach(m=>m.dispose());
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }};
}
