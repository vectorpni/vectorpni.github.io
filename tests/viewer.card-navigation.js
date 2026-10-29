async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:800}}),page=await context.newPage(),rows=[];
  try{
    for(const width of [1440,768,390,320]){
      await page.setViewportSize({width,height:800});await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('tab',{name:/Источники/}).click();
      await page.locator('.modal-body').evaluate(el=>el.scrollTop=el.scrollHeight);
      const scrolled=await page.locator('.modal-body').evaluate(el=>el.scrollTop);
      await page.getByRole('combobox').selectOption('power');
      await page.waitForFunction(()=>document.querySelector('.modal-body').scrollTop===0,{timeout:1500}).catch(()=>{});
      const row={width,scrolled,afterSwitch:await page.locator('.modal-body').evaluate(el=>el.scrollTop),selected:await page.getByRole('combobox').inputValue(),tab:await page.getByRole('tab',{name:'О детали',exact:true}).getAttribute('aria-selected')};
      await page.getByRole('combobox').focus();await page.keyboard.press('ArrowDown');
      row.keyboardSelectKeepsFocus=await page.getByRole('combobox').evaluate(el=>document.activeElement===el);
      await page.getByRole('button',{name:'Следующий компонент'}).focus();await page.keyboard.press('Space');
      row.nextKeepsFocus=await page.getByRole('button',{name:'Следующий компонент'}).evaluate(el=>document.activeElement===el);rows.push(row);
    }
    if(rows.some(r=>r.afterSwitch!==0||!r.keyboardSelectKeepsFocus||!r.nextKeepsFocus))throw Error(JSON.stringify(rows));return rows;
  }finally{await context.close();}
}
