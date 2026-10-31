async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},hasTouch:true}),page=await context.newPage(),errors=[],checks=[];
  const check=(name,v)=>{checks.push({name,passed:!!v});if(!v)throw Error(name);};
  const cdp=await context.newCDPSession(page);
  await page.addInitScript(()=>{
    const m={pending:new Set(),maxPending:0,views:[],main:null};window.__detailLife=m;const raf=requestAnimationFrame,cancel=cancelAnimationFrame;
    window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);fn(t);});m.pending.add(id);m.maxPending=Math.max(m.maxPending,m.pending.size);return id;};window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
    window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r};m.views.push(new WeakRef(v));const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){v.scene=s;v.camera=c;if(this.domElement.closest('.model-stage'))m.main=v;}return render.call(this,s,c);};});
  });
  page.on('pageerror',e=>errors.push(e.message));
  const sample=async()=>{await cdp.send('HeapProfiler.collectGarbage');return page.evaluate(()=>{const m=window.__detailLife,g=new Set(),textures=new Set();m.main.scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const v of Object.values(o.material))if(v?.isTexture)textures.add(v);});return {heap:performance.memory.usedJSHeapSize,pending:m.pending.size,maxPending:m.maxPending,mainMemory:{...m.main.renderer.info.memory},geometryListeners:[...g].reduce((n,g)=>n+(g._listeners?.dispose?.length||0),0),textureListeners:[...textures].reduce((n,g)=>n+(g._listeners?.dispose?.length||0),0),livingRenderers:m.views.map(w=>w.deref()).filter(v=>v&&!v.renderer.getContext().isContextLost()).length,canvases:document.querySelectorAll('canvas').length};});};
  try {
    await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.waitForFunction(()=>window.__detailLife.pending.size===0);
    const baseline=await sample();
    const samples=[];
    for(let i=0;i<90;i++) {
      await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.modal-navigation select').selectOption(['motors','frame','pi','camera','battery','esc','gps','radio','becfc','cooling'][i%10]);await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();await page.waitForTimeout(20);
      if(i===0) {
        await page.locator('.detail-tree>div>button').nth(1).click();await page.locator('.detail-leaves button').last().click();await page.getByRole('button',{name:'Только выбранное',exact:true}).click();
        const selected=await page.locator('.detail-selection>b').textContent();
        const view=await page.evaluate(()=>{const v=window.__detailLife.views.map(w=>w.deref()).findLast(v=>v?.renderer.domElement.closest('.engineering-stage'));const r=v.renderer.domElement.getBoundingClientRect();return {x:r.x+r.width/2,y:r.y+r.height/2};});
        // A background tap must not select hidden geometry through an isolated leaf.
        await page.mouse.click(view.x,view.y);check('Hidden parts cannot be selected',await page.locator('.detail-selection>b').textContent()===selected);
        await page.getByRole('button',{name:'Общий вид узла',exact:true}).click();
      }
      for(let n=0;n<4;n++)await page.getByRole('button',{name:n%2?'Собрать узел':'Разобрать узел',exact:true}).click();
      if(i%30===0) {
        await page.evaluate(async()=>{const v=window.__detailLife.views.map(w=>w.deref()).findLast(v=>v?.renderer.domElement.closest('.engineering-stage')),ext=v.renderer.getContext().getExtension('WEBGL_lose_context');ext.loseContext();await new Promise(r=>setTimeout(r,80));ext.restoreContext();});await page.waitForTimeout(500);check('Nested restore '+i,await page.locator('.detail-error').count()===0);
      }
      if(i%10===0){await page.setViewportSize(i%20?{width:390,height:844}:{width:844,height:390});await page.locator('.engineering-stage').scrollIntoViewIfNeeded();const rect=await page.locator('.engineering-stage').boundingBox();await page.mouse.move(rect.x+rect.width*.4,rect.y+rect.height*.5);await page.mouse.down();await page.mouse.move(rect.x+rect.width*.65,rect.y+rect.height*.6,{steps:4});await page.mouse.up();await page.mouse.wheel(0,-60);}
      // Switch directly while the inner mode is mounted. The next part must
      // begin in its normal preview without creating an unused inner renderer.
      await page.locator('.modal-navigation select').selectOption('props');check('Inner mode resets on component switch '+i,await page.locator('.engineering-stage').count()===0);
      await page.keyboard.press('Escape');if(i%10===0){await page.setViewportSize({width:1440,height:1000});await page.waitForFunction(()=>window.__detailLife.pending.size===0);samples.push({cycle:i,...await sample()});original.__qaProgress?.({completedCycles:i+1,total:90,cpuRate:4});}
    }
    await page.waitForFunction(()=>window.__detailLife.pending.size===0);const final=await sample();
    check('Main geometry registrations unchanged',baseline.geometryListeners===final.geometryListeners);check('Main texture registrations unchanged',baseline.textureListeners===final.textureListeners);check('Main GPU resources unchanged',JSON.stringify(baseline.mainMemory)===JSON.stringify(final.mainMemory));check('One live renderer and canvas after teardown',final.livingRenderers===1&&final.canvases===1);check('No accumulated animation loops',final.pending===0&&final.maxPending<=2);check('Heap remains bounded after warm-up',final.heap<baseline.heap+8_000_000);check('No runtime errors',errors.length===0);
    return {checks,cycles:90,cpuRate:4,baseline,samples,final,errors};
  }finally{await context.close();}
}
