async page=>{
await page.setViewportSize({width:1440,height:1000});await page.goto('http://127.0.0.1:5175');await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();const results=[];
for(const id of ['frame','motors','props','battery','camera']){
 await page.getByRole('combobox').selectOption(id);await page.waitForTimeout(200);const canvas=page.locator('.part-preview canvas'),r=await canvas.boundingBox();await page.mouse.move(r.x+r.width*.5,r.y+r.height*.5);await page.mouse.wheel(0,-6000);await page.waitForTimeout(650);await canvas.screenshot({path:'C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultra-final/maxzoom-'+id+'.png'});
 results.push(await page.evaluate(id=>{const v=window.__qaViews.findLast(v=>v.scene&&v.renderer.domElement.closest('.part-preview'));let bounds;v.scene.updateMatrixWorld(true);v.scene.traverse(o=>{if(!o.isMesh)return;if(o.isInstancedMesh)o.computeBoundingBox();else o.geometry.computeBoundingBox();const b=(o.isInstancedMesh?o.boundingBox:o.geometry.boundingBox).clone().applyMatrix4(o.matrixWorld);bounds?bounds.union(b):bounds=b;});const radius=bounds.getSize(v.camera.position.clone()).length()/2,distance=v.camera.position.length();if(['motors','battery','camera'].includes(id)&&distance<radius*1.04)throw Error('camera entered solid component '+id);return {id,camera:v.camera.position.toArray(),near:v.camera.near,radius,distance};},id));
}
await page.keyboard.press('Escape');return results;
}
