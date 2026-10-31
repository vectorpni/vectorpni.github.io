async original=>{
  const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage(),errors=[];
  page.on('pageerror',e=>errors.push(e.message));
  await page.addInitScript(()=>{window.__audit={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera){if(this.domElement.closest('.model-stage'))window.__audit.main={scene:s};if(this.domElement.closest('.engineering-stage'))window.__audit.inner={renderer:r,camera:c};}return render.call(this,s,c);};});});
  try{
    await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
    const rows=await page.evaluate(async()=>{
      const q=window.__audit,module=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name),root=q.main.scene.children.find(o=>o.children.some(g=>g.userData.part)),rows=[];
      for(const group of root.children.filter(g=>g.children.length)){
        const a=module.createEngineeringAssembly(group),baseline=new Map(),instanceMatrices=new Map();a.update(.01,false,true);a.object.updateMatrixWorld(true);a.object.traverse(o=>{baseline.set(o.id,o.matrixWorld.elements.slice());if(o.isInstancedMesh)instanceMatrices.set(o.id,{count:o.count,array:o.instanceMatrix.array.slice()});});
        let selectionChecks=0,rayChecks=0,finiteVertices=0;const camera=q.inner.camera.clone();camera.aspect=1;camera.updateProjectionMatrix();
        for(const opened of [false,true]){a.update(.01,opened,true);for(const entry of [...a.catalog.sections,...a.nodes]){
          a.select(entry.id,true);a.object.updateMatrixWorld(true);const bounds=a.selectionBounds();if(!bounds||!Number.isFinite(bounds.sphere.radius)||bounds.sphere.radius<=0)throw Error(group.userData.part+'/'+entry.id+' empty selection');
          let visible=0;a.object.traverseVisible(o=>{if(!o.isMesh)return;visible++;let owner=o,belongs=entry.id===o.userData.section;while(owner){if(owner.userData.leaf===entry.id||owner.userData.section===entry.id)belongs=true;owner=owner.parent;}if(!belongs)throw Error('Selection leaked '+JSON.stringify({part:group.userData.part,key:entry.id,hit:o.userData,parent:o.parent.userData,opened}));for(const n of o.matrixWorld.elements)if(!Number.isFinite(n))throw Error('Invalid world transform');finiteVertices+=o.geometry.attributes.position.count;});if(!visible)throw Error('Invisible selection');selectionChecks++;
          if(!entry.id.includes('/')){
            const s=bounds.sphere;camera.position.set(.8,.6,1).normalize().multiplyScalar(s.radius/Math.sin(camera.fov*Math.PI/360)*1.12).add(s.center);camera.lookAt(s.center);camera.updateMatrixWorld(true);let found=false;
            for(let y=-8;y<=8&&!found;y++)for(let x=-8;x<=8&&!found;x++){const hit=a.pick(x/9,y/9,camera);if(hit){if(!hit.startsWith(entry.id+'/'))throw Error('Ray selected hidden neighbour');found=true;}}
            if(!found)throw Error('No ray hit on section '+group.userData.part+'/'+entry.id);rayChecks++;
          }
        }}
        a.select(null,false);for(let i=0;i<120;i++){a.update(1/120,i%9<4);if(i%7===0)a.select(a.nodes[i%a.nodes.length].id,i%2===0);}a.select(null,false);a.update(.01,false,true);a.object.updateMatrixWorld(true);
        let maxTransformError=0;const restoredInstances=[];a.object.traverse(o=>{const before=baseline.get(o.id);if(before)for(let i=0;i<16;i++)maxTransformError=Math.max(maxTransformError,Math.abs(before[i]-o.matrixWorld.elements[i]));if(instanceMatrices.has(o.id)){const before=instanceMatrices.get(o.id);if(o.count!==before.count||o.instanceMatrix.array.some((n,i)=>n!==before.array[i]))throw Error('Instance state not restored');restoredInstances.push(o.count);}});if(maxTransformError>1e-8)throw Error('Animation did not restore initial pose');
        rows.push({part:group.userData.part,sections:a.catalog.sections.length,leaves:a.nodes.length,pieces:a.detail51.pieces,selectionChecks,rayChecks,finiteVertices,maxTransformError,restoredInstances,compaction:a.detail52});a.dispose();
      }
      return rows;
    });
    if(rows.length!==15||rows.reduce((n,r)=>n+r.sections,0)!==52||errors.length)throw Error('Incomplete coverage');return {rows,errors,note:'Actual production factories; both endpoints, all leaf selections, section ray grids, 120 conflicting updates per node, exact pose and instance restoration. Not a CAD interference proof.'};
  }finally{await context.close();}
}
