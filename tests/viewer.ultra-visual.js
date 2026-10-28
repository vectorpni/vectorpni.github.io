async page=>{
const errors=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1440,height:1000});await page.emulateMedia({reducedMotion:'reduce'});const shots=[];
for(const [name,url] of [['before','http://127.0.0.1:5176'],['after','http://127.0.0.1:5175']]){
 await page.goto(url);await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(350);await page.screenshot({path:'C:/Sites/MyWebsite/drone-lab/ultra-'+name+'.png'});
 await page.getByRole('button',{name:'Исследовать компоненты'}).click();
 for(const id of ['frame','motors','props','battery','camera','fc']){await page.getByRole('combobox').selectOption(id);await page.waitForTimeout(150);await page.locator('.part-preview').screenshot({path:'C:/Sites/MyWebsite/drone-lab/ultra-'+name+'-'+id+'.png'});shots.push(name+' '+id);}
 await page.keyboard.press('Escape');await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.waitForTimeout(150);await page.screenshot({path:'C:/Sites/MyWebsite/drone-lab/ultra-'+name+'-exploded.png'});
}
await page.emulateMedia({reducedMotion:'no-preference'});if(errors.length)throw Error(errors.join(';'));return {shots,errors};
}
