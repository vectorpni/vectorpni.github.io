async original=>{
  const context=await original.context().browser().newContext({viewport:{width:844,height:390},hasTouch:true,isMobile:true,deviceScaleFactor:2,reducedMotion:'reduce'}),page=await context.newPage(),cdp=await context.newCDPSession(page),rows=[];
  const folder='C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultimate';
  try{
    for(const [version,port]of [['before',5176],['after',5175]]){
      await page.setViewportSize({width:844,height:390});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:21,left:47,right:47}});
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.evaluate(()=>document.fonts.ready);await page.getByRole('button',{name:'Исследовать компоненты'}).tap();await page.getByRole('combobox').selectOption('camera');await page.waitForTimeout(100);
      const bounds=await page.getByRole('dialog').boundingBox();await page.screenshot({path:folder+'/'+version+'/landscape-safe-area.png'});rows.push({version,view:'landscape-safe-area',bounds});
      await page.setViewportSize({width:1440,height:800});await cdp.send('Emulation.setSafeAreaInsetsOverride',{insets:{top:0,bottom:0,left:0,right:0}});await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.evaluate(()=>document.fonts.ready);
      await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('tab',{name:/Источники/}).click();await page.locator('.modal-body').evaluate(el=>el.scrollTop=el.scrollHeight);await page.getByRole('combobox').focus();await page.getByRole('combobox').selectOption('power');await page.waitForTimeout(100);
      await page.screenshot({path:folder+'/'+version+'/card-navigation.png'});rows.push({version,view:'card-navigation',scrollTop:await page.locator('.modal-body').evaluate(el=>el.scrollTop),comboFocused:await page.getByRole('combobox').evaluate(el=>el===document.activeElement)});
    }
    return {rows,output:folder};
  }finally{await context.close();}
}
