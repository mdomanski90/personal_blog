#!/usr/bin/env python3
"""
Spójne granice dla okresów mapy historycznej → public/granice/okresy/<okres>.json (TopoJSON)

Dlaczego: kafelki OpenHistoricalMap upraszczają każdą granicę osobno (przy oddaleniu sąsiedzi się rozjeżdżają),
a Korona XVI w. pochodzi z innego źródła (Atlas historyczny Polski) – na styku obu zostawały szczeliny.
Tu dla każdego okresu powstaje jeden podział na obszary:
  1. obszary w kolejności dokładności: ziemie i województwa z Atlasu (1520, 1600), uzupełnienia 1600,
     województwa / gubernie OHM, części państw OHM (poziom 3), państwa OHM (poziom 2) – każdy kolejny dostaje tylko
     to, czego nie zajęły wcześniejsze (nakładki znikają);
  2. szczeliny między obszarami (tylko na lądzie) dzielone między sąsiadów po linii środkowej; gdy z jednej
     strony leży granica z Atlasu, szczelina należy do drugiej strony (linia z Atlasu jest dokładniejsza);
  3. wąskie skrawki (resztki niedopasowanych granic) dołączane do sąsiada o najdłuższej wspólnej granicy;
  4. uproszczenie wspólnych odcinków granic raz dla obu stron, linie granic z tych odcinków (każdy raz).

Źródła: OpenHistoricalMap, kafelki ohm_admin (CC0) · Atlas historyczny Polski. Mapy szczegółowe XVI wieku,
IH PAN (CC BY 4.0) – public/granice/korona-xvi.geojson i ziemie-podlaskie-xvi.geojson · uzupełnienia 1600
(wyliczone z OHM) · maska lądu Natural Earth 10m (domena publiczna; nie trafia na mapę – chroni morze
przed zamalowaniem przy łataniu szczelin).

Użycie:
  python3 scripts/granice/pobierz_kafle.py <katalog>      # raz, ok. 15 min
  python3 scripts/granice/okresy.py <katalog kafli> <ne_10m_land.geojson> [okres ...]
"""
import sys, os, re, json, glob, pickle, math
import numpy as np
import shapely
from shapely.geometry import shape, mapping, box, Point, LineString, Polygon, MultiPolygon, MultiPoint
from shapely.ops import unary_union, linemerge, polygonize
from shapely.strtree import STRtree
from pyproj import Transformer

REPO = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
EXTENT = 2048  # rozmiar siatki kafelka OHM (pole „extent” warstwy boundaries)
DO_M = Transformer.from_crs(4326, 3035, always_xy=True)
DO_ST = Transformer.from_crs(3035, 4326, always_xy=True)


def do_m(g):
    return shapely.transform(g, lambda c: np.column_stack(DO_M.transform(c[:, 0], c[:, 1])))


def do_st(g):
    return shapely.transform(g, lambda c: np.column_stack(DO_ST.transform(c[:, 0], c[:, 1])))


def wielokaty(g):
    """Tylko części powierzchniowe (po make_valid / difference zdarzają się linie i punkty)."""
    if g is None or g.is_empty:
        return Polygon()
    czesci = [p for p in shapely.get_parts(g) if p.geom_type in ('Polygon', 'MultiPolygon')]
    return unary_union(czesci) if czesci else Polygon()


def ramka_st(w, s, e, n, krok=0.05):
    """Prostokąt w stopniach, zagęszczony (w 3035 brzegi są krzywe)."""
    return do_m(box(w, s, e, n).segmentize(krok))


# ---------------------------------------------------------------- okresy z lib/granice.ts (jedno źródło prawdy)
def okresy():
    ts = open(os.path.join(REPO, 'lib', 'granice.ts'), encoding='utf8').read()
    return [(m.group(1), float(m.group(2))) for m in re.finditer(r"etykieta: '([^']+)', rok: ([\d.]+)", ts)]


