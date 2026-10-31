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
let diagnostics=[];
const newContext=browser.newContext.bind(browser);
browser.newContext=async options=>{const context=await newContext(options);context.on('page',page=>{
  page.on('pageerror',e=>diagnostics.push({kind:'pageerror',url:page.url(),message:e.message}));
  page.on('console',m=>{if(['error','warning'].includes(m.type()))diagnostics.push({kind:'console',level:m.type(),url:page.url(),message:m.text()});});
  page.on('requestfailed',r=>diagnostics.push({kind:'requestfailed',url:r.url(),message:r.failure()?.errorText}));
  page.on('response',r=>{if(r.status()>=400)diagnostics.push({kind:'http',url:r.url(),status:r.status()});});
});return context;};
try{
  for(const filename of filenames){
    diagnostics=[];
    const context=await browser.newContext({viewport:{width:1440,height:1000},hasTouch:true}),page=await context.newPage(),start=performance.now();page.setDefaultTimeout(15000);
    page.__qaProgress=progress=>console.log(JSON.stringify({test:filename,progress}));
    page.__qaSaveImage=async(filename,dataURL)=>{const target=path.resolve('qa-artifacts',filename),base=path.resolve('qa-artifacts')+path.sep;if(!target.startsWith(base))throw Error('Artifact path outside qa-artifacts');await fs.mkdir(path.dirname(target),{recursive:true});await fs.writeFile(target,Buffer.from(dataURL.split(',')[1],'base64'));};
    page.__qaFilter=process.argv.find(a=>a.startsWith('--filter-component='))?.slice(19);
    try{
      // The scripts either navigate this page themselves or create an isolated
      // context. Give them the origin without rendering an unused extra drone.
      await page.route(initialURL,route=>route.fulfill({status:200,contentType:'text/html',body:'<!doctype html><title>QA bootstrap</title>'}),{times:1});
      await page.goto(initialURL);
      const source=await fs.readFile(filename,'utf8'),run=vm.runInNewContext('('+source+')',{Buffer,URL,console,setTimeout,clearTimeout,TextEncoder,TextDecoder,fetch,crypto});
      const result=await run(page);results.push({filename,passed:true,durationMs:Math.round(performance.now()-start),diagnostics:[...diagnostics],result});
    }catch(e){results.push({filename,passed:false,durationMs:Math.round(performance.now()-start),diagnostics:[...diagnostics],error:e.stack});process.exitCode=1;}
    finally{await context.close();}
    await fs.mkdir(path.dirname(output),{recursive:true});await fs.writeFile(output,JSON.stringify({browser:browserName,browserVersion:browser.version(),finishedAt:new Date().toISOString(),results},null,2));console.log(JSON.stringify({filename:results.at(-1).filename,passed:results.at(-1).passed,durationMs:results.at(-1).durationMs,error:results.at(-1).error}));
  }
}finally{await browser.close();}
