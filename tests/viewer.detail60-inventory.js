async original=>{
  const versions=[];
  for(const port of [5180,5175]){
    const context=await original.context().browser().newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'}),page=await context.newPage();
    await page.addInitScript(()=>{window.__inventory={};window.__THREE_DEVTOOLS__=new EventTarget();window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage'))window.__inventory.main={scene:s};return render.call(this,s,c);};});});
    try{
      await page.goto('http://127.0.0.1:'+port);await page.locator('.model-stage.ready').waitFor();await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.locator('.study-toggle').click();await page.locator('.engineering-stage canvas').waitFor();
      const rows=await page.evaluate(async()=>{
        const module=await import(performance.getEntriesByType('resource').find(r=>r.name.includes('/engineering-inspector-')).name),root=window.__inventory.main.scene.children.find(o=>o.children.some(g=>g.userData.part)),result=[];
        for(const source of root.children.filter(g=>g.children.length)){
          const a=module.createEngineeringAssembly(source),sections=[];
          a.object.updateMatrixWorld(true);
          for(const row of a.catalog.sections){
            const section=a.object.children.find(o=>o.userData.section===row.id);let pieces=0,meshes=0,triangles=0,instances=0;const geometry=new Set();
            section.traverse(o=>{if(o.isGroup)pieces+=o.userData.modeledPieces||0;if(!o.isMesh)return;meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3*(o.isInstancedMesh?o.count:1);if(o.isInstancedMesh)instances++;geometry.add(o.geometry);});
            sections.push({...row,pieces,meshes,triangles,instances,geometries:geometry.size,leaves:a.nodes.filter(n=>n.section===row.id)});
          }
          result.push({id:source.userData.part,sections,refinement:a.detail60||null,replacements:a.detail51.replacements,compaction:a.detail52});a.dispose();
        }
        return result;
      });
      if(rows.length!==15||rows.reduce((n,r)=>n+r.sections.length,0)!==52)throw Error('Incomplete inventory');versions.push({port,rows});
    }finally{await context.close();}
  }
  return {versions,definition:'pieces = builder.add calls on owned groups, not manufactured BOM items; triangles include instances. Charger remains the 16th external information card without invented geometry.'};
}