# ---------------------------------------------------------------- kafelki OHM
def wczytaj_kafle(kat):
    """osm_id → (właściwości, geometria w EPSG:3035). Rdzeń z kafli z9, reszta z z6."""
    meta, z9, z6 = {}, {}, {}
    xs, ys = [], []
    for p in glob.glob(os.path.join(kat, '*.pkl')):
        z, x, y = map(int, os.path.basename(p)[:-4].split('-'))
        n = 2 ** z
        if z == 9:
            xs.append(x); ys.append(y)

        def f(c, x=x, y=y, n=n):
            lon = (x + c[:, 0] / EXTENT) / n * 360 - 180
            lat = np.degrees(np.arctan(np.sinh(np.pi * (1 - 2 * (y + 1 - c[:, 1] / EXTENT) / n))))
            return np.column_stack(DO_M.transform(lon, lat))

        for pr, g in pickle.load(open(p, 'rb')):
            if pr.get('type') != 'administrative' or g['type'] not in ('Polygon', 'MultiPolygon'):
                continue
            try:
                geom = wielokaty(shapely.make_valid(shape(g)))
            except Exception:
                continue
            if geom.is_empty:
                continue
            geom = shapely.transform(geom, f)
            k = pr['osm_id']
            meta.setdefault(k, pr)
            (z9 if z == 9 else z6).setdefault(k, []).append(geom)
    n = 2 ** 9
    lon = lambda x: x / n * 360 - 180
    lat = lambda y: math.degrees(math.atan(math.sinh(math.pi * (1 - 2 * y / n))))
    rdzen = ramka_st(lon(min(xs)), lat(max(ys) + 1), lon(max(xs) + 1), lat(min(ys)))
    return meta, z9, z6, rdzen


class Kafle:
    def __init__(self, kat):
        self.meta, self.z9, self.z6, self.rdzen = wczytaj_kafle(kat)
        self.cache = {}

    def geom(self, k):
        if k not in self.cache:
            a = unary_union(self.z9.get(k, [])).intersection(self.rdzen) if k in self.z9 else Polygon()
            b = unary_union(self.z6.get(k, [])).difference(self.rdzen) if k in self.z6 else Polygon()
            g = wielokaty(unary_union([a, b]))
            # szwy kafli: domknięcie o 30 m
            self.cache[k] = wielokaty(g.buffer(30, join_style='mitre').buffer(-30, join_style='mitre')) if not g.is_empty else g
        return self.cache[k]

    def w_roku(self, rok, poziomy):
        wyn = []
        for k, p in self.meta.items():
            s = p.get('start_decdate'); e = p.get('end_decdate')
            s = -9999 if s is None else s
            e = 9999 if e is None else e
            if s <= rok < e and p.get('admin_level') in poziomy:
                wyn.append(k)
        return wyn


