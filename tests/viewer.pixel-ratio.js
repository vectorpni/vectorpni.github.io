async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},deviceScaleFactor:1}),page=await context.newPage(),cdp=await context.newCDPSession(page),rows=[];
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.part-preview canvas').waitFor();
    for(const scale of [1,2,3,1]){
      await cdp.send('Emulation.setDeviceMetricsOverride',{width:1440,height:1000,deviceScaleFactor:scale,mobile:false});
      // CDP changes DPR but does not deliver the native display/resize signal.
      // Exercise the resize fallback explicitly; physical monitor moves are not
      // claimed by this emulation test.
      await page.evaluate(()=>window.dispatchEvent(new Event('resize')));await page.waitForTimeout(200);
      rows.push(await page.evaluate(scale=>({scale,dpr:devicePixelRatio,canvases:[...document.querySelectorAll('canvas')].map(c=>({preview:!!c.closest('.part-preview'),cssWidth:c.clientWidth,width:c.width,ratio:c.width/c.clientWidth}))}),scale));
    }
    if(rows.some(r=>r.canvases.some(c=>Math.abs(c.ratio-Math.min(r.dpr,c.preview?1.6:2))>.02)))throw Error(JSON.stringify(rows));
    return rows;
  }finally{await context.close();}
}
