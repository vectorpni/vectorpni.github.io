async original=>{
  const results=[];
  // A deliberately stalled external font stylesheet reproduces a load-event
  // navigation timeout deterministically. It cannot identify the cause of the
  // one historical, uninstrumented Firefox timeout.
  for(const port of [5180,5175]){
    const context=await original.context().browser().newContext(),page=await context.newPage(),held=[],pending=new Set(),failed=[];
    page.on('request',r=>pending.add(r.url()));page.on('requestfinished',r=>pending.delete(r.url()));page.on('requestfailed',r=>{pending.delete(r.url());failed.push({url:r.url(),reason:r.failure()?.errorText});});
    await page.route('https://fonts.googleapis.com/**',route=>{held.push(route);});
    const start=Date.now();let timeout=false,error;
    try{
      try{await page.goto('http://127.0.0.1:'+port,{waitUntil:'load',timeout:3500});}catch(e){timeout=e.name==='TimeoutError';error=e.message;if(!timeout)throw e;}
      if(!timeout)await page.locator('.model-stage.ready').waitFor({timeout:Math.max(1,3500-(Date.now()-start))});
      const atDeadline={timeout,elapsedMs:Date.now()-start,pending:[...pending],heldFonts:held.length,ready:await page.locator('.model-stage.ready').count(),state:await page.evaluate(()=>document.readyState)};
      for(const route of held)await route.abort();await page.locator('.model-stage.ready').waitFor({timeout:15000});
      results.push({port,...atDeadline,recovered:true,failed,error});
    }finally{await context.close();}
  }
  if(!results[0].timeout||!results[0].heldFonts)throw Error('Fault injection did not reproduce baseline timeout');
  // The current build must render without any third-party font dependency.
  if(results[1].timeout||results[1].heldFonts||!results[1].ready)throw Error('Current page still waits for an external font: '+JSON.stringify(results));
  return {results,note:'Network fault injection, not evidence of the historical failure cause.'};
}
