import * as THREE from 'three';
import {mergeGeometries} from 'three/addons/utils/BufferGeometryUtils.js';

// The main viewer selects and animates whole component groups. Keep the source
// meshes (and instancing) intact for lazy studies, but submit compatible unique
// opaque surfaces in fewer draws. No rebaking happens during animation.
export function compactMainSurfaces(groups,rendered) {
  const created=[],removed=new Set();let savedCalls=0;
  for(const group of Object.values(groups)) {
    const buckets=new Map();
    for(const o of group.children) {
      const g=o.geometry,m=o.material;
      if(!o.isMesh||o.isInstancedMesh||o.isSkinnedMesh||Array.isArray(m)||!m.isMeshStandardMaterial||m.transparent||!m.visible||!o.visible||m.clippingPlanes?.length||o.morphTargetInfluences||Object.keys(g.morphAttributes).length)continue;
      if(o.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender||o.onAfterRender!==THREE.Object3D.prototype.onAfterRender||o.customDepthMaterial||o.customDistanceMaterial||m.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||m.customProgramCacheKey!==THREE.Material.prototype.customProgramCacheKey||g.drawRange.start!==0||g.drawRange.count!==Infinity)continue;
      if(Object.entries(g.attributes).some(([key,a])=>!['position','normal','uv','color'].includes(key)||a.isInterleavedBufferAttribute))continue;
      o.updateMatrix();if(o.matrix.determinant()<=0)continue;
      const layout=Object.entries(g.attributes).sort(([a],[b])=>a.localeCompare(b)).map(([name,a])=>[name,a.itemSize,a.normalized,a.array.constructor.name]);
      const key=JSON.stringify([m.uuid,layout,o.castShadow,o.receiveShadow,o.renderOrder,o.frustumCulled,o.layers.mask]);
      if(!buckets.has(key))buckets.set(key,[]);buckets.get(key).push(o);
    }
    for(const objects of buckets.values()) {
      if(objects.length<2)continue;
      const parts=objects.map(o=>{const g=o.geometry.clone();if(!g.index)g.setIndex(Array.from({length:g.attributes.position.count},(_,i)=>i));return g.applyMatrix4(o.matrix);});
      let geometry;try{geometry=mergeGeometries(parts,false);}finally{parts.forEach(g=>g.dispose());}
      if(!geometry)throw Error('Incompatible main surface batch');
      geometry.computeBoundingBox();geometry.computeBoundingSphere();
      const first=objects[0],mesh=new THREE.Mesh(geometry,first.material);
      mesh.name=group.name;mesh.userData={part:group.userData.part};mesh.castShadow=first.castShadow;mesh.receiveShadow=first.receiveShadow;mesh.renderOrder=first.renderOrder;mesh.frustumCulled=first.frustumCulled;mesh.layers.mask=first.layers.mask;mesh.updateMatrix();mesh.matrixAutoUpdate=false;
      // Original wrappers have not reached WebGL yet. They remain owned by the
      // existing getPartSourceMeshes registry and normal lifecycle disposal.
      for(const o of objects){o.removeFromParent();removed.add(o);}group.add(mesh);created.push(mesh);savedCalls+=objects.length-1;
    }
  }
  const keep=rendered.filter(o=>!removed.has(o));rendered.splice(0,rendered.length,...keep,...created);
  return {savedCalls,created};
}
