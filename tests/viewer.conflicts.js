async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[],passed=[];
  const check=(condition,label)=>{if(!condition)throw Error(label);passed.push(label);};page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{
    const m={pending:new Set(),maxPending:0,frames:0,invalid:[],main:null};window.__conflicts=m;
    const raf=requestAnimationFrame,cancel=cancelAnimationFrame;
    window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);fn(t);});m.pending.add(id);m.maxPending=Math.max(m.maxPending,m.pending.size);return id;};window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
    window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage')&&s.children.some(o=>o.children.some(g=>g.userData.part))){m.main={renderer:r,scene:s,camera:c};m.frames++;if(![...c.position,...c.quaternion].every(Number.isFinite))m.invalid.push('camera');if(m.frames%10===0){const root=s.children.find(o=>o.children.some(g=>g.userData.part));for(const group of root.children)for(const child of group.children){if(!child.matrixWorld.elements.every(Number.isFinite))m.invalid.push(group.userData.part);for(let axis=0;axis<3;axis++)if(Math.abs(child.matrixWorld.elements[12+axis]-child.matrix.elements[12+axis]-group.position.getComponent(axis))>1e-5)m.invalid.push('detached '+group.userData.part);}}}return render.call(this,s,c);};});
  });
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.evaluate(()=>document.fonts.ready);await page.waitForFunction(()=>window.__conflicts.pending.size===0&&getComputedStyle(document.querySelector('.model-stage canvas')).opacity==='1');const initial=await page.locator('.model-stage canvas').screenshot({path:'C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultimate/conflicts-initial.png'});
    // Seeded interleaving, not random wall-clock-dependent actions.
    let seed=42042;const random=()=>{seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed;};
    for(let i=0;i<120;i++){
      if(await page.getByRole('dialog').count())await page.keyboard.press('Escape');
      const action=random()%8;
      if(action<3)await page.locator('.view-controls button').nth(action).click();
      else if(action===3){await page.locator('.controls .tool').click();await page.locator('.controls .tool').click();await page.locator('.controls .tool').click();}
      else if(action===4){await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(['motors','battery','pi','camera'][i%4]);}
      else if(action===5){const [width,height]=[[320,568],[390,844],[844,390],[1440,1000]][Math.floor(i/8)%4];await page.setViewportSize({width,height});}
      else if(action===6)await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();
      else{const canvas=page.locator('.model-stage canvas');await canvas.scrollIntoViewIfNeeded();const r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.4,r.y+r.height*.45);await page.mouse.down();await page.mouse.move(r.x+r.width*.55,r.y+r.height*.55,{steps:3});await page.mouse.up();await page.mouse.wheel(0,i%2?-70:70);}
    }
    await page.keyboard.press('Escape');await page.setViewportSize({width:1440,height:1000});await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await page.waitForFunction(()=>window.__conflicts.pending.size===0);
    check(initial.equals(await page.locator('.model-stage canvas').screenshot({path:'C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultimate/conflicts-reset.png'})),'reset image identical after 120 interleaved actions');
    for(let i=0;i<3;i++){
      await page.locator('.controls .tool').click();await page.getByRole('button',{name:'Сверху',exact:true}).click();
      await page.evaluate(()=>{window.__loss=document.querySelector('.model-stage canvas').getContext('webgl2').getExtension('WEBGL_lose_context');window.__loss.loseContext();});await page.getByRole('alert').waitFor();
      await page.setViewportSize({width:1280-i*50,height:900});await page.evaluate(()=>window.__loss.restoreContext());await page.getByRole('alert').waitFor({state:'hidden'});
      await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await page.waitForFunction(()=>window.__conflicts.pending.size===0);
      check(await page.evaluate(()=>window.__conflicts.main.scene.children.find(o=>o.children.some(g=>g.userData.part)).children.every(g=>g.position.length()<1e-6)),'restore during animation assembles '+i);
    }
    await page.emulateMedia({reducedMotion:'reduce'});await page.locator('.controls .tool').click();await page.getByRole('button',{name:'Спереди',exact:true}).click();await page.waitForFunction(()=>window.__conflicts.pending.size===0);
    check(await page.getByRole('button',{name:'Собрать',exact:true}).getAttribute('aria-pressed')==='true','reduced motion settles interleaved assembly/camera');
    const state=await page.evaluate(()=>({frames:window.__conflicts.frames,maxPending:window.__conflicts.maxPending,invalid:window.__conflicts.invalid,groups:window.__conflicts.main.scene.children.find(o=>o.children.some(g=>g.userData.part)).children.length}));
    check(state.groups===16,'all 16 groups retained');check(state.invalid.length===0,'all animated matrices finite and attached');check(state.maxPending<=2,'at most one RAF per main/preview');check(errors.length===0,'no conflicting-action runtime errors');
    return {checks:passed.length,passed,state,errors};
  }finally{await context.close();}
}
