// Łączenie osób w rodziny (panel osób).

import { noweIdRodziny, stanOsob, usunRodzine, zapiszRodzine } from './dane'

/** nowy jako rodzic / dziecko / małżonek osoby `kto`. */
export async function polacz(nowy: string, kto: string, jako: string, rodzinaId?: string) {
    const s = await stanOsob()
    const N = s.drzewo.osoby.get(nowy)!, K = s.drzewo.osoby.get(kto)!
    const rel = s.relacje.get(kto) ?? { rodzice: [], malzenstwa: [] }
    const miejsceW = (f: { maz?: string; zona?: string }, o: typeof N) => (o.plec === 'K' ? (!f.zona ? 'zona' : null) : !f.maz ? 'maz' : o.plec === 'U' && !f.zona ? 'zona' : null)
    if (jako === 'rodzic') {
        const f = rel.rodzice.find((x) => miejsceW(x, N))
        if (f) return zapiszRodzine({ ...f, [miejsceW(f, N)!]: nowy })
        return zapiszRodzine({ id: await noweIdRodziny(), [N.plec === 'K' ? 'zona' : 'maz']: nowy, dzieci: [kto], zdarzenia: [], wersja: 0 })
    }
    if (jako === 'dziecko') {
        const f = (rodzinaId && rel.malzenstwa.find((x) => x.id === rodzinaId)) || (rel.malzenstwa.length === 1 ? rel.malzenstwa[0] : undefined)
        if (f) return zapiszRodzine({ ...f, dzieci: [...f.dzieci, nowy] })
        return zapiszRodzine({ id: await noweIdRodziny(), [K.plec === 'K' ? 'zona' : 'maz']: kto, dzieci: [nowy], zdarzenia: [], wersja: 0 })
    }
    if (jako === 'malzonek') {
        const pusta = rel.malzenstwa.find((x) => !(K.plec === 'K' ? x.maz : x.zona) && (K.plec === 'K' ? x.zona === kto : x.maz === kto))
        if (pusta) return zapiszRodzine({ ...pusta, [K.plec === 'K' ? 'maz' : 'zona']: nowy })
        const kM = K.plec !== 'K'
        return zapiszRodzine({ id: await noweIdRodziny(), maz: kM ? kto : nowy, zona: kM ? nowy : kto, dzieci: [], zdarzenia: [], wersja: 0 })
    }
    throw new Error('nieznana relacja')
}

/** Wypisanie osoby z rodziny (jako małżonka albo dziecka); pusta rodzina idzie do kosza. */
export async function rozlacz(rodzinaId: string, osoba: string) {
    const s = await stanOsob()
    const f = s.drzewo.rodziny.get(rodzinaId)
    if (!f) return
    const n = { ...f, maz: f.maz === osoba ? undefined : f.maz, zona: f.zona === osoba ? undefined : f.zona, dzieci: f.dzieci.filter((x) => x !== osoba) }
    if ([n.maz, n.zona, ...n.dzieci].filter(Boolean).length < 2) return usunRodzine(f.id)
    return zapiszRodzine(n)
}
