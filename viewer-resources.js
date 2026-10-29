// dispose() releases renderer registrations/GPU handles, not immutable CPU data.
// Use it both before a lost context is rebuilt and at final teardown. Environment
// render targets are owned by the caller and disposed as render targets.
export function disposeSceneResources(scene,additionalMeshes=[]) {
  const geometries=new Set(),materials=new Set(),textures=new Set(),instances=new Set();
  const collect=o=>{
    if(o.isInstancedMesh)instances.add(o);
    if(o.geometry)geometries.add(o.geometry);
    if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m);
  };
  scene.traverse(collect);additionalMeshes.forEach(collect);
  for(const material of materials)for(const value of Object.values(material))if(value?.isTexture)textures.add(value);
  instances.forEach(o=>o.dispose());geometries.forEach(g=>g.dispose());materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());
}
