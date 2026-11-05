import * as THREE from 'three';

// Immutable ordinary surfaces can be shared across selectable leaves. A
// highlight is a separate variant, so selecting one leaf never tints another.
// Texture objects remain owned by the preview; this pool owns materials only.
export function createStudyMaterialPool(root) {
  const signatures=new WeakMap(),ordinary=new Map(),highlighted=new Map(),surfaces=new WeakMap();
  const signature=m=>{
    if(signatures.has(m))return signatures.get(m);
    const meta={textures:{},images:{}};for(const value of Object.values(m))if(value?.isTexture)meta.textures[value.uuid]={uuid:value.uuid};
    const json=m.toJSON(meta);delete json.uuid;delete json.name;delete json.metadata;delete json.userData;
    for(const [key,value]of Object.entries(m))if(value?.isColor)json[key]=value.toArray();
    if(m.emissive?.getHex()===0)delete json.emissiveIntensity;
    const key=JSON.stringify(json);signatures.set(m,key);return key;
  };
  root.traverse(object=>{
    if(!object.isMesh||Array.isArray(object.material))return;
    const source=object.material;
    // A custom shader may use object/material identity in its callbacks.
    if(!source.isMeshStandardMaterial||source.onBeforeCompile!==THREE.Material.prototype.onBeforeCompile||source.customProgramCacheKey!==THREE.Material.prototype.customProgramCacheKey||object.onBeforeRender!==THREE.Object3D.prototype.onBeforeRender)return;
    const key=signature(source)+':'+!!object.isInstancedMesh;
    if(!ordinary.has(key)){const material=source.clone();material.emissive.set(0);material.emissiveIntensity=0;ordinary.set(key,material);}
    const material=ordinary.get(key);surfaces.set(object,material);object.material=material;
  });
  return {
    setHighlighted(object,active){
      const base=surfaces.get(object);if(!base)return;
      if(active&&!highlighted.has(base)){const material=base.clone();material.emissive.set('#46715a');material.emissiveIntensity=.22;highlighted.set(base,material);}
      object.material=active?highlighted.get(base):base;
    },
    get counts(){return {ordinary:ordinary.size,highlighted:highlighted.size};},
    // Keep CPU descriptors available: context restoration can re-upload the
    // same assembly. A later release must also dispose the restored programs.
    dispose(){for(const material of ordinary.values())material.dispose();for(const material of highlighted.values())material.dispose();}
  };
}
