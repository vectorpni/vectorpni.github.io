async original=>{
  const page=await original.context().newPage();await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__fallbackScene={r,s,c};return render.call(this,s,c);};});});
  await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(120);
  const stats=await page.evaluate(()=>{const {r,s}=window.__fallbackScene;let instances=0;s.traverse(o=>{if(o.isInstancedMesh)instances++;});const root=s.children.find(o=>o.children.some(g=>g.userData.part));return {calls:r.info.render.calls,triangles:r.info.render.triangles,memory:{...r.info.memory},groups:root.children.length,instances};});
  if(stats.calls!==230||stats.triangles!==326430||stats.memory.geometries!==209||stats.memory.textures!==9||stats.groups!==16||stats.instances<1)throw Error('Changed main scene '+JSON.stringify(stats));await page.close();return stats;
}
