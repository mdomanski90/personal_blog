'use client'

// Edytor planu obiektu: podkłady i kalibracja, rysowanie (punkt, prostokąt, wielokąt, linia, napis), warstwy,
// przyciąganie, miarka, duplikowanie i powielanie, zaznaczanie wielu, cofanie, autozapis, zdjęcia nagrobków z GPS.

import * as React from 'react'
import {
    afiniczna, dlugosc, geoNaPlan, jednostka, JEDNOSTKOWA, noweId, pole, podobienstwo, punktyElementu, rokZgonuZeZrodlem, skalaZGeo, srodek, zastosuj,
    type Element, type Geometria, type Macierz, type Osoba, type Pkt, type Plan, type Podklad, type Zdjecie,
} from '@/lib/plany/model'
import { GRUPY, katalog, typGrobu, WARSTWY, type TypElementu, type UstawieniaPlanow, type Warstwa } from '@/lib/plany/typy'
import { DOKLADNOSCI, RODZAJE_PLANU, RODZAJE_ZRODLA, ROZMIAR_STOPNIA, STYLE_PLANU, planGrobowy, rodzajPlanu, stopienNapisu, type RodzajPlanu, type Stopien } from '@/lib/plany/metadane'
import { Uchwyt, useSzerokosc } from './Uchwyt'
import PolePowiazan, { CSS_POLA_POWIAZAN, type CelPowiazania } from '../../wspolne/PolePowiazan'
import { IDENTYFIKACJE, type Identyfikacja } from '@/lib/plany/podstawa'
import { katWMiejscu, kopia, obrocGeom, podgladDanych, propozycjaGrobu, przeniesDane, zamienDane, pozycjaStempla, przesun, przyciagnij, przyciagnijKat, rozlozRowno, rozmiarBokiem, rozmiarGrobu, wektor, wyrownajWLinie, type Przyciaganie, type WzorStempla } from '@/lib/plany/edycja'
import { ETAPY, ETYKIETA_ETAPU, ETYKIETA_POLOZENIA, ETYKIETA_ZRODEL, etapElementu, polozenie, poZmianieDanych, STANY_ZRODEL, stanZrodel, type Etap, type Polozenie, type StanZrodel } from '@/lib/plany/statusy'
import { odczytajExif } from '@/lib/plany/exif'
import { kolejnoDoPracy, numerTekst, numeryPlanu, zastosujNumery, type Numer } from '@/lib/plany/numeracja'
import { NumerGrobu, StanNumeracjiPlanu, TabelaRoznic, UstawieniaKwatery, type Roznice } from './Numeracja'
import { RysunekPlanu, Wzory, szerLinii } from '@/app/components/plan/Rysunek'
import { poUsunieciu, poWstawieniu, WYROWNANIA, WSKAZNIKI, type Wyrownanie, type Wskaznik } from '@/lib/plany/ph3'
import { Probka, WzoryProbek } from '@/app/components/plan/Probka'

type VB = [number, number, number, number]
type Narzedzie = 'wybierz' | 'stempel' | 'punkt' | 'prostokat' | 'wielokat' | 'linia' | 'napis' | 'miarka' | 'skala' | 'geo' | 'dopasuj'
type Zakladka = 'element' | 'plan' | 'podklady' | 'warstwy' | 'zdjecia'
type Zapis = 'ok' | 'zmiany' | 'zapisuje' | 'blad' | 'odrzucony' | 'konflikt'

const NARZEDZIA: { id: Narzedzie; nazwa: string; klawisz: string }[] = [
    { id: 'wybierz', nazwa: 'wybierz', klawisz: '1' },
    { id: 'punkt', nazwa: 'punkt', klawisz: '2' },
    { id: 'prostokat', nazwa: 'prostokąt', klawisz: '3' },
    { id: 'wielokat', nazwa: 'wielokąt', klawisz: '4' },
    { id: 'linia', nazwa: 'linia', klawisz: '5' },
    { id: 'napis', nazwa: 'napis', klawisz: '6' },
    { id: 'miarka', nazwa: 'miarka', klawisz: '7' },
    { id: 'stempel', nazwa: 'stempel', klawisz: '8' },
]
type Filtr = '' | 'bezNapisu' | 'bezZdjecia' | 'niesprawdzone' | 'nieopracowane'
/** Tryby pracy (etap 1): Rysuj – geometria; Opracuj – napis, osoby, zdjęcia, źródła; Sprawdź – porównanie ze zdjęciem i zatwierdzenie. */
type Tryb = 'rysuj' | 'opracuj' | 'sprawdz'
const TRYBY: [Tryb, string, string][] = [['rysuj', 'Rysuj', 'kształty, położenie, typy'], ['opracuj', 'Opracuj', 'napis, osoby, zdjęcia, źródła · N = następny nieopracowany'], ['sprawdz', 'Sprawdź', 'porównanie ze zdjęciem, zatwierdzenie · N = następny niesprawdzony']]
type SkrotOsoby = { id: string; nazwa: string; imiona: string; nazwisko: string; lata: string; miejsce: string }
const API = (slug: string) => `/api/keystatic/plany/${slug}`
const plikUrl = (slug: string, plik: string) => `${API(slug)}/plik/${plik}`

interface Listy {
    miejsca: { id: string; nazwa: string }[]
    obiekty: { id: string; nazwa: string; miejsce: string | null }[]
    /** PH1: materiały ze stronami skanu – źródło planu i podkład ze strony materiału */
    materialy: { id: string; nazwa: string; strony: string[] }[]
    /** PH-09: karty do powiązania elementów (jak w panelu objaśnień) */
    cele: CelPowiazania[]
}
/** Podkład ze strony materiału: obraz z panelu materiałów (bez kopii pliku w planie). */
const adresPodkladu = (slug: string, p: Podklad, materialy: Listy['materialy']) => {
    if (!p.material) return plikUrl(slug, p.plik)
    const plik = materialy.find((m) => m.id === p.material!.id)?.strony[p.material.strona]
    return plik ? `/api/keystatic/materialy/${p.material.id}/strony?podglad=${encodeURIComponent(plik)}` : ''
}
/** PH-22: grupy rozwinięte domyślnie według rodzaju planu (potem stan zapamiętany w przeglądarce). */
const GRUPY_ROZWINIETE: Record<RodzajPlanu, string[]> = {
    cmentarz: ['Na cmentarzu', 'Cmentarze (obszary)', 'Drogi i linie', 'Napisy'],
    historyczny: ['Zabudowa i miasto', 'Drogi i linie', 'Woda i teren', 'Świątynie i domy modlitwy', 'Napisy'],
    schemat: ['Zabudowa i miasto', 'Drogi i linie', 'Woda i teren', 'Napisy'],
}

const odwrotna = (m: Macierz): Macierz => {
    const [a, b, c, d, e, f] = m, det = a * d - b * c || 1
    return [d / det, -b / det, -c / det, a / det, (c * f - d * e) / det, (b * e - a * f) / det]
}

/** Same kontury elementów (bez wypełnień), zawsze w pełni widoczne, z jasną obwódką na tle podkładu. */
function Kontury({ elementy, r }: { elementy: Element[]; r: number }) {
    const ksztalty = elementy.map((e) => {
        const g = e.g
        if (g.k === 't') return null
        if (g.k === 'p') return <circle key={e.id} cx={g.x} cy={g.y} r={r * 0.6} />
        const pkt = punktyElementu(g).map((q) => q.join(',')).join(' ')
        return g.k === 'l' ? <polyline key={e.id} points={pkt} /> : <polygon key={e.id} points={pkt} />
    })
    return (
        <g pointerEvents="none" fill="none">
            <g className="ed-kontur-tlo">{ksztalty}</g>
            <g className="ed-kontur">{ksztalty}</g>
        </g>
    )
}

const KLUCZ_KOPII = (slug: string) => `plan-niezapisany:${slug}`