# ---------------------------------------------------------------- państwa, kolory, podpisy (jak dotąd w lib/granice.ts)
PANSTWA = {
    'korona': ('Korona Królestwa Polskiego', '#c0392b'),
    'litwa': ('Wielkie Księstwo Litewskie', '#2e7d4f'),
    'rosja': ('Imperium Rosyjskie', '#b7791f'),
    'niemcy': ('Prusy', '#2f6aa3'),
    'austria': ('Austria', '#7b4fa0'),
}
PALETA_INNYCH = ['#6b8e23', '#a0522d', '#4682b4', '#8b6914', '#8a5a83', '#5f8a6f']
RZECZPOSPOLITA = ['obojga', 'poland-lithuania', 'polish-lithuanian']
KLUCZE_PANSTW = [
    (['lithuan', 'litew', 'lietuv'], 'litwa'),
    (['polsk', 'poland', 'polish', 'polon', 'korona', 'crown of the kingdom', 'warsaw', 'warszaw', 'rzeczpospolita', 'polen', 'royal prussia', 'prusy król'], 'korona'),
    (['prus', 'preu', 'german', 'niemc', 'niemie', 'deutsch', 'teuton', 'krzyżac', 'generalgouv', 'gubernatorstwo', 'bezirk', 'ober ost'], 'niemcy'),
    (['russia', 'rosyj', 'rossi', 'moscow', 'moskiew', 'moskov', 'росс', 'русск', 'soviet', 'radzieck', 'ссср', 'ssr', 'socjalistyczna'], 'rosja'),
    (['austri', 'habsburg', 'galic', 'österr', 'oesterr', 'lodomer', 'royal hungary', 'królewskie węgry'], 'austria'),
]
PRZED_UNIA = (-9999, 1569.5)
PO_I_ROZBIORZE = (1773.71, 1795.82)
WOJ_ZMIANA = ['kijow', 'kijów', 'kyiv', 'kiev', 'wołyń', 'wolyn', 'volhyn', 'bracław', 'braclaw', 'bratslav']
WOJ_KORONY = ['podlas', 'lubelsk', 'lublin', 'krakow', 'krakó', 'cracow', 'sandomier', 'ruskie', 'ruthen', 'bełsk', 'belz', 'podolsk', 'podolia', 'kalisk', 'kalisz', 'poznań', 'poznan', 'sieradz', 'łęczyc', 'leczyc', 'rawsk', 'rawa', 'płock', 'plock', 'mazow', 'masov', 'mazov', 'inowrocław', 'inowroclaw', 'chełmiń', 'chelmin', 'chełmno', 'chelmno', 'malbor', 'pomorsk', 'prusy król', 'royal prussia', 'gnieźn', 'gniezn', 'czernihow', 'chernihiv', 'dobrzy', 'chełmsk', 'chelm']
WOJ_LITWY = ['brzeskie lit', 'brześć lit', 'brest lit', 'brzesko-lit', 'wileń', 'wilen', 'vilni', 'vilnius', 'trock', 'trakai', 'trakų', 'nowogródz', 'nowogrodz', 'navahrud', 'naugard', 'połock', 'polock', 'polotsk', 'witebsk', 'vitebsk', 'mścisław', 'mscislaw', 'mstsislaw', 'mińsk', 'minsk', 'smoleń', 'smolensk', 'żmud', 'zmud', 'samogit', 'žemait']
WOJ_KORONY_WSCHOD = ['ruskie', 'ruthen', 'bełsk', 'belz', 'podolsk', 'podolia', 'czernihow', 'chernihiv', 'chełmsk']
ZASTEPCZE = [
    (WOJ_KORONY_WSCHOD, (-9999, 1795.82), 'korona', None),
    (['brzesko-kuj', 'brześć kuj', 'brest kuj'], PO_I_ROZBIORZE, 'korona', None),
    (WOJ_ZMIANA, PRZED_UNIA, 'litwa', None),
    (WOJ_ZMIANA, (1569.5, 1795.82), 'korona', None),
    (WOJ_LITWY, PO_I_ROZBIORZE, 'litwa', None),
    (WOJ_KORONY, PO_I_ROZBIORZE, 'korona', None),
    (['gubern', 'губерн', 'governorate'], (1867, 1915.6), 'rosja', 'Imperium Rosyjskie'),
    (['wojew', 'voivod'], (1918.86, 1922.47), 'korona', 'Rzeczpospolita Polska'),
    # Królestwo Polskie 1815–1837 (do zamiany województw na gubernie): OHM ma tylko województwa, bez państwa
    (['wojew', 'voivod'], (1815.4, 1837.2), 'korona', 'Królestwo Polskie'),
]
HABSBURSKIE = ['galic', 'lodomer', 'królewskie węgry', 'royal hungary', 'koruny české', 'bohemian crown', 'österreichischer reichskreis', 'austrian circle']


def tekst(p):
    return f"{p.get('name_en') or ''} {p.get('name') or ''} {p.get('name_pl') or ''}".lower()


def nazwa(p):
    n = str(p.get('name') or '')
    return (n if re.match(r'^województwo ', n, re.I) else (p.get('name_pl') or n)).strip()


def klucz_panstwa(p):
    t = tekst(p)
    if any(k in t for k in RZECZPOSPOLITA):
        return 'ron'
    for klucze, kl in KLUCZE_PANSTW:
        if any(k in t for k in klucze):
            return kl
    return None


def kolor_panstwa(p):
    kl = klucz_panstwa(p)
    if kl == 'ron':
        return None
    if kl:
        return PANSTWA[kl][1]
    return PALETA_INNYCH[int(abs(p.get('osm_id') or 0)) % len(PALETA_INNYCH)]


def regula(p, rok):
    t = tekst(p)
    for klucze, (a, b), kl, nz in ZASTEPCZE:
        if a <= rok < b and any(k in t for k in klucze):
            return kl, nz
    return None


def habsburg(p, rok):
    t = tekst(p)
    if 1526 <= rok < 1918.9 and any(k in t for k in HABSBURSKIE):
        return 'Monarchia Habsburgów' if rok < 1804.6 else 'Cesarstwo Austriackie' if rok < 1867.4 else 'Austro-Węgry'
    return None


# ---------------------------------------------------------------- budowa okresu
RON = 'Rzeczpospolita Obojga Narodów'
KORONA, WKL = PANSTWA['korona'][0], PANSTWA['litwa'][0]


def wczytaj_geojson(plik):
    return json.load(open(os.path.join(REPO, 'public', 'granice', plik), encoding='utf8'))['features']


