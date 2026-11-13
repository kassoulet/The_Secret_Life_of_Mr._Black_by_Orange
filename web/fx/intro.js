// Intro effect (orders 0-1), literal port of frame function 0x10275f of DEMO.EXE (see re/NOTES.md).
// ACCUMULATING state: noise LFSR (ebp), scroll offset, page flip -> the frame k depends on frames 0..k-1 and on the
// per-frame time words the original read (they come from the music timer: 65536 units/s, see NOTES).
export function init(assets){
  const t=assets.tab, st={src:assets.ani,base:assets.pal,fade:t.fade,interval:t.interval,wrap:t.wrap,
    last:0,off:0,ebp:t.seed>>>0,a2:0,a6:32000,
    noise:new Uint8Array(4000),buf:new Uint8Array(0x10000),pal:new Uint8Array(768),
    vram:[0,1,2,3].map(()=>new Uint8Array(65536))};
  for(const p of st.vram) p.fill(0xff,0,64000);   // 0x1026a9: rep stos 0xffffffff, mask 0xf
  return st;
}
function expand(st,plane,dst,esi,second){           // 0x1024fa (second=false) / 0x10258c (second=true)
  const b=st.buf,v=st.vram[plane];
  const px=(o,k)=>second?((b[o+k]+b[o+k+1])&255):b[o+k];
  const four=(e,n)=>{ // n bytes (4 or 2) taken at e, e+2, e+4, e+6
    const r=[];for(let i=0;i<n;i++){let x=px(e,2*i); if(second)x=(x>>1)&0x3f; r.push(x);}return r;};
  for(let row=0;row<98;row++){
    for(let c=0;c<20;c++){
      const n=c<19?4:2, a=four(esi,n);
      const q=a.map(x=>(x>>2)&0x3f), h=q.map(x=>(x>>1)&0x3f);
      for(let i=0;i<n;i++){
        v[dst+i]=a[i]; v[dst+0xa0+i]=a[i]-q[i]; v[dst+0x50+i]=v[dst+0xf0+i]=a[i]-q[i]+h[i];
      }
      if(c<19){dst+=4;esi+=8}else{dst+=2;esi+=8}
    }
    dst+=0xf2;
  }
}
export function step(st,time,row,order){
  const f=st.fade[order*64+row]; time>>>=0;
  if(((time-st.last)|0)>=st.interval){st.last=time;st.off+=4000;if(st.off===st.wrap)st.off=0;}
  let e=st.ebp>>>0;
  for(let i=0;i<4000;i++){
    st.noise[i]=((e&255)*f>>8)&255;
    e=(e+0x9d)>>>0; e=((e<<11)|(e>>>21))>>>0; e=(e^0x9d)>>>0;
  }
  st.ebp=e;
  let s=st.off,n=0,d=0;const S=st.src,N=st.noise,B=st.buf;
  const sat=(a,b)=>Math.min(255,a+b);
  for(let r=0;r<49;r++){
    for(let c=0;c<79;c++){
      const dl=sat(S[s],N[n])>>2,dh=sat(S[s+1],N[n+1])>>2,bl=sat(S[s+80],N[n+80])>>2,bh=sat(S[s+81],N[n+81])>>2;
      B[d]=dl;B[d+1]=(dh+dl)>>1;B[d+0xa0]=(bl+dl)>>1;B[d+0xa1]=(bh+bl+dl+dh)>>2;
      s++;n++;d+=2;
    }
    s++;d+=0xa2;
  }
  for(let i=0;i<768;i++)st.pal[i]=(st.base[i]*(256-f))>>8;
  const P=st.a2;
  expand(st,1,P+0x141,2,false); expand(st,3,P+0x140,1,false);
  expand(st,0,P+0x141,1,true);  expand(st,2,P+0x140,0,true);
  [st.a2,st.a6]=[st.a6,st.a2];
  st.shown=P;                                         // page just drawn (CRTC shows it from the next frame on)
}
export function pageIdx(st,start){                   // 320x400 indices as the CRT shows them from `start`
  const o=new Uint8Array(320*400);
  for(let y=0;y<400;y++)for(let x=0;x<320;x++)o[y*320+x]=st.vram[x&3][(start+y*80+(x>>2))&0xffff];
  return o;
}
