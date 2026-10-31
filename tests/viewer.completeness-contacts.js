async page=>{
  const screenshots=[];for(let i=0;i<4;i++){await page.setViewportSize({width:1280,height:1360});await page.goto('file:///C:/Sites/MyWebsite/drone-lab/qa-artifacts/completeness/contact-'+i+'.html');await page.evaluate(()=>Promise.all([...document.images].map(im=>im.decode())));await page.screenshot({path:'qa-artifacts/completeness/contact-'+i+'.png',fullPage:true});screenshots.push('contact-'+i+'.png');}return {screenshots};
}