def jednostki(kafle, rok):
    """Lista obszarów w kolejności pierwszeństwa. Każdy: geom, dokladny (Atlas), atrybuty albo ohm (właściwości)."""
    J = []
    ron = 1569.5 <= rok < 1795.82
    if rok < 1772.6:
        pod = {}
        for f in wczytaj_geojson('korona-xvi.geojson'):
            if f['geometry']['type'] not in ('Polygon', 'MultiPolygon'):
                continue
            p = f['properties']
            litewskie = rok < 1569.5 and p.get('przed1569')
            n2, n3 = (WKL if litewskie else KORONA, None) if not ron else (RON, KORONA)
            a = {'n2': n2, 'n3': n3, 'n4': p['name'], 'kolor': PANSTWA['litwa' if litewskie else 'korona'][1],
                 'jasnosc': 0.45 if (rok < 1526 and p['name'] == 'województwo mazowieckie') else 1}
            g = wielokaty(shapely.make_valid(do_m(shape(f['geometry']))))
            if p.get('przed1569'):
                pod = a
            # województwo podlaskie dzieli się na ziemie – resztki poza ziemiami mogą być wchłonięte
            J.append({'geom': g, 'dokladny': not p.get('przed1569'), 'a': a, 'id': p['name']})
        if pod and rok >= 1500:
            ziemie = []
            for f in wczytaj_geojson('ziemie-podlaskie-xvi.geojson'):
                if f['geometry']['type'] in ('Polygon', 'MultiPolygon'):
                    g = wielokaty(shapely.make_valid(do_m(shape(f['geometry']))))
                    ziemie.append({'geom': g, 'dokladny': True, 'a': {**pod, 'n5': f['properties']['name']}, 'id': f['properties']['name']})
            J = ziemie + J
    if 1569.5 <= rok < 1618.9:
        for f in wczytaj_geojson('rzeczpospolita-1600-uzupelnienia.geojson'):
            p = f['properties']
            r = p.get('rodzaj')
            a = {'n2': RON if r == 'korona' else None, 'n3': KORONA if r == 'korona' else None, 'n4': p['name'],
                 'kolor': '#77603d' if r == 'kondominium' else PANSTWA['korona'][1],
                 'jasnosc': 0.45 if r == 'lenno' else 0.9 if r == 'kondominium' else 1, 'bp': bool(p.get('bezPodpisu'))}
            J.append({'geom': wielokaty(shapely.make_valid(do_m(shape(f['geometry'])))), 'dokladny': True, 'a': a, 'id': p['name']})
    l4 = kafle.w_roku(rok, (4,))
    l3 = kafle.w_roku(rok, (3,))
    l2 = kafle.w_roku(rok, (2,))
    if rok < 1569.5:
        # OHM nie ma tu Wielkiego Księstwa jako całości – jego obszar z lat 1569–1773 (bez ziem przeniesionych do Korony)
        l3 += [k for k in kafle.w_roku(1569.6, (3,)) if 'grand duchy of lithuania' in tekst(kafle.meta[k]) and k not in l3]
    if rok < 1569.5:
        # ziemie przeniesione w 1569 z Litwy do Korony (Wołyń, Kijowszczyzna, Bracławszczyzna) – OHM ma je dopiero
        # z czasów Rzeczypospolitej; obszar z 1600 r., bez nazw województw (powstały później)
        litwa = {'n2': WKL, 'n3': None, 'n4': None, 'kolor': PANSTWA['litwa'][1], 'jasnosc': 1}
        for k in kafle.w_roku(1600, (4,)):
            if any(x in tekst(kafle.meta[k]) for x in WOJ_ZMIANA) and k not in l4:
                J.append({'geom': kafle.geom(k), 'dokladny': False, 'a': dict(litwa), 'id': k})
        for f in wczytaj_geojson('rzeczpospolita-1600-uzupelnienia.geojson'):
            if 'kijow' in f['properties']['name']:
                J.append({'geom': wielokaty(shapely.make_valid(do_m(shape(f['geometry'])))), 'dokladny': False, 'a': dict(litwa), 'id': 'kijow'})
    # Litwa przed innymi częściami (obszar Korony w OHM bywa za duży)
    l3.sort(key=lambda k: 0 if 'lithuan' in tekst(kafle.meta[k]) else 1)
    if rok < 1772.6:
        # województwa Korony są z Atlasu – te same z OHM pominięte (inaczej ich niedokładne brzegi wystają poza Atlas)
        l4 = [k for k in l4 if not (any(x in tekst(kafle.meta[k]) for x in WOJ_KORONY) and not any(x in tekst(kafle.meta[k]) for x in WOJ_KORONY_WSCHOD))]
    for poz, lista in ((4, l4), (3, l3), (2, l2)):
        for k in lista:
            g = kafle.geom(k)
            # daleko od Polski bez podziału na województwa / kraje Rzeszy (setki drobnych obszarów)
            if poz == 4 and not g.is_empty and not kafle.rdzen.contains(g.centroid):
                continue
            if not g.is_empty:
                J.append({'geom': g, 'dokladny': False, 'ohm': kafle.meta[k], 'poziom': poz, 'id': k})
    return J


