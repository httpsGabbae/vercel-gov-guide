const fs=require('fs');const p='src/Pitch.tsx';let s=fs.readFileSync(p,'utf8');
s=s.replace('function Frame({',`function FloatingArtifact({label=""}:{label?:string}) {
 const f=useCurrentFrame(); const {fps}=useVideoConfig(); const t=f/fps;
 const Icon=/VOICE|ASK/.test(label)?Mic:/TRUST|ACCESS|PRIVACY|DECISION/.test(label)?ShieldCheck:/PLATFORM|SERVICES|AGENCY/.test(label)?Building2:/MARIA|FINISHING/.test(label)?GraduationCap:FileText;
 return <div aria-hidden style={{position:'absolute',right:40,top:760,width:116,height:150,perspective:700,pointerEvents:'none',opacity:0.72}}>
 <div style={{position:'absolute',left:4,top:172,width:108,height:16,borderRadius:'50%',background:'radial-gradient(ellipse,#2563eb24,transparent 70%)',scale:1+0.05*Math.sin(t*.7)}}/>
 <div style={{width:116,height:150,transformStyle:'preserve-3d',transform:'translateY('+(-10+9*Math.sin(t*.8))+'px) rotateX('+(8+4*Math.sin(t*.45))+'deg) rotateY('+(-20+10*Math.sin(t*.55))+'deg) rotateZ('+(-5+2*Math.sin(t*.6))+'deg)'}}>
 <div style={{position:'absolute',inset:0,transform:'translateZ(-14px)',background:'#dbeafe',border:'1px solid #b9cdef',borderRadius:14}}/>
 <div style={{position:'absolute',right:-7,top:5,width:14,height:140,transform:'rotateY(90deg)',background:'#bfd4f4'}}/>
 <div style={{position:'absolute',inset:0,background:'linear-gradient(145deg,#ffffffed,#e4edffcc)',border:'1px solid #ffffff',borderRadius:14,boxShadow:'0 16px 30px #6480ab18',display:'flex',alignItems:'center',justifyContent:'center',flexDirection:'column',gap:16}}>
 <Icon size={48} strokeWidth={1.3} color={C.blue}/><div style={{height:3,width:60,borderRadius:5,background:'#a5bde4'}}/><div style={{height:3,width:42,borderRadius:5,background:'#c5d4eb'}}/>
 </div></div></div>;
}
function Frame({`);
s=s.replace('background: dark ? C.navy : C.white,','background: dark ? "linear-gradient(135deg,#eef4ff 0%,#f5f1fc 100%)" : "linear-gradient(135deg,#fffdf7 0%,#f5f8fc 65%,#edf4ff 100%)",');s=s.replace('color: dark ? "white" : C.navy,','color: C.navy,').replace('color: dark ? "#93c5fd" : C.blue,','color: C.blue,').replace('color: dark ? "#cbd5e1" : C.muted,','color: C.muted,');
s=s.replace('      {children}\n      {source && (','      {children}\n      <FloatingArtifact label={label} />\n      {source && (');
s=s.replace('color: "#cbd5e1"','color: C.muted').replace('<Mic size={160} color="white"','<Mic size={160} color={C.blue}');
s=s.replace('<span style={{ color: C.gold }}>','<span style={{ color: "#94600c" }}>');
s=s.replace('          rotate: "-8deg",\n          scale: interpolate(f, [110, 132], [1.4, 1], ease),\n          opacity: interpolate(f, [108, 112], [0, 1], ease),',`          rotate: interpolate(f,[110,128,137,150],[-17,-7,-9,-8],ease)+"deg",
          scale: interpolate(f,[110,128,136,144,154],[1.85,0.94,1.055,0.985,1],ease),
          translate: "0 "+interpolate(f,[110,128,133,138,144],[-95,0,-7,3,0],ease)+"px",
          boxShadow: "0 "+interpolate(f,[110,128,146],[28,2,0],ease)+"px "+interpolate(f,[110,128,146],[45,4,0],ease)+"px #92400e25",
          opacity: interpolate(f,[110,114],[0,1],ease),`);
s=s.replace('          rotate: "-3deg",','          rotate: "-3deg",\n          translate: interpolate(f,[128,131,134,138,143],[0,-5,4,-2,0],ease)+"px 0",');
s=s.replace(/        <div style=\{\{ fontSize: 36, marginTop: 34, color: C.muted \}\}>\s*PSA \/ NBI \/ PhilHealth\s*<\/div>/,'');
let a=s.indexOf('function End() {'),b=s.indexOf('// A centered cover wipe',a);
s=s.slice(0,a)+`function End() {
 const f=useCurrentFrame();
 const dissolve=interpolate(f,[36,120],[1,0],ease);
 const fade=interpolate(f,[480,599],[1,0],{...ease,easing:Easing.inOut(Easing.cubic)});
 return <AbsoluteFill style={{...text,background:C.white}}>
 <AbsoluteFill style={{opacity:fade,background:'linear-gradient(135deg,#fffdf7,#eff5ff 65%,#f3effa)'}}>
 <div style={{opacity:dissolve}}>
 <div style={{position:'absolute',left:192,top:420,fontSize:72,fontWeight:800,lineHeight:1.4,letterSpacing:-2}}>One platform.<br/><span style={{color:C.blue}}>One conversation.</span><br/>One trip.</div>
 <div style={{position:'absolute',right:192,bottom:100,fontSize:36,color:C.muted}}>Thank you.</div>
 <FloatingArtifact label="PLATFORM"/>
 </div>
 <div style={{position:'absolute',left:interpolate(f,[120,240],[-30,360],{...ease,easing:Easing.inOut(Easing.cubic)}),top:interpolate(f,[120,240],[190,585],{...ease,easing:Easing.inOut(Easing.cubic)}),width:1200,textAlign:'center',fontSize:104,fontWeight:800,letterSpacing:-4,lineHeight:1.15}}>GovGuidePH</div>
 <Img src={staticFile('GovGuidePH_Logo.png')} style={{position:'absolute',left:840,top:interpolate(f,[240,330],[300,275],ease),width:240,height:240,objectFit:'contain',opacity:interpolate(f,[240,330],[0,1],ease)}}/>
 </AbsoluteFill></AbsoluteFill>;
}

`+s.slice(b);
s=s.replace('background: C.navy,','background: "linear-gradient(110deg,#e5efff,#f0eafd 60%,#fff9ec)",');
s=s.replace('        background: "#e2e8f0",','        background: "#e2e8f0",\n        opacity: interpolate(f,[17436,17520],[1,0],ease),');
s=s.replace('      <Audio src={staticFile("pitch/underscore.wav")} volume={0.65} />','      <Audio src={staticFile("pitch/underscore.wav")} volume={0.65} />\n      <Sequence name="Stamp impact cue" from={128} durationInFrames={30}><Audio src={staticFile("pitch/stamp-impact.wav")} volume={0.7}/></Sequence>');
fs.writeFileSync(p,s);
