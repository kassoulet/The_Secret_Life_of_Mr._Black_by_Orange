#!/usr/bin/env python3
"""oracle_gen.py OUTDIR TMAX NAME:ENTRY:RET [NAME:ENTRY:RET ...]  (hex addresses)
Generic oracle: per call of a frame function (entry..ret hooks): t/row/order at entry, displayed frame + DAC at the ret -> OUTDIR/NAME_{meta.json,idx.bin,pal.bin};
guest memory at the first call (data object 0x200000.., host heap, DPMI arena) -> OUTDIR/NAME_mem.npz; same at the last call -> NAME_mem_last.npz (to check what is static)."""
import sys,os,struct,json,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]); os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
def snap():
    return dict(obj2=np.frombuffer(rd(0x200000,0x2c620),np.uint8),heap=np.frombuffer(rd(E.HEAP0,E.hp[0]-E.HEAP0),np.uint8),arena=np.frombuffer(rd(E.ARENA,E.arena_ptr[0]-E.ARENA),np.uint8),
                heapbase=np.array([E.HEAP0]),arenabase=np.array([E.ARENA]))
S={}
def mk(k):
    s=S[k]=dict(fr=[],pend=[None],first=True)
    def pre(uc,a,sz,_):
        if s['first']:
            s['first']=False; np.savez_compressed(f'{out}/{k}_mem.npz',**snap())
        s['pend'][0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
    def post(uc,a,sz,_):
        p=s['pend'][0]
        if p is None: return
        ix,pal=vga.frame_idx(); p['shape']=list(ix.shape); p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); s['fr'].append(p); s['pend'][0]=None
    return pre,post
for arg in sys.argv[3:]:
    k,a,r=arg.split(':'); a=int(a,16); r=int(r,16); pre,post=mk(k); mu.hook_add(UC_HOOK_CODE,pre,begin=a,end=a); mu.hook_add(UC_HOOK_CODE,post,begin=r,end=r)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
np.savez_compressed(f'{out}/mem_end.npz',**snap())
for k,s in S.items():
    json.dump([dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk'],shape=p['shape']) for p in s['fr']],open(f'{out}/{k}_meta.json','w'))
    open(f'{out}/{k}_idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in s['fr'])); open(f'{out}/{k}_pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in s['fr']))
    print(k,len(s['fr']),'frames')
print('clock',H.clock())