def podziel(J):
    """Każdy obszar dostaje tylko to, czego nie zajęły wcześniejsze."""
    komorki, drzewo_g = [], []
    for j in J:
        g = j['geom']
        if drzewo_g:
            t = STRtree(drzewo_g)
            kolizje = [drzewo_g[i] for i in t.query(g, predicate='intersects')]
            if kolizje:
                g = wielokaty(g.difference(unary_union(kolizje)))
        g = wielokaty(shapely.set_precision(g, 1.0))
        if g.is_empty or g.area < 1e5:
            continue
        komorki.append({**j, 'geom': g})
        drzewo_g.append(g)
    return komorki


def atrybuty(komorki, J, rok):
    """Państwo / część / województwo dla obszarów z OHM – z tego, w którym leżą (największa część pola)."""
    l2 = [j for j in J if j.get('poziom') == 2]
    l3 = [j for j in J if j.get('poziom') == 3]
    t2 = STRtree([j['geom'] for j in l2]) if l2 else None
    t3 = STRtree([j['geom'] for j in l3]) if l3 else None

    def w_czym(g, drzewo, lista):
        if drzewo is None:
            return None
        naj, najp = None, 0
        for i in drzewo.query(g, predicate='intersects'):
            pole = lista[i]['geom'].intersection(g).area
            if pole > najp:
                naj, najp = lista[i], pole
        return naj if najp > 0.5 * g.area else None

    ron_lata = 1569.5 <= rok < 1795.82
    for c in komorki:
        if 'a' in c:
            continue
        p, poz = c['ohm'], c['poziom']
        p2 = p if poz == 2 else w_czym(c['geom'], t2, l2) and w_czym(c['geom'], t2, l2)['ohm']
        p3 = p if poz == 3 else (w_czym(c['geom'], t3, l3) or {}).get('ohm') if poz == 4 else None
        a = {'n4': nazwa(p) if poz == 4 else None, 'odcien': int(abs(p.get('osm_id') or 0)) % 3 if poz == 4 else 0, 'jasnosc': 1}
        wkl_przed = rok < 1569.5 and p3 and 'grand duchy of lithuania' in tekst(p3)
        r = regula(p, rok) if poz == 4 else None
        if r and r[0] == 'litwa' and rok < 1569.5:
            a.update(n2=WKL, n3=None, kolor=PANSTWA['litwa'][1])
        elif p3 and (kolor_panstwa(p3) or klucz_panstwa(p3) != 'ron'):
            # części jednego państwa (Austria i Węgry, kraje Rzeszy Niemieckiej) – kolor całego państwa;
            # własny kolor części tylko w Rzeczypospolitej (Korona / Litwa) albo gdy państwo nie ma swojego klucza
            kl2, kl3 = (klucz_panstwa(p2) if p2 else None), klucz_panstwa(p3)
            if wkl_przed:
                a['kolor'] = PANSTWA['litwa'][1]
            elif kl2 not in (None, 'ron'):
                a['kolor'] = PANSTWA[kl2][1]
            elif kl3 not in (None, 'ron') or not p2:
                a['kolor'] = kolor_panstwa(p3)
            else:
                a['kolor'] = kolor_panstwa(p2) or kolor_panstwa(p3)
            if wkl_przed:
                a.update(n2=WKL, n3=None)
            else:
                a['n3'] = nazwa(p3)
                a['n2'] = nazwa(p2) if p2 else habsburg(p3, rok)
                if not a['n2'] and not p2:
                    a.update(n2=a['n3'], n3=None)
        elif p2 and kolor_panstwa(p2):
            a.update(kolor=kolor_panstwa(p2), n2=nazwa(p2), n3=None)
        elif r:
            kl, nz = r
            a['kolor'] = PANSTWA[kl][1]
            nazwa_p = nz or PANSTWA[kl][0]
            if ron_lata and kl in ('korona', 'litwa'):
                a.update(n2=RON, n3=nazwa_p)
            else:
                a.update(n2=nazwa_p, n3=None)
        else:
            a.update(kolor=None, n2=nazwa(p2) if p2 else None, n3=None)
        c['a'] = a