export default function Edytor({ slug }: { slug: string }) {
    const [plan, ustawPlanSurowo] = React.useState<Plan | null>(null)
    const [ust, ustawUst] = React.useState<UstawieniaPlanow>({ progLat: 30, ukryteTypy: [], wlasneTypy: [] })
    const [listy, ustawListy] = React.useState<Listy>({ miejsca: [], obiekty: [], materialy: [], cele: [] })
    // PH-21: szerokości paleta / panel – uchwyty, zapamiętane w przeglądarce
    const [szerPalety, ustawSzerPalety] = useSzerokosc('plan-szer-paleta', 230, 170, 420)
    const [szerPanelu, ustawSzerPanelu] = useSzerokosc('plan-szer-panel', 320, 260, 560)
    // PH-22: zwinięte grupy typów – osobno dla każdego rodzaju planu (domyślnie rozwinięte grupy właściwe dla rodzaju)
    const [pamiecGrup, ustawPamiecGrup] = React.useState<Record<string, string[]>>({})
    React.useEffect(() => { try { const z = JSON.parse(localStorage.getItem('plan-grupy') ?? '{}'); if (z && typeof z === 'object') ustawPamiecGrup(z) } catch { /* bez pamięci */ } }, [])
    const [blad, ustawBlad] = React.useState('')
    const [zapis, ustawZapis] = React.useState<Zapis>('ok')
    const [zazn, ustawZazn] = React.useState<Set<string>>(new Set())
    const zaznRef = React.useRef(zazn) // P6a: miejsce pracy dla „wróć do pracy” (nagłówek przy zapisie)
    zaznRef.current = zazn
    const [wzorId, ustawWzorId] = React.useState<string | null>(null)
    const [narz, ustawNarz] = React.useState<Narzedzie>('wybierz')
    const [typId, ustawTypIdSurowo] = React.useState(() => { try { return localStorage.getItem('plan-ostatni-typ') || 'grob' } catch { return 'grob' } })
    const ustawTypId = (id: string) => { ustawTypIdSurowo(id); try { localStorage.setItem('plan-ostatni-typ', id) } catch { /* nic */ } }
    const [vb, ustawVb] = React.useState<VB>([0, 0, 1600, 1100])
    const [rys, ustawRys] = React.useState<Pkt[]>([])
    const rysRef = React.useRef<Pkt[]>([])
    rysRef.current = rys
    const [kursor, ustawKursor] = React.useState<Pkt | null>(null)
    const [znacznik, ustawZnacznik] = React.useState<Pkt | null>(null)
    const [ukrytePodklady, ustawUkrytePodklady] = React.useState<Set<string>>(new Set())
    const [przyc, ustawPrzyc] = React.useState<Przyciaganie>({ punkty: true, siatka: false, krok: 10 })
    const [zakl, ustawZakl] = React.useState<Zakladka>('element')
    const [ramka, ustawRamka] = React.useState<[Pkt, Pkt] | null>(null)
    const [pw, ustawPw] = React.useState<{ otwarte: boolean; ile: number; kier: 'rzad' | 'kol'; zn: 1 | -1; odstep: number | null }>({ otwarte: false, ile: 3, kier: 'rzad', zn: 1, odstep: null })
    const [dop, ustawDop] = React.useState<{ podklad: string; pary: { zr: Pkt; cel?: Pkt }[] } | null>(null)
    const [szukajTypu, ustawSzukajTypu] = React.useState('')
    const [komunikat, ustawKomunikat] = React.useState('')
    const [paletaOtwarta, ustawPaletaOtwarta] = React.useState(true)
    const [kryRys, ustawKryRys] = React.useState(0.75)
    const [wzorStempla, ustawWzorStempla] = React.useState<WzorStempla | null>(null)
    const [filtr, ustawFiltr] = React.useState<Filtr>('')
    const [teren, ustawTeren] = React.useState(false)
    const [tryb, ustawTrybSurowo] = React.useState<Tryb>(() => { try { const t = localStorage.getItem('plan-tryb'); return t === 'opracuj' || t === 'sprawdz' ? t : 'rysuj' } catch { return 'rysuj' } })
    const [pozycja, ustawPozycja] = React.useState<{ lat: number; lon: number; acc: number } | null>(null)
    const [osobyDrzewa, ustawOsobyDrzewa] = React.useState<SkrotOsoby[] | null>(null)
    const svgRef = React.useRef<SVGSVGElement>(null)
    const historia = React.useRef<Plan[]>([])
    const naprzod = React.useRef<Plan[]>([])
    const brudny = React.useRef(false)
    // autozapis: numer wersji z serwera i jeden zapis naraz (inaczej drugi zapis szedł ze starą wersją → fałszywy konflikt)
    const wersjaRef = React.useRef(0)
    const wTrakcie = React.useRef(false)
    const [kopiaPrz, ustawKopiaPrz] = React.useState<{ czas: string; plan: Plan; zrodlo: 'serwer' | 'przegladarka' } | null>(null)
    const szkicZapisany = React.useRef(false)
    const [ponownie, ustawPonownie] = React.useState(0)
    const [ostatniZapis, ustawOstatniZapis] = React.useState<Date | null>(null)
    const natychmiast = React.useRef(false)
    const planRef = React.useRef<Plan | null>(null)
    planRef.current = plan
    const schowek = React.useRef<Element[] | null>(null)
    const ostatniaKopia = React.useRef<{ ids: string[]; off: Pkt } | null>(null)

    const typy = React.useMemo(() => katalog(ust), [ust])
    const ukryteTypy = React.useMemo(() => new Set(ust.ukryteTypy), [ust])
    const u = plan ? jednostka(plan) : 20
    // numery zapisane w grobach (etap 2) – nie liczone przy wyświetlaniu
    const numery = React.useMemo(() => (plan ? numeryPlanu(plan) : new Map<string, Numer>()), [plan])
    const [roznice, ustawRoznice] = React.useState<Roznice | null>(null)
    const pokaz = (t: string) => { ustawKomunikat(t); window.setTimeout(() => ustawKomunikat((k) => (k === t ? '' : k)), 6000) }

    // ---------- wczytanie ----------
    React.useEffect(() => {
        Promise.all([fetch(API(slug)).then((r) => (r.ok ? r.json() : Promise.reject(r.status))), fetch('/api/keystatic/plany').then((r) => r.json())])
            .then(([p, l]) => {
                wersjaRef.current = p.wersja
                if (p.zmieniono) ustawOstatniZapis(new Date(p.zmieniono))
                ustawPlanSurowo(p)
                // niezapisane zmiany z poprzedniej sesji: szkic na serwerze (etap 1), a jednorazowo także dawna kopia z tej przeglądarki
                const bez = (x: Plan) => JSON.stringify({ ...x, wersja: 0, zmieniono: '' })
                fetch(`${API(slug)}/szkic`).then((r) => (r.ok ? r.json() : null)).catch(() => null).then((sz: { czas: string; plan: Plan } | null) => {
                    let k: { czas: string; plan: Plan; zrodlo: 'serwer' | 'przegladarka' } | null = sz?.plan ? { czas: sz.czas, plan: sz.plan, zrodlo: 'serwer' } : null
                    if (!k) try {
                        const d = JSON.parse(localStorage.getItem(KLUCZ_KOPII(slug)) ?? 'null') as { czas: string; plan: Plan } | null
                        if (d?.plan && (!p.zmieniono || d.czas > p.zmieniono)) k = { ...d, zrodlo: 'przegladarka' }
                        else localStorage.removeItem(KLUCZ_KOPII(slug))
                    } catch { /* brak dostępu do pamięci przeglądarki */ }
                    if (k && bez(k.plan) !== bez(p)) ustawKopiaPrz(k)
                    else if (sz) fetch(`${API(slug)}/szkic`, { method: 'DELETE' }).catch(() => {})
                })
                ustawUst(l.ustawienia)
                ustawListy({ miejsca: l.miejsca, obiekty: l.obiekty, materialy: l.materialy ?? [], cele: l.cele ?? [] })
                // ?el=<id> (z panelu zgłoszeń): zaznacz element i pokaż go
                const elId = new URLSearchParams(window.location.search).get('el')
                const e = elId ? (p as Plan).elementy.find((x) => x.id === elId) : null
                if (e) {
                    const k = poczatkowyKadr(p), [cx, cy] = srodek(e.g), w = Math.min(k[2], jednostka(p) * 30), h = (w * k[3]) / k[2]
                    ustawVb([cx - w / 2, cy - h / 2, w, h]); ustawZazn(new Set([e.id])); ustawWzorId(e.id)
                } else ustawVb(poczatkowyKadr(p))
            })
            .catch((e) => ustawBlad(e === 404 ? 'Nie ma takiego planu.' : e === 401 ? 'Brak dostępu – edytor działa tylko za hasłem panelu.' : 'Nie udało się wczytać planu.'))
    }, [slug])

    // ---------- zmiany z historią ----------
    const zmien = React.useCallback((f: (p: Plan) => Plan, bezHistorii = false) => {
        ustawPlanSurowo((p) => {
            if (!p) return p
            const n = f(p)
            if (n === p) return p
            if (!bezHistorii) {
                historia.current.push(p)
                if (historia.current.length > 150) historia.current.shift()
                naprzod.current = []
            }
            brudny.current = true
            return n
        })
        ustawZapis('zmiany')
    }, [])
    const zmienElementy = React.useCallback((zm: Map<string, Partial<Element> | null>, nowe: Element[] = []) => {
        // poZmianieDanych: grób „narysowany” po wpisaniu danych → „opracowany”; dawne pole `weryfikacja` znika przy zmianie statusu
        zmien((p) => ({ ...p, elementy: [...p.elementy.flatMap((e) => (zm.has(e.id) ? (zm.get(e.id) === null ? [] : [{ ...e, ...poZmianieDanych(e, zm.get(e.id)!, typy.get(e.typ)) } as Element]) : [e])), ...nowe] }))
    }, [zmien, typy])
    const cofnij = () => {
        const p = historia.current.pop()
        if (!p || !plan) return
        naprzod.current.push(plan)
        ustawPlanSurowo({ ...p, wersja: plan.wersja })
        brudny.current = true
        ustawZapis('zmiany')
    }
    const ponow = () => {
        const p = naprzod.current.pop()
        if (!p || !plan) return
        historia.current.push(plan)
        ustawPlanSurowo({ ...p, wersja: plan.wersja })
        brudny.current = true
        ustawZapis('zmiany')
    }

    // ---------- autozapis ----------
    /** Szkic awaryjny na serwerze – gdy zapis planu się nie udał (konflikt z innym oknem, błąd serwera). Nic w pamięci przeglądarki. */
    const zapiszKopie = React.useCallback(() => {
        if (!planRef.current) return
        fetch(`${API(slug)}/szkic`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...planRef.current, wersja: wersjaRef.current }) })
            .then((r) => { if (r.ok) szkicZapisany.current = true }).catch(() => { /* serwer nieosiągalny – zmiany zostają w oknie, ponawiamy zapis */ })
    }, [slug])
    const usunSzkic = React.useCallback(() => {
        szkicZapisany.current = false
        fetch(`${API(slug)}/szkic`, { method: 'DELETE' }).catch(() => {})
        try { localStorage.removeItem(KLUCZ_KOPII(slug)) } catch { /* nic */ }
    }, [slug])
    React.useEffect(() => {
        if (!plan || !brudny.current || zapis === 'konflikt' || wTrakcie.current) return
        const zwloka = natychmiast.current ? 0 : 1200
        natychmiast.current = false
        const t = window.setTimeout(async () => {
            const doZapisu = { ...planRef.current!, wersja: wersjaRef.current }
            brudny.current = false
            wTrakcie.current = true
            ustawZapis('zapisuje')
            const r = await fetch(API(slug), { method: 'PUT', headers: { 'Content-Type': 'application/json', 'X-Miejsce-Pracy': encodeURIComponent([...zaznRef.current][0] ?? '') }, body: JSON.stringify(doZapisu) }).catch(() => null)
            wTrakcie.current = false
            if (r?.status === 409) { brudny.current = true; zapiszKopie(); ustawZapis('konflikt'); return }
            // 422: zapis dodałby powtórzony numer grobu – ponawianie nic nie da; szkic na serwerze, komunikat, czekamy na poprawkę
            if (r?.status === 422) { brudny.current = true; zapiszKopie(); ustawZapis('odrzucony'); const j = await r.json().catch(() => null); pokaz(j?.blad ?? 'Zapis odrzucony.'); return }
            if (!r?.ok) { brudny.current = true; zapiszKopie(); ustawZapis('blad'); window.setTimeout(() => ustawPonownie((x) => x + 1), 4000); return }
            const j = await r.json()
            wersjaRef.current = j.wersja
            if (j.przywrocone?.length) pokaz(`Wróciły z kosza pliki, do których plan znów się odwołuje: ${j.przywrocone.join(', ')}.`)
            ustawOstatniZapis(j.zmieniono ? new Date(j.zmieniono) : new Date())
            ustawPlanSurowo((p) => (p ? { ...p, wersja: j.wersja, zmieniono: j.zmieniono } : p))
            if (brudny.current) ustawPonownie((x) => x + 1) // zmiany w trakcie zapisu – kolejny zapis
            else {
                ustawZapis('ok')
                if (szkicZapisany.current && !kopiaPrzRef.current) usunSzkic() // zapis się udał – szkic awaryjny niepotrzebny
            }
        }, zwloka)
        return () => window.clearTimeout(t)
    }, [plan, slug, zapis, ponownie, zapiszKopie, usunSzkic])
    React.useEffect(() => {
        const ostrz = (e: BeforeUnloadEvent) => { if (brudny.current || wTrakcie.current) { e.preventDefault(); e.returnValue = '' } }
        window.addEventListener('beforeunload', ostrz)
        return () => window.removeEventListener('beforeunload', ostrz)
    }, [])
    const kopiaPrzRef = React.useRef(kopiaPrz)
    kopiaPrzRef.current = kopiaPrz
    /** „zapisz teraz” (Ctrl+S): zapis od razu, także bez zmian – dla pewności, że serwer ma aktualny plan */
    const zapiszTeraz = () => {
        if (zapisRef.current === 'konflikt') { pokaz('Plan zmieniono w innym oknie – wybierz „zachowaj moją wersję” albo „wczytaj z serwera”.'); return }
        brudny.current = true
        natychmiast.current = !wTrakcie.current
        ustawZapis('zmiany')
        ustawPonownie((x) => x + 1)
    }
    const zapisRef = React.useRef(zapis)
    zapisRef.current = zapis
    const zapiszTerazRef = React.useRef(zapiszTeraz)
    zapiszTerazRef.current = zapiszTeraz
    /** konflikt: zachowaj wersję z tego okna (nadpisz serwer) */
    const zachowajMoja = async () => {
        const r = await fetch(API(slug)).then((x) => (x.ok ? x.json() : null)).catch(() => null)
        if (!r) { pokaz('Nie udało się połączyć z serwerem.'); return }
        wersjaRef.current = r.wersja
        brudny.current = true
        ustawZapis('zmiany')
    }
    const pobierzPlik = () => {
        if (!planRef.current) return
        const a = document.createElement('a')
        a.href = URL.createObjectURL(new Blob([JSON.stringify({ ...planRef.current }, null, 1)], { type: 'application/json' }))
        a.download = `${slug}-${new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-')}.plan.json`
        a.click()
        window.setTimeout(() => URL.revokeObjectURL(a.href), 2000)
    }
    const przywrocKopie = () => {
        if (!kopiaPrz || !plan) return
        historia.current.push(plan)
        ustawPlanSurowo({ ...kopiaPrz.plan, slug: plan.slug, wersja: wersjaRef.current, podklady: kopiaPrz.plan.podklady ?? plan.podklady })
        brudny.current = true
        ustawZapis('zmiany')
        ustawKopiaPrz(null)
        usunSzkic()
    }

    // ---------- pomocnicze ----------
    const el = (id: string | null) => (id && plan ? plan.elementy.find((e) => e.id === id) ?? null : null)
    const zaznaczone = plan ? plan.elementy.filter((e) => zazn.has(e.id)) : []
    const wzor = el(wzorId && zazn.has(wzorId) ? wzorId : zaznaczone[0]?.id ?? null)
    const zablokowany = (e: Element) => !!plan?.warstwy[typy.get(e.typ)?.warstwa as Warstwa]?.zablokowana
    const ukryteWarstwy = React.useMemo(() => new Set(Object.entries(plan?.warstwy ?? {}).filter(([, w]) => w?.ukryta).map(([k]) => k)), [plan?.warstwy])
    const skala = plan ? plan.skala ?? skalaZGeo(plan.geo) : null
    const promien = () => (vb[2] / (svgRef.current?.clientWidth || 1000)) * 9
    const punkt = (cx: number, cy: number): Pkt => {
        const s = svgRef.current!, p = s.createSVGPoint()
        p.x = cx; p.y = cy
        const q = p.matrixTransform(s.getScreenCTM()!.inverse())
        return [q.x, q.y]
    }
    const zaznacz = (ids: string[], glowny?: string) => { ustawZazn(new Set(ids)); ustawWzorId(glowny ?? ids[ids.length - 1] ?? null); if (ids.length) ustawZakl('element') }
    const widoczneDoPrzyciagania = () => plan!.elementy.filter((e) => !ukryteWarstwy.has(typy.get(e.typ)?.warstwa ?? ''))
    const przyciagnijP = (p: Pkt, pomin?: Set<string>, alt = false) => {
        if (alt) return { p, rodzaj: null }
        return przyciagnij(p, widoczneDoPrzyciagania(), typy, promien(), przyc, pomin)
    }
    const fmt = (jedn: number, rodz: 'dl' | 'pole' = 'dl') => {
        if (!skala) return `${jedn.toFixed(0)} j.`
        return rodz === 'dl' ? `${(jedn * skala).toFixed(jedn * skala < 10 ? 2 : 1)} m` : `${(jedn * skala * skala).toFixed(0)} m²`
    }

    // ---------- narzędzia ----------
    const wybierzNarzedzie = (n: Narzedzie) => {
        if (n === 'stempel' && plan) {
            const w = zazn.size === 1 ? wzor : null
            if (w && w.g.k === 'r') { ustawWzorStempla({ typ: w.typ, w: w.g.w, h: w.g.h, a: w.g.a }); ustawTypId(w.typ) }
            else ustawWzorStempla(null)
            pokaz(w && w.g.k === 'r' ? 'Stempel: wzorem jest zaznaczony grób – klikaj kolejne miejsca.' : 'Stempel: wzór – typowy grób w kwaterze. Żeby wziąć konkretny grób, zaznacz go przed wybraniem stempla.')
        }
        ustawNarz(n)
        ustawRys([])
    }
    const wzorDlaStempla = (p: Pkt): WzorStempla => {
        if (wzorStempla) return wzorStempla
        const wym = rozmiarGrobu(plan!, p[0], p[1], u)
        return { typ: typId, w: wym.w, h: wym.h, a: katWMiejscu(plan!, p[0], p[1]) }
    }

    // ---------- kolejne groby, filtry ----------
    // kolejność pracy: groby z numerem wg numeru, bez numeru – wg numeru proponowanego z położenia
    const grobyKolejno = React.useMemo(() => (plan ? kolejnoDoPracy(plan, typy) : []), [plan, typy])
    const pokazElement = (e: Element) => {
        const [cx, cy] = srodek(e.g)
        ustawVb(([x, y, w, h]) => (cx > x + w * 0.15 && cx < x + w * 0.85 && cy > y + h * 0.15 && cy < y + h * 0.85 ? [x, y, w, h] : [cx - w / 2, cy - h / 2, w, h]))
    }
    /** Tab / Shift+Tab, „następny” w terenie: kolejny grób wg numeracji (kwatera, rząd, miejsce); przy włączonym filtrze – kolejny pasujący */
    const nastepnyGrob = (d: 1 | -1) => {
        const L = grobyKolejno.filter((e) => pasujeDoFiltra(e, filtr))
        if (!L.length) { pokaz(filtr ? 'Nie ma grobów pasujących do filtra.' : 'Na planie nie ma jeszcze grobów.'); return }
        const pos = wzor ? grobyKolejno.findIndex((e) => e.id === wzor.id) : -1
        let e: Element
        if (pos < 0) e = d > 0 ? L[0] : L[L.length - 1]
        else if (d > 0) e = L.find((x) => grobyKolejno.indexOf(x) > pos) ?? L[0]
        else e = [...L].reverse().find((x) => grobyKolejno.indexOf(x) < pos) ?? L[L.length - 1]
        zaznacz([e.id]); pokazElement(e)
    }
    const pokazGrob = (id: string) => { const e = plan?.elementy.find((x) => x.id === id); if (e) { zaznacz([id]); pokazElement(e) } }
    /** zatwierdzenie tabeli różnic numeracji – jedna zmiana planu, jeden krok cofania; numery to nie dane grobu (etap bez zmian) */
    const zatwierdzNumery = () => {
        if (!roznice?.zmiany.length) { ustawRoznice(null); return }
        const zm = roznice.zmiany
        zmien((p) => ({ ...p, elementy: zastosujNumery(p.elementy, zm) }))
        ustawRoznice(null)
        pokaz(`Zapisano ${zm.length} zmian numerów. Ctrl+Z cofa całą operację.`)
    }
    const ustawTryb = (t: Tryb) => {
        ustawTrybSurowo(t); try { localStorage.setItem('plan-tryb', t) } catch { /* nic */ }
        if (t !== 'rysuj') { ustawNarz('wybierz'); ustawRys([]) }
    }
    /** N: następny grób do zrobienia w bieżącym trybie (kolejność numeracji, od zaznaczonego, w kółko). */
    const nastepnyDoZrobienia = (pomin?: string) => {
        const czeka = (e: Element) => e.id !== pomin && (tryb === 'sprawdz' ? etapElementu(e) !== 'sprawdzony' : etapElementu(e) === 'narysowany')
        const L = grobyKolejno.filter(czeka)
        if (!L.length) { pokaz(tryb === 'sprawdz' ? 'Wszystkie groby są sprawdzone.' : 'Wszystkie groby są opracowane.'); return }
        const pos = wzor ? grobyKolejno.findIndex((e) => e.id === wzor.id) : -1
        const e = L.find((x) => grobyKolejno.indexOf(x) > pos) ?? L[0]
        zaznacz([e.id]); pokazElement(e); ustawZakl('element')
    }

    // tryb terenowy: położenie z telefonu na planie
    React.useEffect(() => {
        if (!teren) { ustawPozycja(null); return }
        if (!('geolocation' in navigator)) { pokaz('Ta przeglądarka nie podaje położenia.'); return }
        const id = navigator.geolocation.watchPosition(
            (q) => ustawPozycja({ lat: q.coords.latitude, lon: q.coords.longitude, acc: q.coords.accuracy }),
            (er) => pokaz(er.code === 1 ? 'Brak zgody na położenie – zezwól stronie na lokalizację w ustawieniach przeglądarki.' : 'Nie udało się ustalić położenia.'),
            { enableHighAccuracy: true, maximumAge: 3000, timeout: 20000 },
        )
        return () => navigator.geolocation.clearWatch(id)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [teren])
    const g2p = React.useMemo(() => (plan && plan.geo.length >= 2 ? geoNaPlan(plan.geo) : null), [plan?.geo]) // eslint-disable-line react-hooks/exhaustive-deps
    const jaNaPlanie: Pkt | null = pozycja && g2p ? g2p(pozycja.lat, pozycja.lon) : null
    const najblizszyGrob = () => {
        if (!jaNaPlanie) return
        let best: Element | null = null, bd = Infinity
        for (const e of grobyKolejno) { const [a, b] = srodek(e.g), d = Math.hypot(a - jaNaPlanie[0], b - jaNaPlanie[1]); if (d < bd) { bd = d; best = e } }
        if (best) { zaznacz([best.id]); pokazElement(best) }
    }
    const oznaczSprawdzony = (id: string) => {
        const e = el(id)
        zmienElementy(new Map([[id, { etap: 'sprawdzony', ...(e?.stan === 'do-sprawdzenia' ? { stan: undefined } : {}) }]]))
    }
    const zdjecieZTerenu = async (f: File) => {
        const id = wzor?.id
        if (!id) return
        pokaz('wysyłam zdjęcie…')
        try {
            const w = await wyslijPlik(f, 'zdjecie')
            const zd: Zdjecie = { plik: w.plik, ...(pozycja ? { lat: +pozycja.lat.toFixed(6), lon: +pozycja.lon.toFixed(6) } : {}), data: new Date().toISOString().slice(0, 19) }
            zmien((p) => ({ ...p, elementy: p.elementy.map((x) => (x.id === id ? { ...x, ...poZmianieDanych(x, { zdjecia: [...(x.zdjecia ?? []), zd] }, typy.get(x.typ)) } : x)) }))
            natychmiast.current = true
            pokaz('Zdjęcie przypięte.')
        } catch (e) { pokaz(e instanceof Error ? e.message : 'błąd') }
    }
    const wczytajOsoby = () => {
        if (osobyDrzewa) return
        ustawOsobyDrzewa([])
        fetch('/api/keystatic/osoby').then((r) => (r.ok ? r.json() : null)).then((j) => ustawOsobyDrzewa(j?.osoby ?? [])).catch(() => ustawOsobyDrzewa([]))
    }

    const wymiaryNaZywo = (): string => {
        if (!plan) return ''
        const r = ruch.current
        if (narz === 'prostokat' && ramka && r?.rodzaj === 'prostokat') {
            const [a, b] = ramka, kat = typAktywny?.grob ? katWMiejscu(plan, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) : 0
            const k = (kat * Math.PI) / 180, dx = b[0] - a[0], dy = b[1] - a[1]
            return `${fmt(Math.abs(dx * Math.cos(k) + dy * Math.sin(k)))} × ${fmt(Math.abs(-dx * Math.sin(k) + dy * Math.cos(k)))}`
        }
        if (r && (r.rodzaj === 'rozmiar' || r.rodzaj === 'bok') && wzor?.g.k === 'r') return `${fmt(wzor.g.w)} × ${fmt(wzor.g.h)}`
        if ((narz === 'wielokat' || narz === 'linia') && rys.length && kursor) {
            const ost = rys[rys.length - 1], c = znacznik ?? kursor
            return `odcinek ${fmt(Math.hypot(c[0] - ost[0], c[1] - ost[1]))}${rys.length > 1 ? ` · razem ${fmt(dlugosc([...rys, c]))}` : ''}`
        }
        return ''
    }

    // ---------- tworzenie elementów ----------
    const typAktywny = typy.get(typId)
    const wybierzTyp = (id: string) => {
        ustawTypId(id)
        const t = typy.get(id)
        if (!t) return
        ustawNarz(t.rodzaj === 'punkt' ? 'punkt' : t.rodzaj === 'linia' ? 'linia' : t.rodzaj === 'napis' ? 'napis' : ['grob', 'budynek', 'gosp'].includes(t.rys) ? 'prostokat' : 'wielokat')
        ustawRys([])
    }
    const dodaj = (g: Geometria, reszta: Partial<Element> = {}) => {
        const e: Element = { id: noweId(), typ: typId, g, ...(typAktywny?.grob ? { etap: 'narysowany' as const } : {}), ...reszta }
        zmien((p) => ({ ...p, elementy: [...p.elementy, e] }))
        zaznacz([e.id])
        return e
    }
    const zakonczRysowanie = (pts: Pkt[] = rys) => {
        // bez powtórzonych punktów (dwuklik dodaje kliknięcia w tym samym miejscu)
        const min = promien() * 0.5
        const q = pts.filter((p, i) => i === 0 || Math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > min)
        if (narz === 'wielokat' && q.length >= 3) dodaj({ k: 'w', p: q })
        else if (narz === 'linia' && q.length >= 2) dodaj({ k: 'l', p: q })
        ustawRys([])
    }

    // ---------- duplikowanie, powielanie, schowek ----------
    const duplikuj = () => {
        if (!plan || !zaznaczone.length || !wzor) return
        const powtorz = ostatniaKopia.current && ostatniaKopia.current.ids.length === zaznaczone.length && zaznaczone.every((e) => ostatniaKopia.current!.ids.includes(e.id))
        const off = powtorz ? ostatniaKopia.current!.off : wektor(plan, zaznaczone, wzor, 'rzad', 1, null)
        const nowe = zaznaczone.map((e) => kopia(e, off[0], off[1]))
        zmienElementy(new Map(), nowe)
        zaznacz(nowe.map((e) => e.id))
        ostatniaKopia.current = { ids: nowe.map((e) => e.id), off }
        pokaz(powtorz ? 'Kolejna kopia w tym samym odstępie.' : 'Kopia obok – ten sam kształt, rozmiar i kąt. Przesuń ją, jeśli trzeba; następne Ctrl+D powtórzy odstęp.')
    }
    const planPowiel = (): Element[] => {
        if (!plan || !zaznaczone.length || !wzor) return []
        const [vx, vy] = wektor(plan, zaznaczone, wzor, pw.kier, pw.zn, pw.odstep)
        const L: Element[] = []
        for (let i = 1; i <= pw.ile; i++) for (const e of zaznaczone) L.push(kopia(e, vx * i, vy * i))
        return L
    }
    const powiel = () => {
        const L = planPowiel()
        if (!L.length || !plan || !wzor) return
        const off = wektor(plan, zaznaczone, wzor, pw.kier, pw.zn, pw.odstep)
        zmienElementy(new Map(), L)
        const ost = L.slice(-zaznaczone.length)
        zaznacz(ost.map((e) => e.id))
        ostatniaKopia.current = { ids: ost.map((e) => e.id), off }
        ustawPw((s) => ({ ...s, otwarte: false }))
        pokaz(`Dodano ${L.length} kopii.`)
    }
    const poRuchu = (dx: number, dy: number) => {
        const o = ostatniaKopia.current
        if (o && o.ids.length === zazn.size && o.ids.every((i) => zazn.has(i))) o.off = [o.off[0] + dx, o.off[1] + dy]
    }
    const kopiujSchowek = () => { if (zaznaczone.length) { schowek.current = zaznaczone; pokaz(`Skopiowano ${zaznaczone.length} – Ctrl+V wkleja pod kursorem.`) } }
    const wklej = () => {
        const s = schowek.current
        if (!s?.length || !plan) return
        const c = kursor ?? [vb[0] + vb[2] / 2, vb[1] + vb[3] / 2]
        const [sx, sy] = s.map((e) => srodek(e.g)).reduce((a, q) => [a[0] + q[0] / s.length, a[1] + q[1] / s.length], [0, 0])
        const nowe = s.map((e) => kopia(e, c[0] - sx, c[1] - sy))
        zmienElementy(new Map(), nowe)
        zaznacz(nowe.map((e) => e.id))
    }
    const usunZaznaczone = () => { if (zaznaczone.length) { zmienElementy(new Map(zaznaczone.map((e) => [e.id, null]))); zaznacz([]) } }
    const obrocZaznaczone = (da: number) => zmienElementy(new Map(zaznaczone.map((e) => [e.id, { g: obrocGeom(e.g, da) }])))
    const przesunZaznaczone = (dx: number, dy: number) => { zmienElementy(new Map(zaznaczone.filter((e) => !zablokowany(e)).map((e) => [e.id, { g: przesun(e.g, dx, dy) }]))); poRuchu(dx, dy) }

    // ---------- wskaźnik ----------
    type Ruch = {
        rodzaj: 'pan' | 'przesun' | 'obrot' | 'rozmiar' | 'bok' | 'wierzcholek' | 'ramka' | 'prostokat' | 'etykieta'
        start: Pkt; sx: number; sy: number; vb0: VB; ruch: boolean
        orig?: Map<string, Element>; id?: string; i?: number; kopie?: string[]; zwin?: string
    }
    const ruch = React.useRef<Ruch | null>(null)
    const wsk = React.useRef(new Map<number, [number, number]>())
    const pinch = React.useRef<{ d: number; vb: VB; c: Pkt } | null>(null)
    const spacja = React.useRef(false)

    const onDown = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!plan) return
        wsk.current.set(e.pointerId, [e.clientX, e.clientY])
        e.currentTarget.setPointerCapture(e.pointerId)
        if (wsk.current.size === 2) {
            if (ruch.current?.orig) zmien((p) => ({ ...p, elementy: p.elementy.map((x) => ruch.current!.orig!.get(x.id) ?? x).filter((x) => !ruch.current!.kopie?.includes(x.id)) }), true)
            ruch.current = null
            const [a, b] = [...wsk.current.values()]
            pinch.current = { d: Math.hypot(a[0] - b[0], a[1] - b[1]) || 1, vb, c: punkt((a[0] + b[0]) / 2, (a[1] + b[1]) / 2) }
            return
        }
        const p = punkt(e.clientX, e.clientY)
        const baza = { start: p, sx: e.clientX, sy: e.clientY, vb0: vb, ruch: false }
        if (e.button === 1 || e.button === 2 || spacja.current) { ruch.current = { rodzaj: 'pan', ...baza }; return }
        const cel = e.target as globalThis.Element
        const uch = cel.closest('[data-uchwyt]')?.getAttribute('data-uchwyt')
        if (uch && wzor) {
            const orig = new Map([[wzor.id, wzor]])
            if (uch === 'obrot') ruch.current = { rodzaj: 'obrot', ...baza, orig, id: wzor.id }
            else if (uch === 'rozmiar') ruch.current = { rodzaj: 'rozmiar', ...baza, orig, id: wzor.id }
            else if (uch.startsWith('bok:')) ruch.current = { rodzaj: 'bok', ...baza, orig, id: wzor.id, i: +uch.slice(4) }
            else if (uch.startsWith('w:')) {
                const i = +uch.slice(2)
                if (e.altKey && (wzor.g.k === 'w' || wzor.g.k === 'l')) {
                    const g = wzor.g
                    // PH3: szerokości w węzłach i ostre narożniki idą za węzłami
                    if (g.p.length > (g.k === 'w' ? 3 : 2)) zmienElementy(new Map([[wzor.id, { g: { ...g, p: g.p.filter((_, j) => j !== i) }, ...poUsunieciu(wzor, i) }]]))
                    return
                }
                ruch.current = { rodzaj: 'wierzcholek', ...baza, orig, id: wzor.id, i }
            } else if (uch.startsWith('m:') && (wzor.g.k === 'w' || wzor.g.k === 'l')) {
                const i = +uch.slice(2), g = wzor.g
                const np = [...g.p.slice(0, i + 1), p, ...g.p.slice(i + 1)], pola = poWstawieniu(wzor, i)
                zmienElementy(new Map([[wzor.id, { g: { ...g, p: np }, ...pola }]]))
                ruch.current = { rodzaj: 'wierzcholek', ...baza, orig: new Map([[wzor.id, { ...wzor, g: { ...g, p: np }, ...pola }]]), id: wzor.id, i: i + 1 }
            }
            return
        }
        const id = cel.closest('[data-id]')?.getAttribute('data-id') ?? null
        const trafiony = id ? el(id) : null
        const czesc = cel.closest('[data-czesc]')?.getAttribute('data-czesc')
        if (narz === 'wybierz') {
            if (trafiony && !zablokowany(trafiony)) {
                if (czesc === 'etykieta' && zazn.has(trafiony.id) && zazn.size === 1) { ruch.current = { rodzaj: 'etykieta', ...baza, orig: new Map([[trafiony.id, trafiony]]), id: trafiony.id }; return }
                if (e.shiftKey || e.ctrlKey || e.metaKey) {
                    const n = new Set(zazn)
                    if (n.has(trafiony.id)) n.delete(trafiony.id); else n.add(trafiony.id)
                    ustawZazn(n); ustawWzorId(trafiony.id); ustawZakl('element')
                    return
                }
                let ids = zazn.has(trafiony.id) ? [...zazn] : [trafiony.id]
                if (!zazn.has(trafiony.id)) zaznacz([trafiony.id])
                else ustawWzorId(trafiony.id)
                let kopie: string[] | undefined
                if (e.altKey) {
                    const nowe = plan.elementy.filter((x) => ids.includes(x.id)).map((x) => kopia(x, 0, 0))
                    zmien((pl) => ({ ...pl, elementy: [...pl.elementy, ...nowe] }))
                    kopie = nowe.map((x) => x.id); ids = kopie
                    zaznacz(kopie)
                    ruch.current = { rodzaj: 'przesun', ...baza, orig: new Map(nowe.map((x) => [x.id, x])), kopie }
                    return
                }
                ruch.current = { rodzaj: 'przesun', ...baza, orig: new Map(plan.elementy.filter((x) => ids.includes(x.id) && !zablokowany(x)).map((x) => [x.id, x])), zwin: zazn.size > 1 && zazn.has(trafiony.id) ? trafiony.id : undefined }
                return
            }
            ruch.current = { rodzaj: e.shiftKey ? 'ramka' : 'pan', ...baza }
            return
        }
        if (narz === 'prostokat') { ruch.current = { rodzaj: 'prostokat', ...baza, start: przyciagnijP(p, undefined, e.altKey).p }; return }
        ruch.current = { rodzaj: 'pan', ...baza }
    }

    const onMove = (e: React.PointerEvent<SVGSVGElement>) => {
        if (!plan) return
        if (wsk.current.has(e.pointerId)) wsk.current.set(e.pointerId, [e.clientX, e.clientY])
        if (pinch.current && wsk.current.size >= 2) {
            const [a, b] = [...wsk.current.values()], d = Math.hypot(a[0] - b[0], a[1] - b[1]) || 1
            const f = pinch.current.d / d, [x, y, w, h] = pinch.current.vb, [cx, cy] = pinch.current.c
            ustawVb([cx - (cx - x) * f, cy - (cy - y) * f, w * f, h * f])
            return
        }
        const p = punkt(e.clientX, e.clientY)
        ustawKursor(p)
        const r = ruch.current
        if (!r) {
            if (['punkt', 'wielokat', 'linia', 'napis', 'prostokat', 'miarka', 'skala', 'geo'].includes(narz)) {
                const s = przyciagnijP(p, undefined, e.altKey)
                ustawZnacznik(s.rodzaj ? s.p : null)
            } else ustawZnacznik(null)
            return
        }
        if (Math.hypot(e.clientX - r.sx, e.clientY - r.sy) > (e.pointerType === 'mouse' ? 3 : 8)) r.ruch = true
        if (!r.ruch) return
        const dx = p[0] - r.start[0], dy = p[1] - r.start[1]
        if (r.rodzaj === 'pan') {
            const k = r.vb0[2] / (svgRef.current?.clientWidth || 1)
            ustawVb([r.vb0[0] - (e.clientX - r.sx) * k, r.vb0[1] - (e.clientY - r.sy) * k, r.vb0[2], r.vb0[3]])
            return
        }
        if (r.rodzaj === 'ramka') { ustawRamka([r.start, p]); return }
        if (r.rodzaj === 'prostokat') { ustawRamka([r.start, przyciagnijP(p, undefined, e.altKey).p]); return }
        const orig = r.orig!
        if (r.rodzaj === 'przesun') {
            // przyciąganie: pierwszy zaznaczony element przyciąga swój najbliższy wierzchołek
            let ddx = dx, ddy = dy
            if (przyc.punkty && !e.altKey && orig.size === 1) {
                const [o] = orig.values(), pts = punktyElementu(o.g).map(([x, y]) => [x + dx, y + dy] as Pkt)
                const pomin = new Set(orig.keys())
                for (const q of pts) { const s = przyciagnij(q, widoczneDoPrzyciagania(), typy, promien(), { ...przyc, siatka: false }, pomin); if (s.rodzaj) { ddx += s.p[0] - q[0]; ddy += s.p[1] - q[1]; break } }
            }
            zmien((pl) => ({ ...pl, elementy: pl.elementy.map((x) => (orig.has(x.id) ? { ...x, g: przesun(orig.get(x.id)!.g, ddx, ddy) } : x)) }), true)
            return
        }
        const o = orig.get(r.id!)!
        if (r.rodzaj === 'etykieta') {
            zmien((pl) => ({ ...pl, elementy: pl.elementy.map((x) => (x.id === o.id ? { ...x, etykieta: { dx: (o.etykieta?.dx ?? 0) + dx, dy: (o.etykieta?.dy ?? (typy.get(o.typ)?.rodzaj === 'punkt' ? u * 1.55 : 0)) + dy } } : x)) }), true)
            return
        }
        let g: Geometria = o.g
        if (r.rodzaj === 'obrot' && (g.k === 'r' || g.k === 't')) {
            const a0 = Math.atan2(p[1] - g.y, p[0] - g.x) * 180 / Math.PI + 90
            const [cx, cy] = [g.x, g.y]
            const a = przyciagnijKat(((a0 + 540) % 360) - 180, typGrobu(typy.get(o.typ)) ? katWMiejscu(plan, cx, cy) : null, e.shiftKey)
            g = { ...g, a }
        } else if (r.rodzaj === 'rozmiar' && g.k === 'r') {
            const a = (g.a * Math.PI) / 180, lx = (p[0] - g.x) * Math.cos(a) + (p[1] - g.y) * Math.sin(a), ly = -(p[0] - g.x) * Math.sin(a) + (p[1] - g.y) * Math.cos(a)
            g = { ...g, w: Math.max(u * 0.1, Math.abs(lx) * 2), h: Math.max(u * 0.1, Math.abs(ly) * 2) }
        } else if (r.rodzaj === 'bok' && g.k === 'r') {
            g = rozmiarBokiem(g, r.i ?? 0, p, u * 0.1, e.altKey)
        } else if (r.rodzaj === 'wierzcholek' && (g.k === 'w' || g.k === 'l')) {
            const s = przyciagnijP(p, new Set([o.id]), e.altKey)
            g = { ...g, p: g.p.map((q, j) => (j === r.i ? s.p : q)) }
        }
        zmien((pl) => ({ ...pl, elementy: pl.elementy.map((x) => (x.id === o.id ? { ...x, g } : x)) }), true)
    }

    const onUp = (e: React.PointerEvent<SVGSVGElement>) => {
        wsk.current.delete(e.pointerId)
        if (pinch.current) { if (wsk.current.size < 2) pinch.current = null; ruch.current = null; return }
        const r = ruch.current
        ruch.current = null
        if (!plan) return
        const p = punkt(e.clientX, e.clientY)
        if (r && r.ruch) {
            if (r.rodzaj === 'ramka') {
                const [a, b] = [r.start, p], x0 = Math.min(a[0], b[0]), x1 = Math.max(a[0], b[0]), y0 = Math.min(a[1], b[1]), y1 = Math.max(a[1], b[1])
                const ids = plan.elementy.filter((x) => !zablokowany(x) && !ukryteWarstwy.has(typy.get(x.typ)?.warstwa ?? '') && (() => { const [cx, cy] = srodek(x.g); return cx >= x0 && cx <= x1 && cy >= y0 && cy <= y1 })()).map((x) => x.id)
                zaznacz([...new Set([...zazn, ...ids])])
                ustawRamka(null)
                return
            }
            if (r.rodzaj === 'prostokat') {
                const b = przyciagnijP(p, undefined, e.altKey).p, a = r.start
                const kat = typAktywny?.grob ? katWMiejscu(plan, (a[0] + b[0]) / 2, (a[1] + b[1]) / 2) : 0
                const k = (kat * Math.PI) / 180, dx = b[0] - a[0], dy = b[1] - a[1]
                const w = Math.abs(dx * Math.cos(k) + dy * Math.sin(k)), h = Math.abs(-dx * Math.sin(k) + dy * Math.cos(k))
                if (w > u * 0.05 && h > u * 0.05) dodaj({ k: 'r', x: (a[0] + b[0]) / 2, y: (a[1] + b[1]) / 2, w, h, a: kat })
                ustawRamka(null)
                return
            }
            if (r.orig && (r.rodzaj === 'przesun' || r.rodzaj === 'obrot' || r.rodzaj === 'rozmiar' || r.rodzaj === 'bok' || r.rodzaj === 'wierzcholek' || r.rodzaj === 'etykieta')) {
                // zapis do historii: stan sprzed przeciągania
                const przed = { ...plan, elementy: plan.elementy.map((x) => r.orig!.get(x.id) ?? x).filter((x) => !r.kopie?.includes(x.id)) }
                historia.current.push(przed); naprzod.current = []
                brudny.current = true; ustawZapis('zmiany')
                if (r.rodzaj === 'przesun') {
                    const [first] = r.orig.keys(), now = plan.elementy.find((x) => x.id === first), o = r.orig.get(first)!
                    if (now) { const [a, b] = srodek(now.g), [c, d] = srodek(o.g); if (r.kopie) ostatniaKopia.current = { ids: r.kopie, off: [a - c, b - d] }; else poRuchu(a - c, b - d) }
                }
            }
            return
        }
        // kliknięcie (bez przeciągania)
        if (r?.kopie) { zmien((pl) => ({ ...pl, elementy: pl.elementy.filter((x) => !r.kopie!.includes(x.id)) }), true); return }
        if (r?.zwin) { zaznacz([r.zwin]); return }
        const s = przyciagnijP(p, undefined, e.altKey).p
        switch (narz) {
            case 'wybierz':
                if (r?.rodzaj === 'pan' || r?.rodzaj === 'ramka') zaznacz([])
                break
            case 'punkt': dodaj({ k: 'p', x: s[0], y: s[1] }); break
            case 'stempel': {
                const wz = wzorDlaStempla(p)
                const q = e.altKey ? { x: p[0], y: p[1], a: wz.a } : pozycjaStempla(plan, p, wz)
                const t = typy.get(wz.typ)
                const nowy: Element = { id: noweId(), typ: wz.typ, g: { k: 'r', x: q.x, y: q.y, w: wz.w, h: wz.h, a: q.a }, ...(t?.grob ? { etap: 'narysowany' as const } : {}) }
                zmien((pl) => ({ ...pl, elementy: [...pl.elementy, nowy] }))
                ustawZazn(new Set([nowy.id])); ustawWzorId(nowy.id)
                break
            }
            case 'napis': { const n = dodaj({ k: 't', x: s[0], y: s[1], a: 0 }, { nazwa: 'napis', styl: 'kursywa' }); window.setTimeout(() => { const i = document.getElementById(`pole-nazwa-${n.id}`) as HTMLInputElement | null; i?.focus(); i?.select() }, 50); break }
            case 'prostokat': {
                const kat = typAktywny?.grob ? katWMiejscu(plan, s[0], s[1]) : 0
                const wym = typAktywny?.grob ? rozmiarGrobu(plan, s[0], s[1], u) : { w: u * 2, h: u * 1.4 }
                dodaj({ k: 'r', x: s[0], y: s[1], w: wym.w, h: wym.h, a: kat })
                break
            }
            case 'wielokat': case 'linia': case 'miarka': ustawRys((q) => [...q, s]); break
            case 'skala': ustawRys((q) => (q.length >= 2 ? [s] : [...q, s])); break
            case 'geo': ustawRys([s]); break
            case 'dopasuj': {
                if (!dop) break
                const pd = plan.podklady.find((x) => x.id === dop.podklad)
                if (!pd) break
                const ost = dop.pary[dop.pary.length - 1]
                if (!ost || ost.cel) ustawDop({ ...dop, pary: [...dop.pary, { zr: zastosuj(odwrotna(pd.macierz), s) }] })
                else ustawDop({ ...dop, pary: [...dop.pary.slice(0, -1), { ...ost, cel: s }] })
                break
            }
        }
    }
    const onDouble = () => { if (narz === 'wielokat' || narz === 'linia') window.setTimeout(() => zakonczRysowanie(rysRef.current), 30) }

    React.useEffect(() => {
        const s = svgRef.current
        if (!s) return
        const kolko = (e: WheelEvent) => {
            e.preventDefault()
            const [cx, cy] = punkt(e.clientX, e.clientY), f = e.deltaY > 0 ? 1.15 : 1 / 1.15
            ustawVb(([x, y, w, h]) => [cx - (cx - x) * f, cy - (cy - y) * f, w * f, h * f])
        }
        s.addEventListener('wheel', kolko, { passive: false })
        return () => s.removeEventListener('wheel', kolko)
    })

    // ---------- klawiatura ----------
    React.useEffect(() => {
        const dol = (e: KeyboardEvent) => {
            if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); zapiszTerazRef.current(); return }
            if ((e.target as HTMLElement).closest('input,textarea,select')) return
            const k = e.key.toLowerCase(), mod = e.ctrlKey || e.metaKey
            if (e.key === ' ') { spacja.current = true; return }
            if (mod && k === 'z') { e.preventDefault(); if (e.shiftKey) ponow(); else cofnij(); return }
            if (mod && k === 'y') { e.preventDefault(); ponow(); return }
            if (mod && k === 'd') { e.preventDefault(); duplikuj(); return }
            if (mod && k === 'c') { kopiujSchowek(); return }
            if (mod && k === 'v') { e.preventDefault(); wklej(); return }
            if (mod && k === 'a') {
                e.preventDefault()
                const t = wzor?.typ
                zaznacz(plan!.elementy.filter((x) => (!t || x.typ === t) && !zablokowany(x)).map((x) => x.id))
                return
            }
            if (mod) return
            if (e.key === 'Escape') { ustawRys([]); zaznacz([]); ustawNarz('wybierz'); ustawDop(null); return }
            if (e.key === 'Enter') { zakonczRysowanie(); return }
            if (k === 'n' && tryb !== 'rysuj') { nastepnyDoZrobienia(); return }
            const n = NARZEDZIA.find((x) => x.klawisz === e.key)
            if (n) { if (tryb === 'rysuj' || n.id === 'wybierz') wybierzNarzedzie(n.id); return }
            if (k === 'g') { wybierzTyp('grob'); return }
            if (k === 'k') { wybierzTyp('krzyz'); return }
            if (e.key === 'Tab') { e.preventDefault(); nastepnyGrob(e.shiftKey ? -1 : 1); return }
            if ((e.key === 'Backspace' || e.key === 'Delete') && rys.length) { e.preventDefault(); ustawRys((q) => q.slice(0, -1)); return }
            if (!zaznaczone.length) return
            const krok = (e.shiftKey ? 1 : 0.1) * u
            const m: Record<string, Pkt> = { ArrowLeft: [-krok, 0], ArrowRight: [krok, 0], ArrowUp: [0, -krok], ArrowDown: [0, krok] }
            if (m[e.key]) { e.preventDefault(); przesunZaznaczone(...m[e.key]); return }
            if (e.key === 'Delete' || e.key === 'Backspace') { e.preventDefault(); usunZaznaczone(); return }
            if (e.key === 'r') obrocZaznaczone(1); else if (e.key === 'R') obrocZaznaczone(-1)
            else if (e.key === ']') obrocZaznaczone(5); else if (e.key === '[') obrocZaznaczone(-5)
        }
        const gora = (e: KeyboardEvent) => { if (e.key === ' ') spacja.current = false }
        window.addEventListener('keydown', dol)
        window.addEventListener('keyup', gora)
        return () => { window.removeEventListener('keydown', dol); window.removeEventListener('keyup', gora) }
    })

    // ---------- pliki ----------
    const wyslijPlik = async (f: File, rodzaj: 'podklad' | 'zdjecie') => {
        const fd = new FormData()
        fd.append('plik', f); fd.append('rodzaj', rodzaj)
        const r = await fetch(`${API(slug)}/plik`, { method: 'POST', body: fd })
        const j = await r.json().catch(() => ({}))
        if (!r.ok) throw new Error(j.blad || 'Nie udało się wgrać pliku.')
        return j as { plik: string; szer: number; wys: number }
    }
    const wgrajPodklad = async (f: File) => {
        pokaz('wgrywam podkład…')
        try {
            const z = await wyslijPlik(f, 'podklad')
            zmien((p) => {
                const pierwszy = p.podklady.length === 0
                const k = pierwszy ? 1 : p.szer / (z.szer || p.szer)
                const nowy: Podklad = { id: noweId(), plik: z.plik, nazwa: f.name.replace(/\.[^.]+$/, ''), szer: z.szer, wys: z.wys, macierz: pierwszy ? JEDNOSTKOWA : [k, 0, 0, k, 0, 0], krycie: 1, widocznosc: 'edycja' }
                return { ...p, ...(pierwszy && p.elementy.length === 0 ? { szer: z.szer, wys: z.wys } : {}), podklady: [...p.podklady, nowy] }
            })
            const p = planRef.current
            if (p && p.podklady.length === 0 && p.elementy.length === 0) ustawVb([0, 0, z.szer, z.wys])
            pokaz(planRef.current?.podklady.length ? 'Podkład wgrany. Dopasuj go do pierwszego trzema wspólnymi punktami.' : 'Podkład wgrany.')
        } catch (e) { pokaz(e instanceof Error ? e.message : 'błąd') }
    }

    // zdjęcia z GPS
    type ZdjecieDoPrzypiecia = { plik: File; url: string; lat?: number; lon?: number; data?: string; propozycja: string | null; odl?: number }
    const [zdjecia, ustawZdjecia] = React.useState<ZdjecieDoPrzypiecia[]>([])
    const [przypinane, ustawPrzypinane] = React.useState<number | null>(null)
    const wczytajZdjecia = async (pliki: FileList) => {
        if (!plan) return
        const L: ZdjecieDoPrzypiecia[] = []
        for (const f of Array.from(pliki)) {
            const ex = f.type === 'image/jpeg' || /\.jpe?g$/i.test(f.name) ? odczytajExif(await f.arrayBuffer()) : {}
            let propozycja: string | null = null, odl: number | undefined
            if (ex.lat !== undefined && ex.lon !== undefined) {
                const p = propozycjaGrobu(plan, (x) => typGrobu(typy.get(x.typ)), skala, ex.lat, ex.lon)
                if (p) { propozycja = p.id; odl = p.odl }
            }
            L.push({ plik: f, url: URL.createObjectURL(f), ...ex, propozycja, odl })
        }
        ustawZdjecia((z) => [...z, ...L])
        ustawZakl('zdjecia')
    }
    const przypnij = async (i: number, elementId: string) => {
        const z = zdjecia[i]
        if (!z) return
        try {
            const w = await wyslijPlik(z.plik, 'zdjecie')
            const zd: Zdjecie = { plik: w.plik, ...(z.lat !== undefined ? { lat: z.lat, lon: z.lon } : {}), ...(z.data ? { data: z.data } : {}) }
            zmien((p) => ({ ...p, elementy: p.elementy.map((x) => (x.id === elementId ? { ...x, ...poZmianieDanych(x, { zdjecia: [...(x.zdjecia ?? []), zd] }, typy.get(x.typ)) } : x)) }))
            ustawZdjecia((L) => L.filter((_, j) => j !== i))
            pokaz('Zdjęcie przypięte.')
        } catch (e) { pokaz(e instanceof Error ? e.message : 'błąd') }
    }
    const przypnijWszystkie = async () => {
        const L = zdjecia.filter((z) => z.propozycja)
        if (!L.length) return
        pokaz(`przypinam ${L.length}…`)
        const dodane = new Map<string, Zdjecie[]>(), gotowe = new Set<string>()
        let bledy = 0
        for (const z of L) {
            try {
                const w = await wyslijPlik(z.plik, 'zdjecie')
                const zd: Zdjecie = { plik: w.plik, ...(z.lat !== undefined ? { lat: z.lat, lon: z.lon } : {}), ...(z.data ? { data: z.data } : {}) }
                dodane.set(z.propozycja!, [...(dodane.get(z.propozycja!) ?? []), zd]); gotowe.add(z.url)
            } catch { bledy++ }
        }
        if (dodane.size) zmien((p) => ({ ...p, elementy: p.elementy.map((x) => (dodane.has(x.id) ? { ...x, ...poZmianieDanych(x, { zdjecia: [...(x.zdjecia ?? []), ...dodane.get(x.id)!] }, typy.get(x.typ)) } : x)) }))
        ustawZdjecia((Z) => Z.filter((z) => !gotowe.has(z.url)))
        pokaz(`Przypięto ${gotowe.size} zdjęć${bledy ? `, ${bledy} nie udało się wysłać` : ''}.`)
    }
    // kliknięcie grobu w trybie „wybierz inny” przypina zdjęcie
    React.useEffect(() => {
        if (przypinane === null || zazn.size !== 1) return
        const [id] = [...zazn]
        if (typGrobu(typy.get(el(id)?.typ ?? ''))) { przypnij(przypinane, id); ustawPrzypinane(null) }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [zazn])

    if (blad) return <Pelny><p style={{ padding: 24 }}>{blad} <a href="/keystatic/plany">← plany</a></p></Pelny>
    if (!plan) return <Pelny><p style={{ padding: 24 }}>wczytuję plan…</p></Pelny>

    const prefix = `ed-${plan.slug}`
    const duchy = pw.otwarte ? planPowiel() : []
    const rodzajGrup = rodzajPlanu(plan)
    const grupyOtwarte = new Set(pamiecGrup[rodzajGrup] ?? GRUPY_ROZWINIETE[rodzajGrup])
    const przelaczGrupe = (g: string) => {
        const n = new Set(grupyOtwarte)
        if (n.has(g)) n.delete(g); else n.add(g)
        const nowa = { ...pamiecGrup, [rodzajGrup]: [...n] }
        ustawPamiecGrup(nowa)
        try { localStorage.setItem('plan-grupy', JSON.stringify(nowa)) } catch { /* bez pamięci */ }
    }
    const grupy = GRUPY.map((g) => ({ g, t: [...typy.values()].filter((t) => t.grupa === g && !ukryteTypy.has(t.id) && (!szukajTypu || t.nazwa.toLowerCase().includes(szukajTypu.toLowerCase()))) })).filter((x) => x.t.length)
    const r = promien()

    return (
        <Pelny>
            <style>{CSS}</style>
            <WzoryProbek prefix={`${prefix}-sw`} />
            <header className={`ed-pasek${teren ? ' ed-pasek-teren' : ''} ed-tryb-${tryb}`}>
                <a href="/keystatic/plany" className="ed-btn">← plany</a>
                <b className="ed-tytul">{plan.tytul}</b>
                <span className={`ed-zapis ed-zapis-${zapis}`}>{{ ok: 'zapisano', zmiany: 'zmiany…', zapisuje: 'zapisuję…', blad: 'błąd zapisu – ponawiam', odrzucony: 'zapis odrzucony – popraw powtórzony numer grobu', konflikt: 'plan zmieniono w innym oknie – zmiany z tego okna nie są jeszcze zapisane' }[zapis]}</span>
                {kopiaPrz && <span className="ed-kopia">{kopiaPrz.zrodlo === 'serwer' ? 'Na serwerze jest szkic niezapisanej wersji planu' : 'W tej przeglądarce jest dawna kopia niezapisanej wersji planu'} z {new Date(kopiaPrz.czas).toLocaleString('pl-PL')}. <button className="ed-btn" onClick={przywrocKopie}>przywróć ją</button> <button className="ed-btn" onClick={() => { usunSzkic(); ustawKopiaPrz(null) }}>odrzuć</button></span>}
                {zapis === 'konflikt' && <>
                    <button className="ed-btn" onClick={zachowajMoja} title="Zapisz plan z tego okna na serwerze (zastąpi wersję z innego okna)">zachowaj moją wersję</button>
                    <button className="ed-btn" onClick={() => { if (confirm('Wczytać plan z serwera? Zmiany z tego okna zostają w szkicu na serwerze – po wczytaniu możesz je przywrócić albo odrzucić.')) { brudny.current = false; zapiszKopie(); window.setTimeout(() => location.reload(), 600) } }}>wczytaj z serwera</button>
                </>}
                <span className="ed-ostatni" title={ostatniZapis ? `ostatni udany zapis na serwerze: ${ostatniZapis.toLocaleString('pl-PL')}` : 'ten plan nie był jeszcze zapisany z edytora'}>{ostatniZapis ? `zapis: ${ostatniZapis.toLocaleTimeString('pl-PL')}${ostatniZapis.toDateString() !== new Date().toDateString() ? ` (${ostatniZapis.toLocaleDateString('pl-PL')})` : ''}` : 'zapis: —'}</span>
                <button className="ed-btn" onClick={zapiszTeraz} disabled={zapis === 'zapisuje'} title="Zapisz na serwerze teraz (Ctrl+S)">zapisz teraz</button>
                <button className="ed-btn ed-nie-teren" onClick={pobierzPlik} title="Pobierz plan z tego okna jako plik .plan.json (kopia na komputer; można go zaimportować na liście planów)">pobierz</button>
                <span className="ed-sep ed-nie-teren" />
                <div className="ed-seg ed-nie-teren" role="group" aria-label="tryb pracy">{TRYBY.map(([t, n, o]) => <button key={t} aria-pressed={tryb === t} title={o} onClick={() => ustawTryb(t)}>{n}</button>)}</div>
                {tryb !== 'rysuj' && <button className="ed-btn ed-nie-teren" onClick={() => nastepnyDoZrobienia()} title="klawisz N">{tryb === 'sprawdz' ? 'następny niesprawdzony' : 'następny nieopracowany'}</button>}
                <span className="ed-sep ed-nie-teren ed-tylko-rysuj" />
                <div className="ed-seg ed-nie-teren ed-tylko-rysuj">{NARZEDZIA.map((n) => <button key={n.id} aria-pressed={narz === n.id} title={`${n.nazwa} (${n.klawisz})`} onClick={() => wybierzNarzedzie(n.id)}>{n.nazwa}</button>)}</div>
                <span className="ed-sep ed-nie-teren" />
                <button className="ed-btn" onClick={cofnij} disabled={!historia.current.length} title="Cofnij (Ctrl+Z)">cofnij</button>
                <button className="ed-btn" onClick={ponow} disabled={!naprzod.current.length} title="Ponów (Ctrl+Shift+Z)">ponów</button>
                <label className="ed-ch ed-nie-teren ed-tylko-rysuj" title="Przyciąganie do wierzchołków i krawędzi (Alt podczas rysowania wyłącza)"><input type="checkbox" checked={przyc.punkty} onChange={(e) => ustawPrzyc({ ...przyc, punkty: e.target.checked })} /> przyciąganie</label>
                <label className="ed-ch ed-nie-teren ed-tylko-rysuj"><input type="checkbox" checked={przyc.siatka} onChange={(e) => ustawPrzyc({ ...przyc, siatka: e.target.checked })} /> siatka</label>
                {przyc.siatka && <input className="ed-in" style={{ width: 64 }} type="number" min={1} value={przyc.krok} onChange={(e) => ustawPrzyc({ ...przyc, krok: Math.max(1, +e.target.value || 1) })} title="krok siatki (jednostki planu)" />}
                {plan.podklady.some((p) => !ukrytePodklady.has(p.id)) && <label className="ed-ch" title="krycie rysunku nad podkładem">rysunek <input type="range" min={0.1} max={1} step={0.05} value={kryRys} onChange={(e) => ustawKryRys(+e.target.value)} style={{ width: 80 }} /></label>}
                <span style={{ flex: 1 }} />
                <button className="ed-btn" aria-pressed={teren} onClick={() => { if (!teren && plan.geo.length < 2) { pokaz('Tryb terenowy potrzebuje co najmniej 2 punktów geo (zakładka „plan”).'); return } ustawTeren(!teren); ustawNarz('wybierz') }} title="Na cmentarzu z telefonem: twoje położenie na planie, zdjęcie i „sprawdzony” jednym dotknięciem">w terenie</button>
                <a className="ed-btn ed-nie-teren" href={`/plany/${plan.slug}`} target="_blank" rel="noreferrer">zobacz na stronie ↗</a>
            </header>
            <div className={`ed-glowna${teren ? ' ed-glowna-teren' : ''}`} style={{ gridTemplateColumns: teren || tryb !== 'rysuj' ? `minmax(0,1fr) 6px ${szerPanelu}px` : paletaOtwarta ? `${szerPalety}px 6px minmax(0,1fr) 6px ${szerPanelu}px` : `36px minmax(0,1fr) 6px ${szerPanelu}px` }}>
                {!teren && tryb === 'rysuj' && <aside className="ed-paleta" aria-label="paleta typów">
                    <button className="ed-btn" style={{ width: '100%' }} onClick={() => ustawPaletaOtwarta((o) => !o)} title="pokaż / ukryj typy">{paletaOtwarta ? '« typy' : '»'}</button>
                    {paletaOtwarta && (
                        <>
                            <form role="search" aria-label="szukaj typu" onSubmit={(e) => { e.preventDefault(); const t = grupy[0]?.t[0]; if (t) wybierzTyp(t.id) }}><input type="search" className="ed-in pn-in-szukaj" placeholder="typ, np. krzyż" aria-label="szukaj typu" value={szukajTypu} onChange={(e) => ustawSzukajTypu(e.target.value)} /></form>
                            {grupy.map(({ g, t }) => {
                                const otwarta = !!szukajTypu || grupyOtwarte.has(g)
                                return (
                                <div key={g} className="ed-grupa">
                                    <button type="button" className="ed-gt ed-gt-przycisk" aria-expanded={otwarta} onClick={() => przelaczGrupe(g)}>{otwarta ? '▾' : '▸'} {g} <span className="ed-maly">{t.length}</span></button>
                                    {otwarta && t.map((x) => (
                                        <button key={x.id} className="ed-typ" aria-pressed={typId === x.id} onClick={() => wybierzTyp(x.id)} title={x.nazwa}>
                                            <Probka typ={x} prefix={`${prefix}-sw`} /><span>{x.nazwa}</span>
                                        </button>
                                    ))}
                                </div>
                                )
                            })}
                            <a href="/keystatic/plany/typy" className="ed-maly">katalog typów (widoczność, własne) →</a>
                        </>
                    )}
                </aside>}
                {!teren && tryb === 'rysuj' && paletaOtwarta && <Uchwyt wartosc={szerPalety} ustaw={ustawSzerPalety} domyslna={230} min={170} max={420} po="lewej" etykieta="szerokość palety typów" />}
                <div className="ed-mapa">
                    <svg ref={svgRef} viewBox={vb.join(' ')} onPointerDown={onDown} onPointerMove={onMove} onPointerUp={onUp} onPointerCancel={onUp} onDoubleClick={onDouble} onContextMenu={(e) => e.preventDefault()}
                        style={{ cursor: narz === 'wybierz' ? 'default' : 'crosshair' }}>
                        <defs><Wzory prefix={prefix} u={u} /></defs>
                        <rect x={vb[0] - vb[2]} y={vb[1] - vb[3]} width={vb[2] * 3} height={vb[3] * 3} style={{ fill: 'var(--pl-papier)' }} />
                        {przyc.siatka && <Siatka vb={vb} krok={przyc.krok} />}
                        {plan.podklady.filter((p) => !ukrytePodklady.has(p.id)).map((p) => (
                            <image key={p.id} href={adresPodkladu(slug, p, listy.materialy)} width={p.szer} height={p.wys} transform={`matrix(${p.macierz.join(' ')})`} opacity={p.krycie} preserveAspectRatio="none" pointerEvents="none" />
                        ))}
                        <g opacity={plan.podklady.some((p) => !ukrytePodklady.has(p.id)) ? kryRys : 1}>
                            <RysunekPlanu plan={{ ...plan, obrot: 0 }} o={{ prefix, typy, ukryteTypy, wybrane: zazn, numery, ukryteWarstwy, edycja: true }} />
                        </g>
                        {/* przy przezroczystym rysunku kontury zostają w pełni widoczne – żeby było widać, co się edytuje */}
                        {plan.podklady.some((p) => !ukrytePodklady.has(p.id)) && kryRys < 1 && (
                            <Kontury elementy={plan.elementy.filter((e) => !ukryteTypy.has(e.typ) && !ukryteWarstwy.has(typy.get(e.typ)?.warstwa ?? ''))} r={r} />
                        )}
                        {filtr && grobyKolejno.filter((e) => pasujeDoFiltra(e, filtr)).map((e) => <polygon key={e.id} points={punktyElementu(e.g).map((q) => q.join(',')).join(' ')} className="ed-filtr" pointerEvents="none" />)}
                        {jaNaPlanie && <g pointerEvents="none">
                            {skala && pozycja && <circle cx={jaNaPlanie[0]} cy={jaNaPlanie[1]} r={pozycja.acc / skala} className="ed-ja-acc" />}
                            <circle cx={jaNaPlanie[0]} cy={jaNaPlanie[1]} r={r * 0.9} className="ed-ja" />
                        </g>}
                        <Nakladka plan={plan} wzor={zazn.size === 1 ? wzor : null} zaznaczone={zaznaczone} r={r} u={u} />
                        {narz === 'stempel' && kursor && !ruch.current && (() => {
                            const wz = wzorDlaStempla(kursor), q = pozycjaStempla(plan, kursor, wz)
                            return <polygon points={punktyElementu({ k: 'r', x: q.x, y: q.y, w: wz.w, h: wz.h, a: q.a }).map((t) => t.join(',')).join(' ')} className={q.przyciagniety ? 'ed-duch ed-duch-ok' : 'ed-duch'} pointerEvents="none" />
                        })()}
                        {duchy.map((d) => <polygon key={d.id} points={punktyElementu(d.g).map((q) => q.join(',')).join(' ')} className="ed-duch" />)}
                        {ramka && <rect x={Math.min(ramka[0][0], ramka[1][0])} y={Math.min(ramka[0][1], ramka[1][1])} width={Math.abs(ramka[1][0] - ramka[0][0])} height={Math.abs(ramka[1][1] - ramka[0][1])} className="ed-ramka" />}
                        {rys.length > 0 && (
                            <g pointerEvents="none">
                                <polyline points={[...rys, ...(kursor && narz !== 'geo' ? [znacznik ?? kursor] : [])].map((q) => q.join(',')).join(' ')} className={narz === 'miarka' || narz === 'skala' ? 'ed-miarka' : 'ed-rys'} />
                                {rys.map((q, i) => <circle key={i} cx={q[0]} cy={q[1]} r={r * 0.45} className="ed-wierz" />)}
                            </g>
                        )}
                        {znacznik && <circle cx={znacznik[0]} cy={znacznik[1]} r={r * 0.7} className="ed-znacznik" pointerEvents="none" />}
                        {plan.geo.map((g, i) => <g key={i} pointerEvents="none"><circle cx={g.x} cy={g.y} r={r * 0.8} className="ed-geo" /><text x={g.x + r} y={g.y - r} fontSize={r * 1.4} className="ed-geo-t">{i + 1}</text></g>)}
                        {dop?.pary.map((q, i) => {
                            const pd = plan.podklady.find((x) => x.id === dop.podklad)
                            const a = pd ? zastosuj(pd.macierz, q.zr) : q.zr
                            return <g key={i} pointerEvents="none"><circle cx={a[0]} cy={a[1]} r={r * 0.7} className="ed-dop-zr" />{q.cel && <><line x1={a[0]} y1={a[1]} x2={q.cel[0]} y2={q.cel[1]} className="ed-dop-l" /><circle cx={q.cel[0]} cy={q.cel[1]} r={r * 0.7} className="ed-dop-cel" /></>}</g>
                        })}
                    </svg>
                    <div className="ed-zoom">
                        <button onClick={() => ustawVb(([x, y, w, h]) => [x + w * 0.15, y + h * 0.15, w * 0.7, h * 0.7])} aria-label="przybliż">+</button>
                        <button onClick={() => ustawVb(([x, y, w, h]) => [x - w * 0.2, y - h * 0.2, w * 1.4, h * 1.4])} aria-label="oddal">−</button>
                        <button onClick={() => ustawVb(poczatkowyKadr(plan))} aria-label="cały plan">⤢</button>
                    </div>
                    <div className="ed-pomoc">{podpowiedz(narz, rys.length, typAktywny, dop)}{(narz === 'miarka' && rys.length > 1) && <b> · {fmt(dlugosc(rys))}</b>}{wymiaryNaZywo() && <b> · {wymiaryNaZywo()}</b>}</div>
                    {grobyKolejno.length > 0 && !teren && (() => {
                        const n = (f: Filtr) => grobyKolejno.filter((e) => pasujeDoFiltra(e, f)).length
                        const fl: [Filtr, string, number][] = [['bezNapisu', 'bez napisu', n('bezNapisu')], ['bezZdjecia', 'bez zdjęcia', n('bezZdjecia')], ['niesprawdzone', 'niesprawdzone', n('niesprawdzone')], ['nieopracowane', 'nieopracowane', n('nieopracowane')]]
                        return (
                            <div className="ed-staty">
                                <span title="groby na planie (z numeracją kwatera · rząd · miejsce)">{grobyKolejno.length} grobów</span>
                                {fl.map(([f, t, k]) => <button key={f} aria-pressed={filtr === f} disabled={!k && filtr !== f} onClick={() => ustawFiltr(filtr === f ? '' : f)} title={filtr === f ? 'wyłącz filtr' : `pokaż na planie: ${t}`}>{t} {k}</button>)}
                                {filtr && <button onClick={() => nastepnyGrob(1)} title="następny pasujący (Tab)">następny ›</button>}
                            </div>
                        )
                    })()}
                    {teren && (
                        <div className="ed-teren">
                            <div className="ed-teren-info">{pozycja ? (jaNaPlanie ? `±${Math.round(pozycja.acc)} m` : 'położenie poza planem') : 'szukam położenia…'}{wzor && numery.get(wzor.id) ? ` · ${numerTekst(numery.get(wzor.id))}` : wzor ? ' · zaznacz grób' : ' · dotknij grobu'}{wzor && (wzor.zdjecia?.length ? ` · ${wzor.zdjecia.length} zdj.` : ' · bez zdjęcia')}{wzor && pasujeDoFiltra(wzor, 'niesprawdzone') ? ' · niesprawdzony' : ''}</div>
                            <div className="ed-rzad">
                                <button className="ed-btn" disabled={!jaNaPlanie} onClick={() => { if (jaNaPlanie) ustawVb(([, , w, h]) => [jaNaPlanie[0] - w / 2, jaNaPlanie[1] - h / 2, w, h]) }}>do mnie</button>
                                <button className="ed-btn" disabled={!jaNaPlanie} onClick={najblizszyGrob}>najbliższy</button>
                                <label className={`ed-btn${wzor ? '' : ' ed-wyl'}`}>📷 zdjęcie<input type="file" accept="image/*" capture="environment" hidden disabled={!wzor} onChange={(e) => { const f = e.target.files?.[0]; e.target.value = ''; if (f) zdjecieZTerenu(f) }} /></label>
                                <button className="ed-btn" disabled={!wzor} onClick={() => wzor && oznaczSprawdzony(wzor.id)}>✓ sprawdzony</button>
                                <button className="ed-btn" onClick={() => nastepnyGrob(-1)} aria-label="poprzedni">‹</button>
                                <button className="ed-btn" onClick={() => nastepnyGrob(1)}>następny ›</button>
                            </div>
                            <div className="ed-rzad ed-maly">
                                <span>kolejne:</span>
                                <span className="ed-seg">{([['', 'wszystkie'], ['bezZdjecia', 'bez zdjęcia'], ['niesprawdzone', 'niesprawdzone'], ['nieopracowane', 'nieopracowane'], ['bezNapisu', 'bez napisu']] as [Filtr, string][]).map(([f, t]) => <button key={f} aria-pressed={filtr === f} onClick={() => ustawFiltr(f)}>{t}</button>)}</span>
                            </div>
                        </div>
                    )}
                    {komunikat && <div className="ed-kom">{komunikat}</div>}
                    {zaznaczone.length > 0 && narz === 'wybierz' && tryb === 'rysuj' && (
                        <div className="ed-akcje">
                            {zaznaczone.length > 1 && <span className="ed-maly">{zaznaczone.length} zazn.</span>}
                            <button onClick={duplikuj} title="Duplikuj: ten sam kształt, rozmiar i kąt (Ctrl+D)">duplikuj</button>
                            <button onClick={() => { ustawPw((s) => ({ ...s, otwarte: true })); ustawZakl('element') }}>powiel…</button>
                            <button onClick={() => obrocZaznaczone(-1)} title="obróć −1° (Shift+R)">⟲</button>
                            <button onClick={() => obrocZaznaczone(1)} title="obróć +1° (R)">⟳</button>
                            <button onClick={usunZaznaczone} title="usuń (Del)">usuń</button>
                        </div>
                    )}
                </div>
                <Uchwyt wartosc={szerPanelu} ustaw={ustawSzerPanelu} domyslna={320} min={260} max={560} po="prawej" etykieta="szerokość panelu" />
                <aside className="ed-panel">
                    {roznice && <TabelaRoznic plan={plan} roznice={roznice} zatwierdz={zatwierdzNumery} anuluj={() => ustawRoznice(null)} pokaz={pokazGrob} />}
                    <div className="ed-zakl">
                        {(['element', 'plan', 'podklady', 'warstwy', 'zdjecia'] as Zakladka[]).map((z) => <button key={z} aria-pressed={zakl === z} onClick={() => ustawZakl(z)}>{{ element: 'element', plan: 'plan', podklady: 'podkłady', warstwy: 'warstwy', zdjecia: 'zdjęcia' }[z]}</button>)}
                    </div>
                    {zakl === 'element' && (
                        zaznaczone.length === 0 ? (
                            <div className="ed-sekcja">
                                <p className="ed-maly">Wybierz typ z listy po lewej i narzędzie u góry, potem rysuj na planie. Kliknij element, żeby go edytować; Shift+klik albo Shift+przeciągnięcie zaznacza kilka.</p>
                                <p className="ed-maly">Skróty: 1–8 narzędzia (8 – stempel) · g grób · k krzyż · Tab / Shift+Tab następny / poprzedni grób · Ctrl+Z / Ctrl+Shift+Z · Ctrl+D duplikuj · Ctrl+C / Ctrl+V · Alt+przeciągnij = kopia · strzałki (z Shift dalej) · r / R obrót · Delete · spacja + przeciąganie = przesuń widok · Esc</p>
                            </div>
                        ) : zaznaczone.length === 1 && wzor ? (
                            <PanelElementu e={wzor} plan={plan} typy={typy} ukryteTypy={ukryteTypy} numer={numery.get(wzor.id)} skala={skala} fmt={fmt} slug={slug}
                                zmiana={(zm) => zmienElementy(new Map([[wzor.id, zm]]))} usun={usunZaznaczone} duplikuj={duplikuj}
                                tryb={tryb} nastepny={() => nastepnyDoZrobienia()} zatwierdz={() => { oznaczSprawdzony(wzor.id); nastepnyDoZrobienia(wzor.id) }}
                                podglad={ustawRoznice} pokazGrob={pokazGrob}
                                powielOtwarte={pw.otwarte} przelaczPowiel={() => ustawPw((s) => ({ ...s, otwarte: !s.otwarte }))}
                                osobyDrzewa={osobyDrzewa} wczytajOsoby={wczytajOsoby} listy={listy}
                                wgrajZdjecie={async (f) => { try { const w = await wyslijPlik(f, 'zdjecie'); zmienElementy(new Map([[wzor.id, { zdjecia: [...(wzor.zdjecia ?? []), { plik: w.plik }] }]])) } catch (e) { pokaz(e instanceof Error ? e.message : 'błąd') } }} />
                        ) : (
                            <PanelWielu zaznaczone={zaznaczone} wzor={wzor} typy={typy} duplikuj={duplikuj} usun={usunZaznaczone} obroc={obrocZaznaczone}
                                powielOtwarte={pw.otwarte} przelaczPowiel={() => ustawPw((s) => ({ ...s, otwarte: !s.otwarte }))}
                                zmienWszystkie={(f) => zmienElementy(new Map(zaznaczone.map((e) => [e.id, f(e)])))}
                                zastosuj={(m, t) => { if (!m.size) { pokaz('Nic do zmiany.'); return } zmienElementy(m); pokaz(t) }}
                                numery={numery} wykonaj={(f, t) => { const w = f(plan.elementy); if ('blad' in w) { pokaz(w.blad); return } zmien((p) => ({ ...p, elementy: w })); pokaz(`${t} Ctrl+Z cofa całą operację.`) }} />
                        )
                    )}
                    {zakl === 'element' && pw.otwarte && zaznaczone.length > 0 && (
                        <div className="ed-sekcja ed-ramka-sek">
                            <div className="ed-gt">powiel</div>
                            <div className="ed-wiersz"><span>kopii</span><span className="ed-seg"><button onClick={() => ustawPw((s) => ({ ...s, ile: Math.max(1, s.ile - 1) }))}>−</button><button disabled>{pw.ile}</button><button onClick={() => ustawPw((s) => ({ ...s, ile: Math.min(60, s.ile + 1) }))}>+</button></span></div>
                            <div className="ed-wiersz"><span>w rzędzie</span><span className="ed-seg">{([-1, 1] as const).map((z) => <button key={z} aria-pressed={pw.kier === 'rzad' && pw.zn === z} onClick={() => ustawPw((s) => ({ ...s, kier: 'rzad', zn: z }))}>{z < 0 ? '←' : '→'}</button>)}</span></div>
                            <div className="ed-wiersz"><span>rzędy</span><span className="ed-seg">{([-1, 1] as const).map((z) => <button key={z} aria-pressed={pw.kier === 'kol' && pw.zn === z} onClick={() => ustawPw((s) => ({ ...s, kier: 'kol', zn: z }))}>{z < 0 ? '↑' : '↓'}</button>)}</span></div>
                            <label className="ed-wiersz"><span>odstęp</span><b>{pw.odstep === null ? 'jak sąsiednie' : fmt(pw.odstep)}</b></label>
                            <input type="range" min={-1} max={u * 3} step={u / 20} value={pw.odstep ?? -1} onChange={(e) => { const v = +e.target.value; ustawPw((s) => ({ ...s, odstep: v < 0 ? null : v })) }} />
                            <button className="ed-btn" onClick={powiel}>dodaj {duchy.length} {duchy.length === 1 ? 'kopię' : 'kopii'}</button>
                        </div>
                    )}
                    {zakl === 'plan' && <PanelPlanu plan={plan} listy={listy} skala={skala} rys={rys} narz={narz} widok={vb} ustawNarz={(n) => { ustawNarz(n); ustawRys([]) }} zmien={(zm) => zmien((p) => ({ ...p, ...zm }))} />}
                    {zakl === 'plan' && planGrobowy(plan) && <div className="ed-sekcja"><StanNumeracjiPlanu plan={plan} typy={typy} podglad={ustawRoznice} pokaz={pokazGrob} /></div>}
                    {zakl === 'podklady' && (
                        <PanelPodkladow plan={plan} slug={slug} ukryte={ukrytePodklady} przelacz={(id) => ustawUkrytePodklady((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n })}
                            wgraj={wgrajPodklad} zmien={(id, zm) => zmien((p) => ({ ...p, podklady: p.podklady.map((x) => (x.id === id ? { ...x, ...zm } : x)) }))}
                            materialy={listy.materialy} dodaj={(pd) => zmien((p) => ({ ...p, podklady: [...p.podklady, pd] }))}
                            usun={(id) => { const pd = plan.podklady.find((x) => x.id === id); zmien((p) => ({ ...p, podklady: p.podklady.filter((x) => x.id !== id) })); if (pd && !pd.material && pd.plik) fetch(`${API(slug)}/plik?plik=${encodeURIComponent(pd.plik)}`, { method: 'DELETE' }) }}
                            dop={dop} zacznijDop={(id) => { ustawDop({ podklad: id, pary: [] }); ustawNarz('dopasuj') }} anulujDop={() => { ustawDop(null); ustawNarz('wybierz') }}
                            zastosujDop={() => {
                                if (!dop) return
                                const pary = dop.pary.filter((q) => q.cel)
                                const m = pary.length >= 3 ? afiniczna(pary.map((q) => q.zr), pary.map((q) => q.cel!)) : podobienstwo(pary.map((q) => q.zr), pary.map((q) => q.cel!))
                                if (!m) { pokaz('Punkty leżą zbyt blisko albo na jednej linii.'); return }
                                zmien((p) => ({ ...p, podklady: p.podklady.map((x) => (x.id === dop.podklad ? { ...x, macierz: m } : x)) }))
                                ustawDop(null); ustawNarz('wybierz'); pokaz('Podkład dopasowany.')
                            }} />
                    )}
                    {zakl === 'warstwy' && (
                        <div className="ed-sekcja">
                            <p className="ed-maly">Ukrycie i blokada działają tylko w edytorze – na stronie widać wszystkie warstwy.</p>
                            {WARSTWY.map((w) => {
                                const st = plan.warstwy[w.id] ?? {}
                                const ust = (zm: { ukryta?: boolean; zablokowana?: boolean }) => zmien((p) => ({ ...p, warstwy: { ...p.warstwy, [w.id]: { ...st, ...zm } } }), true)
                                return (
                                    <div key={w.id} className="ed-wiersz">
                                        <span>{w.nazwa} <span className="ed-maly">· {plan.elementy.filter((e) => typy.get(e.typ)?.warstwa === w.id).length}</span></span>
                                        <span className="ed-seg">
                                            <button aria-pressed={!st.ukryta} onClick={() => ust({ ukryta: !st.ukryta })} title="widoczna w edytorze">{st.ukryta ? 'ukryta' : 'widać'}</button>
                                            <button aria-pressed={!!st.zablokowana} onClick={() => ust({ zablokowana: !st.zablokowana })} title="zablokowana – nie da się jej przypadkiem przesunąć">{st.zablokowana ? 'zablok.' : 'odblok.'}</button>
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                    {zakl === 'zdjecia' && (
                        <div className="ed-sekcja">
                            <p className="ed-maly">Zdjęcia nagrobków z telefonu: odczytuję położenie GPS i proponuję najbliższy grób w promieniu 3 m. Wymaga 2–3 punktów geo (zakładka „plan”). Zdjęcia są zmniejszane, a dane EXIF (także GPS) usuwane z wysyłanych plików.</p>
                            {plan.geo.length < 2 && <p className="ed-uwaga">Brak punktów geo – zdjęcia przypniesz ręcznie (wybierz inny grób).</p>}
                            <label className="ed-btn">wybierz zdjęcia<input type="file" accept="image/*" multiple hidden onChange={(e) => e.target.files && wczytajZdjecia(e.target.files)} /></label>
                            {zdjecia.filter((z) => z.propozycja).length > 1 && <button className="ed-btn" onClick={przypnijWszystkie}>przypnij wszystkie z propozycją ({zdjecia.filter((z) => z.propozycja).length})</button>}
                            {zdjecia.map((z, i) => {
                                const pr = z.propozycja ? el(z.propozycja) : null, n = pr ? numery.get(pr.id) : null
                                return (
                                    <div key={z.url} className="ed-zdj">
                                        {/* eslint-disable-next-line @next/next/no-img-element */}
                                        <img src={z.url} alt="" />
                                        <div className="ed-zdj-o">
                                            <span className="ed-maly">{z.plik.name}{z.data ? ` · ${z.data.slice(0, 10)}` : ''}{z.lat === undefined ? ' · bez GPS' : ''}</span>
                                            {pr ? <span>proponuję: {n ? numerTekst(n) : 'grób'} ({z.odl!.toFixed(1)} m)</span> : <span className="ed-maly">brak grobu w promieniu 3 m</span>}
                                            <div className="ed-rzad">
                                                {pr && <button className="ed-btn" onClick={() => przypnij(i, pr.id)}>przypnij</button>}
                                                <button className="ed-btn" aria-pressed={przypinane === i} onClick={() => { ustawPrzypinane(i); ustawNarz('wybierz'); pokaz('Kliknij grób na planie, żeby przypiąć zdjęcie.') }}>wybierz inny</button>
                                                <button className="ed-btn" onClick={() => ustawZdjecia((L) => L.filter((_, j) => j !== i))}>pomiń</button>
                                            </div>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </aside>
            </div>
        </Pelny>
    )
}

function poczatkowyKadr(p: Plan): VB {
    const pts = p.elementy.flatMap((e) => punktyElementu(e.g))
    if (!pts.length) return [0, 0, p.szer, p.wys]
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]), m = jednostka(p) * 3
    return [Math.min(...xs) - m, Math.min(...ys) - m, Math.max(...xs) - Math.min(...xs) + 2 * m, Math.max(...ys) - Math.min(...ys) + 2 * m]
}

function podpowiedz(n: Narzedzie, ile: number, t: TypElementu | undefined, dop: { pary: { zr: Pkt; cel?: Pkt }[] } | null): string {
    const typ = t ? ` · typ: ${t.nazwa.replace(/ \(.*\)$/, '')}` : ''
    switch (n) {
        case 'wybierz': return 'kliknij element · Shift+klik / Shift+przeciągnij – kilka · przeciągnij tło – przesuń widok · kółko – przybliż · Tab – następny grób w rzędzie'
        case 'stempel': return `stempel: każde kliknięcie stawia kopię wzoru – obok sąsiedniego grobu przyciąga się w rzędzie albo rząd dalej · Alt – bez przyciągania · Esc kończy${typ}`
        case 'punkt': return `kliknij, żeby postawić znak${typ}`
        case 'prostokat': return `przeciągnij od narożnika do narożnika albo kliknij (rozmiar jak sąsiednie)${typ}`
        case 'wielokat': return `klikaj narożniki · dwuklik albo Enter kończy · Backspace cofa punkt${typ} (${ile})`
        case 'linia': return `klikaj kolejne punkty · dwuklik albo Enter kończy${typ} (${ile})`
        case 'napis': return 'kliknij, gdzie ma stać napis, i wpisz treść w panelu'
        case 'miarka': return 'klikaj punkty – długość odcinków · Esc czyści'
        case 'skala': return ile < 2 ? `skala: kliknij ${ile ? 'drugi' : 'pierwszy'} punkt o znanej odległości` : 'wpisz odległość w panelu „plan”'
        case 'geo': return 'kliknij punkt, którego współrzędne znasz (np. z Geoportalu), i wpisz je w panelu'
        case 'dopasuj': {
            const ost = dop?.pary[dop.pary.length - 1]
            return !ost || ost.cel ? `dopasowanie: kliknij punkt na dopasowywanym podkładzie (para ${(dop?.pary.length ?? 0) + 1})` : 'teraz kliknij to samo miejsce na planie / pierwszym podkładzie'
        }
    }
}

function Pelny({ children }: { children: React.ReactNode }) {
    return <div className="ed-pelny">{children}</div>
}

function Siatka({ vb, krok }: { vb: VB; krok: number }) {
    const n = vb[2] / krok
    if (n > 200) return null
    const x0 = Math.floor(vb[0] / krok) * krok, y0 = Math.floor(vb[1] / krok) * krok
    let d = ''
    for (let x = x0; x < vb[0] + vb[2]; x += krok) d += `M${x} ${vb[1]}V${vb[1] + vb[3]}`
    for (let y = y0; y < vb[1] + vb[3]; y += krok) d += `M${vb[0]} ${y}H${vb[0] + vb[2]}`
    return <path d={d} className="ed-siatka" pointerEvents="none" />
}

/** Uchwyty zaznaczonego elementu: obrót, rozmiar, wierzchołki (z punktami do dodawania między nimi). */
function Nakladka({ plan, wzor, zaznaczone, r }: { plan: Plan; wzor: Element | null; zaznaczone: Element[]; r: number; u: number }) {
    if (!wzor) {
        if (zaznaczone.length < 2) return null
        const pts = zaznaczone.flatMap((e) => punktyElementu(e.g)), xs = pts.map((p) => p[0]), ys = pts.map((p) => p[1])
        return <rect x={Math.min(...xs) - r} y={Math.min(...ys) - r} width={Math.max(...xs) - Math.min(...xs) + 2 * r} height={Math.max(...ys) - Math.min(...ys) + 2 * r} className="ed-obw" pointerEvents="none" />
    }
    const g = wzor.g
    void plan
    if (g.k === 'r' || g.k === 't') {
        const a = (g.a * Math.PI) / 180, c = Math.cos(a), s = Math.sin(a)
        const h2 = g.k === 'r' ? g.h / 2 : r
        const ox = g.x + (0 * c - (-h2 - r * 3) * s), oy = g.y + (0 * s + (-h2 - r * 3) * c)
        const tx = g.x - (-h2) * s, ty = g.y + (-h2) * c
        return (
            <g>
                <line x1={tx} y1={ty} x2={ox} y2={oy} className="ed-uch-l" pointerEvents="none" />
                <circle cx={ox} cy={oy} r={r} className="ed-uch ed-uch-obrot" data-uchwyt="obrot" />
                {g.k === 'r' && [[1, 0], [0, 1], [-1, 0], [0, -1]].map(([kx, ky], i) => {
                    // boki: zmiana tylko szerokości albo tylko długości (przeciwległy bok zostaje; Alt – symetrycznie)
                    const bx = g.x + (kx * g.w / 2) * c - (ky * g.h / 2) * s, by = g.y + (kx * g.w / 2) * s + (ky * g.h / 2) * c
                    const pion = i % 2 === 0, dl = r * 1.5, gr = r * 0.6
                    return <rect key={i} x={-(pion ? gr : dl) / 2} y={-(pion ? dl : gr) / 2} width={pion ? gr : dl} height={pion ? dl : gr} transform={`translate(${bx} ${by}) rotate(${g.a})`} className="ed-uch ed-uch-bok" data-uchwyt={`bok:${i}`} />
                })}
                {g.k === 'r' && (() => { const sx = g.x + (g.w / 2) * c - (g.h / 2) * s, sy = g.y + (g.w / 2) * s + (g.h / 2) * c; return <rect x={sx - r * 0.8} y={sy - r * 0.8} width={r * 1.6} height={r * 1.6} className="ed-uch" data-uchwyt="rozmiar" /> })()}
            </g>
        )
    }
    if (g.k === 'w' || g.k === 'l') {
        const n = g.p.length, zamk = g.k === 'w'
        return (
            <g>
                {g.p.map((q, i) => {
                    if (!zamk && i === n - 1) return null
                    const b = g.p[(i + 1) % n]
                    return <circle key={'m' + i} cx={(q[0] + b[0]) / 2} cy={(q[1] + b[1]) / 2} r={r * 0.45} className="ed-uch-m" data-uchwyt={`m:${i}`} />
                })}
                {/* PH-05: ostry narożnik gładkiej linii – uchwyt kwadratowy */}
                {g.p.map((q, i) => wzor?.gladka && wzor.ostre?.includes(i)
                    ? <rect key={i} x={q[0] - r * 0.75} y={q[1] - r * 0.75} width={r * 1.5} height={r * 1.5} className="ed-uch" data-uchwyt={`w:${i}`} />
                    : <circle key={i} cx={q[0]} cy={q[1]} r={r * 0.75} className="ed-uch" data-uchwyt={`w:${i}`} />)}
            </g>
        )
    }
    return null
}

/** A2-09: rok śmierci przyjęty do zasady „zmarli niedawno” i jego źródło – reguła bez zmian (decyzja 16.11). */
function RokZgonu({ e }: { e: Element }) {
    const r = rokZgonuZeZrodlem(e)
    if (!r) return <span className="ed-maly">Brak roku śmierci – napis będzie publiczny, chyba że zaznaczysz niżej, że na nagrobku są osoby żyjące.</span>
    if (r.zrodlo === 'pole') return <span className="ed-maly">Przyjęty rok śmierci: {r.rok} (wpisany).</span>
    if (r.zrodlo === 'osoby') return <span className="ed-maly">Przyjęty rok śmierci: {r.rok} (z dat pochowanych).</span>
    return <span className="ed-maly">Przyjęty rok śmierci: {r.rok} (z napisu) – jeśli to np. rok odnowienia nagrobka, wpisz właściwy rok śmierci.</span>
}

/** PH2 (PH-02, 09, 19): na czym oparto element, jak nazywa się w źródle, jak pewna jest identyfikacja, z jakimi kartami jest powiązany. */
function ZrodloElementu({ e, plan, zmiana, listy }: { e: Element; plan: Plan; zmiana: (zm: Partial<Element>) => void; listy: Listy }) {
    const [mat, ustawMat] = React.useState(plan.zrodlo?.material ?? '')
    const [obj, ustawObj] = React.useState('')
    const [objasnienia, ustawObjasnienia] = React.useState<{ id: string; tekst: string; rodzaj: string }[]>([])
    React.useEffect(() => {
        ustawObjasnienia([]); ustawObj('')
        if (!mat) return
        let zywy = true
        fetch(`/api/keystatic/materialy/${mat}/objasnienia`).then((r) => (r.ok ? r.json() : null)).then((d) => { if (zywy && d?.objasnienia) ustawObjasnienia(d.objasnienia) }).catch(() => {})
        return () => { zywy = false }
    }, [mat])
    const podstawa = e.podstawa ?? []
    const nazwaMat = (id: string) => listy.materialy.find((m) => m.id === id)?.nazwa ?? id
    return (
        <div className="ed-sekcja ed-ramka-sek">
            <style>{CSS_POLA_POWIAZAN}</style>
            <div className="ed-gt">źródło i powiązania</div>
            <Pole etykieta="nazwa w źródle (np. napis na szkicu)"><input className="ed-in" value={e.nazwaZrodlowa ?? ''} onChange={(x) => zmiana({ nazwaZrodlowa: x.target.value || undefined })} /></Pole>
            <Pole etykieta="identyfikacja (widać na stronie)"><select className="ed-in" value={e.identyfikacja ?? 'pewna'} onChange={(x) => zmiana({ identyfikacja: x.target.value === 'pewna' ? undefined : (x.target.value as Identyfikacja) })}>{(Object.keys(IDENTYFIKACJE) as Identyfikacja[]).map((k) => <option key={k} value={k}>{IDENTYFIKACJE[k]}</option>)}</select></Pole>
            <PolePowiazan wartosc={e.powiazania ?? []} cele={listy.cele} zmien={(v) => zmiana({ powiazania: v.length ? v : undefined })} idListy={`cele-${e.id}`} etykieta="karty – obiekt, miejsce, osoba, temat" klasaPola="ed-in" klasaZnacznika="ed-btn" klasaOpisu="ed-maly" />
            <span className="ed-maly">podstawa – na czym oparto element</span>
            {podstawa.map((p, i) => (
                <div key={`${p.material}-${p.objasnienie ?? i}`} className="ed-wiersz">
                    <span>{nazwaMat(p.material)}{p.objasnienie ? ` · ${objasnienia.find((o) => o.id === p.objasnienie)?.tekst.slice(0, 40) || p.objasnienie}` : ''}</span>
                    <button className="ed-maly" onClick={() => { const n = podstawa.filter((_, j) => j !== i); zmiana({ podstawa: n.length ? n : undefined }) }} aria-label="usuń podstawę">✕</button>
                </div>
            ))}
            <select className="ed-in" value={mat} onChange={(x) => ustawMat(x.target.value)} aria-label="materiał"><option value="">— materiał —</option>{listy.materialy.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}</select>
            {mat && <select className="ed-in" value={obj} onChange={(x) => ustawObj(x.target.value)} aria-label="objaśnienie na skanie"><option value="">cały materiał (bez objaśnienia)</option>{objasnienia.map((o, i) => <option key={o.id} value={o.id}>{i + 1}. {o.tekst.slice(0, 60) || o.rodzaj}</option>)}</select>}
            <button className="ed-btn" disabled={!mat || podstawa.some((p) => p.material === mat && (p.objasnienie ?? '') === obj)} onClick={() => zmiana({ podstawa: [...podstawa, obj ? { material: mat, objasnienie: obj } : { material: mat }] })}>+ dodaj podstawę</button>
        </div>
    )
}

/** PH1 (PH-03, 11): rodzaj planu, dwie daty, źródło, dokładność, kolejność na liście planów miejscowości. */
function MetadanePlanu({ plan, listy, widok, zmien }: { plan: Plan; listy: Listy; widok: VB; zmien: (zm: Partial<Plan>) => void }) {
    const opc = (v: string) => v || undefined
    return (
        <>
            <div className="ed-gt">rodzaj i metadane</div>
            <Pole etykieta="rodzaj planu"><select className="ed-in" value={rodzajPlanu(plan)} onChange={(e) => zmien({ rodzaj: e.target.value as RodzajPlanu })}>{(Object.keys(RODZAJE_PLANU) as RodzajPlanu[]).map((r) => <option key={r} value={r}>{RODZAJE_PLANU[r]}</option>)}</select></Pole>
            {!plan.rodzaj && <p className="ed-maly">Rodzaj niezapisany – plan zachowuje się jak plan cmentarza.</p>}
            <Pole etykieta="stan przedstawiony (EDTF, np. 1939, 193X)"><input className="ed-in" value={plan.okres ?? ''} onChange={(e) => zmien({ okres: opc(e.target.value) })} /></Pole>
            <Pole etykieta="sporządzono (EDTF)"><input className="ed-in" value={plan.sporzadzono ?? ''} onChange={(e) => zmien({ sporzadzono: opc(e.target.value) })} /></Pole>
            <Pole etykieta="rodzaj źródła"><select className="ed-in" value={plan.rodzajZrodla ?? ''} onChange={(e) => zmien({ rodzajZrodla: opc(e.target.value) as Plan['rodzajZrodla'] })}><option value="">—</option>{Object.entries(RODZAJE_ZRODLA).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Pole>
            <Pole etykieta="twórca"><input className="ed-in" value={plan.tworca ?? ''} onChange={(e) => zmien({ tworca: opc(e.target.value) })} /></Pole>
            {/* KRT-01 (P3) */}
            <Pole etykieta="zgłosił(a) – za zgodą, bez e-maila"><input className="ed-in" value={plan.zglosil ?? ''} pattern="[^@]*" title="Bez adresu e-mail – sam podpis." onChange={(e) => zmien({ zglosil: opc(e.target.value) })} /></Pole>
            <Pole etykieta="materiał źródłowy (skan w archiwum) – plan otworzy się na stronie materiału"><select className="ed-in" value={plan.zrodlo?.material ?? ''} onChange={(e) => zmien({ zrodlo: e.target.value || plan.zrodlo?.opis ? { ...plan.zrodlo, material: opc(e.target.value) } : undefined })}><option value="">—</option>{listy.materialy.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}</select></Pole>
            <Pole etykieta="źródło – opis"><input className="ed-in" value={plan.zrodlo?.opis ?? ''} onChange={(e) => zmien({ zrodlo: e.target.value || plan.zrodlo?.material ? { ...plan.zrodlo, opis: opc(e.target.value) } : undefined })} /></Pole>
            <Pole etykieta="prawa do rekonstrukcji"><input className="ed-in" value={plan.prawa ?? ''} onChange={(e) => zmien({ prawa: opc(e.target.value) })} /></Pole>
            <Pole etykieta="dokładność"><select className="ed-in" value={plan.dokladnosc ?? ''} onChange={(e) => zmien({ dokladnosc: opc(e.target.value) as Plan['dokladnosc'] })}><option value="">—</option>{Object.entries(DOKLADNOSCI).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Pole>
            {plan.dokladnosc === 'schematyczny' && <p className="ed-maly">Plan schematyczny – na stronie bez paska skali.</p>}
            <Pole etykieta="zasięg (opis)"><input className="ed-in" value={plan.zasieg ?? ''} onChange={(e) => zmien({ zasieg: opc(e.target.value) })} /></Pole>
            {/* etap 3 · CEM-14: źródło numeracji grobów – w panelu „o planie” na stronie */}
            <Pole etykieta="źródło numeracji grobów (np. numeracja robocza wg oględzin 2024)"><input className="ed-in" value={plan.zrodloNumeracji ?? ''} onChange={(e) => zmien({ zrodloNumeracji: opc(e.target.value) })} /></Pole>
            {/* PH-17: styl rysunku na stronie */}
            <Pole etykieta="styl na stronie"><select className="ed-in" value={plan.styl ?? ''} onChange={(e) => zmien({ styl: opc(e.target.value) as Plan['styl'] })}><option value="">współczesny</option>{Object.entries(STYLE_PLANU).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></Pole>
            {/* etap 3 · CEM-07: kadr startowy przeglądarki = bieżący widok edytora (układ planu, przed obrotem) */}
            <div className="ed-wiersz"><span>kadr startowy</span><b>{plan.kadr ? 'zapisany' : 'samodzielnie – groby i kwatery'}</b></div>
            <div className="ed-rzad">
                <button className="ed-btn" onClick={() => zmien({ kadr: widok.map((x) => Math.round(x * 10) / 10) as [number, number, number, number] })}>ustaw bieżący widok jako kadr startowy</button>
                {plan.kadr && <button className="ed-maly" onClick={() => zmien({ kadr: undefined })}>usuń kadr</button>}
            </div>
            <div className="ed-rzad">
                <label className="ed-ch"><input type="checkbox" checked={!!plan.wyrozniony} onChange={(e) => zmien({ wyrozniony: e.target.checked || undefined })} /> plan reprezentacyjny miejscowości</label>
                <label className="ed-ch">kolejność <input className="ed-in" type="number" value={plan.kolejnosc ?? ''} onChange={(e) => zmien({ kolejnosc: e.target.value === '' ? undefined : +e.target.value })} /></label>
            </div>
        </>
    )
}

/** PH1 (K6): podkład = strona materiału archiwum; rozmiar z obrazu, wstępnie dopasowany do szerokości planu. */
function PodkladZMaterialu({ plan, materialy, dodaj }: { plan: Plan; materialy: Listy['materialy']; dodaj: (p: Podklad) => void }) {
    const [id, ustawId] = React.useState(plan.zrodlo?.material ?? '')
    const [strona, ustawStrone] = React.useState(0)
    const [blad, ustawBlad] = React.useState('')
    const m = materialy.find((x) => x.id === id)
    const wstaw = () => {
        if (!m || !m.strony[strona]) return
        const img = new Image()
        img.onload = () => {
            const k = plan.szer / img.naturalWidth
            dodaj({ id: noweId(), plik: '', nazwa: `${m.nazwa}${m.strony.length > 1 ? `, s. ${strona + 1}` : ''}`, szer: img.naturalWidth, wys: img.naturalHeight, macierz: [k, 0, 0, k, 0, 0], krycie: 1, widocznosc: 'edycja', material: { id: m.id, strona } })
            ustawBlad('')
        }
        img.onerror = () => ustawBlad('Nie udało się wczytać strony materiału.')
        img.src = `/api/keystatic/materialy/${m.id}/strony?podglad=${encodeURIComponent(m.strony[strona])}`
    }
    if (!materialy.length) return null
    return (
        <div className="ed-ramka-sek ed-sekcja">
            <div className="ed-gt">podkład ze strony materiału</div>
            <select className="ed-in" value={id} onChange={(e) => { ustawId(e.target.value); ustawStrone(0) }} aria-label="materiał"><option value="">— materiał —</option>{materialy.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select>
            {m && m.strony.length > 1 && <select className="ed-in" value={strona} onChange={(e) => ustawStrone(+e.target.value)} aria-label="strona">{m.strony.map((_, i) => <option key={i} value={i}>strona {i + 1}</option>)}</select>}
            <button className="ed-btn" disabled={!m} onClick={wstaw}>+ dodaj podkład</button>
            {blad && <p className="ed-maly">{blad}</p>}
        </div>
    )
}

/**
 * PH3 (PH-04–08): napis (wyrównanie, tło, wzdłuż linii), wskaźnik od etykiety, gładkość i szerokość w węzłach, numer legendy.
 * Rysuj: kształt (gładkość, węzły); w każdym trybie: napis i legenda.
 */
function NarzedziaPH3({ e, plan, t, zmiana, rysuj }: { e: Element; plan: Plan; t: TypElementu | undefined; zmiana: (zm: Partial<Element>) => void; rysuj: boolean }) {
    const g = e.g, wezly = g.k === 'l' || g.k === 'w' ? g.p : null
    const napis = t?.rys === 'napis' || !!e.pokazNazwe || t?.id === 'kwatera' || (e.pokazNazwe === undefined && t?.rodzaj === 'obszar' && !t?.grob)
    const linie = plan.elementy.filter((x) => x.g.k === 'l' && x.g.p.length > 1)
    const nazwaLinii = (x: Element) => `${x.nazwa?.split('\n').join(' ') || '(bez nazwy)'}${x.id === e.id ? ' – ta linia' : ''}`
    const nr = e.nrLegendy?.trim().toLocaleLowerCase('pl')
    const powt = !!nr && plan.elementy.some((x) => x.id !== e.id && x.nrLegendy?.trim().toLocaleLowerCase('pl') === nr)
    const k = e.kotwica ?? [0.5, 0.5]
    const przelaczOstry = (i: number) => { const o = new Set(e.ostre ?? []); if (o.has(i)) o.delete(i); else o.add(i); zmiana({ ostre: o.size ? [...o].sort((a, b) => a - b) : undefined }) }
    return (
        <>
            {napis && t?.id !== 'kwatera' && (
                <div className="ed-rzad">
                    <span className="ed-seg" role="group" aria-label="wyrównanie wierszy napisu">{(Object.keys(WYROWNANIA) as Wyrownanie[]).map((w) => (
                        <button key={w} aria-pressed={(e.wyrownanie ?? 's') === w} title={WYROWNANIA[w]} onClick={() => zmiana({ wyrownanie: w === 's' ? undefined : w })}>{w === 'l' ? '⇤' : w === 'p' ? '⇥' : '↔'}</button>
                    ))}</span>
                    <label className="ed-ch"><input type="checkbox" checked={!!e.tlo} onChange={(x) => zmiana({ tlo: x.target.checked || undefined })} /> tło pod napisem</label>
                </div>
            )}
            {napis && t?.id !== 'kwatera' && linie.length > 0 && (
                <Pole etykieta="napis wzdłuż linii (np. nazwa rzeki)">
                    <select className="ed-in" value={e.wzdluz ?? ''} onChange={(x) => zmiana({ wzdluz: x.target.value || undefined })}>
                        <option value="">— prosty —</option>
                        {linie.map((x) => <option key={x.id} value={x.id}>{nazwaLinii(x)}</option>)}
                    </select>
                </Pole>
            )}
            {napis && t?.id !== 'kwatera' && !e.wzdluz && (
                <div className="ed-rzad">
                    <Pole etykieta="wskaźnik">
                        <select className="ed-in" value={e.wskaznik ?? ''} onChange={(x) => zmiana({ wskaznik: (x.target.value || undefined) as Wskaznik | undefined })}>
                            <option value="">bez wskaźnika</option>
                            {(Object.keys(WSKAZNIKI) as Wskaznik[]).map((w) => <option key={w} value={w}>{WSKAZNIKI[w]}</option>)}
                        </select>
                    </Pole>
                    {e.wskaznik && <>
                        <Pole etykieta="wskazuje: x %"><input className="ed-in" type="number" min={0} max={100} step={5} value={Math.round(k[0] * 100)} onChange={(x) => zmiana({ kotwica: [Math.min(1, Math.max(0, +x.target.value / 100)), k[1]] })} /></Pole>
                        <Pole etykieta="y %"><input className="ed-in" type="number" min={0} max={100} step={5} value={Math.round(k[1] * 100)} onChange={(x) => zmiana({ kotwica: [k[0], Math.min(1, Math.max(0, +x.target.value / 100))] })} /></Pole>
                    </>}
                </div>
            )}
            {napis && e.wskaznik && !e.etykieta && <span className="ed-maly">Przesuń napis od elementu (przeciągnij go na planie) – wtedy pojawi się {WSKAZNIKI[e.wskaznik]}.</span>}
            {rysuj && wezly && (
                <>
                    <label className="ed-ch"><input type="checkbox" checked={!!e.gladka} disabled={wezly.length < 3} onChange={(x) => zmiana({ gladka: x.target.checked || undefined })} /> gładka krzywa (ostre narożniki – w tabeli węzłów)</label>
                    {g.k === 'l' && <label className="ed-ch"><input type="checkbox" checked={!!e.s} onChange={(x) => { const d = +(e.szer ?? szerLinii(e, t?.rys ?? 'wlasny', jednostka(plan))).toFixed(2); zmiana({ s: x.target.checked ? wezly.map(() => d) : undefined }) }} /> zmienna szerokość (w węzłach)</label>}
                    {(e.gladka || e.s) && (
                        <table className="ed-wezly">
                            <thead><tr><th scope="col">węzeł</th>{e.s && <th scope="col">szerokość</th>}{e.gladka && <th scope="col">narożnik</th>}</tr></thead>
                            <tbody>
                                {wezly.map((_, i) => (
                                    <tr key={i}>
                                        <td>{i + 1}</td>
                                        {e.s && <td><input className="ed-in" type="number" step={0.25} min={0.1} aria-label={`szerokość w węźle ${i + 1}`} value={e.s[i] ?? ''} onChange={(x) => { const v = Math.max(0.1, +x.target.value || 0.1); zmiana({ s: e.s!.map((w, j) => (j === i ? v : w)) }) }} /></td>}
                                        {e.gladka && <td><button className="ed-btn" aria-pressed={!!e.ostre?.includes(i)} aria-label={`węzeł ${i + 1}: ostry narożnik`} onClick={() => przelaczOstry(i)}>ostry</button></td>}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </>
            )}
            <Pole etykieta="numer w legendzie planu (np. 2, 13, A)"><input className="ed-in" maxLength={8} value={e.nrLegendy ?? ''} onChange={(x) => zmiana({ nrLegendy: x.target.value.trim() || undefined })} /></Pole>
            <label className="ed-ch"><input type="checkbox" checked={!!e.nieznanePolozenie} onChange={(x) => zmiana({ nieznanePolozenie: x.target.checked || undefined })} /> położenie nieznane (tylko w legendzie)</label>
            {powt && <span className="ed-uwaga">Numer {e.nrLegendy} ma już inny element – zapis zostanie odrzucony.</span>}
        </>
    )
}

function Pole({ etykieta, children }: { etykieta: string; children: React.ReactNode }) {
    return <label className="ed-pole"><span>{etykieta}</span>{children}</label>
}

function bezOgonkow(t: string) { return t.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l') }
function podpowiedziOsob(L: SkrotOsoby[] | null, q: string): SkrotOsoby[] {
    const sl = bezOgonkow(q).split(/\s+/).filter((x) => x.length >= 2)
    if (!L || !sl.length) return []
    return L.filter((o) => { const t = bezOgonkow(`${o.nazwa} ${o.lata} ${o.miejsce}`); return sl.every((x) => t.includes(x)) }).slice(0, 7)
}
function pasujeDoFiltra(e: Element, f: Filtr): boolean {
    if (f === 'bezNapisu') return !(e.napis?.trim() || e.opis?.trim() || e.osoby?.some((o) => o.nazwa.trim()) || e.nazwa?.trim())
    if (f === 'bezZdjecia') return !e.zdjecia?.length
    if (f === 'nieopracowane') return etapElementu(e) === 'narysowany'
    if (f === 'niesprawdzone') return etapElementu(e) !== 'sprawdzony' || !!polozenie(e) || e.stan === 'do-sprawdzenia'
    return true
}
function PanelElementu({ e, plan, typy, ukryteTypy, numer, skala, fmt, slug, zmiana, usun, duplikuj, powielOtwarte, przelaczPowiel, wgrajZdjecie, osobyDrzewa, wczytajOsoby, tryb, nastepny, zatwierdz, podglad, pokazGrob, listy }: {
    listy: Listy
    tryb: Tryb; nastepny: () => void; zatwierdz: () => void; podglad: (r: Roznice) => void; pokazGrob: (id: string) => void
    e: Element; plan: Plan; typy: Map<string, TypElementu>; ukryteTypy: Set<string>; numer?: Numer; skala: number | null
    fmt: (j: number, r?: 'dl' | 'pole') => string; slug: string; zmiana: (zm: Partial<Element>) => void; usun: () => void; duplikuj: () => void
    powielOtwarte: boolean; przelaczPowiel: () => void; wgrajZdjecie: (f: File) => void
    osobyDrzewa: SkrotOsoby[] | null; wczytajOsoby: () => void
}) {
    const [aktywna, ustawAktywna] = React.useState<number | null>(null)
    const [bladKarty, ustawBladKarty] = React.useState('')
    const t = typy.get(e.typ)
    const zgodne = [...typy.values()].filter((x) => x.rodzaj === t?.rodzaj && (!ukryteTypy.has(x.id) || x.id === e.typ))
    const g = e.g
    const osoby = e.osoby ?? []
    const ustOsoby = (o: Osoba[]) => zmiana({ osoby: o.length ? o : undefined })
    /** PD-01: osoba z grobu bez karty → nowa karta w drzewie (dodana w panelu, zmarła, daty z grobu) i powiązanie z grobem */
    const utworzKarte = async (i: number) => {
        const o = osoby[i], cz = o.nazwa.trim().split(/\s+/)
        const nazwisko = cz.length > 1 ? cz[cz.length - 1] : cz[0], imiona = cz.length > 1 ? cz.slice(0, -1).join(' ') : ''
        if (!confirm(`Utworzyć kartę osoby?\nimiona: ${imiona || '–'}\nnazwisko: ${nazwisko}\nur.: ${o.ur || '–'} · zm.: ${o.zm || '–'}\n\nKarta powstanie w dziale „osoby” bez rodziny; uzupełnisz ją tam.`)) return
        const r = await fetch('/api/keystatic/osoby', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ akcja: 'nowa', imiona, nazwisko, ur: o.ur, zm: o.zm, zGrobu: { plan: slug, grob: e.id } }) }).catch(() => null)
        const j = r ? await r.json().catch(() => null) : null
        if (!r?.ok || !j?.id) { ustawBladKarty(j?.blad ?? 'Nie udało się utworzyć karty.'); return }
        ustawBladKarty('')
        ustOsoby(osoby.map((q, k) => (k === i ? { ...q, id: j.id } : q)))
        wczytajOsoby()
    }
    void skala
    // Rysuj: kształt i położenie; Opracuj / Sprawdź: dane grobu (napis, osoby, zdjęcia, źródła)
    const rysuj = tryb === 'rysuj', dane = !rysuj || !t?.grob, etap = t?.grob ? etapElementu(e) : null
    return (
        <div className="ed-sekcja">
            <div className="ed-gt">{numer ? numerTekst(numer) : t?.grob ? `${t.nazwa} bez numeru` : t?.nazwa}{etap ? ` · ${ETYKIETA_ETAPU[etap]}` : ''}</div>
            <div className="ed-rzad">
                {rysuj && <button className="ed-btn" onClick={duplikuj} title="Ctrl+D">duplikuj</button>}
                {rysuj && <button className="ed-btn" aria-pressed={powielOtwarte} onClick={przelaczPowiel}>powiel…</button>}
                {t?.grob && tryb === 'sprawdz' && etap !== 'sprawdzony' && <button className="ed-btn ed-btn-gl" onClick={zatwierdz} title="zatwierdź i przejdź do następnego niesprawdzonego">sprawdzony ✓ → następny</button>}
                {t?.grob && !rysuj && <button className="ed-btn" onClick={nastepny} title="klawisz N">{tryb === 'sprawdz' ? 'pomiń →' : 'następny nieopracowany →'}</button>}
                {rysuj && <button className="ed-btn" onClick={usun}>usuń</button>}
            </div>
            {t?.grob && tryb === 'sprawdz' && (e.zdjecia?.length
                // eslint-disable-next-line @next/next/no-img-element
                ? <a href={plikUrl(slug, e.zdjecia[0].plik)} target="_blank" rel="noreferrer"><img className="ed-podglad" src={plikUrl(slug, e.zdjecia[0].plik)} alt="zdjęcie nagrobka – porównaj z napisem poniżej" /></a>
                : <span className="ed-uwaga">Brak zdjęcia – sprawdź w terenie albo dodaj zdjęcie niżej.</span>)}
            {rysuj && t?.grob && <span className="ed-maly">dane: {[e.napis?.trim() && 'napis', e.osoby?.length && `osoby: ${e.osoby.length}`, e.zdjecia?.length && `zdjęcia: ${e.zdjecia.length}`, e.zrodla?.trim() && 'źródła'].filter(Boolean).join(' · ') || 'brak'} – wpisuje się je w trybie „Opracuj”.</span>}
            {rysuj && <Pole etykieta="typ">
                <select className="ed-in" value={e.typ} onChange={(x) => zmiana({ typ: x.target.value })}>{zgodne.map((x) => <option key={x.id} value={x.id}>{x.nazwa}</option>)}</select>
            </Pole>}
            <Pole etykieta={t?.rys === 'napis' ? 'treść napisu' : t?.id === 'kwatera' ? 'nazwa kwatery' : 'nazwa / napis na planie'}>
                {/* PH-06: napis w kilku wierszach – Enter = nowy wiersz */}
                <textarea id={`pole-nazwa-${e.id}`} className="ed-in" rows={Math.min(4, Math.max(1, (e.nazwa ?? '').split('\n').length))} value={e.nazwa ?? ''} onChange={(x) => zmiana({ nazwa: x.target.value || undefined })} />
            </Pole>
            {t?.rys !== 'napis' && t?.id !== 'kwatera' && <label className="ed-ch"><input type="checkbox" checked={e.pokazNazwe ?? (t?.rodzaj === 'obszar' && !t?.grob)} onChange={(x) => zmiana({ pokazNazwe: x.target.checked })} /> pokaż nazwę na planie</label>}
            {(t?.rys === 'napis' || e.pokazNazwe) && (
                <div className="ed-rzad">
                    <span className="ed-seg" role="group" aria-label="wielkość napisu (stopień)">{(Object.keys(ROZMIAR_STOPNIA).map(Number) as Stopien[]).map((n) => <button key={n} aria-pressed={stopienNapisu(e, t?.rys === 'napis' ? 3 : 2) === n} title={`stopień ${n} (${ROZMIAR_STOPNIA[n]} jednostki planu)`} onClick={() => zmiana({ stopien: n, rozmiar: undefined })}>{n}</button>)}</span>
                    <select className="ed-in" aria-label="styl napisu" value={e.styl ?? ''} onChange={(x) => zmiana({ styl: (x.target.value || undefined) as Element['styl'] })}><option value="">styl domyślny</option><option value="zwykly">zwykły</option><option value="kursywa">kursywa</option><option value="rozstrzelony">rozstrzelony</option></select>
                    <select className="ed-in" aria-label="kolor napisu" value={e.kolor ?? ''} onChange={(x) => zmiana({ kolor: (x.target.value || undefined) as Element['kolor'] })}><option value="">kolor domyślny</option><option value="tekst">czarny</option><option value="szary">szary</option><option value="woda">woda</option><option value="las">roślinność</option><option value="teren">teren</option><option value="pamiec">pamięć</option></select>
                </div>
            )}
            {!t?.grob && <NarzedziaPH3 e={e} plan={plan} t={t} zmiana={zmiana} rysuj={rysuj} />}
            {!t?.grob && <ZrodloElementu e={e} plan={plan} zmiana={zmiana} listy={listy} />}
            {rysuj && (<>
            {(e.etykieta) && <button className="ed-maly" onClick={() => zmiana({ etykieta: undefined })}>przywróć położenie napisu</button>}
            {g.k === 't' && <Pole etykieta="obrót napisu (°)"><input className="ed-in" type="number" value={g.a} onChange={(x) => zmiana({ g: { ...g, a: +x.target.value || 0 } })} /></Pole>}
            {g.k === 'r' && (
                <div className="ed-rzad">
                    <Pole etykieta="kąt (°)"><input className="ed-in" type="number" step={0.5} value={+g.a.toFixed(2)} onChange={(x) => zmiana({ g: { ...g, a: +x.target.value || 0 } })} /></Pole>
                    <Pole etykieta={`szer. (${skala ? 'm' : 'j.'})`}><input className="ed-in" type="number" step={0.1} value={+(g.w * (skala ?? 1)).toFixed(2)} onChange={(x) => zmiana({ g: { ...g, w: Math.max(0.01, +x.target.value / (skala ?? 1)) } })} /></Pole>
                    <Pole etykieta={`dł. (${skala ? 'm' : 'j.'})`}><input className="ed-in" type="number" step={0.1} value={+(g.h * (skala ?? 1)).toFixed(2)} onChange={(x) => zmiana({ g: { ...g, h: Math.max(0.01, +x.target.value / (skala ?? 1)) } })} /></Pole>
                </div>
            )}
            {g.k === 'w' && <span className="ed-maly">powierzchnia {fmt(pole(g.p), 'pole')} · obwód {fmt(dlugosc(g.p, true))}</span>}
            {g.k === 'l' && <span className="ed-maly">długość {fmt(dlugosc(g.p))}</span>}
            {(t?.rodzaj === 'linia') && !e.s && <Pole etykieta="grubość (jednostki planu, puste = domyślna)"><input className="ed-in" type="number" step={0.5} value={e.szer ?? ''} onChange={(x) => zmiana({ szer: x.target.value ? Math.max(0.1, +x.target.value) : undefined })} /></Pole>}
            {t?.id === 'kwatera' && <Pole etykieta="kąt rzędów (°)"><input className="ed-in" type="number" step={0.5} value={e.kat ?? 0} onChange={(x) => zmiana({ kat: +x.target.value || 0 })} /></Pole>}
            {t?.id === 'kwatera' && <UstawieniaKwatery e={e} plan={plan} typy={typy} zmiana={zmiana} podglad={podglad} />}
            </>)}
            {t?.grob && <NumerGrobu e={e} plan={plan} typy={typy} zmiana={zmiana} pokaz={pokazGrob} />}
            {t?.grob ? (dane && (
                <>
                    <Pole etykieta="napis z nagrobka – transkrypcja dosłowna (pisownia, język i wiersze jak na kamieniu)"><textarea className="ed-in ed-napis" rows={5} value={e.napis ?? ''} onChange={(x) => zmiana({ napis: x.target.value || undefined })} placeholder={'Ś. † P.\nJAN …\nŻYŁ LAT …'} /></Pole>
                    <Pole etykieta="weryfikacja źródeł"><select className="ed-in" value={stanZrodel(e)} onChange={(x) => zmiana({ zrodlaStan: x.target.value === 'brak' ? undefined : (x.target.value as StanZrodel) })}>{STANY_ZRODEL.map((z) => <option key={z} value={z}>{ETYKIETA_ZRODEL[z]}</option>)}</select></Pole>
                    <Pole etykieta="weryfikacja w źródłach (co potwierdzają księgi, z podaniem źródła)"><textarea className="ed-in" rows={3} value={e.zrodla ?? ''} onChange={(x) => zmiana({ zrodla: x.target.value || undefined })} placeholder="np. zgon 12 III 1943 – księga zgonów parafii Próchenki 1943, akt nr 15 (AP Siedlce, sygn. …)" /></Pole>
                    {e.opis && <Pole etykieta="uwagi (dawne pole)"><textarea className="ed-in" rows={2} value={e.opis} onChange={(x) => zmiana({ opis: x.target.value || undefined })} /></Pole>}
                </>
            )) : <Pole etykieta="opis"><textarea className="ed-in" rows={3} value={e.opis ?? ''} onChange={(x) => zmiana({ opis: x.target.value || undefined })} /></Pole>}
            {t?.grob && dane && (
                <>
                    <div className="ed-gt">pochowani</div>
                    {osoby.map((o, i) => {
                        const podp = aktywna === i && !o.id ? podpowiedziOsob(osobyDrzewa, o.nazwa) : []
                        return (
                            <div key={i} className="ed-osoba">
                                <div className="ed-rzad">
                                    <input className="ed-in" style={{ flex: 2 }} placeholder={o.id ? 'imię i nazwisko' : 'imię i nazwisko – szukaj w drzewie'} value={o.nazwa}
                                        onFocus={() => { wczytajOsoby(); ustawAktywna(i) }} onBlur={() => window.setTimeout(() => ustawAktywna((a) => (a === i ? null : a)), 200)}
                                        onChange={(x) => ustOsoby(osoby.map((q, j) => (j === i ? { ...q, nazwa: x.target.value } : q)))} />
                                    <input className="ed-in" style={{ width: 58 }} placeholder="ur." value={o.ur ?? ''} onChange={(x) => ustOsoby(osoby.map((q, j) => (j === i ? { ...q, ur: x.target.value || undefined } : q)))} />
                                    <input className="ed-in" style={{ width: 58 }} placeholder="zm." value={o.zm ?? ''} onChange={(x) => ustOsoby(osoby.map((q, j) => (j === i ? { ...q, zm: x.target.value || undefined } : q)))} />
                                    <button className="ed-btn" onClick={() => ustOsoby(osoby.filter((_, j) => j !== i))} aria-label="usuń osobę">×</button>
                                </div>
                                {!o.id && o.nazwa.trim().length > 2 && <button className="ed-link ed-maly" onClick={() => utworzKarte(i)} title="Nowa karta w dziale osoby (bez rodziny); import GEDCOM jej nie usuwa">nie ma w drzewie – utwórz kartę osoby</button>}
                                {o.id && <span className="ed-maly">w drzewie: <a href={`/keystatic/osoby/${o.id}`} target="_blank" rel="noreferrer">karta osoby ↗</a> · <button className="ed-link" onClick={() => ustOsoby(osoby.map((q, j) => (j === i ? { ...q, id: undefined } : q)))}>odłącz</button></span>}
                                {podp.length > 0 && (
                                    <div className="ed-podp">
                                        {podp.map((x) => (
                                            <button key={x.id} onMouseDown={(ev) => ev.preventDefault()} onClick={() => {
                                                const [ur, zm] = x.lata.split('–').map((v) => (v && v !== '?' ? v : undefined))
                                                const nowe = osoby.map((q, j) => (j === i ? { nazwa: x.nazwa, id: x.id, ...(ur ? { ur } : q.ur ? { ur: q.ur } : {}), ...(zm ? { zm } : q.zm ? { zm: q.zm } : {}) } : q))
                                                // rok śmierci z drzewa – od niego zależy, czy napis grobu jest publiczny
                                                const rok = zm && /^\d{4}$/.test(zm) ? +zm : 0
                                                zmiana({ osoby: nowe, ...(rok > (e.rokZgonu ?? 0) ? { rokZgonu: rok } : {}) })
                                                ustawAktywna(null)
                                            }}>{x.nazwa}<span className="ed-maly">{[x.lata, x.miejsce].filter(Boolean).join(' · ')}</span></button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )
                    })}
                    <button className="ed-btn" onClick={() => { wczytajOsoby(); ustOsoby([...osoby, { nazwa: '' }]); ustawAktywna(osoby.length); window.setTimeout(() => { const L = document.querySelectorAll<HTMLInputElement>('.ed-osoba input'); L[L.length - 3]?.focus() }, 50) }}>+ osoba</button>
                    {bladKarty && <p className="ed-uwaga" role="alert">{bladKarty}</p>}
                    <span className="ed-maly">Wpisz nazwisko – podpowiem osoby z drzewa; wybrana osoba dostaje na swojej karcie wiersz „pochówek”.</span>
                    <div className="ed-rzad">
                        <Pole etykieta="rok śmierci (ostatniej osoby)"><input className="ed-in" type="number" value={e.rokZgonu ?? ''} onChange={(x) => zmiana({ rokZgonu: x.target.value ? +x.target.value : undefined })} placeholder="z napisu" /></Pole>
                    </div>
                    <RokZgonu e={e} />
                    <label className="ed-ch"><input type="checkbox" checked={!!e.ukryjNapis} onChange={(x) => zmiana({ ukryjNapis: x.target.checked || undefined })} /> na nagrobku są osoby żyjące – napis tylko dla bliskich</label>
                </>
            )}
            <div className="ed-rzad">
                <Pole etykieta="czas"><input className="ed-in" value={e.czas ?? ''} onChange={(x) => zmiana({ czas: x.target.value || undefined })} placeholder="np. 1915, XIX w." /></Pole>
                <Pole etykieta="stan"><select className="ed-in" value={e.stan ?? 'istnieje'} onChange={(x) => zmiana({ stan: x.target.value === 'istnieje' ? undefined : (x.target.value as Element['stan']) })}><option value="istnieje">istnieje</option><option value="nie-istnieje">nie istnieje</option><option value="do-sprawdzenia">do sprawdzenia</option></select></Pole>
            </div>
            <Pole etykieta="widoczność"><select className="ed-in" value={e.widocznosc ?? 'publiczne'} onChange={(x) => zmiana({ widocznosc: x.target.value === 'publiczne' ? undefined : (x.target.value as Element['widocznosc']) })}><option value="publiczne">publiczne</option><option value="bliscy">dla bliskich</option><option value="ja">tylko ja</option></select></Pole>
            {t?.grob && (
                <div className="ed-rzad">
                    <Pole etykieta="etap opracowania"><select className="ed-in" value={etapElementu(e)} onChange={(x) => zmiana({ etap: x.target.value as Etap })}>{ETAPY.map((z) => <option key={z} value={z} disabled={z === 'sprawdzony' && tryb !== 'sprawdz' && etap !== 'sprawdzony'}>{ETYKIETA_ETAPU[z]}{z === 'sprawdzony' && tryb !== 'sprawdz' ? ' (w trybie „Sprawdź”)' : ''}</option>)}</select></Pole>
                    <Pole etykieta="położenie"><select className="ed-in" value={polozenie(e) ?? 'pewne'} onChange={(x) => zmiana({ polozenie: x.target.value === 'pewne' ? undefined : (x.target.value as Polozenie) })}>{(['pewne', 'auto', 'przyp'] as const).map((z) => <option key={z} value={z}>{ETYKIETA_POLOZENIA[z]}</option>)}</select></Pole>
                </div>
            )}
            <Pole etykieta="notatka (tylko w panelu)"><textarea className="ed-in" rows={2} value={e.notatka ?? ''} onChange={(x) => zmiana({ notatka: x.target.value || undefined })} /></Pole>
            {dane && <div className="ed-gt">zdjęcia</div>}
            {dane && <div className="ed-rzad" style={{ flexWrap: 'wrap' }}>
                {(e.zdjecia ?? []).map((z) => (
                    <span key={z.plik} className="ed-miniatura">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={plikUrl(slug, z.plik)} alt="" />
                        <button onClick={() => zmiana({ zdjecia: (e.zdjecia ?? []).filter((q) => q.plik !== z.plik) })} aria-label="odepnij">×</button>
                    </span>
                ))}
                <label className="ed-btn">+ zdjęcie<input type="file" accept="image/*" hidden onChange={(x) => x.target.files?.[0] && wgrajZdjecie(x.target.files[0])} /></label>
            </div>}
            <span className="ed-maly">plan: {plan.tytul}</span>
        </div>
    )
}

/** Przenieś / zamień dane dwóch zaznaczonych grobów: wybór operacji → podgląd skutku → zatwierdzenie (jeden krok cofania). */
function DaneDwochGrobow({ a, b, numery, wykonaj }: {
    a: Element; b: Element; numery: Map<string, Numer>
    wykonaj: (f: (L: Element[]) => Element[] | { blad: string }, komunikat: string) => void
}) {
    const [op, ustawOp] = React.useState<null | 'zamien' | 'ab' | 'ba'>(null)
    const pg = podgladDanych(a, b), odwr = podgladDanych(b, a)
    const nA = numerTekst(numery.get(a.id)) || 'grób 1', nB = numerTekst(numery.get(b.id)) || 'grób 2'
    const ma = (strona: 'a' | 'b', p: (typeof pg.pola)[number]) => {
        if (op === 'zamien') return strona === 'a' ? p.b : p.a
        if (op === 'ab') return strona === 'a' ? false : p.a
        if (op === 'ba') return strona === 'a' ? p.b : false
        return strona === 'a' ? p.a : p.b
    }
    return (
        <>
            <div className="ed-gt">dane dwóch grobów</div>
            {!pg.pola.length ? <span className="ed-maly">Żaden z grobów nie ma danych.</span> : (
                <table className="ed-tab">
                    <caption className="ed-maly">{op ? 'po operacji' : 'teraz'} – ● pole wypełnione</caption>
                    <thead><tr><th scope="col">pole</th><th scope="col">{nA}</th><th scope="col">{nB}</th></tr></thead>
                    <tbody>{pg.pola.map((p) => <tr key={p.pole}><th scope="row">{p.nazwa}</th><td>{ma('a', p) ? '●' : '–'}</td><td>{ma('b', p) ? '●' : '–'}</td></tr>)}</tbody>
                </table>
            )}
            {op ? (
                <div className="ed-rzad">
                    <button className="ed-btn ed-btn-gl" onClick={() => {
                        if (op === 'zamien') wykonaj((L) => zamienDane(L, a.id, b.id), `Zamieniono dane: ${nA} ↔ ${nB}.`)
                        else if (op === 'ab') wykonaj((L) => przeniesDane(L, a.id, b.id), `Przeniesiono dane: ${nA} → ${nB}.`)
                        else wykonaj((L) => przeniesDane(L, b.id, a.id), `Przeniesiono dane: ${nB} → ${nA}.`)
                        ustawOp(null)
                    }}>zatwierdź</button>
                    <button className="ed-btn" onClick={() => ustawOp(null)}>anuluj</button>
                </div>
            ) : pg.pola.length > 0 && (
                <div className="ed-rzad" style={{ flexWrap: 'wrap' }}>
                    <button className="ed-btn" onClick={() => ustawOp('zamien')}>zamień dane…</button>
                    <button className="ed-btn" disabled={pg.celZajety || !pg.pola.some((p) => p.a)} onClick={() => ustawOp('ab')} title={pg.celZajety ? 'cel ma już dane – użyj „zamień”' : ''}>przenieś {nA} → {nB}…</button>
                    <button className="ed-btn" disabled={odwr.celZajety || !pg.pola.some((p) => p.b)} onClick={() => ustawOp('ba')} title={odwr.celZajety ? 'cel ma już dane – użyj „zamień”' : ''}>przenieś {nB} → {nA}…</button>
                </div>
            )}
            <span className="ed-maly">Kształt, położenie i numer zostają; z danymi idą widoczność i „ukryj napis”. Przeniesione dane wracają do etapu „opracowany”.</span>
        </>
    )
}

function PanelWielu({ zaznaczone, wzor, typy, duplikuj, usun, obroc, powielOtwarte, przelaczPowiel, zmienWszystkie, zastosuj, numery, wykonaj }: {
    numery: Map<string, Numer>
    wykonaj: (f: (L: Element[]) => Element[] | { blad: string }, komunikat: string) => void
    zaznaczone: Element[]; wzor: Element | null; typy: Map<string, TypElementu>; duplikuj: () => void; usun: () => void; obroc: (d: number) => void
    powielOtwarte: boolean; przelaczPowiel: () => void; zmienWszystkie: (f: (e: Element) => Partial<Element>) => void
    zastosuj: (m: Map<string, Partial<Element>>, komunikat: string) => void
}) {
    const ileTypow = new Set(zaznaczone.map((e) => e.typ)).size
    const wg = wzor?.g
    return (
        <div className="ed-sekcja">
            {zaznaczone.length === 2 && zaznaczone.every((x) => typy.get(x.typ)?.grob) && <DaneDwochGrobow a={zaznaczone[0]} b={zaznaczone[1]} numery={numery} wykonaj={wykonaj} />}
            <div className="ed-gt">zaznaczono {zaznaczone.length}{ileTypow > 1 ? ` · ${ileTypow} typy` : ` · ${typy.get(zaznaczone[0].typ)?.nazwa ?? ''}`}</div>
            <div className="ed-rzad">
                <button className="ed-btn" onClick={duplikuj}>duplikuj</button>
                <button className="ed-btn" aria-pressed={powielOtwarte} onClick={przelaczPowiel}>powiel…</button>
                <button className="ed-btn" onClick={usun}>usuń</button>
            </div>
            <div className="ed-wiersz"><span>obrót każdego</span><span className="ed-seg">{[-5, -1, 1, 5].map((d) => <button key={d} onClick={() => obroc(d)}>{d > 0 ? '+' : ''}{d}°</button>)}</span></div>
            {wg?.k === 'r' && (
                <div className="ed-rzad">
                    <button className="ed-btn" onClick={() => zmienWszystkie((e) => (e.g.k === 'r' && e.id !== wzor!.id ? { g: { ...e.g, w: wg.w, h: wg.h, a: wg.a } } : {}))}>rozmiar i kąt jak wzór</button>
                    <button className="ed-btn" onClick={() => zmienWszystkie((e) => (e.g.k === 'r' && e.id !== wzor!.id ? { g: { ...e.g, a: wg.a } } : {}))}>tylko kąt</button>
                    <button className="ed-btn" onClick={() => zmienWszystkie((e) => (e.g.k === 'r' && e.id !== wzor!.id ? { g: { ...e.g, w: wg.w, h: wg.h } } : {}))}>tylko rozmiar</button>
                </div>
            )}
            {zaznaczone.length >= 2 && (
                <>
                    <div className="ed-rzad">
                        <button className="ed-btn" title="Środki zaznaczonych na jednej prostej (najlepiej dopasowanej); prostokąty dostają kąt tej linii" onClick={() => zastosuj(wyrownajWLinie(zaznaczone), 'Wyrównano w linię.')}>wyrównaj w linię</button>
                        <button className="ed-btn" disabled={zaznaczone.length < 3} title="Skrajne zostają na miejscu, pozostałe w równych odstępach między nimi" onClick={() => zastosuj(rozlozRowno(zaznaczone), 'Rozłożono równo.')}>rozłóż równo</button>
                    </div>
                    <span className="ed-maly">Działa tylko na zaznaczonych elementach.</span>
                </>
            )}
            <Pole etykieta="stan wszystkich"><select className="ed-in" defaultValue="" onChange={(x) => x.target.value && zmienWszystkie(() => ({ stan: x.target.value === 'istnieje' ? undefined : (x.target.value as Element['stan']) }))}><option value="">—</option><option value="istnieje">istnieje</option><option value="nie-istnieje">nie istnieje</option><option value="do-sprawdzenia">do sprawdzenia</option></select></Pole>
            <Pole etykieta="widoczność wszystkich"><select className="ed-in" defaultValue="" onChange={(x) => x.target.value && zmienWszystkie(() => ({ widocznosc: x.target.value === 'publiczne' ? undefined : (x.target.value as Element['widocznosc']) }))}><option value="">—</option><option value="publiczne">publiczne</option><option value="bliscy">dla bliskich</option><option value="ja">tylko ja</option></select></Pole>
            <p className="ed-maly">Wzorem jest ostatnio kliknięty element (grubsza ramka). Przeciągnięcie przesuwa całą grupę, Alt+przeciągnięcie jej kopię.</p>
        </div>
    )
}

function PanelPlanu({ plan, listy, skala, rys, narz, widok, ustawNarz, zmien }: {
    plan: Plan; listy: Listy; skala: number | null; rys: Pkt[]; narz: Narzedzie; widok: VB
    ustawNarz: (n: Narzedzie) => void; zmien: (zm: Partial<Plan>) => void
}) {
    const [metry, ustawMetry] = React.useState('')
    const [lat, ustawLat] = React.useState('')
    const [lon, ustawLon] = React.useState('')
    return (
        <div className="ed-sekcja">
            <Pole etykieta="tytuł"><input className="ed-in" value={plan.tytul} onChange={(e) => zmien({ tytul: e.target.value })} /></Pole>
            <Pole etykieta="miejscowość"><select className="ed-in" value={plan.miejsce ?? ''} onChange={(e) => zmien({ miejsce: e.target.value || undefined })}><option value="">—</option>{listy.miejsca.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}</select></Pole>
            <Pole etykieta="obiekt (np. cmentarz)"><select className="ed-in" value={plan.obiekt ?? ''} onChange={(e) => zmien({ obiekt: e.target.value || undefined })}><option value="">—</option>{listy.obiekty.filter((o) => !plan.miejsce || o.miejsce === plan.miejsce).map((o) => <option key={o.id} value={o.id}>{o.nazwa}</option>)}</select></Pole>
            <Pole etykieta="widoczność planu"><select className="ed-in" value={plan.widocznosc} onChange={(e) => zmien({ widocznosc: e.target.value as Plan['widocznosc'] })}><option value="ja">szkic – tylko ja</option><option value="bliscy">dla bliskich</option><option value="publiczne">publiczny</option></select></Pole>
            <Pole etykieta="opis pod tytułem"><textarea className="ed-in" rows={3} value={plan.opis ?? ''} onChange={(e) => zmien({ opis: e.target.value || undefined })} /></Pole>
            <MetadanePlanu plan={plan} listy={listy} widok={widok} zmien={zmien} />
            <div className="ed-gt">skala i kierunek</div>
            <div className="ed-wiersz"><span>skala</span><b>{skala ? `1 j. = ${skala.toFixed(4)} m` : 'nieustawiona'}{plan.skala === null && skala ? ' (z punktów geo)' : ''}</b></div>
            <button className="ed-btn" aria-pressed={narz === 'skala'} onClick={() => ustawNarz('skala')}>ustaw skalę: 2 punkty i odległość</button>
            {narz === 'skala' && rys.length === 2 && (
                <div className="ed-rzad">
                    <input className="ed-in" type="number" step={0.1} placeholder="odległość w metrach" value={metry} onChange={(e) => ustawMetry(e.target.value)} />
                    <button className="ed-btn" onClick={() => { const d = Math.hypot(rys[1][0] - rys[0][0], rys[1][1] - rys[0][1]); if (+metry > 0 && d > 0) { zmien({ skala: +metry / d }); ustawNarz('wybierz') } }}>zapisz</button>
                </div>
            )}
            {plan.skala !== null && <button className="ed-maly" onClick={() => zmien({ skala: null })}>usuń skalę</button>}
            <Pole etykieta="obrót rysunku na stronie (°), żeby północ była u góry"><input className="ed-in" type="number" step={0.5} value={plan.obrot} onChange={(e) => zmien({ obrot: +e.target.value || 0 })} /></Pole>
            <div className="ed-gt">punkty geo (do zdjęć z GPS)</div>
            <p className="ed-maly">2–3 punkty, których współrzędne znasz – np. narożnik kaplicy, brama – odczytane z Geoportalu (szerokość i długość geograficzna, WGS84).</p>
            {plan.geo.map((g, i) => <div key={i} className="ed-wiersz"><span>{i + 1}. {g.lat.toFixed(6)}, {g.lon.toFixed(6)}</span><button className="ed-maly" onClick={() => zmien({ geo: plan.geo.filter((_, j) => j !== i) })}>usuń</button></div>)}
            <button className="ed-btn" aria-pressed={narz === 'geo'} onClick={() => ustawNarz('geo')}>dodaj punkt geo</button>
            {narz === 'geo' && rys.length === 1 && (
                <div className="ed-rzad">
                    <input className="ed-in" placeholder="szer. (52.18…)" value={lat} onChange={(e) => ustawLat(e.target.value)} />
                    <input className="ed-in" placeholder="dł. (22.56…)" value={lon} onChange={(e) => ustawLon(e.target.value)} />
                    <button className="ed-btn" onClick={() => { const a = parseFloat(lat.replace(',', '.')), b = parseFloat(lon.replace(',', '.')); if (Number.isFinite(a) && Number.isFinite(b)) { zmien({ geo: [...plan.geo, { x: rys[0][0], y: rys[0][1], lat: a, lon: b }] }); ustawLat(''); ustawLon(''); ustawNarz('wybierz') } }}>zapisz</button>
                </div>
            )}
        </div>
    )
}

function PanelPodkladow({ plan, slug, ukryte, przelacz, wgraj, zmien, usun, dop, zacznijDop, anulujDop, zastosujDop, materialy, dodaj }: {
    plan: Plan; slug: string; ukryte: Set<string>; przelacz: (id: string) => void; wgraj: (f: File) => void; zmien: (id: string, zm: Partial<Podklad>) => void; usun: (id: string) => void
    materialy: Listy['materialy']; dodaj: (p: Podklad) => void
    dop: { podklad: string; pary: { zr: Pkt; cel?: Pkt }[] } | null; zacznijDop: (id: string) => void; anulujDop: () => void; zastosujDop: () => void
}) {
    void slug
    return (
        <div className="ed-sekcja">
            <p className="ed-maly">Podkład to obraz, na którym rysujesz: zrzut ortofotomapy z Geoportalu, skan dawnej mapy, zdjęcie z drona, szkic. JPG, PNG, WebP albo TIFF; duże pliki są zmniejszane. Na stronie widać tylko rysunek – chyba że udostępnisz podkład.</p>
            <PodkladZMaterialu plan={plan} materialy={materialy} dodaj={dodaj} />
            <label className="ed-btn">+ wgraj podkład<input type="file" accept="image/jpeg,image/png,image/webp,image/tiff" hidden onChange={(e) => e.target.files?.[0] && wgraj(e.target.files[0])} /></label>
            {plan.podklady.map((p, i) => (
                <div key={p.id} className="ed-ramka-sek ed-sekcja">
                    <div className="ed-rzad"><label className="ed-ch"><input type="checkbox" checked={!ukryte.has(p.id)} onChange={() => przelacz(p.id)} /></label><input className="ed-in" value={p.nazwa} onChange={(e) => zmien(p.id, { nazwa: e.target.value })} /></div>
                    <Pole etykieta={`krycie ${Math.round(p.krycie * 100)}%`}><input type="range" min={0.05} max={1} step={0.05} value={p.krycie} onChange={(e) => zmien(p.id, { krycie: +e.target.value })} /></Pole>
                    {p.material && <p className="ed-maly">strona {p.material.strona + 1} materiału „{materialy.find((m) => m.id === p.material!.id)?.nazwa ?? p.material.id}” – obraz i prawa z karty materiału; na stronie rekonstrukcja jest warstwą skanu.</p>}
                    <Pole etykieta="kto widzi na stronie"><select className="ed-in" value={p.widocznosc} onChange={(e) => zmien(p.id, { widocznosc: e.target.value as Podklad['widocznosc'] })}><option value="edycja">tylko edycja</option><option value="bliscy">dla bliskich</option><option value="publiczne">publicznie</option></select></Pole>
                    <div className="ed-rzad">
                        {i > 0 && (dop?.podklad === p.id ? (
                            <>
                                <span className="ed-maly">par: {dop.pary.filter((q) => q.cel).length}</span>
                                <button className="ed-btn" disabled={dop.pary.filter((q) => q.cel).length < 2} onClick={zastosujDop}>zastosuj</button>
                                <button className="ed-btn" onClick={anulujDop}>anuluj</button>
                            </>
                        ) : <button className="ed-btn" onClick={() => zacznijDop(p.id)} title="Wskaż 2–3 te same miejsca na tym podkładzie i na pierwszym">dopasuj (3 punkty)</button>)}
                        <button className="ed-btn" onClick={() => { if (confirm(`Usunąć podkład „${p.nazwa}”?`)) usun(p.id) }}>usuń</button>
                    </div>
                </div>
            ))}
        </div>
    )
}

const CSS = `
/* PK: edytor pod paskiem panelu, obok kolumny ikon (app/keystatic/RamaPanelu.tsx); kolory interfejsu z tokenów panelu (app/keystatic/panel.css).
   Rysunek planu bez zmian – kolory znaczników (miarka, geo, dopasowanie, filtry) zostają; zaznaczenie #0a6fe0 (--pn-wyp) zamiast fioletu. */
.ed-pelny{position:fixed;top:48px;left:56px;right:0;bottom:0;z-index:30;display:flex;flex-direction:column;background:var(--pn-karta);color:var(--pn-tekst);font:13.5px/1.4 var(--pn-font)}
@media (max-width:820px){.ed-pelny{left:0}}
.ed-pasek{display:flex;flex-wrap:wrap;align-items:center;gap:6px 10px;padding:8px 12px;border-bottom:1px solid var(--pn-linia);background:var(--pn-karta)}
.ed-tytul{font-size:15px;font-weight:650;max-width:28ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ed-sep{width:1px;height:20px;background:var(--pn-linia)}
.ed-btn,.ed-zakl button,.ed-akcje button,.ed-zoom button{font:500 13px/1 var(--pn-font);height:32px;box-sizing:border-box;padding:0 12px;border:1px solid var(--pn-linia);border-radius:6px;background:var(--pn-btn);color:var(--pn-tekst);cursor:pointer;display:inline-flex;align-items:center;gap:4px;text-decoration:none;white-space:nowrap}
.ed-btn:hover,.ed-akcje button:hover,.ed-zoom button:hover{background:var(--pn-hover)}
.ed-btn:disabled,.ed-seg button:disabled{opacity:.45;cursor:default}
.ed-btn[aria-pressed=true]{background:color-mix(in srgb,var(--pn-wyp) 12%,var(--pn-btn));border-color:var(--pn-wyp);font-weight:600}
.ed-btn-gl{background:var(--pn-wyp)!important;border-color:var(--pn-wyp)!important;color:var(--pn-na-wyp)!important;font-weight:600}
/* przełączniki jako segmenty macOS: tor + biały segment */
.ed-seg{display:inline-flex;gap:2px;padding:2px;border-radius:8px;background:var(--pn-tor)}
.ed-seg button{font:500 13px/1 var(--pn-font);height:32px;box-sizing:border-box;padding:0 12px;border:0;border-radius:6px;background:none;color:var(--pn-tekst);cursor:pointer;display:inline-flex;align-items:center;gap:4px;white-space:nowrap}
.ed-seg button[aria-pressed=true]{background:var(--pn-seg);font-weight:600;box-shadow:0 1px 2px var(--pn-cien),0 0 0 .5px var(--pn-obwodka)}
.ed-ch{display:inline-flex;align-items:center;gap:5px;color:var(--pn-tekst)}
.ed-wezly{border-collapse:collapse;font-size:12px;width:100%}.ed-wezly th{text-align:left;font-weight:400;color:var(--pn-szary);padding:2px 4px}.ed-wezly td{padding:2px 4px;border-top:1px solid var(--pn-linia2)}.ed-wezly .ed-in{width:5.5em}
.ed-in{font:inherit;font-size:13px;height:32px;padding:0 8px;border:1px solid var(--pn-linia);border-radius:6px;background:var(--pn-pole);color:var(--pn-tekst);min-width:0;width:100%;box-sizing:border-box}
textarea.ed-in{height:auto;padding:6px 8px;resize:vertical}
.ed-glowna{flex:1;min-height:0;display:grid}
.ed-paleta{border-right:1px solid var(--pn-linia);background:var(--pn-menu);overflow:auto;padding:8px;display:flex;flex-direction:column;gap:8px}
.ed-grupa{display:flex;flex-direction:column;gap:1px}
.ed-gt{font-size:12.5px;font-weight:600;color:var(--pn-szary);margin-top:4px}
.ed-gt-przycisk{font:600 12.5px/1.3 var(--pn-font);background:none;border:0;padding:4px 2px;text-align:left;cursor:pointer;display:flex;gap:6px;align-items:baseline;color:var(--pn-tekst)}
.ed-uchwyt{cursor:col-resize;background:transparent;touch-action:none;border-left:1px solid transparent}
.ed-uchwyt:hover,.ed-uchwyt:focus-visible{background:color-mix(in srgb,var(--pn-wyp) 35%,transparent);outline:none}
.ed-typ{font:inherit;display:flex;align-items:center;gap:8px;min-height:30px;padding:3px 6px;border:1px solid transparent;border-radius:6px;background:none;color:inherit;cursor:pointer;text-align:left;font-size:12.5px}
.ed-typ:hover{background:var(--pn-hover)}
.ed-typ[aria-pressed=true]{background:var(--pn-wyb);font-weight:600}
.ed-typ span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
.ed-mapa{position:relative;min-width:0;min-height:0;touch-action:none;background:var(--pn-tlo)}
.ed-mapa svg{width:100%;height:100%;display:block;user-select:none}
.ed-panel{border-left:1px solid var(--pn-linia);background:var(--pn-karta);overflow:auto;display:flex;flex-direction:column}
.ed-zakl{display:flex;gap:2px;margin:8px;padding:2px;border-radius:8px;background:var(--pn-tor);position:sticky;top:8px;z-index:1}
.ed-zakl button{flex:1 1 auto;justify-content:center;height:28px;padding:0 8px;font-size:12.5px;border:0;background:none}
.ed-zakl button[aria-pressed=true]{background:var(--pn-seg);font-weight:600;box-shadow:0 1px 2px var(--pn-cien),0 0 0 .5px var(--pn-obwodka)}
.ed-sekcja{display:flex;flex-direction:column;gap:8px;padding:10px 12px}
.ed-ramka-sek{border:1px solid var(--pn-linia);border-radius:10px;margin:4px 12px;background:var(--pn-pole)}
.ed-pole{display:flex;flex-direction:column;gap:3px;flex:1;min-width:0}.ed-pole>span{font-size:12px;color:var(--pn-szary)}
.ed-pole--szer{flex:2}
.ed-roznice{margin:0;padding:0;list-style:none;max-height:260px;overflow:auto;display:flex;flex-direction:column}
.ed-roznice li{display:flex;flex-direction:column;align-items:flex-start;gap:1px;padding:4px 0;border-bottom:1px solid var(--pn-linia2)}
.ed-rzad{display:flex;gap:6px;align-items:flex-end}
.ed-wiersz{display:flex;justify-content:space-between;align-items:center;gap:8px}
.ed-maly{font-size:12px;color:var(--pn-szary);line-height:1.45;background:none;border:0;padding:0;text-align:left;font-family:inherit;cursor:pointer}
p.ed-maly,span.ed-maly{cursor:default}
.ed-tab{border-collapse:collapse;font-size:12px;width:100%}.ed-tab th,.ed-tab td{text-align:left;padding:2px 4px;font-weight:400}.ed-tab td{text-align:center}.ed-tab caption{text-align:left}.ed-podglad{display:block;width:100%;max-height:280px;object-fit:contain;border-radius:6px;background:var(--pn-tlo)}
.ed-uwaga{display:flex;gap:8px;align-items:flex-start;font-size:12.5px;color:var(--pn-tekst);background:var(--pn-pole);border:1px solid var(--pn-linia);border-radius:8px;padding:6px 8px;margin:0}
.ed-uwaga::before{content:"!";flex:none;width:16px;height:16px;border-radius:50%;background:var(--pn-ostrz);color:var(--pn-na-ostrz);font:700 11px/16px var(--pn-font);text-align:center}
.ed-zoom{position:absolute;right:10px;top:10px;display:flex;flex-direction:column;gap:4px}
.ed-zoom button{width:32px;justify-content:center;padding:0}
.ed-pomoc{position:absolute;left:10px;bottom:10px;right:10px;font-size:12px;color:var(--pn-szary);background:color-mix(in srgb,var(--pn-karta) 92%,transparent);border:1px solid var(--pn-linia);border-radius:6px;padding:4px 8px;pointer-events:none;width:fit-content;max-width:calc(100% - 20px)}
.ed-kom{position:absolute;left:50%;top:10px;transform:translateX(-50%);background:var(--pn-tekst);color:var(--pn-karta);border-radius:6px;padding:6px 12px;font-size:12.5px;max-width:80%}
.ed-akcje{position:absolute;left:50%;bottom:44px;transform:translateX(-50%);display:flex;gap:4px;align-items:center;background:var(--pn-karta);border:1px solid var(--pn-linia);border-radius:8px;padding:4px;box-shadow:0 2px 10px var(--pn-cien)}
.ed-akcje button{border-color:transparent;background:none}
.ed-zdj{display:flex;gap:8px;border-top:1px solid var(--pn-linia2);padding-top:8px}.ed-zdj img{width:72px;height:72px;object-fit:cover;border-radius:6px}
.ed-zdj-o{display:flex;flex-direction:column;gap:4px;min-width:0;font-size:12px}
.ed-miniatura{position:relative}.ed-miniatura img{width:64px;height:64px;object-fit:cover;border-radius:6px;display:block}
.ed-miniatura button{position:absolute;top:2px;right:2px;width:18px;height:18px;border-radius:9px;border:0;background:rgba(0,0,0,.6);color:#fff;cursor:pointer;line-height:1}
.ed-uch{fill:#fff;stroke:#0a6fe0;stroke-width:2;vector-effect:non-scaling-stroke;cursor:grab}
.ed-uch-obrot{fill:#0a6fe0}
.ed-uch-m{fill:#0a6fe0;fill-opacity:.35;stroke:none;cursor:copy}
.ed-uch-l{stroke:#0a6fe0;stroke-width:1.5;vector-effect:non-scaling-stroke}
.ed-obw{fill:none;stroke:#0a6fe0;stroke-width:1.2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}
.ed-ramka{fill:rgba(10,111,224,.08);stroke:#0a6fe0;stroke-width:1.2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke;pointer-events:none}
.ed-kontur-tlo *{stroke:rgba(255,255,255,.85);stroke-width:3;vector-effect:non-scaling-stroke}
.ed-kontur *{stroke:#262420;stroke-width:1.1;vector-effect:non-scaling-stroke}
.ed-duch{fill:rgba(10,111,224,.1);stroke:#0a6fe0;stroke-width:1.2;stroke-dasharray:5 4;vector-effect:non-scaling-stroke;pointer-events:none}
.ed-rys{fill:none;stroke:#0a6fe0;stroke-width:2;vector-effect:non-scaling-stroke}
.ed-miarka{fill:none;stroke:#b45309;stroke-width:2;stroke-dasharray:6 4;vector-effect:non-scaling-stroke}
.ed-wierz{fill:#fff;stroke:#0a6fe0;stroke-width:1.5;vector-effect:non-scaling-stroke}
.ed-znacznik{fill:none;stroke:#db2777;stroke-width:2;vector-effect:non-scaling-stroke}
.ed-geo{fill:#059669;stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke}.ed-geo-t{fill:#059669;font-weight:700}
.ed-dop-zr{fill:#db2777;stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke}.ed-dop-cel{fill:#059669;stroke:#fff;stroke-width:1.5;vector-effect:non-scaling-stroke}
.ed-dop-l{stroke:#db2777;stroke-width:1.5;stroke-dasharray:4 3;vector-effect:non-scaling-stroke}
.ed-siatka{stroke:#a39d91;stroke-opacity:.35;stroke-width:1;vector-effect:non-scaling-stroke;fill:none}
.ed-zapis{font-size:12px;color:var(--pn-szary)}.ed-ostatni{font-size:12px;color:var(--pn-szary);white-space:nowrap;font-variant-numeric:tabular-nums}.ed-napis{font-family:var(--font-jetbrains),monospace;text-align:center;white-space:pre}.ed-uch-bok{cursor:ew-resize}.ed-duch-ok{stroke:#15803d!important;fill:rgba(21,128,61,.15)!important}.ed-filtr{fill:none;stroke:#ea580c;stroke-width:2.2;vector-effect:non-scaling-stroke}.ed-ja{fill:#0a6fe0;stroke:#fff;stroke-width:2;vector-effect:non-scaling-stroke}.ed-ja-acc{fill:rgba(10,111,224,.12);stroke:rgba(10,111,224,.5);stroke-width:1;vector-effect:non-scaling-stroke}
/* filtry grobów jako żetony w torze */
.ed-staty{position:absolute;left:10px;top:10px;display:flex;flex-wrap:wrap;gap:2px;align-items:center;font-size:12px;background:var(--pn-tor);border-radius:8px;padding:2px;max-width:calc(100% - 70px)}
.ed-staty>span{padding:0 8px}
.ed-staty button{font:inherit;border:0;border-radius:6px;background:none;padding:3px 8px;cursor:pointer;color:var(--pn-tekst)}
.ed-staty button[aria-pressed=true]{background:var(--pn-seg);font-weight:600;box-shadow:0 1px 2px var(--pn-cien)}
.ed-staty button:disabled{opacity:.45;cursor:default}
.ed-teren{position:absolute;left:8px;right:8px;bottom:8px;display:flex;flex-direction:column;gap:6px;background:var(--pn-karta);border:1px solid var(--pn-linia);border-radius:10px;padding:8px;box-shadow:0 2px 12px var(--pn-cien)}.ed-teren .ed-rzad{flex-wrap:wrap}.ed-teren-info{font-size:13px;font-weight:600}.ed-wyl{opacity:.45;pointer-events:none}.ed-glowna-teren .ed-pomoc,.ed-glowna-teren .ed-akcje{display:none}
.ed-osoba{display:flex;flex-direction:column;gap:3px;position:relative}.ed-podp{display:flex;flex-direction:column;border:1px solid var(--pn-linia);border-radius:6px;overflow:hidden;background:var(--pn-pole)}.ed-podp button{display:flex;justify-content:space-between;gap:8px;text-align:left;font:inherit;font-size:12.5px;padding:5px 8px;border:0;border-bottom:1px solid var(--pn-linia2);background:transparent;color:inherit;cursor:pointer}.ed-podp button:hover{background:color-mix(in srgb,var(--pn-wyp) 10%,transparent)}
.ed-link{border:0;background:none;padding:0;font:inherit;color:var(--pn-akcent);cursor:pointer;text-decoration:underline}
.ed-kopia{display:flex;gap:6px;align-items:center;flex-wrap:wrap;font-size:12px;background:var(--pn-pole);border:1px solid var(--pn-linia);color:var(--pn-tekst);padding:2px 8px;border-radius:6px}
.ed-zapis-blad,.ed-zapis-konflikt,.ed-zapis-odrzucony{color:var(--pn-blad)}.ed-zapis-ok{color:var(--pn-ok)}
@media (max-width:900px){.ed-uchwyt{display:none}.ed-glowna{grid-template-columns:minmax(0,1fr)!important;grid-template-rows:auto minmax(55vh,1fr) auto}.ed-paleta{border-right:0;border-bottom:1px solid var(--pn-linia);max-height:30vh}.ed-panel{border-left:0;border-top:1px solid var(--pn-linia);max-height:45vh}}
.ed-pasek-teren .ed-nie-teren{display:none!important}.ed-pasek:not(.ed-tryb-rysuj) .ed-tylko-rysuj{display:none!important}@media (max-width:900px){.ed-glowna-teren{grid-template-rows:minmax(64vh,1fr) auto!important}.ed-glowna-teren .ed-panel{max-height:32vh}.ed-teren{left:4px;right:4px;bottom:4px;padding:6px;gap:4px}}@media (pointer:coarse){.ed-btn,.ed-seg button,.ed-zakl button,.ed-akcje button,.ed-in{height:44px}.ed-uch{stroke-width:3}}
`
