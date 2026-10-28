async page=>{
const dir='C:/Sites/MyWebsite/drone-lab/qa-artifacts/release42',captured=new Map();
const errors=[],results=[],shots=[];page.on('pageerror',e=>errors.push(e.message));await page.setViewportSize({width:1200,height:1000});await page.emulateMedia({reducedMotion:'reduce'});
await page.addInitScript(()=>{
 window.__THREE_DEVTOOLS__=new EventTarget();window.__qaViews=[];
 window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;const v={renderer:r};window.__qaViews.push(v);r.render=function(s,c){if(s.isScene&&s.children.some(o=>o.children.some(p=>p.userData.part))){v.scene=s;v.camera=c;}return render.call(this,s,c);};});
});
const configurations=[
 {id:'overview',label:'Общий вид',target:[0,.15,0],position:[4.8,5.5,9.5]},
 {id:'frame',label:'Карбоновая рама',part:'frame',target:[.25,.54,.3],position:[1.7,1.65,2]},
 {id:'motors',label:'Двигатель',part:'motors',target:[2.08,.6,2.08],position:[2.8,1.13,2.9]},
 {id:'props',label:'Пропеллер',part:'props',target:[2.08,.8,2.08],position:[3.25,3.1,5.2]},
 {id:'battery',label:'Аккумулятор и ремни',part:'battery',target:[0,.95,-.12],position:[1.7,1.9,2.3]},
 {id:'camera',label:'Камера и подвес',part:'camera',target:[0,-1.25,.25],position:[.85,-.7,1.45]},
 {id:'fasteners',label:'Крепёж рамы',part:'frame',target:[.77,.61,.83],position:[1.04,1.02,1.18]},
 {id:'motor-fasteners',label:'Крепёж двигателя',part:'motors',target:[2.08,.72,2.08],position:[2.52,1.12,2.52]}
];
for(const [version,url] of [['before','http://127.0.0.1:5176'],['materials','http://127.0.0.1:5177'],['after','http://127.0.0.1:5175']]){
 await page.goto(url);await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(300);
 for(const config of configurations){
  const metadata=await page.evaluate(config=>{const v=window.__qaViews.find(v=>v.scene),{scene,camera,renderer}=v;
   const root=scene.children.find(o=>o.children.some(p=>p.userData.part));for(const group of root.children)group.visible=!config.part||group.userData.part===config.part;
   // The original bands belonged to wiring. Include those existing bands in
   // the original battery shot, so regrouping is not mistaken for new geometry.
   if(config.part==='battery'&&false){
    const wiring=root.children.find(g=>g.userData.part==='wiring');wiring.visible=true;
    for(const o of wiring.children){o.geometry.computeBoundingBox();const size=o.geometry.boundingBox.getSize(camera.position.clone());o.visible=o.geometry.type==='ExtrudeGeometry'||(o.geometry.type==='TubeGeometry'&&o.geometry.parameters.radius===.0038)||(Math.abs(size.x-.028)<1e-5&&Math.abs(size.y-.17)<1e-5&&Math.abs(size.z-.195)<1e-5);}
   }
   camera.position.set(...config.position);camera.lookAt(...config.target);camera.updateMatrixWorld(true);renderer.render(scene,camera);
   return {position:camera.position.toArray(),quaternion:camera.quaternion.toArray(),fov:camera.fov,aspect:camera.aspect,exposure:renderer.toneMappingExposure,lights:scene.children.filter(o=>o.isLight).map(o=>({type:o.type,color:o.color.toArray(),ground:o.groundColor?.toArray(),intensity:o.intensity,position:o.position.toArray()})),calls:renderer.info.render.calls,triangles:renderer.info.render.triangles};},{...config,version});
  const canvas=page.locator('.model-stage canvas');captured.set(version+'-'+config.id,(await canvas.screenshot({path:dir+'/'+version+'-'+config.id+'.png'})).toString('base64'));
  const first=await canvas.screenshot();await page.evaluate(()=>{const v=window.__qaViews.find(v=>v.scene);v.renderer.render(v.scene,v.camera);});const second=await canvas.screenshot();
  if(!first.equals(second))throw Error('Unstable static rendering '+version+' '+config.id);
  shots.push({version,id:config.id,...metadata});
 }
 await page.reload();await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Разобрать',exact:true}).click();await page.getByRole('button',{name:'3D',exact:true}).click();await page.waitForTimeout(100);
 // Identical camera even when the two revisions have slightly different bounds.
 await page.evaluate(()=>{const v=window.__qaViews.find(v=>v.scene);v.camera.position.set(6,7,13);v.camera.lookAt(0,.15,0);v.camera.updateMatrixWorld(true);v.renderer.render(v.scene,v.camera);});
 captured.set(version+'-exploded',(await page.locator('.model-stage canvas').screenshot({path:dir+'/'+version+'-exploded.png'})).toString('base64'));
 if(version==='after'){
  const ownership=await page.evaluate(()=>{const v=window.__qaViews.find(v=>v.scene),root=v.scene.children.find(o=>o.children.some(p=>p.userData.part));return root.children.map(g=>({id:g.userData.part,offset:g.position.toArray(),children:g.children.map(o=>({id:o.userData.part,local:o.matrix.toArray(),world:o.matrixWorld.toArray()}))}));});
  await page.getByRole('button',{name:'Собрать',exact:true}).click();await page.waitForTimeout(100);
  const assembled=await page.evaluate(()=>{const v=window.__qaViews.find(v=>v.scene),root=v.scene.children.find(o=>o.children.some(p=>p.userData.part));return root.children.map(g=>({id:g.userData.part,offset:g.position.toArray(),children:g.children.map(o=>({id:o.userData.part,local:o.matrix.toArray(),world:o.matrixWorld.toArray()}))}));});
  for(let i=0;i<ownership.length;i++){const g=ownership[i],a=assembled[i];if(a.offset.some(x=>Math.abs(x)>1e-6))throw Error('assembly not settled');if(g.children.length!==a.children.length)throw Error('lost detail '+g.id);for(let j=0;j<g.children.length;j++){const o=g.children[j],b=a.children[j];if(o.id!==g.id||JSON.stringify(o.local)!==JSON.stringify(b.local))throw Error('detached child '+g.id);for(let k=0;k<3;k++)if(Math.abs(o.world[12+k]-b.world[12+k]-(g.offset[k]-a.offset[k]))>1e-5)throw Error('incorrect displacement '+g.id);}}
  results.push({test:'ownership and reversibility',groups:ownership.length,renderedChildren:ownership.reduce((n,g)=>n+g.children.length,0)});
 }
}
for(const config of configurations){const a=shots.find(s=>s.version==='before'&&s.id===config.id),b=shots.find(s=>s.version==='after'&&s.id===config.id);for(const key of ['position','quaternion','fov','aspect'])if(JSON.stringify(a[key])!==JSON.stringify(b[key]))throw Error('camera mismatch '+config.id);}
// This is a technical contact sheet, with untouched browser captures.