def klucz(a):
    return (a.get('n2'), a.get('n3'), a.get('n4'), a.get('n5'), a.get('kolor'), a.get('jasnosc'))


def scal_jednakowe(komorki):
    grupy = {}
    for c in komorki:
        grupy.setdefault(klucz(c['a']), []).append(c)
    wyn = []
    for gr in grupy.values():
        c = dict(gr[0])
        c['geom'] = wielokaty(shapely.set_precision(unary_union([x['geom'] for x in gr]), 1.0))
        c['dokladny'] = any(x['dokladny'] for x in gr)
        wyn.append(c)
    return wyn


def dlugosc_styku(g, h):
    return g.boundary.intersection(h.buffer(5)).length


def podziel_szczeline(g, sasiedzi):
    """Szczelina między kilkoma obszarami → po linii środkowej (Voronoi z punktów na ich brzegach)."""
    pkt, wl, byly = [], [], set()
    strefa = g.buffer(60)
    for i, c in enumerate(sasiedzi):
        brzeg = c['geom'].boundary.intersection(strefa)
        if brzeg.is_empty:
            continue
        for x, y in shapely.get_coordinates(brzeg.segmentize(200)):
            k = (round(x), round(y))
            if k in byly:
                continue
            byly.add(k)
            pkt.append((x, y)); wl.append(i)
    if len(set(wl)) < 2:
        return {wl[0] if wl else 0: g}
    mp = MultiPoint(pkt)
    vor = shapely.voronoi_polygons(mp, extend_to=g.buffer(2000), ordered=True)
    czesci = {}
    for reg, i in zip(shapely.get_parts(vor), wl):
        k = reg.intersection(g)
        if not k.is_empty:
            czesci.setdefault(i, []).append(k)
    return {i: wielokaty(unary_union(v)) for i, v in czesci.items()}


def zalataj(komorki, lad, d=10000):
    U = unary_union([c['geom'] for c in komorki])
    domk = U.buffer(d, join_style='round', quad_segs=4).buffer(-d, join_style='round', quad_segs=4)
    # dziury w środku (enklawy bez danych, np. miasta zapisane na niższym poziomie) – też do sąsiadów
    pelne = unary_union([Polygon(p.exterior) for p in shapely.get_parts(U)])
    dziury = [h for h in shapely.get_parts(wielokaty(pelne.difference(U))) if h.area < 3e9]
    szczeliny = wielokaty(unary_union([domk.difference(U)] + dziury).intersection(lad))
    drzewo = STRtree([c['geom'] for c in komorki])
    dodatki = {}
    for g in shapely.get_parts(szczeliny):
        if g.area < 2e3:
            continue
        sas = [komorki[i] for i in drzewo.query(g.buffer(20), predicate='intersects')]
        if not sas:
            continue
        niedokladni = [c for c in sas if not c['dokladny']]
        if niedokladni and len(niedokladni) < len(sas):
            sas = niedokladni
        if len(sas) == 1:
            dodatki.setdefault(id(sas[0]), []).append(g)
            continue
        for i, kaw in podziel_szczeline(g, sas).items():
            dodatki.setdefault(id(sas[i]), []).append(kaw)
    for c in komorki:
        if id(c) in dodatki:
            c['geom'] = wielokaty(shapely.set_precision(unary_union([c['geom']] + dodatki[id(c)]), 1.0))
    return komorki


def wchlon_skrawki(komorki, szer=1500, maks_pole=3e8):
    """Wąskie kawałki (resztki niedopasowanych granic) → do sąsiada o najdłuższym styku."""
    for _ in range(3):
        kaw = []  # (komórka, część)
        for c in komorki:
            for p in shapely.get_parts(c['geom']):
                kaw.append((c, p))
        drzewo = STRtree([p for _, p in kaw])
        do_przen = []
        for i, (c, p) in enumerate(kaw):
            if c['dokladny'] or p.area > maks_pole:
                continue
            if not (p.area < 2e6 or p.buffer(-szer).is_empty):
                continue
            # cała komórka jako skrawek – tylko gdy to nie jedyna część dużej całości bez sąsiadów
            best, bl = None, 0
            for j in drzewo.query(p.buffer(10), predicate='intersects'):
                c2, p2 = kaw[j]
                if c2 is c:
                    continue
                l = dlugosc_styku(p, p2)
                if l > bl:
                    best, bl = c2, l
            if best is not None and bl > 0.15 * p.length:
                do_przen.append((c, p, best))
        if not do_przen:
            break
        zabierz, daj = {}, {}
        for c, p, b in do_przen:
            zabierz.setdefault(id(c), []).append(p)
            daj.setdefault(id(b), []).append(p)
        for c in komorki:
            g = c['geom']
            if id(c) in zabierz:
                g = g.difference(unary_union(zabierz[id(c)]).buffer(0.5))
            if id(c) in daj:
                g = unary_union([g] + daj[id(c)])
            c['geom'] = wielokaty(shapely.set_precision(g, 1.0))
        komorki = [c for c in komorki if not c['geom'].is_empty]
    return komorki


