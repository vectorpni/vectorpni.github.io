async original=>{
  const rows=[];
  for(const port of [5180,5175]){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
    await page.addInitScript(()=>{window.__atlas={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){if(this.domElement.closest('.model-stage'))window.__atlas.main={scene:s};if(this.domElement.closest('.engineering-stage'))window.__atlas.inner={scene:s,renderer:r,camera:c};}return render.call(this,s,c);};});});
    try{
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
      const result=await page.evaluate(async()=>{
        const q=window.__atlas,m=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name),root=q.main.scene.children.find(o=>o.children.some(g=>g.userData.part)),r=new q.inner.renderer.constructor({alpha:true,antialias:true});r.setPixelRatio(1);r.setSize(1000,900,false);const s=new q.inner.scene.constructor(),c=new q.inner.camera.constructor(35,1000/900,.001,100),env=m.createStudioEnvironment(r,128),list=[],images=[];s.environment=env.texture;m.configureStudioLighting(s,r,{preview:true});for(const l of q.inner.scene.children.filter(o=>o.isLight))s.add(l.clone());c.position.set(0,0,18);c.lookAt(0,0,0);c.updateMatrixWorld(true);
        try{for(const [i,source]of root.children.filter(g=>g.children.length).entries()){const a=m.createEngineeringAssembly(source),g=new source.constructor();g.position.set((i%5-2)*2,(1-Math.floor(i/5))*2,0);g.scale.setScalar(.75/a.sphere.radius);g.add(a.object);s.add(g);list.push({a,g});}
          for(const opened of [false,true]){for(const {a}of list)a.update(.01,opened,true);s.updateMatrixWorld(true);r.render(s,c);if(r.getContext().isContextLost())throw Error('Lost atlas context');images.push({state:opened?'opened':'assembled',amounts:list.map(({a})=>a.amount),calls:r.info.render.calls,triangles:r.info.render.triangles,image:r.domElement.toDataURL('image/png')});}return {nodes:list.length,images};
        }finally{for(const {a,g}of list){s.remove(g);a.dispose();}env.dispose();r.dispose();r.forceContextLoss();}
      });
      for(const image of result.images){if(image.amounts.some(n=>n!==(image.state==='opened'?1:0)))throw Error('Incomplete endpoint');await original.__qaSaveImage('detail52/'+(port===5180?'before':'after')+'/atlas-'+image.state+'.png',image.image);delete image.image;}rows.push({port,...result});
    }finally{await context.close();}
  }
  return {rows,method:'Same camera, 1000x900 DPR1, fixed positions/rotation, all 15 representatives exactly at amount 0 or 1. Each node fitted to its combined endpoint envelope.'};
}
