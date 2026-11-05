async original=>{
  const rows=[];
  for(const port of [5180,5175]){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
    await cdp.send('Performance.enable');
    await page.addInitScript(()=>{window.__mem={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){if(this.domElement.closest('.model-stage'))window.__mem.main={scene:s};if(this.domElement.closest('.engineering-stage'))window.__mem.inner={r,s,c};}return render.call(this,s,c);};});});
    try{
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
      await page.evaluate(async()=>{const q=window.__mem;q.module=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name);q.groups=q.main.scene.children.find(o=>o.children.some(g=>g.userData.part)).children.filter(g=>g.children.length);q.r=new q.inner.r.constructor({alpha:true,antialias:true});q.r.setPixelRatio(1);q.r.setSize(1000,900,false);q.s=new q.inner.s.constructor();q.c=q.inner.c.clone();q.c.position.set(0,0,18);q.c.aspect=1000/900;q.c.lookAt(0,0,0);q.c.updateProjectionMatrix();for(const l of q.inner.s.children.filter(o=>o.isLight))q.s.add(l.clone());q.env=q.module.createStudioEnvironment(q.r,128);q.s.environment=q.env.texture;q.module.configureStudioLighting(q.s,q.r,{preview:true});});
      const heap=async()=>{await cdp.send('HeapProfiler.collectGarbage');return (await cdp.send('Performance.getMetrics')).metrics.find(m=>m.name==='JSHeapUsedSize').value;};
      const before=await heap(),cycles=[];
      for(let cycle=0;cycle<3;cycle++){
        const loaded=await page.evaluate(()=>{const q=window.__mem;q.list=q.groups.map((g,i)=>{const a=q.module.createEngineeringAssembly(g),w=new g.constructor();w.position.set((i%5-2)*2,(1-Math.floor(i/5))*2,0);w.scale.setScalar(.75/a.sphere.radius);w.add(a.object);q.s.add(w);a.update(.01,true,true);return {a,w};});q.s.updateMatrixWorld(true);q.r.render(q.s,q.c);if(q.r.getContext().isContextLost())throw Error('Lost context');return {...q.r.info.memory};});
        const loadedHeap=await heap();
        const closed=await page.evaluate(()=>{const q=window.__mem;for(const {a,w}of q.list){q.s.remove(w);a.dispose();}q.list=[];q.r.render(q.s,q.c);return {...q.r.info.memory};});
        cycles.push({cycle,loaded,loadedHeap,closed,closedHeap:await heap()});
      }
      if(cycles.some(c=>JSON.stringify(c.closed)!==JSON.stringify(cycles[0].closed))||cycles[2].closedHeap>cycles[0].closedHeap+2_000_000)throw Error('Repeated full-detail resource growth');
      rows.push({port,beforeHeap:before,cycles});
    }finally{await page.evaluate(()=>{const q=window.__mem;q?.env?.dispose();q?.r?.dispose();q?.r?.forceContextLoss();}).catch(()=>{});await context.close();}
  }
  return {rows,note:'JS heap via CDP after explicit garbage collection; includes scene, helper and lazy code. Not total process RAM/VRAM. Three simultaneous source/UI/atlas renderers, one 15-unit atlas alive; 3 complete load/dispose cycles per version.'};
}
