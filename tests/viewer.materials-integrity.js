async original=>{
const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage(),errors=[];
page.on('pageerror',e=>errors.push(e.message));await page.addInitScript(()=>{
 window.__THREE_DEVTOOLS__=new EventTarget();window.__materialViews=[];window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const v={renderer:r};window.__materialViews.push(v);const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&s.children.some(o=>o.children.some(p=>p.userData.part))){v.scene=s;v.camera=c;}return render.call(this,s,c);};});
});
try{
 const revisions=[];
 for(const url of ['http://127.0.0.1:5176','http://127.0.0.1:5175']){
  await page.goto(url);await page.locator('.model-stage.ready').waitFor();await page.waitForTimeout(500);
  revisions.push(await page.evaluate(url=>{
   const v=window.__materialViews.find(v=>v.scene&&v.renderer.domElement.closest('.model-stage')),root=v.scene.children.find(o=>o.children.some(p=>p.userData.part)),textures=new Map(),records=[];
   const hash=a=>{let h=2166136261;const bytes=new Uint8Array(a.buffer,a.byteOffset,a.byteLength);for(const x of bytes)h=Math.imul(h^x,16777619);return h>>>0;};
   root.updateMatrixWorld(true);
   for(const group of root.children)for(const o of group.children){if(!o.isMesh)continue;const g=o.geometry,signature=[hash(g.attributes.position.array),hash(g.attributes.normal.array),g.index?hash(g.index.array):null];
    for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const m=o.matrix.clone();if(o.isInstancedMesh)o.getMatrixAt(i,m);else m.identity();m.premultiply(o.matrixWorld);records.push(JSON.stringify([group.userData.part,signature,m.toArray().map(x=>Math.round(x*1e6))]));}
   }
   const add=t=>{if(!t?.isTexture||textures.has(t.uuid))return;const image=t.image;const width=image?.width||0,height=image?.height||0;const bytes=width*height*4*(t.type===1016?2:t.type===1015?4:1)*(t.generateMipmaps?4/3:1);textures.set(t.uuid,{width,height,type:t.type,colorSpace:t.colorSpace,estimatedBytes:Math.round(bytes),cpuTypedBytes:image?.data?.byteLength||0});};
   v.scene.traverse(o=>{if(o.material)for(const m of Array.isArray(o.material)?o.material:[o.material])Object.values(m).forEach(add);});add(v.scene.environment);
   return {url,geometry:records.sort(),calls:v.renderer.info.render.calls,triangles:v.renderer.info.render.triangles,rendererMemory:{...v.renderer.info.memory},textures:[...textures.values()],estimatedTextureBytes:[...textures.values()].reduce((n,t)=>n+t.estimatedBytes,0)};
  },url));
 }
 if(JSON.stringify(revisions[0].geometry)!==JSON.stringify(revisions[1].geometry))throw Error('Geometry, normals, topology or transforms changed');
 if(revisions[0].calls!==revisions[1].calls||revisions[0].triangles!==revisions[1].triangles)throw Error('Rendering budget changed');
 const before=await page.evaluate(()=>({...window.__materialViews.find(v=>v.scene&&v.renderer.domElement.closest('.model-stage')).renderer.info.memory}));
 await page.getByRole('button',{name:'Исследовать компоненты'}).click();for(const id of ['frame','motors','esc','props','fc','power','becpi','becfc','battery','pi','cooling','gps','radio','camera','charger','wiring']){await page.getByRole('combobox').selectOption(id);await page.waitForTimeout(100);}
 await page.keyboard.press('Escape');await page.waitForTimeout(300);
 const after=await page.evaluate(()=>({...window.__materialViews.find(v=>v.scene&&v.renderer.domElement.closest('.model-stage')).renderer.info.memory}));
 if(JSON.stringify(before)!==JSON.stringify(after))throw Error('Main WebGL allocation count grew');
 if(errors.length)throw Error(errors.join(';'));
 return {revisions:revisions.map(({geometry,...r})=>({...r,expandedMeshes:geometry.length})),geometryEqual:true,mainMemoryStable:{before,after},errors};
}finally{await context.close();}
}
