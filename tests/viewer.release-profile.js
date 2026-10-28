async original=>{
const release=original.url().includes('release'),rows=[];
for(const cpuRate of [1,4]){
 // Counterbalanced order reduces drift from warm shaders, scheduling and heat.
 const order=release?[5176,5177,5175,5175,5177,5176]:[5176,5177,5177,5176];
 for(const port of order){
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
  try{
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});await cdp.send('Performance.enable');
   await page.addInitScript(()=>{
    window.__THREE_DEVTOOLS__=new EventTarget();window.__views=[];
    window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r,times:[],cpu:[],matrix:[],collect:false};window.__views.push(v);const render=r.render;
     r.render=function(s,c){if(!v.scene&&c.isPerspectiveCamera&&s.children.some(o=>o.children.some(g=>g.userData.part))){v.scene=s;v.camera=c;const update=s.updateMatrixWorld;s.updateMatrixWorld=function(...args){const t=performance.now(),result=update.apply(this,args);if(v.collect)v.matrix.push(performance.now()-t);return result;};}
      const measured=v.collect&&s===v.scene,t=measured?performance.now():0,result=render.call(this,s,c);if(measured){v.times.push(t);v.cpu.push(performance.now()-t);v.calls=r.info.render.calls;v.triangles=r.info.render.triangles;}return result;};
    });
   });
   const start=Date.now();await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();const readyMs=Date.now()-start;await page.waitForTimeout(650);await cdp.send('HeapProfiler.collectGarbage');
   const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
   const set=()=>page.evaluate(()=>{const v=window.__views.find(v=>v.scene&&v.renderer.domElement.closest('.model-stage'));v.times=[];v.cpu=[];v.matrix=[];v.collect=true;});
   const get=()=>page.evaluate(()=>{const v=window.__views.find(v=>v.scene&&v.renderer.domElement.closest('.model-stage')),t=v.times,c=v.cpu.slice().sort((a,b)=>a-b),g=t.slice(1).map((x,i)=>x-t[i]).sort((a,b)=>a-b);v.collect=false;return {frames:t.length,fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95FrameMs:g[Math.floor(g.length*.95)],p95RenderMs:c[Math.floor(c.length*.95)],meanMatrixMs:v.matrix.reduce((a,b)=>a+b,0)/Math.max(t.length,1),calls:v.calls,triangles:v.triangles};});
   await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(300);await set();await page.waitForTimeout(2000);const rotation=await get();await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(650);await set();await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.waitForTimeout(1500);const assembly=await get();
   rows.push({port,cpuRate,readyMs,heapBytes:metrics.JSHeapUsedSize,rotation,assembly});
  }finally{await context.close();}
 }
}
return {method:'one wrapper per renderer frame, no per-draw GL wrappers; counterbalanced order',rows};
}