const rows=[];for(const config of [...configurations,{id:'exploded',label:'Разобранная модель'}]){const images=[];for(const version of ['before','materials','after'])images.push('data:image/png;base64,'+captured.get(version+'-'+config.id));rows.push({config,images});}
const context=await page.context().browser().newContext({viewport:{width:1800,height:1200}}),gallery=await context.newPage();
const html='<!doctype html><html lang="ru"><meta charset="utf-8"><title>AF-18 4.1 materials + studio — сравнение</title><style>body{margin:24px;background:#edf0f1;color:#20392c;font:18px Arial}h1{font-size:26px}article{padding:16px;margin:20px 0;background:white;border-radius:12px}h2{font-size:21px}.pair{display:flex;gap:12px}.pair div{width:33.333%}img{display:block;width:100%;background:#eef1f2}b{display:block;padding:10px}</style><h1>AF-18: исходная версия / 4.1 materials + studio</h1><p>Одинаковые позиции камеры, ориентация, FOV и размер viewport. В крупных планах остальные группы скрыты только для диагностики.</p>'+rows.map(({config,images})=>'<article id="'+config.id+'"><h2>'+config.label+'</h2><section class="pair">'+images.map((src,i)=>'<div><b>'+(['Ultra 4.0','4.1','4.2'][i]||'До детализации')+'</b><img src="'+src+'"></div>').join('')+'</section></article>').join('')+'</html>';
await gallery.setContent(html);await gallery.locator('img').evaluateAll(imgs=>Promise.all(imgs.map(i=>i.decode())));
for(const {config}of rows)await gallery.locator('article#'+config.id).screenshot({path:dir+'/compare-'+config.id+'.png'});await context.close();await page.emulateMedia({reducedMotion:'no-preference'});if(errors.length)throw Error(errors.join(';'));
return {shots,results,errors,output:dir};
}
