# Pobiera kafelki OpenHistoricalMap ohm_admin (CC0) dla okolic Polski: z9 dla rdzenia, z6 dla reszty Europy.
# Zapisuje tylko granice poziomów 2–4 od 1500 r. Użycie: python3 scripts/granice/pobierz_kafle.py <katalog>
import math, sys, os, gzip, pickle, urllib.request, mapbox_vector_tile, time
from concurrent.futures import ThreadPoolExecutor
UA={'User-Agent':'odniepamieci.pl (mapa granic historycznych)','Referer':'https://odniepamieci.pl/'}
POLA=('osm_id','name','name_en','name_pl','admin_level','start_decdate','end_decdate','type')
def xy(lat,lon,z):
    n=2**z; return int((lon+180)/360*n), int((1-math.asinh(math.tan(math.radians(lat)))/math.pi)/2*n)
def jeden(z,x,y):
    p=os.path.join(KAT,f'{z}-{x}-{y}.pkl')
    if os.path.exists(p): return 0
    for proba in range(4):
        try:
            d=urllib.request.urlopen(urllib.request.Request(f'https://vtiles.openhistoricalmap.org/maps/ohm_admin/{z}/{x}/{y}',headers=UA),timeout=90).read()
            break
        except Exception as e:
            time.sleep(3+proba*5)
    else:
        print('blad',z,x,y,flush=True); return 0
    if d[:2]==b'\x1f\x8b': d=gzip.decompress(d)
    t=mapbox_vector_tile.decode(d) if d else {}
    out=[]
    for f in t.get('boundaries',{}).get('features',[]):
        pr=f['properties']
        if pr.get('admin_level') not in (2,3,4): continue
        s=pr.get('start_decdate'); e=pr.get('end_decdate')
        if e is not None and e<1500: continue
        if s is not None and s>2030: continue
        out.append(({k:pr.get(k) for k in POLA}, f['geometry']))
    pickle.dump(out,open(p,'wb'))
    return len(d)
def zakres(z,w,s,e,n):
    x0,y0=xy(n,w,z); x1,y1=xy(s,e,z)
    return [(z,x,y) for x in range(x0,x1+1) for y in range(y0,y1+1)]
KAT=sys.argv[1]; os.makedirs(KAT,exist_ok=True)
zad=zakres(9,13,47,33,57.5)+zakres(6,0,40,45,62)
print('kafli',len(zad),flush=True)
with ThreadPoolExecutor(12) as ex:
    tot=0
    for i,b in enumerate(ex.map(lambda a: jeden(*a), zad)):
        tot+=b
        if i%50==0: print(i,round(tot/1e6,1),'MB',flush=True)
print('koniec',flush=True)
