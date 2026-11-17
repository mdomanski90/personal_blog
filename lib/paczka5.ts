/** Paczka 5: współdzielone zasoby i filtrowanie; korzysta z tego samego lib/szukanie co wyszukiwarka globalna. */
import * as React from 'react'
import { createReader } from '@keystatic/core/reader'
import type { Node } from '@markdoc/markdoc'
import keystaticConfig from '../keystatic.config'
import { materialy, lataMaterialu, widoczne, type Widocznosc, type Material } from './archiwum'
import { naTekst } from './markdoc'
import { normalizuj, porownajPl } from './tekst'
import { pasuje, przygotujZapytanie } from './szukanie'
import { stronicuj } from './stronicowanie'

const reader = createReader(process.cwd(), keystaticConfig)
const cache: <T extends (...a: never[]) => unknown>(fn: T) => T =
  (React as unknown as { cache?: <T>(fn: T) => T }).cache ?? ((fn) => fn)

export type Zbior = { id: string; nazwa: string; opis: Node | null; pochodzenie: string; prawa: string; widocznosc: Widocznosc; zrodla: string[]; zglosil?: string }
export type Publikacja = { id: string; nazwa: string; rodzaj: string; autor: string; rok: string; wydawca: string; isbn: string; url: string; opis: string; miejsca: string[]; tematy: string[]; widocznosc: Widocznosc; zglosil?: string }

async function istnieje(katalog: string): Promise<boolean> {
  const fs = await import('node:fs/promises')
  try { await fs.access(`${process.cwd()}/content/${katalog}`); return true }
  catch (error) { if ((error as NodeJS.ErrnoException).code === 'ENOENT') return false; throw error }
}