def uprosc(komorki, szczegol, rdzen, zewn):
    """Wspólne odcinki granic upraszczane raz dla obu stron; obszary składane z powrotem z odcinków."""
    linie = unary_union([c['geom'].boundary for c in komorki])
    luki = list(shapely.get_parts(linemerge(linie))) if linie.geom_type != 'LineString' else [linie]
    # odcinki dzielone na strefy: okolice Polski dokładnie, reszta Europy coraz ogólniej
    proste = []
    strefy = ((szczegol, 70), (rdzen.difference(szczegol), 400), (None, 3000))
    for l in luki:
        for obszar, tol in strefy:
            kaw = l.intersection(obszar) if obszar is not None else l.difference(rdzen)
            for k in shapely.get_parts(linemerge(kaw) if kaw.geom_type == 'MultiLineString' else kaw):
                if k.geom_type == 'LineString' and k.length > 0:
                    proste.append(k.simplify(tol, preserve_topology=False))
    siatka = unary_union(proste)
    twarze = list(polygonize(siatka))
    drzewo = STRtree([c['geom'] for c in komorki])
    nowe = {}
    for t in twarze:
        rp = t.point_on_surface()
        idx = drzewo.query(rp, predicate='within')
        if len(idx):
            nowe.setdefault(int(idx[0]), []).append(t)
        else:
            # twarz z brzegu (po uproszczeniu) – do obszaru o największej części wspólnej
            naj, najp = None, 0
            for i in drzewo.query(t, predicate='intersects'):
                pp = komorki[i]['geom'].intersection(t).area
                if pp > najp:
                    naj, najp = int(i), pp
            if naj is not None and najp > 0.5 * t.area:
                nowe.setdefault(naj, []).append(t)
    def wazna(t):
        # drobne wyspy i skrawki: im dalej od okolic Łosic, tym większe pomijamy
        s = t.centroid
        return t.area > (5e5 if szczegol.contains(s) else 5e6 if rdzen.contains(s) else 5e7)
    wyn = []
    for i, c in enumerate(komorki):
        if i in nowe:
            g = wielokaty(unary_union(nowe[i]))
            g = wielokaty(unary_union([t for t in shapely.get_parts(g) if wazna(t)]))
            if not g.is_empty:
                wyn.append({**c, 'geom': g})
    # linie granic: każdy odcinek raz, rodzaj z obszarów po obu stronach
    drzewo2 = STRtree([c['geom'] for c in wyn])
    ramka = zewn.boundary.buffer(1500)
    odcinki = []
    for l in shapely.get_parts(linemerge(siatka) if siatka.geom_type != 'LineString' else siatka):
        if l.length < 1 or ramka.contains(l):
            continue
        m = l.interpolate(0.5, normalized=True)
        a_ = l.interpolate(max(0, l.project(m) - 5)); b_ = l.interpolate(min(l.length, l.project(m) + 5))
        dx, dy = b_.x - a_.x, b_.y - a_.y
        dl = math.hypot(dx, dy) or 1
        nx, ny = -dy / dl * 8, dx / dl * 8
        strony = []
        for pt in (Point(m.x + nx, m.y + ny), Point(m.x - nx, m.y - ny)):
            idx = drzewo2.query(pt, predicate='within')
            strony.append(wyn[int(idx[0])]['a'] if len(idx) else None)
        A, B = strony
        if A is not None and B is not None and klucz(A) == klucz(B):
            continue
        if (A is None or B is None) and not rdzen.contains(m):
            continue  # brzeg morza / obszaru bez danych daleko od Polski – bez kreski
        if A is None and B is None:
            continue
        if A is None or B is None or A.get('n2') != B.get('n2'):
            r = 'panstwo'
        elif A.get('n3') != B.get('n3'):
            r = 'czesc'
        elif A.get('n4') != B.get('n4'):
            r = 'woj'
        else:
            r = 'ziemia'
        odcinki.append((l, r))
    return wyn, odcinki


