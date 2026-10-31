async original=>{
  const rows=[];
  for(const cpuRate of [1,4])for(const port of [5176,5175,5175,5176]){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),cdp=await context.newCDPSession(page);
    try{
      await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});await cdp.send('Performance.enable');await cdp.send('Network.enable');await cdp.send('Network.setCacheDisabled',{cacheDisabled:true});
      await page.addInitScript(()=>{
        const m={pending:new Set(),collect:false,times:[],render:[],callback:[],views:[],longTasks:[],ready:null};window.__ultimate=m;
        const raf=requestAnimationFrame,cancel=cancelAnimationFrame;
        window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);const start=performance.now();fn(t);if(m.collect)m.callback.push(performance.now()-start);});m.pending.add(id);return id;};
        window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
        window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r};m.views.push(v);const render=r.render;r.render=function(s,c){const measured=c.isPerspectiveCamera&&this.domElement.closest('.model-stage');if(measured){v.scene=s;v.camera=c;}const t=performance.now(),result=render.call(this,s,c);if(measured&&m.collect){m.times.push(t);m.render.push(performance.now()-t);}return result;};});
        new PerformanceObserver(list=>m.longTasks.push(...list.getEntries().map(e=>({start:e.startTime,ms:e.duration})))).observe({type:'longtask',buffered:true});
        const observer=new MutationObserver(()=>{if(m.ready===null&&document.querySelector('.model-stage.ready')){m.ready=performance.now();observer.disconnect();}});observer.observe(document,{attributes:true,childList:true,subtree:true});
      });
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(1200);await cdp.send('HeapProfiler.collectGarbage');
      const getMetrics=async()=>Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
      const initial=await page.evaluate(()=>({readyMs:window.__ultimate.ready,pending:window.__ultimate.pending.size,memory:{...window.__ultimate.views[0].renderer.info.memory},programs:window.__ultimate.views[0].renderer.info.programs.length,longTasks:window.__ultimate.longTasks})),heap=(await getMetrics()).JSHeapUsedSize;
      const begin=()=>page.evaluate(()=>{const m=window.__ultimate;m.times=[];m.render=[];m.callback=[];m.collect=true;});
      const end=()=>page.evaluate(()=>{const m=window.__ultimate;m.collect=false;const t=m.times,g=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b),render=m.render.sort((a,b)=>a-b),callback=m.callback.sort((a,b)=>a-b),q=(a,p)=>a[Math.min(a.length-1,Math.floor(a.length*p))]??null;return {frames:t.length,fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95FrameMs:q(g,.95),p99FrameMs:q(g,.99),p95RenderMs:q(render,.95),p99RenderMs:q(render,.99),p95CallbackMs:q(callback,.95),p99CallbackMs:q(callback,.99),calls:m.views[0].renderer.info.render.calls,triangles:m.views[0].renderer.info.render.triangles};});
      await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(250);await begin();const busyStart=await getMetrics(),start=Date.now();await page.waitForTimeout(3000);const busyEnd=await getMetrics(),rotation={...await end(),mainThreadBusyPct:(busyEnd.TaskDuration-busyStart.TaskDuration)*100000/(Date.now()-start)};
      await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(500);await begin();await page.locator('.controls .tool').click();await page.waitForTimeout(1500);const assembly=await end();await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await page.waitForTimeout(1600);
      const pointer=await page.evaluate(()=>{
        const v=window.__ultimate.views[0],canvas=v.renderer.domElement,r=canvas.getBoundingClientRect(),times=[];let raycasts=0;
        v.scene.traverse(o=>{if(!o.isMesh||!o.userData.part)return;const raycast=o.raycast;o.raycast=function(...args){raycasts++;return raycast.apply(this,args);};});
        // Same 144 positions, four warmup sweeps + eight measured sweeps.
        for(let round=0;round<12;round++)for(let y=0;y<12;y++)for(let x=0;x<12;x++){
          const t=performance.now();canvas.dispatchEvent(new PointerEvent('pointermove',{bubbles:true,pointerType:'mouse',pointerId:1,clientX:r.x+r.width*(.2+x*.6/11),clientY:r.y+r.height*(.2+y*.6/11)}));
          if(round>=4)times.push(performance.now()-t);
        }
        times.sort((a,b)=>a-b);return {events:times.length,medianMs:times[Math.floor(times.length*.5)],p95Ms:times[Math.floor(times.length*.95)],p99Ms:times[Math.floor(times.length*.99)],meanRaycastsPerEvent:raycasts/(12*144)};
      });
      rows.push({port,cpuRate,runtimeAssets:await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>n.includes('/assets/'))),...initial,heapBytes:heap,rotation,assembly,pointer});
    }finally{await context.close();}
  }
  return {method:'counterbalanced ABBA per CPU rate, 1440x1000 DPR1, cold browser cache, warmed render, one wrapper per frame; hover uses synchronous synthetic pointer events',rows};
}
