import * as React from 'react'
import { Link } from 'next-view-transitions'
import type { Powiazania as DanePowiazan, ZrodloPowiazania } from '@/lib/archiwum'
import { odmiana } from '@/lib/tekst'
import { RAMKA, Sekcja } from './Uklad'

const RODZAJ: Record<string, string> = { wpis: 'wpis', miejsce: 'miejsce', temat: 'temat', obiekt: 'obiekt' }

function Lista({ zrodla, wyroznienie }: { zrodla: ZrodloPowiazania[]; wyroznienie: 'odnosnik' | 'wzmianka' }) {
    return (
        <ul className="flex flex-col" style={{ gap: 'calc(0.9rem * var(--font-scale, 1))', listStyle: 'none', padding: 0, margin: 0 }}>
            {zrodla.map((z) => (
                <li key={`${z.zrodlo.rodzaj}:${z.zrodlo.id}`} className={`${RAMKA} powiazanie`} style={{ borderRadius: 8, padding: 'calc(0.6rem * var(--font-scale, 1)) calc(0.8rem * var(--font-scale, 1))' }}>
                    <div className="flex flex-wrap items-baseline" style={{ gap: '2px 10px' }}>
                        <span className="text-gray-500 lowercase" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>{RODZAJ[z.zrodlo.rodzaj]}</span>
                        <Link href={z.zrodlo.adres} className="font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{z.zrodlo.nazwa}</Link>
                        {z.ile > z.fragmenty.length && (
                            <span className="text-gray-500" style={{ fontSize: 'calc(12px * var(--font-scale, 1))' }}>{odmiana(z.ile, ['raz', 'razy', 'razy'])}</span>
                        )}
                    </div>
                    {z.fragmenty.map((f, i) => (
                        <p key={i} className="text-gray-700 dark:text-gray-300 leading-relaxed" style={{ fontSize: 'calc(14px * var(--font-scale, 1))', marginTop: 4 }}>
                            {f.przed}
                            <mark className={`powiazanie-${wyroznienie}`}>{f.trafienie}</mark>
                            {f.po}
                        </p>
                    ))}
                </li>
            ))}
        </ul>
    )
}

/**
 * Sieć powiązań na dole strony (jak w Logseq): teksty z odnośnikiem [[…]] do tej pozycji
 * oraz – zwinięte – teksty, w których jej nazwa pada bez odnośnika.
 */
export default function Powiazania({ dane }: { dane: DanePowiazan }) {
    if (!dane.odnosniki.length && !dane.wzmianki.length) return null
    return (
        <>
            {dane.odnosniki.length > 0 && (
                <Sekcja tytul={`odnośniki w tekstach (${dane.odnosniki.length})`} id="odnosniki">
                    <Lista zrodla={dane.odnosniki} wyroznienie="odnosnik" />
                </Sekcja>
            )}
            {dane.wzmianki.length > 0 && (
                <details id="wzmianki" className="flex flex-col">
                    <summary className="cursor-pointer lowercase font-bold" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                        wspomniane bez odnośnika ({dane.wzmianki.length})
                    </summary>
                    <p className="text-gray-500 lowercase" style={{ fontSize: 'calc(12px * var(--font-scale, 1))', margin: '6px 0 10px' }}>
                        teksty, w których pada ta nazwa albo jej forma, ale bez odnośnika [[…]] i bez powiązania w panelu.
                    </p>
                    <Lista zrodla={dane.wzmianki} wyroznienie="wzmianka" />
                </details>
            )}
        </>
    )
}
