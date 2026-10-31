async original=>{
  const rows=[];
  for(const port of [5176,5175]) {
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
    try {
      await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__preserve=null;window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__preserve={scene:s,renderer:r};return render.call(this,s,c);};});});
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();
      rows.push(await page.evaluate(port=>{
        const {scene,renderer}=window.__preserve,root=scene.children.find(o=>o.children.some(g=>g.userData.part)),parts={},cache=new WeakMap();
        const hash=g=>{if(cache.has(g))return cache.get(g);let h=2166136261;for(const a of [...Object.entries(g.attributes).sort().map(([,v])=>v),g.index].filter(Boolean))for(const n of new Uint8Array(a.array.buffer,a.array.byteOffset,a.array.byteLength))h=Math.imul(h^n,16777619);const result=h>>>0;cache.set(g,result);return result;};
        for(const group of root.children) {
          const counts={},bounds={min:[Infinity,Infinity,Infinity],max:[-Infinity,-Infinity,-Infinity]};let meshes=0,instances=0;
          for(const mesh of group.children) {
            if(!mesh.isMesh)continue;const m=mesh.material,material=[m.type,...m.color.toArray(),m.metalness,m.roughness,m.envMapIntensity,m.side,m.transparent,m.vertexColors,!!m.map,!!m.bumpMap,m.bumpScale,!!m.roughnessMap];
            const p=mesh.geometry.attributes.position,mat=mesh.matrix.clone(),v=mesh.position.clone();
            for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
              if(mesh.isInstancedMesh){mesh.getMatrixAt(i,mat);instances++;}
              if(port===5175&&group.userData.part==='power')mat.elements[13]-=.05;
              const key=JSON.stringify([hash(mesh.geometry),mat.toArray().map(x=>Math.round(x*1e6)/1e6),material]);counts[key]=(counts[key]||0)+1;meshes++;
              for(let k=0;k<p.count;k++){v.fromBufferAttribute(p,k).applyMatrix4(mat);for(let a=0;a<3;a++){bounds.min[a]=Math.min(bounds.min[a],v.getComponent(a));bounds.max[a]=Math.max(bounds.max[a],v.getComponent(a));}}
            }
          }parts[group.userData.part]={counts,meshes,instances,bounds};
        }
        return {calls:renderer.info.render.calls,triangles:renderer.info.render.triangles,instancedMeshes:root.children.reduce((n,g)=>n+g.children.filter(o=>o.isInstancedMesh).length,0),parts};
      },port));
    }finally{await context.close();}
  }
  const differences=[],summary=[];for(const [id,before]of Object.entries(rows[0].parts)){const after=rows[1].parts[id];if(!after)throw Error('Missing main group '+id);for(const [key,count]of Object.entries(before.counts))if((after.counts[key]||0)<count)differences.push({id,key,count,after:after.counts[key]||0});summary.push({id,before:before.meshes,after:after.meshes,added:after.meshes-before.meshes});}
  if(differences.length)throw Error('Existing geometry/materials changed: '+JSON.stringify(differences.slice(0,5)));
  return {allOriginalGeometryNormalsUvsAndMaterialSettingsPreserved:true,otherTransformsPreserved:true,intentionalTransformCorrections:{power:[0,.05,0]},before:{calls:rows[0].calls,triangles:rows[0].triangles,instancedMeshes:rows[0].instancedMeshes},after:{calls:rows[1].calls,triangles:rows[1].triangles,instancedMeshes:rows[1].instancedMeshes},summary};
}
