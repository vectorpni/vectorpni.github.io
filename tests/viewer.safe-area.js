async original=>{
  const context=await original.context().browser().newContext({viewport:{width:390,height:844},hasTouch:true,isMobile:true,deviceScaleFactor:2}),page=await context.newPage(),cdp=await context.newCDPSession(page),rows=[];
  try{
    for(const [width,height,insets]of [[390,844,{top:47,bottom:34,left:0,right:0}],[844,390,{top:0,bottom:21,left:47,right:47}],[320,568,{top:20,bottom:0,left:0,right:0}],[430,932,{top:59,bottom:34,left:0,right:0}],[768,1024,{top:24,bottom:20,left:0,right:0}],[390,664,{top:47,bottom:34,left:0,right:0}]]){
      await page.setViewportSize({width,height});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets});await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();
      const initial=await page.evaluate(()=>({overflow:document.documentElement.scrollWidth>innerWidth,padding:getComputedStyle(document.querySelector('.drone-page')).padding}));
      await page.getByRole('button',{name:'Исследовать компоненты'}).tap();await page.getByRole('combobox').selectOption('camera');await page.waitForTimeout(100);
      const rect=await page.getByRole('dialog').boundingBox();rows.push({width,height,insets,rect,initial});
    }
    const failures=rows.filter(r=>r.initial.overflow||r.rect.x<r.insets.left-1||r.rect.x+r.rect.width>r.width-r.insets.right+1||r.rect.y<r.insets.top-1||r.rect.y+r.rect.height>r.height-r.insets.bottom+1);
    if(failures.length)throw Error(JSON.stringify({failures,rows}));return {emulation:'Chromium env(safe-area-inset-*) override, not physical iOS',rows};
  }finally{await context.close();}
}
