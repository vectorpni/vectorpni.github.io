async page=>{
  const files=[];
  for(const [kind,count]of [['sections',9],['macros',6]])for(let i=0;i<count;i++){
    const name=kind+'-'+i;await page.setViewportSize({width:1280,height:500});await page.goto('file:///C:/Sites/MyWebsite/drone-lab/qa-artifacts/detail52/'+name+'.html');await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));await page.screenshot({path:'qa-artifacts/detail52/'+name+'.png',fullPage:true});files.push(name+'.png');
  }
  return {files};
}
