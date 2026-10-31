async original=>{
  const rows=[];
  for(const [width,height]of [[320,568],[390,844],[1024,768],[1440,1000]]){
    const pair=[];
    for(const port of [5180,5175]){
      const context=await original.context().browser().newContext({viewport:{width,height},deviceScaleFactor:1,reducedMotion:'reduce'}),page=await context.newPage();
      try{
        await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();
        const result=await page.evaluate(async()=>{
          const weights=[400,500,600,700,800];for(const weight of weights)await document.fonts.load(weight+' 16px Manrope','AF-18 \u2014 \u0418\u0437\u0443\u0447\u0438\u0442\u0435 \u043a\u043e\u043d\u0441\u0442\u0440\u0443\u043a\u0446\u0438\u044e');await document.fonts.ready;
          const c=document.createElement('canvas').getContext('2d'),fonts=weights.map(weight=>{c.font=weight+' 16px Manrope';return {weight,width:c.measureText('AF-18 — Изучите конструкцию в деталях').width,available:document.fonts.check(weight+' 16px Manrope')};});
          const boxes=['header','.title','.model-stage','.controls','.instructions','footer'].map(selector=>{const e=document.querySelector(selector),r=e.getBoundingClientRect();return {selector,box:[r.x,r.y,r.width,r.height],font:getComputedStyle(e).fontFamily};});
          return {fonts,boxes,overflow:document.documentElement.scrollWidth>innerWidth,assets:performance.getEntriesByType('resource').filter(r=>r.name.includes('/assets/')).map(r=>({url:r.name,bytes:r.encodedBodySize}))};
        });
        const screenshot=await page.screenshot();await original.__qaSaveImage('detail52/ui/'+(port===5180?'before':'after')+'-'+width+'.png','data:image/png;base64,'+screenshot.toString('base64'));pair.push({port,...result});
      }finally{await context.close();}
    }
    if(JSON.stringify(pair[0].fonts)!==JSON.stringify(pair[1].fonts))throw Error('Typeface metrics changed '+JSON.stringify({width,pair:pair.map(r=>({port:r.port,fonts:r.fonts}))}));
    if(JSON.stringify(pair[0].boxes)!==JSON.stringify(pair[1].boxes))throw Error('Layout changed at '+width);
    if(pair.some(r=>r.overflow))throw Error('Horizontal overflow');rows.push({width,height,pair});
  }
  return {rows,note:'Same original Manrope files; all five weights measured after document.fonts.ready. Production pages, matching CSS box coordinates; no claim of physical-device testing.'};
}