def zaokraglij(g):
    return shapely.set_precision(shapely.make_valid(do_st(g)), 1e-5)


def buduj(kafle, lad, etykieta, rok, szczegol, zewn):
    import time
    t0 = time.time()
    def krok(n):
        print(f'   {n} {time.time() - t0:.0f}s', flush=True)
    J = jednostki(kafle, rok); krok('jednostki')
    kom = podziel(J); krok('podział')
    atrybuty(kom, J, rok)
    # resztki obszaru Rzeczypospolitej poza Koroną i Litwą (niedopasowane granice części) – do łatania jak szczeliny
    kom = [c for c in kom if not (c.get('poziom') == 2 and not c['a'].get('kolor') and klucz_panstwa(c['ohm']) == 'ron')]
    kom = scal_jednakowe(kom); krok('atrybuty')
    kom = zalataj(kom, lad); krok('szczeliny')
    kom = wchlon_skrawki(kom)
    kom = scal_jednakowe(kom); krok('skrawki')
    kom, odc = uprosc(kom, szczegol, kafle.rdzen, zewn); krok('uproszczenie')
    feats = []
    for c in kom:
        a = c['a']
        pr = {k: v for k, v in {
            'kolor': a.get('kolor'), 'jasnosc': a.get('jasnosc', 1), 'odcien': a.get('odcien', 0),
            'n2': a.get('n2'), 'n3': a.get('n3'), 'n4': a.get('n4'), 'n5': a.get('n5'), 'bp': a.get('bp') or None,
        }.items() if v is not None}
        g = wielokaty(zaokraglij(c['geom']))
        if not g.is_empty:
            feats.append({'type': 'Feature', 'properties': pr, 'geometry': mapping(g)})
    zr = 'OpenHistoricalMap (CC0), kafelki ohm_admin'
    if rok < 1772.6:
        zr += '; Korona i ziemie podlaskie: Atlas historyczny Polski. Mapy szczegółowe XVI wieku, IH PAN (CC BY 4.0)'
    if 1569.5 <= rok < 1618.9:
        zr += '; Kijowszczyzna, Inflanty, lenna: wyznaczone z OHM'
    # TopoJSON: każdy wspólny odcinek granicy zapisany raz (mniejszy plik); linie granic liczy przeglądarka
    # z sąsiedztwa obszarów (lib/topojson.ts), więc kreska jest dokładnie na styku wypełnień
    import topojson
    topo = topojson.Topology({'type': 'FeatureCollection', 'features': feats}, prequantize=200000, topology=True,
                             presimplify=False, toposimplify=False, object_name='obszary').to_dict()
    topo['okres'], topo['rok'] = etykieta, rok
    topo['zrodlo'] = zr + '. Zmiany: szczeliny między granicami podzielone między sąsiadów, nakładki usunięte, granice uproszczone (skrypt scripts/granice/okresy.py).'
    return topo


def main():
    kat, plik_ladu = sys.argv[1], sys.argv[2]
    wybrane = set(sys.argv[3:])
    print('kafle…', flush=True)
    kafle = Kafle(kat)
    zewn = ramka_st(0, 40, 45, 62, 0.25)
    szczegol = ramka_st(16, 48.5, 29, 56)
    lad_st = unary_union([shape(f['geometry']) for f in json.load(open(plik_ladu))['features']]).intersection(box(-2, 38, 47, 64))
    lad = do_m(lad_st).buffer(500)  # zapas na nierówności linii brzegowej
    wyj = os.path.join(REPO, 'public', 'granice', 'okresy')
    os.makedirs(wyj, exist_ok=True)
    for et, rok in okresy():
        if wybrane and et not in wybrane:
            continue
        print(et, rok, flush=True)
        fc = buduj(kafle, lad, et, rok, szczegol, zewn)
        plik = os.path.join(wyj, f'{et}.json')
        json.dump(fc, open(plik, 'w', encoding='utf8'), ensure_ascii=False, separators=(',', ':'))
        print('  ', len(fc['objects']['obszary']['geometries']), 'obszarów', len(fc['arcs']), 'odcinków', round(os.path.getsize(plik) / 1e3), 'kB', flush=True)


if __name__ == '__main__':
    main()
