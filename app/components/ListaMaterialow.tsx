import * as React from 'react'
import type { Material } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { formatujEdtf } from '@/lib/edtf'
import { typPliku } from '@/lib/pliki'
import SiatkaMiniatur from './SiatkaMiniatur'
import { pozycjaKadru } from '@/lib/kadr'

const ZNAK: Record<string, string> = { obraz: '▣', dzwiek: '♪', film: '▶', pdf: 'PDF', inny: '▤' }

/** Siatka materiałów: miniatura (zdjęcia, mapy, skany) albo znak rodzaju pliku, tytuł, rodzaj i data. */
export default function ListaMaterialow({ materialy }: { materialy: Material[] }) {
    return (
        <SiatkaMiniatur pusto="brak materiałów." pozycje={materialy.map((m) => {
            const typ = typPliku(m.plik), s0 = m.strony[0]
            return {
                klucz: m.id, href: `/archiwum/${m.id}`, tytul: m.nazwa, znak: typ ? ZNAK[typ] : '—',
                linia: [RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj, m.czas && formatujEdtf(m.czas), m.widocznosc === 'bliscy' && 'dla bliskich'].filter(Boolean).join(' · '),
                // eslint-disable-next-line @next/next/no-img-element
                obraz: s0 ? <img src={s0.adres.startsWith('/pliki/strony/') ? `${s0.adres}?w=480` : s0.adres} alt="" loading="lazy" decoding="async" style={{ '--kadr': pozycjaKadru(m.kadr) } as React.CSSProperties /* styl-dynamiczny: kadr miniatury zapisany w materiale */} /> : undefined,
            }
        })} />
    )
}
