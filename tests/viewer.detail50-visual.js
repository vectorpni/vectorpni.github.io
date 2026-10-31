async original=>{
  const root='C:/Sites/MyWebsite/drone-lab/qa-artifacts/detail50',beforeOnly=new URL(original.url()).searchParams.get('capture')==='before';
  const context=await original.context().browser().newContext({viewport:{width:1200,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[],shots=[],captures=new Map();
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__qaViews=[];window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r};window.__qaViews.push(v);const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&s.children.some(o=>o.children.some(g=>g.userData.part))){v.scene=s;v.camera=c;}return render.call(this,s,c);};});});
  const configs=[
    {id:'overview',position:[4.8,5.5,9.5],target:[0,.15,0]},
    {id:'top',position:[.01,11,.01],target:[0,.15,0]},
    {id:'front',position:[0,2,11],target:[0,.15,0]},
    {id:'frame',part:'frame',position:[1.7,1.65,2],target:[.25,.54,.3]},
    {id:'motors',part:'motors',position:[2.8,1.13,2.9],target:[2.08,.6,2.08]},
    {id:'props',part:'props',position:[3.25,3.1,5.2],target:[2.08,.8,2.08]},
    {id:'battery',part:'battery',position:[1.7,1.9,2.3],target:[0,.95,-.12]},
    {id:'camera',part:'camera',position:[.85,-.7,1.45],target:[0,-1.25,.25]},
    {id:'electronics',part:'pi',position:[1.2,.9,1.3],target:[0,-.32,.05]},
    {id:'fasteners',part:'frame',position:[1.04,1.02,1.18],target:[.77,.61,.83]},
    {id:'landing',part:'frame',position:[2,-.4,2.9],target:[1.1,-1.1,.1]},
    {id:'exploded',exploded:true,position:[6,7,13],target:[0,.15,0]}
  ];
  try{
    for(const [version,port]of beforeOnly?[['before',5176]]:[['before',5176],['after',5175]]){
      await page.setViewportSize({width:1200,height:1000});await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.evaluate(()=>document.fonts.ready);
      for(const config of configs){
        if(config.exploded)await page.locator('.controls .tool').click();
        await page.waitForTimeout(100);
        const metadata=await page.evaluate(config=>{
          const v=window.__qaViews.find(v=>v.scene),{scene,camera,renderer}=v,drone=scene.children.find(o=>o.children.some(g=>g.userData.part));
          for(const group of drone.children)group.visible=!config.part||group.userData.part===config.part;
          camera.position.set(...config.position);camera.lookAt(...config.target);camera.updateMatrixWorld(true);renderer.render(scene,camera);
          return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};
        },config);
        const a=await page.locator('.model-stage canvas').screenshot({path:root+'/'+version+'/'+config.id+'.png'});
        await page.evaluate(()=>{const v=window.__qaViews.find(v=>v.scene);v.renderer.render(v.scene,v.camera);});
        const b=await page.locator('.model-stage canvas').screenshot();
        if(!a.equals(b))throw Error('Unstable static rendering '+version+'/'+config.id);
        captures.set(version+'/'+config.id,a);shots.push({version,id:config.id,...metadata});
      }
      await page.reload();await page.locator('.model-stage.ready').waitFor();await page.setViewportSize({width:390,height:844});await page.waitForTimeout(150);await page.evaluate(()=>document.fonts.ready);
      captures.set(version+'/mobile',await page.screenshot({path:root+'/'+version+'/mobile.png',fullPage:true}));
      await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption('pi');await page.waitForTimeout(150);
      captures.set(version+'/mobile-card',await page.screenshot({path:root+'/'+version+'/mobile-card.png',fullPage:true}));
    }
    const equality=[];
    if(!beforeOnly)for(const id of [...configs.map(c=>c.id),'mobile','mobile-card'])equality.push({id,byteIdentical:captures.get('before/'+id).equals(captures.get('after/'+id))});
    if(errors.length)throw Error(errors.join(';'));
    return {shots,equality,errors,output:root};
  }finally{await context.close();}
}
