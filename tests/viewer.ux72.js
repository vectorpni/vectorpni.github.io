// Checks the actual production shell before, during and without WebGL startup.
async original=>{
  const origin=new URL(original.url()).origin,browser=original.context().browser(),rows=[];
  const expected='Интерактивная реконструкция дрона AF-18 по референсу. Изучите назначение 16 компонентов и источники данных. Геометрия условная; неподтверждённые характеристики отмечены в карточках.';
  const check=(value,message)=>{if(!value)throw Error(message);};
  for(const width of [360,375,390,768,1440])for(const fallback of [false,true]){
    const context=await browser.newContext({viewport:{width,height:width<700?844:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
    page.on('pageerror',e=>errors.push(e.message));
    page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
    if(fallback)await page.addInitScript(()=>{const get=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(type,...args){return /webgl/i.test(type)?null:get.call(this,type,...args);};});
    try{
      await page.goto(origin);await page.locator(fallback?'.fallback-view':'.model-stage.ready').waitFor();await page.evaluate(()=>document.fonts.ready);
      const layout=await page.evaluate(()=>{
        const title=document.querySelector('.title h1'),text=document.querySelector('.reconstruction-summary'),stage=document.querySelector('.model-stage'),controls=document.querySelector('.controls')||document.querySelector('.fallback-actions');
        const box=e=>{const r=e.getBoundingClientRect();return {x:r.x,y:r.y,right:r.right,bottom:r.bottom,width:r.width,height:r.height};};
        const css=getComputedStyle(text);return {text:text.textContent,fontSize:parseFloat(css.fontSize),lineHeight:parseFloat(css.lineHeight),title:box(title),summary:box(text),stage:box(stage),controls:box(controls),overflow:document.documentElement.scrollWidth>innerWidth,ordered:!!(title.compareDocumentPosition(text)&Node.DOCUMENT_POSITION_FOLLOWING)&&!!(text.compareDocumentPosition(stage)&Node.DOCUMENT_POSITION_FOLLOWING)};
      });
      check(layout.text===expected,'Reconstruction wording changed');check(layout.fontSize>=16&&layout.fontSize<=18,'Unreadable summary size');check(layout.ordered,'Incorrect screen-reader order');check(layout.title.bottom<=layout.summary.y&&layout.summary.bottom<=layout.stage.y&&(fallback||layout.stage.bottom<=layout.controls.y+1),'Hero elements overlap '+JSON.stringify({width,fallback,layout}));check(layout.summary.x>=0&&layout.summary.right<=width&&!layout.overflow,'Horizontal overflow');
      check(await page.locator('.reconstruction-summary').isVisible(),'Summary hidden');
      if([390,1440].includes(width))await page.screenshot({path:`qa-artifacts/ux72/${browser.browserType().name()}-${fallback?'fallback':'3d'}-${width}.png`,fullPage:true});
      if(width===1440){
        await page.getByRole('button',{name:'Посмотреть компоненты',exact:true}).last().click();check(await page.locator('.component-list li').count()===16,'Component list lost entries');await page.locator('.component-list li').first().getByRole('button').click();
        const select=page.locator('.modal-navigation select'),ids=await select.locator('option').evaluateAll(options=>options.map(o=>o.value));check(ids.length===16,'Missing component cards');
        for(const id of ids){await select.selectOption(id);check(await page.locator('.modal-top h2').isVisible(),`Missing card ${id}`);}
        await page.keyboard.press('Escape');
        if(!fallback){await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.getByRole('button',{name:'Собрать',exact:true}).click();}
      }
      check(errors.length===0,'Browser errors: '+errors.join('; '));rows.push({width,fallback,layout,errors});
    }finally{await context.close();}
  }
  const context=await browser.newContext(),page=await context.newPage();let release;
  const gate=new Promise(resolve=>{release=resolve;});
  try{
    await page.route('**/assets/viewer-engine-*.js',async route=>{await gate;await route.continue();});
    await page.goto(origin,{waitUntil:'domcontentloaded'});await page.locator('.reconstruction-summary').waitFor();
    check(await page.locator('.reconstruction-summary').textContent()===expected,'Summary missing before 3D load');check(await page.locator('.model-stage.ready').count()===0,'3D was not held back');
    release();await page.locator('.model-stage.ready').waitFor();
  }finally{release();await context.close();}
  return {rows,before3DLoad:true,all16CardsInBothModes:true};
}
