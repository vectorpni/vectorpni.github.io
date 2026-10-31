import * as THREE from 'three';
import {getPartSourceMeshes,instancePartMeshes} from './viewer-instancing.js';

// CPU vertex arrays and pixel sources are immutable and shared. Geometry and
// Texture wrappers must be private to each renderer: their dispose listeners
// otherwise retain closed WebGL renderers through the main scene's resources.
export function createPreviewPart(group,{classify,include=()=>true,leafFor}={}) {
  const object=new THREE.Group(),materials=new Map(),geometries=new Map(),textures=new Map(),sections=new Map(),id=group.userData.part;
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
  const representativeCenter=new THREE.Vector3();
  for(const source of getPartSourceMeshes(group)){
    if(single&&!(source.position.x>1&&source.position.z>1)){
      // Cable vertices may already contain their world-local coordinates while
      // the mesh origin stays at zero. Pick the representative by its bounds.
      source.geometry.computeBoundingBox();source.updateMatrix();source.geometry.boundingBox.getCenter(representativeCenter).applyMatrix4(source.matrix);
      if(!(representativeCenter.x>1&&representativeCenter.z>1))continue;
    }
    if(!include(source))continue;
    const clone=source.clone(true),original=source.material;
    if(!materials.has(original)){
      const m=original.clone();m.emissive?.set('#000000');m.emissiveIntensity=0;
      for(const [key,value]of Object.entries(m))if(value?.isTexture){if(!textures.has(value))textures.set(value,value.clone());m[key]=textures.get(value);}
      materials.set(original,m);
    }
    clone.geometry=geometryFor(source.geometry);clone.material=materials.get(original);
    if(classify){const key=classify(source);if(!sections.has(key)){const section=new THREE.Group();section.name=key;section.userData={part:id,section:key};sections.set(key,section);object.add(section);}const section=sections.get(key),leaf=leafFor?.(source);if(leaf){let node=section.children.find(c=>c.isGroup&&c.userData.leaf===key+'/'+leaf.id);if(!node){node=new THREE.Group();node.name=leaf.label;node.userData={part:id,section:key,leaf:key+'/'+leaf.id};section.add(node);}node.add(clone);}else section.add(clone);}else object.add(clone);
  }
  const bounds=new THREE.Box3().setFromObject(object),sphere=bounds.getBoundingSphere(new THREE.Sphere());object.position.sub(bounds.getCenter(new THREE.Vector3()));
  if(classify){for(const section of sections.values()){for(const leaf of section.children.filter(c=>c.isGroup))instancePartMeshes({[id]:leaf},[...leaf.children],{disposeDeduplicatedGeometry:false});instancePartMeshes({[id]:section},[...section.children],{disposeDeduplicatedGeometry:false});}}
  else instancePartMeshes({[id]:object},[...object.children],{disposeDeduplicatedGeometry:false});
  return {object,sphere,sections,dispose(){
    const owned=new Set(materials.values());
    object.traverse(o=>{if(o.isInstancedMesh)o.dispose();if(o.isMesh)owned.add(o.material);});owned.forEach(m=>m.dispose());
    geometries.forEach(g=>g.dispose());textures.forEach(t=>t.dispose());
  }};
}
