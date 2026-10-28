async original=>{
const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),rows=[],captures=new Map(),differences=[];
await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__pv=[];window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={r,cpu:[]};window.__pv.push(v);const render=r.render;r.render=function(s,c){const isPreview=this.domElement.closest('.part-preview')&&c.isPerspectiveCamera;const t=performance.now(),result=render.call(this,s,c);if(isPreview){v.scene=s;v.camera=c;v.cpu.push(performance.now()-t);v.calls=this.info.render.calls;v.triangles=this.info.render.triangles;}return result;};});});
try{
for(const [version,port]of [['4.1',5177],['4.2',5175]]){
 await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();
 for(const id of ['frame','motors','esc','props','fc','power','becpi','becfc','battery','pi','cooling','gps','radio','camera','charger','wiring']){
  await page.getByRole('combobox').selectOption(id);await page.waitForTimeout(220);if(id==='charger')continue;
  const canvas=page.locator('.part-preview canvas');const capture=(await canvas.screenshot()).toString('base64');captures.set(version+id,capture);
  const r=await canvas.boundingBox();await page.evaluate(()=>{window.__pv.at(-1).cpu=[];});await page.mouse.move(r.x+r.width*.35,r.y+r.height*.5);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.55,{steps:12});await page.mouse.up();await page.waitForTimeout(300);
  rows.push(await page.evaluate(({id,version})=>{const v=window.__pv.findLast(v=>v.scene),cpu=v.cpu.slice().sort((a,b)=>a-b),materials=new Set();v.scene.traverse(o=>{if(o.material)materials.add(o.material);});return {id,version,calls:v.calls,triangles:v.triangles,materials:materials.size,p95RenderMs:cpu[Math.floor(cpu.length*.95)]};},{id,version}));
 }
 await page.keyboard.press('Escape');
}
for(const id of ['frame','motors','esc','props','fc','power','becpi','becfc','battery','pi','cooling','gps','radio','camera','wiring']){
 differences.push(await page.evaluate(async({id,a,b})=>{const pixels=async data=>{const i=new Image();i.src='data:image/png;base64,'+data;await i.decode();const c=document.createElement('canvas');c.width=i.width;c.height=i.height;const x=c.getContext('2d');x.drawImage(i,0,0);return x.getImageData(0,0,c.width,c.height).data;};const x=await pixels(a),y=await pixels(b);if(x.length!==y.length)throw Error('preview size changed');let total=0,changed=0;for(let i=0;i<x.length;i+=4){let peak=0;for(let j=0;j<3;j++){const d=Math.abs(x[i+j]-y[i+j]);total+=d;peak=Math.max(peak,d);}if(peak>8)changed++;}return {id,meanRGB:total/(x.length/4*3),changedPct:changed/(x.length/4)*100};},{id,a:captures.get('4.1'+id),b:captures.get('4.2'+id)}));
}
if(differences.some(d=>d.meanRGB>.1||d.changedPct>.25))throw Error(JSON.stringify(differences));
return {rows,differences};
}finally{await context.close();}
}
