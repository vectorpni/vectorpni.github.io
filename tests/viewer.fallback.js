async original=>{
  const origin=new URL(original.url()).origin,results=[];
  const check=(condition,message)=>{if(!condition)throw Error(message);};
  for(const scenario of ['normal','unsupported','creation','construction','render-failure','resource','timeout','stalled-frame','context','restore-failure','restore-timeout','restarts','keyboard-mobile']){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(scenario=>{
      window.__fallbackQA={block:['unsupported','creation','keyboard-mobile'].includes(scenario),renderers:[],requests:0,disposed:0,breakEnvironment:scenario==='construction',breakRender:scenario==='render-failure'};
      const raf=window.requestAnimationFrame,cancel=window.cancelAnimationFrame,frames=new Set();window.__fallbackQA.frames=frames;
      window.requestAnimationFrame=cb=>{const id=raf.call(window,time=>{frames.delete(id);cb(time);});frames.add(id);return id;};window.cancelAnimationFrame=id=>{frames.delete(id);return cancel.call(window,id);};
      const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener,registrations=new WeakMap();window.__fallbackQA.registrations=registrations;
      EventTarget.prototype.addEventListener=function(type,fn,options){if(fn){if(!registrations.has(this))registrations.set(this,[]);const rows=registrations.get(this),capture=!!(typeof options==='boolean'?options:options?.capture);if(!rows.some(r=>r.type===type&&r.fn===fn&&r.capture===capture))rows.push({type,fn,capture});}return add.call(this,type,fn,options);};
      EventTarget.prototype.removeEventListener=function(type,fn,options){const rows=registrations.get(this),capture=!!(typeof options==='boolean'?options:options?.capture);if(rows){const index=rows.findIndex(r=>r.type===type&&r.fn===fn&&r.capture===capture);if(index>=0)rows.splice(index,1);}return remove.call(this,type,fn,options);};
      const get=HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'){window.__fallbackQA.requests++;if(window.__fallbackQA.block)return null;}return get.call(this,type,...args);};
      window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const qa=window.__fallbackQA;qa.renderers.push(r);const dispose=r.dispose;r.dispose=function(){qa.disposed++;return dispose.call(this);};const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&r.domElement.closest('.model-stage')){qa.main={r,s,c};if(qa.breakRender)throw Error('Injected model render failure');}return render.call(this,s,c);};
        const set=r.setRenderTarget;r.setRenderTarget=function(...args){if(qa.breakEnvironment)throw Error('Injected environment allocation failure');return set.apply(this,args);};
      });
      // In this scenario the capability probe succeeds but renderer creation fails.
      if(scenario==='creation'){window.__fallbackQA.block=false;const base=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){if(type==='webgl2'&&window.__fallbackQA.requests>0&&window.__fallbackQA.creationFail!==false)return null;return base.call(this,type,...args);};}
      if(scenario==='stalled-frame'){window.__realRAF=window.requestAnimationFrame;window.requestAnimationFrame=()=>0;}
    },scenario);
    let abortModule=scenario==='resource',held=[];
    if(scenario==='resource'||scenario==='timeout')await page.route('**/assets/viewer-engine-*.js',async route=>{if(scenario==='timeout')held.push(route);else if(abortModule)await route.abort('failed');else await route.continue();});
    try{
      if(scenario==='keyboard-mobile')await page.setViewportSize({width:390,height:844});
      await page.goto(origin,{waitUntil:'domcontentloaded'});
      const fallback=page.locator('.fallback-view'),retry=page.getByRole('button',{name:'Повторить запуск 3D',exact:true});
      if(scenario==='normal'){
        await page.locator('.model-stage.ready').waitFor();check(await fallback.count()===0,'Static image remains over working model');
        await page.screenshot({path:'qa-artifacts/fallback/01-normal-desktop.png',fullPage:true});
        await page.getByRole('button',{name:'Посмотреть компоненты',exact:true}).click();check(await page.locator('.component-list li').count()===16,'16 list entries');
        await page.screenshot({path:'qa-artifacts/fallback/04-component-list.png',fullPage:true});await page.locator('.component-list li').nth(1).getByRole('button').click();await page.locator('.part-preview canvas').waitFor();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
        await page.getByRole('button',{name:'Разобрать узел',exact:true}).click();check(await page.locator('.detail-tree>div>button').count()===4,'Motor internals retained');await page.keyboard.press('Escape');
        await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.getByRole('button',{name:'Собрать',exact:true}).click();
      }else if(['unsupported','creation','construction','render-failure','resource','timeout','stalled-frame','keyboard-mobile'].includes(scenario)){
        await retry.waitFor({timeout:25000});check(await page.locator('.controls').count()===0,'Dead 3D toolbar remains');check(await page.locator('.desktop-instructions,.mobile-instructions').count()===0,'False gesture instructions');
        const image=page.locator('.fallback-image-map img');check(await image.evaluate(async img=>{await img.decode();return img.complete&&img.naturalWidth===1600;}),'Static model image did not load');
        if(['unsupported','keyboard-mobile'].includes(scenario)){check(await page.locator('canvas').count()===0,'Fallback created canvas');check(await page.evaluate(()=>!performance.getEntriesByType('resource').some(e=>/viewer-engine-|viewer-motion-|engineering-inspector-/.test(e.name))),'No-WebGL loaded heavy scene');}
        if(scenario==='unsupported'){
          await page.screenshot({path:'qa-artifacts/fallback/02-fallback-desktop.png',fullPage:true});await page.locator('.fallback-image-map').screenshot({path:'qa-artifacts/fallback/03-numbered-points.png'});
          await page.locator('.component-point').first().click();await page.screenshot({path:'qa-artifacts/fallback/05-component-card.png',fullPage:true});
          const ids=await page.locator('.modal-navigation option').evaluateAll(o=>o.map(n=>n.value));let sections=0;
          for(const id of ids){await page.locator('.modal-navigation select').selectOption(id);check((await page.locator('.component-summary').innerText()).length>20,'Missing shared description '+id);await page.getByRole('tab',{name:'Источники'}).click();check(await page.locator('.source-card').count()>0,'Missing sources '+id);sections+=await page.locator('.static-section').count();}
          check(sections===52,'Missing static sections '+sections);await page.keyboard.press('Escape');
          for(const point of await page.locator('.component-point').all()){await point.click();check(await page.locator('.spec-modal').count()===1,'Point failed');await page.keyboard.press('Escape');}
          for(let i=0;i<3;i++){await retry.click();await retry.waitFor();check(await page.locator('canvas').count()===0,'Failed retry mounted a canvas');}check(await page.locator('.fallback-image-map img').isVisible(),'Repeated failure lost image');
        }
        if(scenario==='resource'){
          abortModule=false;await retry.click();await page.locator('.model-stage.ready').waitFor({timeout:25000});check(await fallback.count()===0,'Resource recovery did not hide fallback');
        }
        if(scenario==='creation'){
          await page.evaluate(()=>{window.__fallbackQA.creationFail=false;});await retry.click();await page.locator('.model-stage.ready').waitFor();
        }
        if(['construction','render-failure','stalled-frame'].includes(scenario)){
          check(await page.locator('canvas').count()===0,'Failed scene retained canvas');check(await page.evaluate(()=>window.__fallbackQA.disposed===1),'Partial scene not disposed');
          await page.evaluate(()=>{window.__fallbackQA.breakEnvironment=false;window.__fallbackQA.breakRender=false;if(window.__realRAF)window.requestAnimationFrame=window.__realRAF;});await retry.click();await page.locator('.model-stage.ready').waitFor();
        }
        if(scenario==='timeout'){
          const before=await page.evaluate(()=>window.__fallbackQA.renderers.length);for(const route of held)await route.continue().catch(()=>{});await page.waitForTimeout(1000);check(await page.evaluate(()=>window.__fallbackQA.renderers.length)===before,'Cancelled initialization mounted a late scene');await retry.click();await page.locator('.model-stage.ready').waitFor({timeout:25000});
        }
        if(scenario==='keyboard-mobile'){
          const rows=[];
          for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[768,1024],[1024,768],[1440,1000],[844,390]]){
            await page.setViewportSize({width,height});await page.waitForTimeout(60);
            const boxes=await page.locator('.component-point:visible').evaluateAll(points=>points.map(p=>{const r=p.getBoundingClientRect();return {x:r.x,y:r.y,w:r.width,h:r.height};}));
            for(let i=0;i<boxes.length;i++){const a=boxes[i];check(a.x>=0&&a.x+a.w<=width+.1&&a.w>=44&&a.h>=44,'Marker bounds '+width);for(let j=i+1;j<boxes.length;j++){const b=boxes[j];check(a.x+a.w<=b.x||b.x+b.w<=a.x||a.y+a.h<=b.y||b.y+b.h<=a.y,'Marker overlap '+width);}}
            check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Horizontal overflow '+width);rows.push({width,visiblePoints:boxes.length});
          }
          await page.setViewportSize({width:390,height:844});await page.screenshot({path:'qa-artifacts/fallback/06-fallback-mobile.png',fullPage:true});
          const trigger=page.getByRole('button',{name:'Посмотреть компоненты',exact:true});await trigger.focus();await page.keyboard.press('Enter');check(await page.locator('.explorer-close').evaluate(e=>e===document.activeElement),'List focus');
          await page.keyboard.press('Tab');await page.keyboard.press('Space');await page.locator('.spec-modal').waitFor();check(await page.locator('.modal-close').evaluate(e=>e===document.activeElement),'Card focus');
          await page.keyboard.press('Tab');check(await page.locator('.static-internals>summary').evaluate(e=>e===document.activeElement),'Static hierarchy keyboard access');await page.keyboard.press('Enter');check(await page.locator('.static-internals').getAttribute('open')!==null,'Cannot expand static hierarchy');await page.keyboard.press('Escape');check(await trigger.evaluate(e=>e===document.activeElement),'Return focus');
          await page.locator('.component-point:visible').first().tap();await page.locator('.spec-modal').waitFor();const bounds=await page.locator('.spec-modal').boundingBox();check(bounds.x>=0&&bounds.x+bounds.width<=390&&bounds.y>=0&&bounds.y+bounds.height<=844,'Mobile card clipped');await page.keyboard.press('Escape');
          results.push({scenario,widths:rows});
        }
      }else{
        await page.locator('.model-stage.ready').waitFor();
        await page.waitForTimeout(100);
        const snapshot=()=>page.evaluate(()=>{const q=window.__fallbackQA;return {memory:{...q.main.r.info.memory},canvasListeners:q.registrations.get(q.main.r.domElement)?.length||0,rootKeys:(q.registrations.get(document)||[]).filter(r=>['keydown','keyup','visibilitychange'].includes(r.type)).length};});
        const before=await snapshot();
        const cycles=scenario==='restarts'?5:1;
        for(let i=0;i<cycles;i++){
          await page.evaluate(()=>{window.__loss=window.__fallbackQA.main.r.getContext().getExtension('WEBGL_lose_context');window.__loss.loseContext();});await retry.waitFor();check(await page.locator('.fallback-image-map img').isVisible(),'Blank context loss');
          if(scenario==='context'){
            await page.evaluate(()=>window.__loss.restoreContext());await page.locator('.model-stage.ready').waitFor();
            await page.screenshot({path:'qa-artifacts/fallback/07-restored-3d.png',fullPage:true});
          }else if(scenario==='restore-failure'||scenario==='restore-timeout'){
            if(scenario==='restore-failure'){await page.evaluate(()=>{window.__fallbackQA.breakEnvironment=true;window.__loss.restoreContext();});}
            await page.waitForFunction(()=>document.querySelectorAll('.model-stage canvas').length===0,{},{timeout:12000});check(await fallback.isVisible(),'Failed restore removed static mode');
            check(await page.evaluate(()=>window.__fallbackQA.disposed===1),'Failed restore did not dispose scene');await page.evaluate(()=>{window.__fallbackQA.breakEnvironment=false;});await retry.click();await page.locator('.model-stage.ready').waitFor();
          }else{
            // Many events in one task must create just one replacement session.
            await retry.evaluate(button=>{for(let i=0;i<12;i++)button.click();});await page.locator('.model-stage.ready').waitFor();
            const lifecycle=await page.evaluate(()=>({created:window.__fallbackQA.renderers.length,disposed:window.__fallbackQA.disposed,canvases:document.querySelectorAll('.model-stage canvas').length,live:window.__fallbackQA.renderers.filter(r=>!r.getContext().isContextLost()).length}));check(lifecycle.canvases===1&&lifecycle.live===1&&lifecycle.created-lifecycle.disposed===1,'Overlapping renderers '+JSON.stringify(lifecycle));
            await page.waitForTimeout(100);const after=await snapshot();check(JSON.stringify(before)===JSON.stringify(after),'Resource/listener accumulation '+JSON.stringify({before,after}));check(await page.evaluate(()=>window.__fallbackQA.frames.size)===0,'Idle animation frame leak');
          }
        }
      }
      check(errors.length===0,scenario+' errors '+JSON.stringify(errors));results.push({scenario,passed:true,errors,counts:await page.evaluate(()=>{const q=window.__fallbackQA;return {contextsAttempted:q.requests,renderers:q.renderers.length,disposed:q.disposed,memory:q.main?{...q.main.r.info.memory}:null,calls:q.main?.r.info.render.calls,triangles:q.main?.r.info.render.triangles,frames:q.frames.size};})});original.__qaProgress?.(results.at(-1));
    }finally{for(const route of held)await route.abort().catch(()=>{});await context.close();}
  }
  return results;
}
