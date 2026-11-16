// PH2 (łańcuch z PH0): odwrotne odnośniki – na których planach i skanach występuje karta (obiekt, miejsce, osoba, temat).
// Liczone przy odczycie z jednego kierunku zapisu (powiązania elementów i objaśnień), bez kopiowania treści.
// Tylko pozycje widoczne dla czytelnika: plan i element w wersji dla czytelnika, materiał i objaśnienie widoczne, cel widoczny.
import { cache } from 'react'
import type { RodzajCelu } from '../odnosniki'

import { indeksWystapien, type Wystapienia } from './wystapienia-indeks'
export type { Wystapienia, Wystapienie } from './wystapienia-indeks'

const indeks = cache(async (poziom: 'publiczne' | 'bliscy') => {
    const [{ rozwiazOdnosniki, materialy, widoczne }, { listaPlanow, wczytajUstawienia }, { dlaCzytelnika }, { objasnieniaMaterialu }, { katalog }, { adresPlanu }] = await Promise.all([
        import('../archiwum'), import('./dane'), import('./model'), import('../objasnienia'), import('./typy'), import('./katalog'),
    ])
    const [rozwiaz, u, mat] = await Promise.all([rozwiazOdnosniki(poziom), wczytajUstawienia(), materialy(poziom)])
    const typy = katalog(u), widoczneMat = new Set(mat.map((m) => m.id))
    const plany = (await listaPlanow()).filter((p) => widoczne(p.widocznosc, poziom)).map((pelny) => {
        const wydany = dlaCzytelnika(pelny, poziom, u), baza = adresPlanu(pelny, widoczneMat)
        return { pelny, wydany, adres: (el: string) => (baza.startsWith('/plany/') ? `${baza}?grob=${encodeURIComponent(el)}` : baza), nazwaTypu: (t: string) => typy.get(t)?.nazwa ?? 'element' }
    })
    const skany = mat.map((m) => ({ id: m.id, nazwa: m.nazwa, objasnienia: objasnieniaMaterialu(m.id).filter((o) => widoczne(o.widocznosc, poziom)) }))
    return indeksWystapien(plany, skany, (id) => rozwiaz(id))
})

/** Wystąpienia karty na planach i skanach – dla bieżącego czytelnika. */
export async function wystapieniaKarty(rodzaj: RodzajCelu, id: string): Promise<Wystapienia> {
    const { poziomCzytelnika } = await import('../archiwum')
    const poziom = (await poziomCzytelnika()) === 'bliscy' ? 'bliscy' : 'publiczne'
    return (await indeks(poziom)).get(`${rodzaj}:${id}`) ?? { plany: [], skany: [] }
}
