async original=>{
 const rows=[],origin=new URL(original.url()).origin;
 for(const cpuRate of [4]){
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),cdp=await context.newCDPSession(page);
  try{
   await cdp.send('Emulation.setCPUThrottlingRate',{rate:cpuRate});
   await page.addInitScript(()=>{window.__picking={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__picking.scene=s;if(c.isPerspectiveCamera&&this.domElement.closest('.engineering-stage'))window.__picking.camera=c;return render.call(this,s,c);};});});
   await page.goto(origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
   const result=await page.evaluate(async()=>{
    const q=window.__picking,module=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name),root=q.scene.children.find(o=>o.children.some(g=>g.userData.part)),sections=[],answers=[];
    for(const source of root.children.filter(g=>g.children.length)){
     const a=module.createEngineeringAssembly(source);a.update(.01,true,true);
     for(const section of a.catalog.sections){a.select(section.id,true);a.object.updateMatrixWorld(true);const sphere=a.selectionBounds().sphere,c=new q.camera.constructor(35,1,.0001,100);c.position.copy(sphere.center).add(c.position.clone().set(.8,.6,1).normalize().multiplyScalar(sphere.radius*3.5));c.lookAt(sphere.center);c.updateMatrixWorld(true);
      let total=0,hidden=0;const originals=[];a.object.traverse(o=>{if(!o.isMesh)return;const original=o.raycast;originals.push([o,original]);o.raycast=function(...args){total++;for(let p=this;p;p=p.parent)if(!p.visible){hidden++;break;}return original.apply(this,args);};});
      for(let i=0;i<5;i++)a.pick(0,0,c);total=0;hidden=0;const start=performance.now();for(let round=0;round<3;round++)for(const y of [-.35,0,.35])for(const x of [-.35,0,.35]){const key=a.pick(x,y,c);answers.push([source.userData.part,section.id,round,x,y,key?.replace(/@\d+:/,'@:')||null]);}const elapsed=performance.now()-start;for(const [o,raycast]of originals)o.raycast=raycast;sections.push({id:source.userData.part,section:section.id,ms:elapsed,totalRaycasts:total,hiddenRaycasts:hidden});
     }
     a.dispose();
    }
    return {sections,answers,totalMs:sections.reduce((n,r)=>n+r.ms,0),hiddenRaycasts:sections.reduce((n,r)=>n+r.hiddenRaycasts,0),totalRaycasts:sections.reduce((n,r)=>n+r.totalRaycasts,0)};
   });if(result.sections.length!==52)throw Error('Incomplete picking coverage');rows.push({origin,cpuRate,...result});
  }finally{await context.close();}original.__qaProgress?.({cpuRate,origin});
 }
 if(rows.some(r=>r.hiddenRaycasts))throw Error('Hidden leaf was raycast');
 if(rows.some(r=>!r.answers.some(a=>a.at(-1))))throw Error('Empty picking sample');
 return {rows,method:'52 isolated, fully opened sections; 9-ray grid x3 after 5 warm-ups. Counts actual mesh raycasts and rejects visits to hidden branches. CPU-only pick timing excludes scene construction and GPU rendering. Fixed sparse rays can miss a thin part; equivalence to recursive picking is covered by the CPU test and the paired benchmark.'};
}