const wszystkieZbiory = cache(async (): Promise<Zbior[]> => {
  if (!(await istnieje('zbiory'))) return []
  const wpisy = await reader.collections.zbiory.all({ resolveLinkedFiles: true })
  return wpisy.map(({ slug, entry }) => ({
    id: slug, nazwa: entry.title, opis: entry.description?.node ?? null,
    pochodzenie: entry.provenance ?? '', prawa: entry.rights ?? '',
    widocznosc: entry.visibility as Widocznosc,
    zrodla: [...(entry.sources ?? [])].map(String).filter(Boolean),
    zglosil: String(entry.reportedBy ?? '').trim(),
  })).sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

const wszystkiePublikacje = cache(async (): Promise<Publikacja[]> => {
  if (!(await istnieje('publikacje'))) return []
  const wpisy = await reader.collections.publikacje.all()
  return wpisy.map(({ slug, entry }) => ({
    id: slug, nazwa: entry.title, rodzaj: entry.type, autor: entry.creator ?? '',
    rok: entry.year ?? '', wydawca: entry.publisher ?? '', isbn: entry.identifier ?? '',
    url: entry.url ?? '', opis: entry.description ?? '',
    miejsca: [...(entry.spatial ?? [])].filter((id): id is string => !!id),
    tematy: [...(entry.subject ?? [])].filter((id): id is string => !!id),
    widocznosc: entry.visibility as Widocznosc,
    zglosil: String(entry.reportedBy ?? '').trim(),
  })).sort((a, b) => porownajPl(a.nazwa, b.nazwa))
})

export async function zbiory(poziom: Widocznosc): Promise<Zbior[]> {
  return (await wszystkieZbiory()).filter((z) => widoczne(z.widocznosc, poziom))
}
export async function zbior(id: string, poziom: Widocznosc): Promise<Zbior | null> {
  return (await zbiory(poziom)).find((z) => z.id === id) ?? null
}
export async function publikacje(poziom: Widocznosc): Promise<Publikacja[]> {
  return (await wszystkiePublikacje()).filter((p) => widoczne(p.widocznosc, poziom))
}
export async function publikacja(id: string, poziom: Widocznosc): Promise<Publikacja | null> {
  return (await publikacje(poziom)).find((p) => p.id === id) ?? null
}
export async function materialyZbioru(id: string, poziom: Widocznosc): Promise<Material[]> {
  // Nawet znając adres prywatnego zbioru nie można enumerować jego materiałów.
  if (!(await zbior(id, poziom))) return []
  return (await materialy(poziom)).filter((m) => m.zbiory.includes(id))
}

export interface FiltrP5 {
  q?: string; rodzaj?: string; miejsce?: string; temat?: string; osoba?: string;
  obiekt?: string; zbior?: string; od?: number; do?: number;
  /** KRT-03 (P3): materiały instytucji – „wszystkie (N) w archiwum →” z karty instytucji */
  instytucja?: string;
  sort?: 'data_rosnaco' | 'data_malejaco' | 'tytul' | 'dodano'; strona?: number
}
export interface WynikiP5 { wyniki: Material[]; razem: number; stron: number; strona: number }
export async function katalogP5(poziom: Widocznosc, f: FiltrP5): Promise<WynikiP5> {
  const z = przygotujZapytanie((f.q ?? '').slice(0, 100))
  let lista = (await materialy(poziom)).filter((m) => {
    if (f.rodzaj && m.rodzaj !== f.rodzaj) return false
    if (f.miejsce && !m.miejsca.includes(f.miejsce)) return false
    if (f.temat && !m.tematy.includes(f.temat)) return false
    if (f.obiekt && !m.obiekty.includes(f.obiekt)) return false
    if (f.osoba && !m.osobyIds.includes(f.osoba)) return false
    if (f.zbior && !m.zbiory.includes(f.zbior)) return false
    if (f.instytucja && !m.instytucje.includes(f.instytucja)) return false
    if (f.od !== undefined || f.do !== undefined) {
      const l = lataMaterialu(m)
      if (!l || (f.od !== undefined && l[1] < f.od) || (f.do !== undefined && l[0] > f.do)) return false
    }
    if (z && !pasuje(z, [m.nazwa, m.sygnatura, m.tworca, m.pochodzenie,
        m.przekazal, m.opracowal, m.miejscePrzechowywania, m.transkrypcja,
        ...m.zrodla, naTekst(m.opis)].join(' '))) return false
    return true
  })
  const data = (m: Material) => lataMaterialu(m)?.[0]
  if (f.sort === 'tytul') lista = lista.sort((a, b) => porownajPl(a.nazwa, b.nazwa))
  else if (f.sort === 'dodano') lista = lista.sort((a, b) => (b.dodano ?? '').localeCompare(a.dodano ?? ''))
  else if (f.sort === 'data_malejaco') lista = lista.sort((a, b) => (data(b) ?? -999999) - (data(a) ?? -999999) || porownajPl(a.nazwa, b.nazwa))
  else lista = lista.sort((a, b) => (data(a) ?? 999999) - (data(b) ?? 999999) || porownajPl(a.nazwa, b.nazwa))
  return stronicuj(lista, f.strona)
}

/** Rozszerzenie indeksu globalnego, bez osobnego algorytmu wyszukiwania. */
export async function szukajP5(q: string, poziom: Widocznosc) {
  const z = przygotujZapytanie(q)
  if (!z) return []
  const wyn: { rodzaj: 'zbiór' | 'publikacja'; etykieta: string; id: string; tytul: string; adres: string; fragment: string; waga: number }[] = []
  for (const p of await publikacje(poziom)) {
    if (!pasuje(z, [p.nazwa, p.autor, p.opis, p.rok, p.wydawca, p.isbn].join(' '))) continue
    wyn.push({ rodzaj: 'publikacja', etykieta: 'publikacja', id: p.id, tytul: p.nazwa,
      adres: `/biblioteka/publikacje/${p.id}`, fragment: [p.autor, p.rok].filter(Boolean).join(' · '),
      waga: normalizuj(p.nazwa).includes(z.fraza) ? 2 : 1 })
  }
  for (const k of await zbiory(poziom)) {
    if (!pasuje(z, [k.nazwa, k.pochodzenie, naTekst(k.opis)].join(' '))) continue
    wyn.push({ rodzaj: 'zbiór', etykieta: 'zbiór archiwalny', id: k.id, tytul: k.nazwa,
      adres: `/archiwum/zbiory/${k.id}`, fragment: k.pochodzenie,
      waga: normalizuj(k.nazwa).includes(z.fraza) ? 2 : 1 })
  }
  return wyn
}
