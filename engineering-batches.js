import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// Consolidate only within one selectable leaf and one transform owner. This
// needs no duplicate render tree, per-frame rebaking or selection fallback.
// Original instances and independently animated parts retain their draws.
export function compactStudyMeshes(root) {
  const buckets=new Map(),created=[],signatures=new Map();
  const signature=m=>{
    if(signatures.has(m))return signatures.get(m);
    // Compare texture identities, never serialise their pixel data to PNG/JSON
    // just to compare materials during construction.
    const meta={textures:{},images:{}};for(const value of Object.values(m))if(value?.isTexture)meta.textures[value.uuid]={uuid:value.uuid};
    const json=m.toJSON(meta);delete json.uuid;delete json.name;delete json.metadata;delete json.userData;
    for(const [key,value]of Object.entries(m))if(value?.isColor)json[key]=value.toArray();
    if(m.emissive?.getHex()===0)delete json.emissiveIntensity;
    const result=JSON.stringify(json);signatures.set(m,result);return result;
  };
  root.traverse(o=>{
    if(!o.isMesh||o.isInstancedMesh||Array.isArray(o.material)||o.isSkinnedMesh||o.morphTargetInfluences)return;
    const m=o.material,g=o.geometry;o.updateMatrix();
    if(!m.isMeshStandardMaterial||m.transparent||m.clippingPlanes?.length||!m.visible||!o.visible||o.matrix.determinant()<=0||g.drawRange.start!==0||g.drawRange.count!==Infinity||o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile)return;
    if(Object.keys(g.morphAttributes).length||Object.keys(g.attributes).some(k=>!['position','normal','uv'].includes(k)))return;
    // Black emissive * any intensity is still black. Normalise this redundant
    // parameter in the comparison, while keeping the actual material intact.
    const key=o.parent.uuid+':'+o.userData.leaf+':'+signature(m)+':'+Object.keys(g.attributes).sort().join(',')+':'+o.castShadow+':'+o.receiveShadow+':'+o.renderOrder+':'+o.frustumCulled;
    if(!buckets.has(key))buckets.set(key,{parent:o.parent,material:m,objects:[]});buckets.get(key).objects.push(o);
  });
  let savedCalls=0;
  for(const {parent,material,objects}of buckets.values()){
    if(objects.length<2)continue;
    const parts=objects.map(o=>{o.updateMatrix();const g=o.geometry.clone();if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));return g.applyMatrix4(o.matrix);});
    const geometry=mergeGeometries(parts,false);parts.forEach(g=>g.dispose());
    if(!geometry)throw Error('Incompatible study render batch');
    geometry.computeBoundingBox();geometry.computeBoundingSphere();
    const mesh=new THREE.Mesh(geometry,material);mesh.name=parent.name;mesh.userData={...objects[0].userData};
    mesh.castShadow=objects[0].castShadow;mesh.receiveShadow=objects[0].receiveShadow;mesh.renderOrder=objects[0].renderOrder;mesh.frustumCulled=objects[0].frustumCulled;
    // Construction happens before this assembly reaches a renderer. Release
    // replaced wrappers now and don't retain a second copy of their CPU arrays.
    for(const o of objects){o.removeFromParent();o.geometry.dispose();}parent.add(mesh);created.push(mesh);savedCalls+=objects.length-1;
  }
  buckets.clear();signatures.clear();
  return {created,savedCalls,dispose(){for(const mesh of created)mesh.geometry.dispose();}};
}
