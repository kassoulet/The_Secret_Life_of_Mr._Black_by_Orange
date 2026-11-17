#!/usr/bin/env python3
"""oracle_s20.py OUTDIR [TMAX]: ORACLE of scene 10 (eye zoom, frame function 0x105960 .. 0x105f50, orders 20-21): per call t/row/order read at entry, displayed frame + DAC at the ret; static memory dumped at the first call (OUTDIR/mem.npz: texture, DAC, sine table, init words)."""
import sys,os,struct,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 159; os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
fr=[]; pend=[None]; mem={}
def pre(uc,a,sz,_):
    if not mem:
        P=d4(0x215cf0)
        mem.update(tex=rd(P,65536),pal=rd(0x215d18,768),sine=rd(0x206b68,0x5008),init=np.array([d4(0x216348),d4(0x216338),d4(0x21634c),d4(0x21589c),P]))
    pend[0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
def post(uc,a,sz,_):
    if pend[0] is None: return
    ix,pal=vga.frame_idx(); p=pend[0]; p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); fr.append(p); pend[0]=None
mu.hook_add(UC_HOOK_CODE,pre,begin=0x105960,end=0x105960)
mu.hook_add(UC_HOOK_CODE,post,begin=0x105f50,end=0x105f50)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.savez(out+'/mem.npz',**{k:(np.frombuffer(v,np.uint8) if isinstance(v,bytes) else v) for k,v in mem.items()})
meta=[dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk']) for p in fr]
import json; json.dump(meta,open(out+'/meta.json','w'))
open(out+'/idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in fr)); open(out+'/pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in fr))
print(len(fr),'frames; clock',H.clock())
