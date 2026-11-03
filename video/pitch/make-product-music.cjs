// Original, deterministic instrumental underscore. No third-party audio samples.
const fs = require('fs');
const rate=44100, seconds=300, n=rate*seconds;
const left=new Float32Array(n), right=new Float32Array(n);
const hz=m=>440*Math.pow(2,(m-69)/12);
function note(start,dur,midi,gain,pan=0,kind='bell'){
  const begin=Math.round(start*rate),len=Math.min(Math.round(dur*rate),n-begin),f=hz(midi);
  for(let i=0;i<len;i++){
    const t=i/rate,release=Math.min(1,(dur-t)/0.35);
    const env=kind==='pad'?Math.min(1,t/1.2)*release*Math.exp(-t/6):Math.min(1,t/0.014)*Math.exp(-t/1.1)*release;
    const v=(Math.sin(2*Math.PI*f*t)+0.24*Math.sin(2*Math.PI*f*2*t)+0.07*Math.sin(2*Math.PI*f*3*t))*env*gain;
    left[begin+i]+=v*(1-pan*0.4);right[begin+i]+=v*(1+pan*0.4);
  }
}
const beat=60/96,bar=beat*4, chords=[[50,57,62,65,69],[46,53,58,62,65],[53,60,65,69,72],[48,55,60,64,67]];
for(let b=0;b<120;b++){
  const start=b*bar, c=chords[Math.floor(b/2)%4];
  const energy=start<45?0.65:start<70?0.85:start<220?0.75:1;
  c.slice(0,4).forEach((m,k)=>note(start,bar+1,m,0.014*energy,(k-1.5)/2,'pad'));
  note(start,2,c[0]-12,0.025*energy,0,'bell');
  for(let j=0;j<8;j++) note(start+j*beat/2,1.7,c[[2,3,4,3,2,4,3,1][j]]+12,0.018*energy,(j%3-1)*0.6);
  if(start>=45) for(let j=0;j<4;j++){
    const at=Math.round((start+j*beat)*rate);
    for(let i=0;i<Math.round(rate*.12)&&at+i<n;i++){
      const t=i/rate,v=Math.sin(2*Math.PI*(70*t-120*t*t))*Math.exp(-t*40)*0.018;
      left[at+i]+=v;right[at+i]+=v;
    }
  }
}
const wav=Buffer.alloc(44+n*4);wav.write('RIFF');wav.writeUInt32LE(36+n*4,4);wav.write('WAVEfmt ',8);wav.writeUInt32LE(16,16);wav.writeUInt16LE(1,20);wav.writeUInt16LE(2,22);wav.writeUInt32LE(rate,24);wav.writeUInt32LE(rate*4,28);wav.writeUInt16LE(4,32);wav.writeUInt16LE(16,34);wav.write('data',36);wav.writeUInt32LE(n*4,40);
for(let i=0;i<n;i++){
 const t=i/rate,fade=Math.min(1,t/4,(seconds-t)/6);
 wav.writeInt16LE(Math.round(Math.tanh(left[i])*fade*32767),44+i*4);
 wav.writeInt16LE(Math.round(Math.tanh(right[i])*fade*32767),46+i*4);
}
fs.writeFileSync('public/pitch/underscore-product.wav',wav); console.log('Original 300-second stereo underscore written.');
