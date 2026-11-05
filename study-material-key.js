// Construction-scoped cache. Callers compare immutable settings, then clone
// highlight variants; no per-frame state or renderer/texture pixels are kept.
export function createStudyMaterialKey(){
  const signatures=new WeakMap();
  return material=>{
    if(signatures.has(material))return signatures.get(material);
    const meta={textures:{},images:{}};for(const value of Object.values(material))if(value?.isTexture)meta.textures[value.uuid]={uuid:value.uuid};
    const json=material.toJSON(meta);delete json.uuid;delete json.name;delete json.metadata;delete json.userData;
    for(const [key,value]of Object.entries(material))if(value?.isColor)json[key]=value.toArray();
    if(material.emissive?.getHex()===0)delete json.emissiveIntensity;
    const key=JSON.stringify(json);signatures.set(material,key);return key;
  };
}
