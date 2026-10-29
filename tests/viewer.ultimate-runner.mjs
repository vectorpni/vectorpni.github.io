// Optional batch runner for the existing CLI function-expression tests. Uses
// Playwright already installed in the workspace; adds no production dependency.
import {chromium,firefox,webkit} from 'playwright';
import fs from 'node:fs/promises';
import vm from 'node:vm';
import path from 'node:path';

const browserName=process.argv.find(a=>a.startsWith('--browser='))?.slice(10)||'chrome';
const initialURL=new URL(process.argv.find(a=>a.startsWith('--url='))?.slice(6)||'http://127.0.0.1:5175').href;
const filenames=process.argv.filter(a=>!a.startsWith('--')&&!a.endsWith('viewer.ultimate-runner.mjs')&&a.endsWith('.js'));
if(!filenames.length)throw Error('Provide tests/viewer.*.js paths');
const output=path.resolve(process.argv.find(a=>a.startsWith('--output='))?.slice(9)||`qa-artifacts/ultimate/${browserName}-batch.json`);
const engine={chrome:chromium,chromium,firefox,webkit}[browserName];if(!engine)throw Error('Unknown browser');
const browser=await engine.launch({headless:true,...(browserName==='chrome'?{channel:'chrome'}:{})}),results=[];
try{
  for(const filename of filenames){
    const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true}),page=await context.newPage(),start=performance.now();page.setDefaultTimeout(15000);
    page.__qaProgress=progress=>console.log(JSON.stringify({test:filename,progress}));
    page.__qaFilter=process.argv.find(a=>a.startsWith('--filter-component='))?.slice(19);
    try{
      // The scripts either navigate this page themselves or create an isolated
      // context. Give them the origin without rendering an unused extra drone.
      await page.route(initialURL,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>QA bootstrap</title>'}),{times:1});
      await page.goto(initialURL);
      const source=await fs.readFile(filename,'utf8'),run=vm.runInNewContext('('+source+')',{Buffer,URL,console,setTimeout,clearTimeout,TextEncoder,TextDecoder,fetch,crypto});
      const result=await run(page);results.push({filename,passed:true,durationMs:Math.round(performance.now()-start),result});
    }catch(e){results.push({filename,passed:false,durationMs:Math.round(performance.now()-start),error:e.stack});process.exitCode=1;}
    finally{await context.close();}
    await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({browser:browserName,browserVersion:browser.version(),finishedAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify({filename:results.at(-1).filename,passed:results.at(-1).passed,durationMs:results.at(-1).durationMs,error:results.at(-1).error}));
  }
}finally{await browser.close();}
