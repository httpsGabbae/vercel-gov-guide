import fs from 'node:fs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const sharp=createRequire(require.resolve('next/package.json'))('sharp');
const svg='<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"><rect width="1200" height="900" fill="white"/><g font-family="Arial" font-size="45" fill="black"><text x="80" y="120">SYNTHETIC TEST DOCUMENT - NOT OFFICIAL</text><text x="80" y="240">Full name: Ana Reyes</text><text x="80" y="340">Date of birth: 2000-01-02</text></g></svg>';
const image=await sharp(Buffer.from(svg)).png().toBuffer();
const started=Date.now();
const r=await fetch('http://localhost:3001/api/inspect',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({text:'Inspect this synthetic test document for name discrepancies.',language:'English',serviceCode:'PSA_BIRTH_CERT',applicant:{id:'synthetic',role:'new_citizen',display_name:'Maria Santos',birth_date:'2000-01-01',title:'Citizen Account',initials:'MS',civil_status:'',barangay:'',city:''},attachments:[{name:'synthetic.png',type:'image/png',dataUrl:'data:image/png;base64,'+image.toString('base64')}]})});
const j=await r.json();console.log(JSON.stringify({status:r.status,elapsedMs:Date.now()-started,code:j.code,message:j.message,inspection:j.inspection?.overall_status,counts:j.inspection?.summary_counts}));
