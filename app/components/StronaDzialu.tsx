import * as React from 'react'
import { Strona, TytulStrony } from './Uklad'
import type { Sciezka } from './Wzorce'
import { ElementyDzialu, type ElementyDzialuProps } from './ElementyDzialu'
import { odmiana } from '@/lib/tekst'

/** Strona działu katalogu (DZL-01): tytuł i elementy w jednej, wspólnej kolejności – zob. ElementyDzialu. */
export default function StronaDzialu({ tytul, sciezka, ...elementy }: { tytul: React.ReactNode; sciezka?: Sciezka } & ElementyDzialuProps) {
    return (
        <Strona uklad="pelna">
            <TytulStrony sciezka={sciezka}>{tytul}</TytulStrony>
            <ElementyDzialu {...elementy} />
        </Strona>
    )
}

/** Licznik nad listą (UX-11/ARC-08): „N pozycji · strona X z Y”; odmiana zawsze przez odmiana(). */
export function LicznikWynikow({ liczba, formy, strona, stron, dodatek, fraza }: { liczba: number; formy: [string, string, string]; strona?: number; stron?: number; dodatek?: React.ReactNode; /** łatka P3 (plansza /szukaj): „„fraza” – N wyników” */ fraza?: string }) {
    return (
        <p className="ot-drobne" aria-live="polite">
            {fraza && <>„{fraza}” – </>}{odmiana(liczba, formy)}{stron !== undefined && strona !== undefined && <> · strona {strona} z {stron}</>}
            {dodatek && <> · {dodatek}</>}
        </p>
    )
}
