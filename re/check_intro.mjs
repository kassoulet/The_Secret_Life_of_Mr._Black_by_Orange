// node check_intro.mjs ORACLE_DIR : replays web/fx/intro.js with the per-frame inputs (time,row,order) the original read, diffs displayed page + DAC
import fs from 'fs'; import {init,step,pageIdx} from '../web/fx/intro.js';
const d=process.argv[2], meta=JSON.parse(fs.readFileSync(d+'/meta.json')), idx=fs.readFileSync(d+'/idx.bin'), pal=fs.readFileSync(d+'/pal.bin');
const A='../web/assets/'; const st=init({ani:fs.readFileSync(A+'pallo64.ani'),pal:fs.readFileSync(A+'intro_pal.bin'),tab:JSON.parse(fs.readFileSync(A+'intro_tab.json'))});
let bad=0,badp=0,bads=0,first=-1; const F=320*400;
for(let k=0;k<meta.length;k++){
  const [t,r,o,last,off,ebp,a2,a6]=meta[k].pre;
  if(st.last!==last||st.off!==off||st.ebp!==ebp||st.a2!==a2||st.a6!==a6){bads++; if(first<0)first=k; console.log('state mismatch frame',k,{last,off,ebp,a2,a6},{l:st.last,o:st.off,e:st.ebp,a2:st.a2,a6:st.a6}); if(bads>3)break;}
  step(st,t,r,o);
  let dp=0;for(let i=0;i<768;i++)if(st.pal[i]!==pal[k*768+i])dp++; badp+=dp;
  // CRT of frame k shows the page start a6(pre), i.e. what frame k-1 drew: check it
  const shown=pageIdx(st,a6); let dd=0; for(let i=0;i<F;i++)if(shown[i]!==idx[k*F+i])dd++;
  bad+=dd; if((dd||dp)&&first<0){first=k;console.log('first diff frame',k,'pixels',dd,'pal bytes',dp);}
}
console.log('frames',meta.length,'state mismatches',bads,'pixel diffs',bad,'palette byte diffs',badp);
