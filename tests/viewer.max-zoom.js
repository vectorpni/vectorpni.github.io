async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),rows=[],errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__zoomViews={};window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){const type=this.domElement.closest('.part-preview')?'preview':'main';window.__zoomViews[type]={renderer:r,scene:s,camera:c};}return render.call(this,s,c);};});});
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();
    const ids=await page.getByRole('combobox').locator('option').evaluateAll(options=>options.map(o=>o.value).filter(v=>v!=='charger'));
    for(const id of ids){
      await page.getByRole('combobox').selectOption(id);const canvas=page.locator('.part-preview canvas');await canvas.scrollIntoViewIfNeeded();await page.waitForTimeout(100);const rect=await canvas.boundingBox();await page.mouse.move(rect.x+rect.width/2,rect.y+rect.height*.4);await page.mouse.wheel(0,-10000);await page.waitForTimeout(400);
      const row=await page.evaluate(id=>{
        const {scene,camera,renderer}=window.__zoomViews.preview,object=scene.children.find(o=>o.isGroup),first=object.children.find(o=>o.geometry),Box=first.geometry.boundingBox.constructor,bounds=new Box().setFromObject(object),sphere=bounds.getBoundingSphere({center:camera.position.clone(),radius:0});
        const distance=camera.position.length(),ratio=distance/sphere.radius;
        if(!camera.position.toArray().every(Number.isFinite)||camera.near<=0)throw Error('Invalid maximum-zoom camera '+id);
        if(['motors','battery','camera','gps','radio','esc','becpi','becfc','cooling'].includes(id)&&ratio<1.04)throw Error('Camera entered solid component envelope '+id);
        return {id,distance,radius:sphere.radius,ratio,near:camera.near,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
      },id);rows.push(row);await canvas.screenshot({path:'C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultimate/after/maxzoom-'+id+'.png'});
    }
    if(errors.length)throw Error(errors.join(';'));return {rows,errors};
  }finally{await context.close();}
}
