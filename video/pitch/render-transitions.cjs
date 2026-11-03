const {bundle}=require('@remotion/bundler');
const {openBrowser,selectComposition,renderStill,renderMedia}=require('@remotion/renderer');
const path=require('path'),fs=require('fs');
(async()=>{
 const root=path.resolve(__dirname,'..');process.chdir(root);
 const serveUrl=await bundle({entryPoint:path.join(root,'src/index.ts'),outDir:path.join(root,'out/pitch-bundle'),rspack:true});
 const browser=await openBrowser('chrome');
 const composition=await selectComposition({serveUrl,id:'GovGuidePitch5Min',puppeteerInstance:browser});
 const dir=path.join(root,'out/transition-review');fs.mkdirSync(dir,{recursive:true});
 const seconds=[7.7,7.85,8,8.15,8.3,44.85,45,45.15,139.85,140,140.15,289.85,290,290.15];
 for(let i=0;i<seconds.length;i++) {await renderStill({serveUrl,composition,puppeteerInstance:browser,frame:Math.round(seconds[i]*60),output:path.join(dir,String(i).padStart(2,'0')+'.jpg'),imageFormat:'jpeg',scale:0.5});console.log('REVIEW '+i+' '+seconds[i]+'s');}
 if(process.argv.includes('--render')) {let last=-1;await renderMedia({serveUrl,composition,puppeteerInstance:browser,codec:'h264',outputLocation:path.join(root,'out/GovGuide-PH-5min-1080p60-transitions.mp4'),crf:19,concurrency:8,onProgress:({progress})=>{let pct=Math.floor(progress*100);if(pct>=last+5){console.log('RENDER '+pct+'%');last=pct;}}});}
 await browser.close({silent:true});console.log('DONE');
})().catch(e=>{console.error(e);process.exit(1)});



