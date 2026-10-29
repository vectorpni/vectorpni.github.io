// Uses the Playwright installation already present in the workspace. This is
// deliberately separate from npm test: default 5 minutes, release QA used 60.
import {chromium} from 'playwright';
import fs from 'node:fs/promises';
import path from 'node:path';
import assert from 'node:assert/strict';

const minutes=Number(process.argv.find(a=>a.startsWith('--minutes='))?.split('=')[1]||5);
assert.ok(Number.isFinite(minutes)&&minutes>0&&minutes<=60);
const output=path.resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)||'qa-artifacts/ultimate/endurance.json');
const url=process.argv.find(a=>a.startsWith('--url='))?.slice(6)||'http://127.0.0.1:5175';
const report={startedAt:new Date().toISOString(),requestedMinutes:minutes,complete:false,cycles:0,errors:[],warnings:[],samples:[],parts:{},contextRestores:0,freezeResumes:0};
const start=performance.now(),browser=await chromium.launch({channel:'chrome',headless:true}),context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true}),page=await context.newPage(),cdp=await context.newCDPSession(page);
page.setDefaultTimeout(12000);page.on('pageerror',e=>report.errors.push({kind:'pageerror',message:e.message}));
page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('Failed to load resource'))report.errors.push({kind:'console',message:m.text()});if(m.type()==='warning'&&/WebGL|THREE|GL_INVALID/i.test(m.text())&&report.warnings.length<100)report.warnings.push(m.text());});
const save=async()=>{report.elapsedMs=Math.round(performance.now()-start);await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify(report,null,2));};
try{
  await cdp.send('Performance.enable');
  await page.addInitScript(()=>{
    const m={pending:new Set(),callbacks:0,maxPending:0,createdContexts:0,live:new Map(),main:null,globalListeners:new Map(),measuring:false,times:[],cpu:[]};window.__stress=m;
    const raf=requestAnimationFrame,cancel=cancelAnimationFrame;
    window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);m.callbacks++;fn(t);});m.pending.add(id);m.maxPending=Math.max(m.maxPending,m.pending.size);return id;};
    window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
    const add=EventTarget.prototype.addEventListener,remove=EventTarget.prototype.removeEventListener;
    const listeners=(target,type)=>{const key=(target===window?'window:':'document:')+type;if(!m.globalListeners.has(key))m.globalListeners.set(key,new Set());return m.globalListeners.get(key);};
    EventTarget.prototype.addEventListener=function(type,fn,options){if(this===window||this===document)listeners(this,type).add(fn);return add.call(this,type,fn,options);};
    EventTarget.prototype.removeEventListener=function(type,fn,options){if(this===window||this===document)listeners(this,type).delete(fn);return remove.call(this,type,fn,options);};
    const get=HTMLCanvasElement.prototype.getContext,seen=new WeakSet();
    HTMLCanvasElement.prototype.getContext=function(type,...args){
      const gl=get.call(this,type,...args);if(!gl||!/^webgl/.test(type)||seen.has(gl))return gl;seen.add(gl);
      const id=++m.createdContexts,s={id,canvas:new WeakRef(this),buffers:new Map(),bound:new Map(),textures:new Set()};m.live.set(id,s);
      for(const key of ['createBuffer','createTexture']){const f=gl[key];gl[key]=function(...a){const v=f.apply(this,a);if(v){if(key==='createBuffer')s.buffers.set(v,0);else s.textures.add(v);}return v;};}
      const bind=gl.bindBuffer,data=gl.bufferData,del=gl.deleteBuffer,delTexture=gl.deleteTexture;
      gl.bindBuffer=function(target,buffer){s.bound.set(target,buffer);return bind.call(this,target,buffer);};
      gl.bufferData=function(target,source,...rest){const buffer=s.bound.get(target);if(buffer)s.buffers.set(buffer,typeof source==='number'?source:source?.byteLength||0);return data.call(this,target,source,...rest);};
      gl.deleteBuffer=function(buffer){s.buffers.delete(buffer);return del.call(this,buffer);};
      gl.deleteTexture=function(texture){s.textures.delete(texture);return delTexture.call(this,texture);};
      this.addEventListener('webglcontextlost',()=>{s.buffers.clear();s.bound.clear();s.textures.clear();m.live.delete(id);});
      this.addEventListener('webglcontextrestored',()=>m.live.set(id,s));
      return gl;
    };
    window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
      const r=e.detail;if(!r.isWebGLRenderer)return;if(!m.main)m.main=new WeakRef(r);
      const render=r.render;r.render=function(s,c){const isMain=this===m.main.deref()&&c.isPerspectiveCamera&&s.children.some(o=>o.children.some(g=>g.userData.part));if(isMain)m.mainScene=s;const measured=m.measuring&&isMain;const t=measured?performance.now():0,result=render.call(this,s,c);if(measured){m.times.push(t);m.cpu.push(performance.now()-t);}return result;};
    });
  });
  const settle=async()=>{await page.waitForFunction(()=>window.__stress.pending.size===0,{timeout:8000});};
  const reset=async()=>{await page.keyboard.press('Escape');await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await settle();};
  const sample=async()=>{
    await reset();await page.waitForFunction(()=>window.__stress.live.size===1);await cdp.send('HeapProfiler.collectGarbage');
    const metrics=Object.fromEntries((await cdp.send('Performance.getMetrics')).metrics.map(m=>[m.name,m.value]));
    const s=await page.evaluate(()=>{
      const m=window.__stress,r=m.main.deref(),main=[...m.live.values()].find(s=>s.canvas.deref()?.closest('.model-stage'));
      const geometries=new Set(),textures=new Set();m.mainScene.traverse(o=>{if(o.geometry)geometries.add(o.geometry);if(o.material)for(const value of Object.values(o.material))if(value?.isTexture)textures.add(value);});
      const disposeListeners={geometries:[...geometries].reduce((n,g)=>n+(g._listeners?.dispose?.length||0),0),textures:[...textures].reduce((n,t)=>n+(t._listeners?.dispose?.length||0),0)};
      return {canvases:document.querySelectorAll('canvas').length,liveContexts:m.live.size,createdContexts:m.createdContexts,pendingRAF:m.pending.size,maxPendingRAF:m.maxPending,memory:{...r.info.memory},programs:r.info.programs.length,buffers:main.buffers.size,bufferBytes:[...main.buffers.values()].reduce((a,b)=>a+b,0),textures:main.textures.size,disposeListeners,globalListeners:Object.fromEntries([...m.globalListeners].filter(([,v])=>v.size).map(([k,v])=>[k,v.size]))};
    });
    const baseline=report.samples[0];
    report.samples.push({elapsedMs:Math.round(performance.now()-start),cycles:report.cycles,heapBytes:metrics.JSHeapUsedSize,...s});
    assert.equal(s.canvases,1);assert.equal(s.liveContexts,1);assert.equal(s.pendingRAF,0);assert.deepEqual(s.memory,{geometries:181,textures:9});
    if(baseline){assert.equal(s.buffers,baseline.buffers);assert.equal(s.bufferBytes,baseline.bufferBytes);assert.equal(s.textures,baseline.textures);assert.deepEqual(s.disposeListeners,baseline.disposeListeners);assert.deepEqual(s.globalListeners,baseline.globalListeners);}
    assert.equal(report.errors.length,0,JSON.stringify(report.errors));await save();console.log(JSON.stringify({elapsedSeconds:Math.round((performance.now()-start)/1000),cycles:report.cycles,heapBytes:metrics.JSHeapUsedSize,buffers:s.buffers,liveContexts:s.liveContexts}));
  };
  const measure=async()=>{
    await reset();await page.getByRole('button',{name:'Автовращение',exact:true}).click();await page.waitForTimeout(300);
    await page.evaluate(()=>{const m=window.__stress;m.times=[];m.cpu=[];m.measuring=true;});await page.waitForTimeout(2000);
    const result=await page.evaluate(()=>{const m=window.__stress;m.measuring=false;const t=m.times,g=t.slice(1).map((v,i)=>v-t[i]).sort((a,b)=>a-b),cpu=m.cpu.sort((a,b)=>a-b),r=m.main.deref();return {fps:(t.length-1)*1000/(t.at(-1)-t[0]),p95FrameMs:g[Math.floor(g.length*.95)],p99FrameMs:g[Math.floor(g.length*.99)],p95RenderMs:cpu[Math.floor(cpu.length*.95)],calls:r.info.render.calls,triangles:r.info.render.triangles};});
    await reset();return result;
  };
  const restore=async selector=>{
    await page.locator(selector).evaluate(canvas=>{window.__stressLoss=canvas.getContext('webgl2').getExtension('WEBGL_lose_context');window.__stressLoss.loseContext();});
    const lost=selector.includes('part-preview')?page.getByText('3D-просмотр недоступен',{exact:true}):page.getByRole('alert');
    await lost.waitFor();await page.evaluate(()=>window.__stressLoss.restoreContext());await lost.waitFor({state:'hidden'});report.contextRestores++;
  };
  await page.goto(url);await page.locator('.model-stage.ready').waitFor();report.runtimeAssets=await page.evaluate(()=>({scripts:[...document.scripts].map(s=>s.src),styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>l.href)}));report.browserVersion=browser.version();await settle();report.firstPerformance=await measure();
  // Warm React's card controls before the listener/heap baseline.
  await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.keyboard.press('Escape');await sample();
  const ids=['frame','motors','esc','props','fc','power','becpi','becfc','battery','pi','cooling','gps','radio','camera','charger','wiring'];
  const sizes=[[1440,1000],[390,844],[320,568],[844,390],[768,1024],[430,932],[1024,600],[1440,1000]];
  let sampledAt=performance.now();
  while(performance.now()-start<minutes*60000){
    const i=report.cycles,id=ids[i%ids.length];
    if(i%16===0){const [width,height]=sizes[Math.floor(i/16)%sizes.length];await page.setViewportSize({width,height});}
    await page.locator('.controls .tool').click();
    if(i%3===0){await page.locator('.controls .tool').click();await page.locator('.controls .tool').click();}
    await page.locator('.view-controls button').nth(i%3).click();
    await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(id);
    assert.ok((await page.locator('.component-summary').textContent()).length>60);
    if(id!=='charger'){
      const preview=page.locator('.part-preview canvas');await preview.scrollIntoViewIfNeeded();const r=await preview.boundingBox();
      await page.mouse.move(r.x+r.width*.3,r.y+r.height*.4);await page.mouse.down();await page.mouse.move(r.x+r.width*.65,r.y+r.height*.55,{steps:4});await page.mouse.up();await page.mouse.wheel(0,i%2?-50:50);
      if(i%40===1)await restore('.part-preview canvas');
    }
    await page.getByRole('button',{name:'Следующий компонент'}).click();await page.getByRole('button',{name:'Предыдущий компонент'}).click();
    assert.equal(await page.getByRole('combobox').inputValue(),id);
    await page.keyboard.press('Escape');await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(id);await page.getByRole('button',{name:'Закрыть характеристики'}).click();
    if(i%5===0){const canvas=page.locator('.model-stage canvas');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.35,r.y+r.height*.45);await page.mouse.down();await page.mouse.move(r.x+r.width*.6,r.y+r.height*.5,{steps:4});await page.mouse.up();await page.mouse.wheel(0,i%2?-80:80);}
    if(i%40===0){await restore('.model-stage canvas');await cdp.send('Page.setWebLifecycleState',{state:'frozen'});await new Promise(resolve=>setTimeout(resolve,200));await cdp.send('Page.setWebLifecycleState',{state:'active'});report.freezeResumes++;}
    report.parts[id]=(report.parts[id]||0)+1;report.cycles++;
    if(performance.now()-sampledAt>=60000){await sample();sampledAt=performance.now();}
  }
  await page.setViewportSize({width:1440,height:1000});await sample();report.lastPerformance=await measure();
  report.complete=true;report.finishedAt=new Date().toISOString();await save();
}catch(e){report.errors.push({kind:'assertion',message:e.stack});await save();console.error(e);process.exitCode=1;}
finally{await browser.close();await save();}
