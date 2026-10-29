async original=>{
  const all=[],errors=[];
  for(const mobile of original.__qaFilter?[true]:[false,true]){
    const context=await original.context().browser().newContext({viewport:mobile?{width:390,height:844}:{width:1440,height:1000},hasTouch:true,isMobile:mobile,deviceScaleFactor:mobile?2:1}),page=await context.newPage();
    const cdp=mobile?await context.newCDPSession(page):null;page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{
      window.__THREE_DEVTOOLS__=new EventTarget();window.__components={pending:new Set(),main:null,preview:null,Raycaster:null};const m=window.__components,raf=requestAnimationFrame,cancel=cancelAnimationFrame;
      window.requestAnimationFrame=fn=>{const id=raf(t=>{m.pending.delete(id);fn(t);});m.pending.add(id);return id;};window.cancelAnimationFrame=id=>{m.pending.delete(id);return cancel(id);};
      window.__THREE_DEVTOOLS__.addEventListener('observe',e=>{const r=e.detail;if(!r.isWebGLRenderer)return;const render=r.render;r.render=function(s,c){if(c.isPerspectiveCamera&&this.domElement.closest('.model-stage')&&s.children.some(o=>o.children.some(g=>g.userData.part))){m.main={renderer:r,scene:s,camera:c};if(!m.hooked){m.hooked=true;s.traverse(o=>{if(!o.isMesh||!o.userData.part)return;const raycast=o.raycast;o.raycast=function(ray,...args){m.Raycaster=ray.constructor;return raycast.call(this,ray,...args);};});}}else if(c.isPerspectiveCamera&&this.domElement.closest('.part-preview'))m.preview={renderer:r,scene:s,camera:c};return render.call(this,s,c);};});
    });
    try{
      await page.goto(new URL(original.url()).origin);await page.locator('.model-stage.ready').waitFor();await page.waitForFunction(()=>window.__components.pending.size===0);
      await page.locator('.model-stage canvas').dispatchEvent('pointermove',{pointerType:'mouse',pointerId:1,clientX:mobile?195:720,clientY:400});
      await page.getByRole('button',{name:'Исследовать компоненты'}).click();let ids=await page.getByRole('combobox').locator('option').evaluateAll(options=>options.map(o=>o.value));if(original.__qaFilter)ids=ids.filter(id=>id===original.__qaFilter);await page.keyboard.press('Escape');
      for(const exploded of [false,true]){
        await page.getByRole('button',{name:'Сбросить вид',exact:true}).click();if(exploded)await page.locator('.controls .tool').click();await page.waitForFunction(()=>window.__components.pending.size===0);
        for(const id of ids){
          const row={mobile,exploded,id,modelPick:false};
          await page.locator('.model-stage canvas').scrollIntoViewIfNeeded();
          if(id!=='charger'){
            const hit=await page.evaluate(id=>{
              const m=window.__components,v=m.main,{scene,camera,renderer}=v,root=scene.children.find(o=>o.children.some(g=>g.userData.part)),group=root.children.find(g=>g.userData.part===id),meshes=root.children.flatMap(g=>g.children),Vector=camera.position.constructor;
              if(!m.Raycaster){renderer.domElement.dispatchEvent(new PointerEvent('pointermove',{pointerType:'mouse',clientX:renderer.domElement.getBoundingClientRect().x+renderer.domElement.clientWidth/2,clientY:renderer.domElement.getBoundingClientRect().y+renderer.domElement.clientHeight/2}));}
              if(!m.Raycaster)throw Error('Unable to capture native raycaster');
              const ray=new m.Raycaster(),projected=new Vector(),instance=camera.matrix.clone(),world=camera.matrix.clone(),positions=[];
              for(const mesh of group.children){const g=mesh.geometry;if(!g)continue;g.computeBoundingBox();const b=g.boundingBox;
                for(let i=0;i<(mesh.isInstancedMesh?mesh.count:1);i++){
                  world.copy(mesh.matrixWorld);if(mesh.isInstancedMesh){mesh.getMatrixAt(i,instance);world.multiply(instance);}
                  positions.push(b.getCenter(new Vector()).applyMatrix4(world));
                  for(const axis of [0,1,2])for(const side of ['min','max']){const p=b.getCenter(new Vector());p.setComponent(axis,b[side].getComponent(axis));positions.push(p.applyMatrix4(world));}
                }
              }
              const views=[[4.8,5.5,9.5],[-4.8,5.5,9.5],[4.8,1,-9.5],[-4.8,-4,-9.5],[.01,11,.01],[0,-8,9],[11,.3,.01],[-11,.3,.01],[.01,.3,11],[.01,.3,-11]];
              for(const position of views){camera.position.set(...position);camera.lookAt(0,.15,0);camera.updateMatrixWorld(true);
                for(const point of positions){projected.copy(point).project(camera);if(Math.abs(projected.x)>.94||Math.abs(projected.y)>.94||Math.abs(projected.z)>1)continue;
                  const r=renderer.domElement.getBoundingClientRect(),x=Math.round(r.x+(projected.x+1)/2*r.width),y=Math.round(r.y+(1-projected.y)/2*r.height);
                  // Playwright/Chrome rounds touch coordinates. Pick a solid
                  // patch rather than a subpixel cable or a silhouette edge.
                  let solid=true;
                  for(const [dx,dy]of [[0,0],[-1,0],[1,0],[0,-1],[0,1]]){
                    projected.set((x+dx-r.x)/r.width*2-1,-(y+dy-r.y)/r.height*2+1,0);ray.setFromCamera(projected,camera);
                    if(ray.intersectObjects(meshes,false)[0]?.object.userData.part!==id){solid=false;break;}
                  }
                  if(!solid)continue;
                  renderer.render(scene,camera);return {x,y,position};
                }
              }return null;
            },id);
            if(hit){
              await page.evaluate(hit=>{
                const m=window.__components;m.tapEvents=[];m.expected=hit;
                if(!m.logged){m.logged=true;
                  document.addEventListener('click',e=>m.tapEvents.push({type:'click',target:e.target.closest('button')?.textContent||e.target.tagName,selected:document.querySelector('.modal-navigation select')?.value}),true);
                }
              },hit);
              if(mobile)await page.touchscreen.tap(hit.x,hit.y);else await page.mouse.click(hit.x,hit.y);await page.getByRole('dialog').waitFor();row.modelPick=true;row.camera=hit.position;
              const clicks=await page.evaluate(()=>window.__components.tapEvents);
              if(clicks.length!==1||clicks[0].target!=='CANVAS')throw Error('Touch/click reached a new card instead of the original canvas: '+JSON.stringify(clicks));
              row.completedClickOnCanvas=true;
            }
            else if(exploded)throw Error('No visible pick for exploded component '+id);
          }
          if(!row.modelPick){await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(id);row.selection=id==='charger'?'external equipment selector':'selector (occluded in assembly)';}
          if(await page.getByRole('combobox').inputValue()!==id)throw Error(JSON.stringify({failure:'Wrong selection',id,actual:await page.getByRole('combobox').inputValue(),row,diagnostic:await page.evaluate(()=>({expected:window.__components.expected,events:window.__components.tapEvents}))}));
          if((await page.locator('.component-summary').textContent()).length<60)throw Error('Empty information '+id);
          if(id!=='charger'){
            await page.waitForFunction(id=>{const v=window.__components.main,root=v.scene.children.find(o=>o.children.some(g=>g.userData.part)),group=root.children.find(g=>g.userData.part===id);return group.children.some(o=>o.material?.emissiveIntensity>.4);},id);
            const preview=page.locator('.part-preview canvas');await preview.scrollIntoViewIfNeeded();await page.waitForFunction(()=>window.__components.pending.size===0);const before=await preview.screenshot(),r=await preview.boundingBox();
            if(mobile){
              const point=(n,x,y)=>({id:n,x,y,radiusX:3,radiusY:3,force:1}),x=r.x+r.width/2,y=r.y+r.height*.4;
              await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(11,x-15,y),point(12,x+15,y)]});
              for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(11,x-15-i*3,y),point(12,x+15+i*3,y)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
              await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[point(13,x-15,y)]});for(let i=1;i<=4;i++)await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[point(13,x-15+i*8,y+i*3)]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
            }else{await page.mouse.move(r.x+r.width*.3,r.y+r.height*.4);await page.mouse.down();await page.mouse.move(r.x+r.width*.7,r.y+r.height*.6,{steps:6});await page.mouse.up();await page.mouse.wheel(0,-90);}
            await page.waitForFunction(()=>window.__components.pending.size===0);if(before.equals(await preview.screenshot()))throw Error('Preview gesture ineffective '+id);
            if(await page.getByRole('combobox').inputValue()!==id)throw Error('Gesture changed selection '+id);row.highlight=true;row.previewRotateZoom=true;
          }else if(await page.locator('.part-preview canvas').count())throw Error('External charger became drone geometry');
          await page.getByRole('tab',{name:'Параметры',exact:true}).click();if(await page.locator('.spec-section dl>div').count()<3)throw Error('Missing specifications '+id);
          await page.getByRole('tab',{name:/Источники/}).click();if(!await page.locator('.source-card').count())throw Error('Missing sources '+id);
          await page.getByRole('button',{name:'Следующий компонент'}).click();await page.getByRole('button',{name:'Предыдущий компонент'}).click();if(await page.getByRole('combobox').inputValue()!==id)throw Error('Navigation mismatch');
          if(mobile)await page.getByRole('button',{name:'Закрыть характеристики'}).tap();else await page.getByRole('button',{name:'Закрыть характеристики'}).click();
          await page.getByRole('button',{name:'Исследовать компоненты'}).click();await page.getByRole('combobox').selectOption(id);await page.keyboard.press('Escape');await page.waitForFunction(()=>window.__components.pending.size===0);row.reopened=true;
          all.push(row);original.__qaProgress?.({mobile,exploded,id,modelPick:row.modelPick});
        }
      }
    }finally{await context.close();}
  }
  if(errors.length)throw Error(errors.join(';'));return {scenarios:all.length,results:all,errors};
}
