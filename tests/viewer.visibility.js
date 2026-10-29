async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const m={pending:new Set(),callbacks:0};window.__visibility=m;const raf=requestAnimationFrame,cancel=cancelAnimationFrame;
    window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);m.callbacks++;fn(t);});m.pending.add(id);return id;};window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
  });
  let windowId;
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(100);
    let native={supported:false};
    try{
      ({windowId}=await cdp.send('Browser.getWindowForTarget'));
      await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'minimized'}});await page.waitForTimeout(200);
      native={supported:await page.evaluate(()=>document.hidden)};
      if(native.supported){const before=await page.evaluate(()=>({callbacks:window.__visibility.callbacks,pending:window.__visibility.pending.size}));await page.waitForTimeout(200);native={...native,before,after:await page.evaluate(()=>({callbacks:window.__visibility.callbacks,pending:window.__visibility.pending.size}))};if(native.before.pending||native.after.callbacks!==native.before.callbacks)throw Error('Hidden page kept rendering');}
    }finally{if(windowId)await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}});}
    await page.waitForTimeout(100);
    await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});
    const before=await page.evaluate(()=>({callbacks:window.__visibility.callbacks,pending:window.__visibility.pending.size}));await page.waitForTimeout(200);await page.setViewportSize({width:1280,height:800});
    const hidden=await page.evaluate(()=>({callbacks:window.__visibility.callbacks,pending:window.__visibility.pending.size}));
    if(hidden.pending||hidden.callbacks!==before.callbacks)throw Error('Synthetic hidden page kept rendering');
    await page.evaluate(()=>{delete document.hidden;document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(150);
    const resumed=await page.evaluate(()=>({callbacks:window.__visibility.callbacks,pending:window.__visibility.pending.size}));if(resumed.callbacks<=hidden.callbacks)throw Error('Visibility restore did not resume');
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await page.waitForFunction(()=>window.__visibility.pending.size===0);
    if(errors.length)throw Error(errors.join(';'));
    return {nativeMinimization:native,syntheticVisibility:{before,hidden,resumed},errors};
  }finally{if(windowId)await cdp.send('Browser.setWindowBounds',{windowId,bounds:{windowState:'normal'}}).catch(()=>{});await context.close();}
}
