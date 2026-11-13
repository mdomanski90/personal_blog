// Wspólne dla stron i tras: plan widziany przez bieżącego czytelnika, wydawanie plików.
import fs from 'node:fs'
import { poziomCzytelnika } from '@/lib/archiwum'
import { dlaCzytelnika, numeracja, planNaGeo, widoczne, type Numer, type Plan } from './model'
import { katalog } from './typy'
import { kadr } from '@/app/components/plan/Rysunek'
import { sciezkaPliku, wczytajPlan, wczytajUstawienia, listaPlanow } from './dane'
import { mimePliku } from '@/lib/pliki'

export async function planDlaCzytelnika(slug: string): Promise<{ plan: Plan; poziom: 'publiczne' | 'bliscy' } | null> {
    const surowy = await wczytajPlan(slug)
    if (!surowy) return null
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    if (!widoczne(surowy.widocznosc, poziom)) return null
    return { plan: dlaCzytelnika(surowy, poziom, await wczytajUstawienia()), poziom }
}

/** Plany widoczne dla czytelnika, przypisane do miejsca albo obiektu. */
export async function planyDlaCzytelnika(rodzaj: 'miejsce' | 'obiekt', id: string): Promise<Plan[]> {
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    return (await listaPlanow()).filter((p) => (rodzaj === 'miejsce' ? p.miejsce === id : p.obiekt === id) && widoczne(p.widocznosc, poziom))
}

export const nieMa = () => new Response('Nie znaleziono', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function wydajPlik(katalog: string, plik: string, publiczny: boolean): Promise<Response> {
    const p = sciezkaPliku(katalog, plik)
    if (!p) return nieMa()
    try {
        const st = await fs.promises.stat(p)
        if (!st.isFile()) return nieMa()
        const dane = await fs.promises.readFile(p)
        return new Response(new Uint8Array(dane), {
            headers: {
                'Content-Type': mimePliku(plik), 'Content-Length': String(st.size), 'X-Content-Type-Options': 'nosniff',
                'Cache-Control': publiczny ? 'public, max-age=86400' : 'private, no-store', ...(publiczny ? {} : { 'X-Robots-Tag': 'noindex, nofollow' }),
            },
        })
    } catch { return nieMa() }
}

/** Do punktów mapy dopisuje plany (widoczne dla czytelnika): plakietka wsi – plany wsi, obiekt – jego plany. */
export async function dolaczPlany<T extends { id: string; typ: 'miejsce' | 'obiekt'; plany?: { slug: string; tytul: string }[] }>(punkty: T[]): Promise<T[]> {
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    const plany = (await listaPlanow()).filter((p) => widoczne(p.widocznosc, poziom))
    if (!plany.length) return punkty
    return punkty.map((pt) => {
        const L = plany.filter((p) => (pt.typ === 'obiekt' ? p.obiekt === pt.id : p.miejsce === pt.id)).sort((a, b) => Number(!!a.obiekt) - Number(!!b.obiekt))
        return L.length ? { ...pt, plany: L.map((p) => ({ slug: p.slug, tytul: p.tytul })) } : pt
    })
}

export interface Pochowek { slug: string; tytul: string; elementId: string; numer?: Numer; /** pierwsze zdjęcie grobu (jeśli czytelnik może je zobaczyć) */ zdjecie?: string }

/** Groby, w których plan wskazuje daną osobę z drzewa (tylko te, które czytelnik może zobaczyć). */
export async function pochowkiOsoby(osobaId: string): Promise<Pochowek[]> {
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    const kandydaci = (await listaPlanow()).filter((p) => widoczne(p.widocznosc, poziom) && p.elementy.some((e) => e.osoby?.some((o) => o.id === osobaId)))
    if (!kandydaci.length) return []
    const ust = await wczytajUstawienia(), typy = katalog(ust)
    const wyn: Pochowek[] = []
    for (const surowy of kandydaci) {
        const p = dlaCzytelnika(surowy, poziom, ust), nr = numeracja(p, typy)
        for (const e of p.elementy) if (e.osoby?.some((o) => o.id === osobaId)) wyn.push({ slug: p.slug, tytul: p.tytul, elementId: e.id, numer: nr.get(e.id), ...(e.zdjecia?.[0]?.plik ? { zdjecie: `/plany/${p.slug}/zdjecie/${e.zdjecia[0].plik}` } : {}) })
    }
    return wyn
}

export interface PlanNaMapie {
    slug: string
    tytul: string
    /** narożniki obrazu planu: lewy górny, prawy górny, prawy dolny, lewy dolny – [dł., szer.] */
    naroza: [[number, number], [number, number], [number, number], [number, number]]
}

/** Plany z punktami geo (co najmniej 2), widoczne dla czytelnika – do nałożenia na mapę przy dużym przybliżeniu. */
export async function planyNaMape(): Promise<PlanNaMapie[]> {
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    const wyn: PlanNaMapie[] = []
    for (const p of await listaPlanow()) {
        if (!widoczne(p.widocznosc, poziom) || p.geo.length < 2) continue
        const f = planNaGeo(p.geo)
        if (!f) continue
        const [x, y, w, h] = kadr({ ...p, obrot: 0 })
        wyn.push({ slug: p.slug, tytul: p.tytul, naroza: [f([x, y]), f([x + w, y]), f([x + w, y + h]), f([x, y + h])] })
    }
    return wyn
}
