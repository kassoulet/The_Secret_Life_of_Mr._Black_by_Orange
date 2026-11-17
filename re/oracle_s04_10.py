#!/usr/bin/env python3
"""oracle_s04_10.py OUTDIR [TMAX]: ORACLE of scene 3 (green rings, frame 0x102ce6 .. ret 0x102ffb, orders 4-5) and scene 5 (spiral tiles + pi scroller, frame 0x10314d .. ret 0x1034a4, orders 10-11).
Per call t/row/order at entry, displayed frame + DAC at the ret -> OUTDIR/{a,b}_{meta.json,idx.bin,pal.bin}; static memory at the first call of each -> OUTDIR/mem_{a,b}.npz."""
import sys,os,struct,json,numpy as np
import harness as H,emucore as E,vga
from emucore import *
out=sys.argv[1]; tmax=float(sys.argv[2]) if len(sys.argv)>2 else 73; os.makedirs(out,exist_ok=True)
d4=lambda a:struct.unpack('<I',bytes(mu.mem_read(a,4)))[0]
rd=lambda a,n:bytes(mu.mem_read(a,n))
S={k:dict(fr=[],pend=[None],mem={}) for k in 'ab'}
def dump(k):
    m=dict(obj2=rd(0x200000,0x2c620),sine=rd(0x206b68,0x5008),state=rd(0x211cf0,0xa0),ptrs=np.array([d4(0x212375),d4(0x21237d),d4(0x211d64),d4(0x212379)]),spr=rd(d4(0x212375),0x2800+0x1400))
    if k=='a': m.update(fade=rd(0x211afc,0x400),pal=rd(0x211d75,768),kk=rd(d4(0x211af8),64000),name=rd(0x211aec,12))
    else: m.update(fade=rd(0x211bfc,0x400),pal=rd(0x212075,768),scr=rd(0x212680,0x800),pfile=rd(d4(0x2126d4),0xc800+0x400),name=rd(0x2129d8,12),pbuf=np.array([d4(0x2129e5)]))
    return m
def mk(k):
    s=S[k]
    def pre(uc,a,sz,_):
        if not s['mem']: s['mem'].update(dump(k))
        s['pend'][0]=dict(t=d4(0x200ab9),row=d4(0x200abd),order=d4(0x200ac1),irqs=H.irqs[0],clk=H.clock())
    def post(uc,a,sz,_):
        p=s['pend'][0]
        if p is None: return
        ix,pal=vga.frame_idx(); p['idx']=ix.copy(); p['pal']=np.frombuffer(pal,np.uint8).copy(); s['fr'].append(p); s['pend'][0]=None
    return pre,post
for k,(a,r) in dict(a=(0x102ce6,0x102ffb),b=(0x10314d,0x1034a4)).items():
    pre,post=mk(k); mu.hook_add(UC_HOOK_CODE,pre,begin=a,end=a); mu.hook_add(UC_HOOK_CODE,post,begin=r,end=r)
first=[]
def hk(uc,a,sz,_):
    if mu.reg_read(UC_X86_REG_ECX)==0x100: first.append((mu.reg_read(UC_X86_REG_ESI),mu.reg_read(UC_X86_REG_EBP)))
mu.hook_add(UC_HOOK_CODE,hk,begin=0x1031b4,end=0x1031b4)
mu.reg_write(UC_X86_REG_EIP,E.ENTRY)
H.run_until(tmax)
for k,s in S.items():
    np.savez_compressed(f'{out}/mem_{k}.npz',**{n:(np.frombuffer(v,np.uint8) if isinstance(v,bytes) else v) for n,v in s['mem'].items()})
    json.dump([dict(t=p['t'],row=p['row'],order=p['order'],irqs=p['irqs'],clk=p['clk']) for p in s['fr']],open(f'{out}/{k}_meta.json','w'))
    open(f'{out}/{k}_idx.bin','wb').write(b''.join(p['idx'].tobytes() for p in s['fr'])); open(f'{out}/{k}_pal.bin','wb').write(b''.join(p['pal'].tobytes() for p in s['fr']))
    print(k,len(s['fr']),'frames')
json.dump(first,open(out+'/b_first.json','w'))
print('clock',H.clock())
