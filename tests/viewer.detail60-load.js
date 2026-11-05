async original=>{
 const rows=[];
 for(const cpuRate of [1,4])for(const port of [5180,5181,5175,5175,5181,5180]){
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
  try{
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
   await page.addInitScript(()=>{window.__loading={};new MutationObserver(()=>{const q=window.__loading;if(!q.mainReady&&document.querySelector('.model-stage.ready'))q.mainReady=performance.now();if(!q.studyReady&&document.querySelector('.engineering-stage canvas')&&!document.querySelector('.engineering-stage [role=status]'))q.studyReady=performance.now();}).observe(document,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});});
   await page.goto('http://127.0.0.1:'+port);await page.waitForFunction(()=>window.__loading.mainReady);
   const main=await page.evaluate(()=>({mainReadyMs:window.__loading.mainReady,decodedBytes:performance.getEntriesByType('resource').reduce((n,r)=>n+r.decodedBodySize,0),resources:performance.getEntriesByType('resource').map(r=>({url:r.name,decodedBytes:r.decodedBodySize,transferBytes:r.transferSize}))}));
   await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.evaluate(()=>{window.__loading.studyStart=performance.now();});await page.locator('.study-toggle').click();await page.waitForFunction(()=>window.__loading.studyReady);
   rows.push({port,cpuRate,...main,...await page.evaluate(()=>({studyReadyMs:window.__loading.studyReady-window.__loading.studyStart}))});
  }finally{await context.close();}
  original.__qaProgress?.({port,cpuRate});
 }
 return {rows,method:'Fresh browser contexts and disabled HTTP cache; loopback Vite production preview, no network throttling. Mutation-observed first ready main scene and first study frame. Two samples per version/CPU, not internet/CDN loading times. Decoded resource sizes are uncompressed, not gzip transfer estimates.'};
}
