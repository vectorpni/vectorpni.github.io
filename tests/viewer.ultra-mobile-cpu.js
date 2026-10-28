async original=>{
const context=await original.context().browser().newContext({viewport:{width:390,height:844},deviceScaleFactor:2,isMobile:true,hasTouch:true}),page=await context.newPage(),cdp=await context.newCDPSession(page),errors=[],checks=[],measurements=[];
const check=(v,n)=>{if(!v)throw Error(n);checks.push(n);};page.on('pageerror',e=>errors.push(e.message));
await cdp.send('Emulation.setCPUThrottlingRate',{rate:4});
await page.addInitScript(()=>{const m={pending:new Set(),token:0,times:[],calls:0,last:-1};window.__mobile=m;const raf=requestAnimationFrame,cancel=cancelAnimationFrame;window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);m.token++;fn(t);});m.pending.add(id);return id;};window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){const gl=get.call(this,type,...args);if(gl&&type==='webgl2'&&!gl.__mobileWrapped){gl.__mobileWrapped=true;for(const k of ['drawElements','drawArrays','drawElementsInstanced','drawArraysInstanced']){const f=gl[k];gl[k]=function(...a){if(this.canvas.closest('.model-stage')){m.calls++;if(m.last!==m.token){m.last=m.token;m.times.push(performance.now());}}return f.apply(this,a);};}}return gl;};});
try{
 await page.goto('http://127.0.0.1:5175');await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(1000);
 for(const [width,height] of [[320,568],[375,812],[390,844],[430,932],[768,1024],[844,390]]){
  await page.setViewportSize({width,height});await page.waitForTimeout(250);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'no overflow '+width+'x'+height);
  const c=await page.locator('.controls').boundingBox(),m=await page.locator('.model-stage').boundingBox();check(c.y>=m.y+m.height-1,'controls clear model '+width);
  await page.getByRole('button',{name:'Разобрать',exact:true}).tap();await page.waitForTimeout(250);await page.getByRole('button',{name:'Собрать',exact:true}).tap();await page.getByRole('button',{name:'Сверху',exact:true}).tap();await page.getByRole('button',{name:'Спереди',exact:true}).tap();await page.getByRole('button',{name:'Сбросить вид',exact:true}).tap();await page.waitForTimeout(1700);
  check(await page.getByRole('button',{name:'Разобрать',exact:true}).getAttribute('aria-pressed')==='false','reset after reversal '+width);
 }
 await page.setViewportSize({width:390,height:844});await page.getByRole('button',{name:'Исследовать компоненты'}).tap();
 for(const id of ['frame','motors','esc','props','fc','power','becpi','becfc','battery','pi','cooling','gps','radio','camera','charger','wiring']){await page.getByRole('combobox').selectOption(id);check(await page.locator('.component-summary').isVisible(),'component '+id);check(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'card fits '+id);}
 await page.getByRole('button',{name:'Закрыть характеристики'}).tap();await page.waitForTimeout(1700);
 async function phase(name,action,ms){await page.evaluate(()=>{window.__mobile.times=[];window.__mobile.calls=0;});await action();await page.waitForTimeout(ms);measurements.push(await page.evaluate(name=>{const m=window.__mobile,t=m.times,g=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b);return {name,frames:t.length,fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95FrameMs:g[Math.floor(g.length*.95)],calls:m.calls/t.length};},name));}
 await phase('rotation',()=>page.getByRole('button',{name:'Автовращение',exact:true}).tap(),3000);await page.getByRole('button',{name:'Автовращение',exact:true}).tap();await page.waitForTimeout(1500);await phase('disassembly',()=>page.getByRole('button',{name:'Разобрать',exact:true}).tap(),2200);await page.getByRole('button',{name:'Сбросить вид',exact:true}).tap();await page.waitForTimeout(1800);
 check(await page.evaluate(()=>window.__mobile.pending.size===0),'idle has no RAF');check(errors.length===0,'no JavaScript errors');return {cpuRate:4,dpr:2,checks:checks.length,passed:checks,measurements,errors};
}finally{await cdp.send('Emulation.setCPUThrottlingRate',{rate:1});await context.close();}
}
