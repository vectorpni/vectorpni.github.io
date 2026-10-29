async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000}}),page=await context.newPage();
  await page.addInitScript(()=>{window.__THREE_DEVTOOLS__=new EventTarget();window.__geometryScene=null;window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&s.children.some(o=>o.children.some(g=>g.userData.part)))window.__geometryScene=s;return render.call(this,s,c);};});});
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();
    return await page.evaluate(()=>{
      const geometries=new Map(),errors=[],rows=[],root=window.__geometryScene.children.find(o=>o.children.some(g=>g.userData.part));window.__geometryScene.traverse(o=>{if(o.geometry)geometries.set(o.geometry.uuid,o.geometry);});
      const hierarchy={groups:root.children.length,children:0,instances:0};
      for(const group of root.children)for(const child of group.children){hierarchy.children++;if(child.isInstancedMesh)hierarchy.instances++;if(child.userData.part!==group.userData.part)throw Error('Incorrect part ownership '+group.userData.part);}
      if(hierarchy.groups!==16)throw Error('Component count changed');
      for(const g of geometries.values()){
        const p=g.attributes.position,n=g.attributes.normal,indices=g.index?.array,row={type:g.type,vertices:p.count,triangles:(indices?.length||p.count)/3,invalid:0,zeroArea:0,reversed:0,badNormals:0};
        for(const attribute of Object.values(g.attributes))for(const value of attribute.array)if(!Number.isFinite(value))row.invalid++;
        if(indices)for(const index of indices)if(index<0||index>=p.count)row.invalid++;
        if(n)for(let i=0;i<n.count;i++){const length=Math.hypot(n.getX(i),n.getY(i),n.getZ(i));if(Math.abs(length-1)>.002)row.badNormals++;}
        for(let i=0;i<(indices?.length||p.count);i+=3){
          const a=indices?indices[i]:i,b=indices?indices[i+1]:i+1,c=indices?indices[i+2]:i+2;
          const ux=p.getX(b)-p.getX(a),uy=p.getY(b)-p.getY(a),uz=p.getZ(b)-p.getZ(a),vx=p.getX(c)-p.getX(a),vy=p.getY(c)-p.getY(a),vz=p.getZ(c)-p.getZ(a),fx=uy*vz-uz*vy,fy=uz*vx-ux*vz,fz=ux*vy-uy*vx;
          if(fx*fx+fy*fy+fz*fz<1e-24)row.zeroArea++;
          if(n&&fx*(n.getX(a)+n.getX(b)+n.getX(c))+fy*(n.getY(a)+n.getY(b)+n.getY(c))+fz*(n.getZ(a)+n.getZ(b)+n.getZ(c))<-1e-12)row.reversed++;
        }
        if(row.invalid||row.badNormals||row.reversed)errors.push(row);rows.push(row);
      }
      const summary={hierarchy,geometries:rows.length,uniqueTriangles:rows.reduce((n,r)=>n+r.triangles,0),zeroArea:rows.reduce((n,r)=>n+r.zeroArea,0),errors,byType:Object.fromEntries([...new Set(rows.map(r=>r.type))].map(type=>[type,rows.filter(r=>r.type===type).length]))};
      if(errors.length)throw Error(JSON.stringify(summary));return summary;
    });
  }finally{await context.close();}
}
