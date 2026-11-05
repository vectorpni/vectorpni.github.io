async page=>{
 await page.addInitScript(()=>{window.__seating={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(scene,camera){if(camera.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__seating={scene,renderer:r,camera};return render.call(this,scene,camera);};});});
 await page.goto(new URL(page.url()).origin);await page.locator('.model-stage.ready').waitFor();
 const rows=await page.evaluate(()=>{const root=window.__seating.scene.children.find(o=>o.children.some(g=>g.userData.part)),group=root.children.find(g=>g.userData.part==='esc'),rows=[];
  // Use constructors already present in the scene; no second Three.js build.
  const vector=window.__seating.camera.position.clone(),matrix=group.matrix.clone(),supports=group.children.filter(o=>o.isMesh&&[.17,.018].some(h=>Math.abs((o.geometry.parameters?.height||0)-h)<1e-7));
  for(const heads of group.children.filter(o=>o.geometry?.parameters?.radiusTop===.014&&o.geometry.parameters.height===.023))for(let i=0;i<(heads.isInstancedMesh?heads.count:1);i++){
   if(heads.isInstancedMesh)heads.getMatrixAt(i,matrix);else matrix.copy(heads.matrix);const p=vector.clone().setFromMatrixPosition(matrix);let top=-Infinity;
   for(const support of supports)for(let j=0;j<(support.isInstancedMesh?support.count:1);j++){
    const transform=group.matrix.clone();if(support.isInstancedMesh)support.getMatrixAt(j,transform);else transform.copy(support.matrix);const local=p.clone().setY(transform.elements[13]).applyMatrix4(transform.clone().invert());support.geometry.computeBoundingBox();const box=support.geometry.boundingBox;if(local.x>=box.min.x&&local.x<=box.max.x&&local.z>=box.min.z&&local.z<=box.max.z)top=Math.max(top,box.max.y+transform.elements[13]);
   }
   const gap=p.y-.023/2-top;if(!Number.isFinite(top)||Math.abs(gap)>1e-6)throw Error('Unsupported ESC screw '+JSON.stringify({point:p.toArray(),top,gap}));rows.push({point:p.toArray(),supportTop:top,gap});
  }if(rows.length!==16)throw Error('Expected sixteen existing ESC heads, got '+rows.length);return rows;
 });
 return {rows,method:'All 16 actual production-scene head transforms checked against existing case/fin envelopes; CPU tests additionally raycast the rounded support surfaces.'};
}
