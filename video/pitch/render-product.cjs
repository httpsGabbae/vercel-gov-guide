const {bundle}=require('@remotion/bundler');
const {openBrowser,selectComposition,renderStill,renderMedia}=require('@remotion/renderer');
const path=require('path'),fs=require('fs');
(async()=>{
 const root=path.resolve(__dirname,'..');process.chdir(root);
 const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'out/pitch-bundle'),rspack:true});
 const browser=await openBrowser('chrome');
 const composition=await selectComposition({serveUrl,id:'GovGuidePitch5Min',puppeteerInstance:browser});
 const dir=path.join(root,'out/product-review');fs.mkdirSync(dir,{recursive:true});
 const seconds=[4,13,24,34,42,49,63,75,83,88,94,99,105,110,119,127,131,136,143,155,168,178,182,192,204,215,226,238,249,260,269,277,286,291,293,297,299.9];
 for(let i=0;i<seconds.length;i++) {await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:Math.round(seconds[i]*60),output:path.join(dir,String(i).padStart(2,'0')+'.jpg'),imageFormat:'jpeg',scale:0.5});console.log('REVIEW '+i+' '+seconds[i]+'s');}
 if(process.argv.includes('--render')) {let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(root,'out/GovGuide-PH-product-pitch-1080p60.mp4'),crf:19,concurrency:8,onProgress:({progress})=>{let pct=Math.floor(progress*100);if(pct>=last+5){console.log('RENDER '+pct+'%');last=pct;}}});}
 await browser.close({silent:true});console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});



