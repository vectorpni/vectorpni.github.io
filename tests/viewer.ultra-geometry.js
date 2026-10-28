async page=>{
await page.setViewportSize({width:1200,height:1000});await page.goto('http://127.0.0.1:5175');await page.locator('.model-stage.ready').waitFor();
const geometry=await page.evaluate(()=>{
 const {scene,camera}=window.__qaViews.find(v=>v.scene),root=scene.children.find(o=>o.children.some(p=>p.userData.part)),seen=new Set(),stats={buffers:0,triangles:0,degenerate:0,reversed:0,duplicates:0,invalid:0},bounds={};
 scene.updateMatrixWorld(true);
 for(const group of root.children){let low=Infinity,high=-Infinity;
  for(const o of group.children){
   const g=o.geometry;if(!g)continue;g.computeBoundingBox();
   for(let i=0;i<(o.isInstancedMesh?o.count:1);i++){const matrix=o.matrix.clone();if(o.isInstancedMesh)o.getMatrixAt(i,matrix);else matrix.identity();
    for(const x of [g.boundingBox.min.x,g.boundingBox.max.x])for(const y of [g.boundingBox.min.y,g.boundingBox.max.y])for(const z of [g.boundingBox.min.z,g.boundingBox.max.z]){const p=camera.position.clone().set(x,y,z).applyMatrix4(matrix).applyMatrix4(o.matrixWorld);low=Math.min(low,p.y);high=Math.max(high,p.y);}
   }
   if(g.type!=='BufferGeometry'||seen.has(g.uuid))continue;seen.add(g.uuid);stats.buffers++;
   const p=g.attributes.position,n=g.attributes.normal,index=g.index?.array,faces=new Set();
   for(const value of [...p.array,...n.array])if(!Number.isFinite(value))stats.invalid++;
   for(let i=0;i<(index?.length||p.count);i+=3){const ids=[0,1,2].map(j=>index?index[i+j]:i+j),v=ids.map(k=>camera.position.clone().fromBufferAttribute(p,k)),face=v[1].clone().sub(v[0]).cross(v[2].clone().sub(v[0]));stats.triangles++;if(face.lengthSq()<1e-24)stats.degenerate++;
    const normal=camera.position.clone().set(0,0,0);for(const k of ids)normal.add(camera.position.clone().fromBufferAttribute(n,k));if(face.dot(normal)<-1e-12)stats.reversed++;
    const key=v.map(p=>p.toArray().map(x=>x.toFixed(7)).join(',')).sort().join(';');if(faces.has(key))stats.duplicates++;faces.add(key);
   }
  }bounds[group.userData.part]={minY:low,maxY:high};
 }
 if(stats.invalid||stats.degenerate||stats.reversed||stats.duplicates)throw Error(JSON.stringify(stats));
 if(bounds.props.minY<=bounds.frame.maxY)throw Error('prop/frame envelopes overlap');
 return {...stats,propFrameGap:bounds.props.minY-bounds.frame.maxY,bounds};
});
await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();await page.waitForTimeout(1800);const canvas=page.locator('.model-stage canvas'),r=await canvas.boundingBox();await page.mouse.move(r.x+r.width/2,r.y+r.height/2);await page.mouse.wheel(0,-6000);await page.waitForTimeout(600);await canvas.screenshot({path:'C:/Sites/MyWebsite/drone-lab/qa-artifacts/ultra-final/maxzoom-main.png'});
return geometry;
}
