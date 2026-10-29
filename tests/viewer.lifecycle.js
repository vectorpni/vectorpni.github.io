async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const m={listeners:new Map(),created:0,live:0};window.__lifecycle=m;
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    function entry(target,type){const id=(target===window?'window:':'document:')+type;if(!m.listeners.has(id))m.listeners.set(id,new Set());return m.listeners.get(id);}
    EventTarget.prototype.addEventListener=function(type,fn,options){if(this===document||this===window)entry(this,type).add(fn);return add.call(this,type,fn,options);};
    EventTarget.prototype.removeEventListener=function(type,fn,options){if(this===document||this===window)entry(this,type).delete(fn);return remove.call(this,type,fn,options);};
    const get=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=get.call(this,type,...args);if(gl&&/^webgl/.test(type)&&!seen.has(gl)){seen.add(gl);m.created++;m.live++;this.addEventListener('webglcontextlost',()=>m.live--);this.addEventListener('webglcontextrestored',()=>m.live++);}return gl;};
  });
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();
    // Track every global event type used by the application. Playwright may
    // lazily install its own pointer hit-target listeners during modifier clicks.
    const snapshot=()=>page.evaluate(()=>({listeners:Object.fromEntries([...window.__lifecycle.listeners].filter(([k,s])=>s.size&&['document:keydown','document:keyup','document:visibilitychange','window:keydown','window:resize','window:pageshow'].includes(k)).map(([k,s])=>[k,s.size])),live:window.__lifecycle.live,created:window.__lifecycle.created}));
    // Modifier clicks install Playwright's own global hit-target listeners.
    // Warm that exact path before taking the application listener baseline.
    await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.keyboard.down('Control');await page.getByRole('button',{name:'Закрыть характеристики'}).click();await page.keyboard.up('Control');await page.waitForTimeout(100);const before=await snapshot();
    for(let i=0;i<40;i++){
      await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(i%2?'pi':'motors');
      if(i%2===0)await page.keyboard.down('Control');
      await page.getByRole('button',{name:'Закрыть характеристики'}).click();
      if(i%2===0)await page.keyboard.up('Control');
    }
    await page.waitForFunction(()=>window.__lifecycle.live===1);const after=await snapshot();
    if(JSON.stringify(before.listeners)!==JSON.stringify(after.listeners)||errors.length)throw Error(JSON.stringify({before,after,errors}));
    return {cycles:40,ctrlHeldDuringClose:20,before,after,errors};
  }finally{await context.close();}
}
