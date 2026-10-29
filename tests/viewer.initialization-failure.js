async original => {
  const results=[];
  for(const target of ['main','preview']){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(target=>{
      let renderers=0;
      window.__THREE_DEVTOOLS__=new EventTarget();
      window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{
        const renderer=e.detail;if(!renderer.isWebGLRenderer)return;
        renderers++;
        if(renderers!==(target==='main'?1:2))return;
        const set=renderer.setRenderTarget;
        let failed=false;
        renderer.setRenderTarget=function(...args){
          if(!failed){failed=true;throw Error('QA: environment allocation failed');}
          return set.apply(this,args);
        };
        window.__failedRenderer=renderer;
      });
    },target);
    try{
      await page.goto(original.url().startsWith('http')?new URL(original.url()).origin:'http://127.0.0.1:5175');
      if(target==='preview'){
        await page.locator('.model-stage.ready').waitFor();
        await page.getByRole('button',{name:'Исследовать компоненты'}).click();
        await page.getByText('3D-просмотр недоступен',{exact:true}).waitFor({timeout:4000});
      }else{
        await page.getByRole('alert').waitFor({timeout:4000});
        await page.getByRole('button',{name:'Исследовать компоненты'}).click();
      }
      const text=await page.locator('.component-summary').textContent();
      if(!text||text.length<60)throw Error('Component information lost');
      const released=await page.evaluate(()=>window.__failedRenderer.getContext().isContextLost());
      if(!released)throw Error('Partial renderer was not released');
      if(errors.length)throw Error(errors.join('; '));
      results.push({target,informationAvailable:true,failedContextReleased:released,errors});
    }catch(e){results.push({target,failure:e.message,errors,body:await page.locator('body').innerText(),failedContextReleased:await page.evaluate(()=>window.__failedRenderer?.getContext().isContextLost())});}
    finally{await context.close();}
  }
  if(results.some(r=>r.failure))throw Error(JSON.stringify(results));
  return results;
}
