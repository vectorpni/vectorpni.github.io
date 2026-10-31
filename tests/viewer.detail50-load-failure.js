async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  try {
    await page.route('**/engineering-inspector-*.js',route=>route.abort('failed'));
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();
    await page.getByRole('alert').filter({hasText:'Не удалось загрузить устройство узла'}).waitFor();await page.locator('.study-toggle').click();await page.locator('.part-preview canvas').waitFor();
    await page.getByRole('button',{name:'Закрыть характеристики',exact:true}).click();await page.getByRole('button',{name:'Разобрать',exact:true}).click();if(await page.getByRole('button',{name:'Собрать',exact:true}).count()!==1)throw Error('Main viewer lost after chunk failure');
    return {handledChunkFailure:true,exteriorAvailable:true,mainViewerAvailable:true};
  }finally{await context.close();}
}
