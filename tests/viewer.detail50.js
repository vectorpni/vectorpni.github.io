async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},hasTouch:true,reducedMotion:'reduce'}),page=await context.newPage(),errors=[],checks=[],rows=[];
  const captureRoot='qa-artifacts/detail50/'+(original.context().browser().browserType().name()==='chromium'?'after':'firefox');
  const check=(name,value)=>{checks.push({name,passed:!!value});if(!value)throw Error(name);};
  await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__detailViews=[];window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r};window.__detailViews.push(v);const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){v.scene=s;v.camera=c;}return render.call(this,s,c);};});});
  page.on('pageerror',e=>errors.push(e.message));
  try {
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();
    check('Detailed module not fetched on first screen',await page.evaluate(()=>!performance.getEntriesByType('resource').some(r=>r.name.includes('engineering-inspector'))));
    await page.getByRole('button',{name:'Исследовать компоненты'}).click();
    const ids=await page.locator('.modal-navigation select option').evaluateAll(opts=>opts.map(o=>o.value));check('16 main components',ids.length===16);
    for(const id of ids) {
      await page.locator('.modal-navigation select').selectOption(id);await page.waitForTimeout(60);
      if(id==='charger'){check('Charger remains external without invented internals',await page.locator('.study-toggle').count()===0);continue;}
      await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();await page.waitForTimeout(100);
      check(id+' no initialization failure',await page.locator('.detail-error').count()===0);
      const metadata=await page.evaluate(()=>{const v=window.__detailViews.findLast(v=>v.renderer.domElement.closest('.engineering-stage'));if(!v?.scene)throw Error('No detail render');let meshes=0,invalid=0,badNormals=0,instances=0,triangles=0,zeroArea=0,reversed=0;const geometry=new Set();v.scene.traverse(o=>{if(!o.isMesh)return;meshes++;if(o.isInstancedMesh)instances++;geometry.add(o.geometry);triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.count||1);});for(const g of geometry){for(const a of Object.values(g.attributes))for(const n of a.array)if(!Number.isFinite(n))invalid++;const n=g.attributes.normal,p=g.attributes.position,indices=g.index?.array;if(n)for(let i=0;i<n.count;i++)if(Math.abs(Math.hypot(n.getX(i),n.getY(i),n.getZ(i))-1)>.003)badNormals++;for(let i=0;i<(indices?.length||p.count);i+=3){const a=indices?indices[i]:i,b=indices?indices[i+1]:i+1,c=indices?indices[i+2]:i+2;if(a>=p.count||b>=p.count||c>=p.count)invalid++;const ux=p.getX(b)-p.getX(a),uy=p.getY(b)-p.getY(a),uz=p.getZ(b)-p.getZ(a),vx=p.getX(c)-p.getX(a),vy=p.getY(c)-p.getY(a),vz=p.getZ(c)-p.getZ(a),fx=uy*vz-uz*vy,fy=uz*vx-ux*vz,fz=ux*vy-uy*vx;if(fx*fx+fy*fy+fz*fz<1e-24)zeroArea++;if(n&&fx*(n.getX(a)+n.getX(b)+n.getX(c))+fy*(n.getY(a)+n.getY(b)+n.getY(c))+fz*(n.getZ(a)+n.getZ(b)+n.getZ(c))<-1e-12)reversed++;}}return {meshes,instances,triangles,geometries:geometry.size,invalid,badNormals,zeroArea,reversed,calls:v.renderer.info.render.calls};});
      check(id+' finite geometry and normals',metadata.invalid===0&&metadata.badNormals===0&&metadata.zeroArea===0&&metadata.reversed===0);
      await page.locator('.engineering-stage').screenshot({path:captureRoot+'/internal-assembled-'+id+'.png'});
      await page.getByRole('button',{name:'Разобрать узел',exact:true}).click();await page.waitForTimeout(60);
      check(id+' reversible opening state',await page.getByRole('button',{name:'Собрать узел',exact:true}).getAttribute('aria-pressed')==='true');
      const sections=page.locator('.detail-tree>div>button'),count=await sections.count();
      for(let i=0;i<count;i++) {
        await sections.nth(i).click();check(id+' section '+i+' selection',await sections.nth(i).getAttribute('aria-pressed')==='true');
        const leaves=page.locator('.detail-leaves button');check(id+' section '+i+' not empty',await leaves.count()>0);
        await leaves.last().click();await page.getByRole('button',{name:'Только выбранное',exact:true}).click();await page.waitForTimeout(30);
        check(id+' visible isolated leaf '+i,await page.evaluate(()=>{const v=window.__detailViews.findLast(v=>v.renderer.domElement.closest('.engineering-stage'));let n=0;v.scene.traverseVisible(o=>{if(o.isMesh)n++;});return n>0;}));
        await page.getByRole('button',{name:'Приблизить деталь',exact:true}).click();await page.waitForTimeout(60);await page.getByRole('button',{name:'Показать весь узел',exact:true}).click();
      }
      await page.getByRole('button',{name:'Общий вид узла',exact:true}).click();await page.waitForTimeout(60);
      await page.locator('.engineering-stage').screenshot({path:captureRoot+'/internal-'+id+'.png'});
      if(id==='motors') {
        const restored=await page.evaluate(async()=>{const v=window.__detailViews.findLast(v=>v.renderer.domElement.closest('.engineering-stage')),gl=v.renderer.getContext(),ext=gl.getExtension('WEBGL_lose_context');if(!ext)return false;ext.loseContext();await new Promise(r=>setTimeout(r,80));ext.restoreContext();return true;});check('Detail WebGL loss supported',restored);await page.waitForTimeout(600);check('Detail WebGL restored',await page.locator('.detail-error').count()===0);
      }
      for(let n=0;n<8;n++){await page.getByRole('button',{name:n%2?'Разобрать узел':'Собрать узел',exact:true}).click();}
      await page.locator('.study-toggle').click();check(id+' exterior restored',await page.locator('.part-preview canvas').count()===1&&await page.locator('.engineering-stage').count()===0);rows.push({id,sections:count,...metadata});
    }
    await page.getByRole('button',{name:'Закрыть характеристики',exact:true}).click();
    for(const [width,height]of [[320,568],[375,667],[390,844],[430,932],[768,1024],[844,390]]) {
      await page.setViewportSize({width,height});await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.modal-navigation select').selectOption('motors');await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();await page.getByRole('button',{name:'Разобрать узел',exact:true}).click();
      const box=await page.locator('.engineering-stage').boundingBox();check('Internal mobile bounds '+width,box.width>80&&box.x>=0&&box.x+box.width<=width+.1);check('No horizontal overflow '+width,await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth));
      await page.locator('.engineering-stage').scrollIntoViewIfNeeded();await page.screenshot({path:captureRoot+'/mobile-internal-'+width+'.png',fullPage:true});await page.getByRole('button',{name:'Закрыть характеристики',exact:true}).click();
    }
    check('No JS errors',errors.length===0);const runtimeAssets=await page.evaluate(()=>performance.getEntriesByType('resource').map(r=>r.name).filter(n=>/\.(js|css)(\?|$)/.test(n)));return {checks,rows,errors,runtimeAssets};
  }finally{await context.close();}
}
