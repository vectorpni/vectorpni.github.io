async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__shared=null;window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage')&&s.children.some(o=>o.children.some(g=>g.userData.part)))window.__shared={renderer:r,scene:s};return render.call(this,s,c);};});});
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();
    const snapshot=()=>page.evaluate(()=>{
      const g=new Set(),t=new Set(),{scene,renderer}=window.__shared;
      scene.traverse(o=>{if(o.geometry)g.add(o.geometry);if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])for(const value of Object.values(m))if(value?.isTexture)t.add(value);});
      return {geometryListeners:[...g].reduce((n,g)=>n+(g._listeners?.dispose?.length||0),0),textureListeners:[...t].reduce((n,t)=>n+(t._listeners?.dispose?.length||0),0),maxGeometryListeners:Math.max(...[...g].map(g=>g._listeners?.dispose?.length||0)),maxTextureListeners:Math.max(...[...t].map(t=>t._listeners?.dispose?.length||0)),memory:{...renderer.info.memory}};
    });
    const before=await snapshot();
    for(let i=0;i<24;i++){await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(['frame','motors','pi','battery'][i%4]);await page.locator('.part-preview canvas').waitFor();await page.waitForTimeout(40);await page.keyboard.press('Escape');}
    const after=await snapshot();if(JSON.stringify(before)!==JSON.stringify(after))throw Error(JSON.stringify({before,after}));
    const restores=[];
    for(let i=0;i<3;i++){
      await page.evaluate(()=>{window.__sharedLoss=document.querySelector('.model-stage canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.__sharedLoss.loseContext();});await page.getByRole('alert').waitFor();await page.evaluate(()=>window.__sharedLoss.restoreContext());await page.getByRole('alert').waitFor({state:'hidden'});await page.waitForTimeout(100);
      restores.push(await snapshot());if(JSON.stringify(before)!==JSON.stringify(restores.at(-1)))throw Error(JSON.stringify({before,after,restores}));
    }
    return {cycles:24,before,after,restores};
  }finally{await context.close();}
}
