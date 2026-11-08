// Browser regression for the actual production camera, not a synthetic fixture.
async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
  try{
    await page.addInitScript(()=>{window.__physical71={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__physical71.scene=s;return render.call(this,s,c);};});});
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.modal-navigation select').selectOption('camera');await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
    return await page.evaluate(async()=>{
      const module=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name),root=window.__physical71.scene.children.find(o=>o.children.some(g=>g.userData.part)),camera=root.children.find(g=>g.userData.part==='camera');
      const a=module.createEngineeringAssembly(camera);
      try{
        if(a.surface71?.surfaces!==7||a.surface71.addedTriangles!==7360)throw Error('Expected seven study-only refined camera surfaces');
        let support;a.object.traverse(o=>{if(o.name==='Условная опорная юбка существующей оправы')support=o;});if(!support)throw Error('Missing continuous rim support');
        let node=support;while(node&&!node.userData.leaf)node=node.parent;if(node?.userData.leaf!=='optics/exterior')throw Error('Optical support has wrong animation owner');
        for(const opened of [false,true,false]){a.select('optics/exterior',true);a.update(.01,opened,true);let p=support;while(p){if(!p.visible)throw Error('Support hidden while its rings are isolated');p=p.parent;}}
        a.select(null,false);a.update(.01,false,true);if(a.amount!==0)throw Error('Camera did not reassemble');
        return {surfaces:a.surface71.surfaces,addedStudyTriangles:a.surface71.addedTriangles,supportOwner:node.userData.leaf,assembled:true};
      }finally{a.dispose();}
    });
  }finally{await context.close();}
}
