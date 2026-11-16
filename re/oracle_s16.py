#!/usr/bin/env python3
"""oracle_s16.py OUTDIR [TMAX]: ORACLE of scene 16 (frame function 0x103807 .. ret 0x103b28, orders 16-17): per call t/row/order read at entry ([0x200ab9/abd/ac1]),
displayed frame + DAC at the ret; memory the frame depends on dumped at the first call (OUTDIR/mem.npz: photo, ghost, mask, tables, sine table, sprite struct)."""
import sys,os,struct,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 130; os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
fr=[]; pend=[None]; mem={}
def pre(uc,a,sz,_):
    if not mem:
        P=lambda n:d4(n)
        sp=d4(0x213898)
        mem.update(photo=rd(P(0x21394c),0x3e800),ghost=rd(P(0x213950),0x14000),mask=rd(P(0x213930),0x14000),t1=rd(P(0x213944),0x4000),t2=rd(P(0x213948),0x10000),
                   sine=rd(0x206b68,0x5008),sprite=rd(sp,64),spptr=np.array([sp,P(0x213898+0),P(0x2139c4)]),pal=rd(0x213a04,768),
                   ptrs=np.array([P(0x21394c),P(0x213950),P(0x213930),P(0x213944),P(0x213948),P(0x213934)]))
        mem['sprite2']=rd(struct.unpack('<I',mem['sprite'][:4])[0],64)
    pend[0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
def post(uc,a,sz,_):
    if pend[0] is None: return
    ix,pal=vga.frame_idx(); p=pend[0]; p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); fr.append(p); pend[0]=None
mu.hook_add(UC_HOOK_CODE,pre,begin=0x103807,end=0x103807)
mu.hook_add(UC_HOOK_CODE,post,begin=0x103b28,end=0x103b28)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.savez(out+'/mem.npz',**{k:(np.frombuffer(v,np.uint8) if isinstance(v,bytes) else v) for k,v in mem.items()})
meta=[dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk']) for p in fr]
import json; json.dump(meta,open(out+'/meta.json','w'))
open(out+'/idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in fr)); open(out+'/pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in fr))
print(len(fr),'frames; clock',H.clock())
