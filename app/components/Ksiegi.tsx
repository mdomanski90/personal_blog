// Inwentarz ksiąg metrykalnych: pasek lat (które roczniki zachowały się dla danego
// rodzaju ksiąg) i tabela z miejscem przechowania, sygnaturą i odnośnikami.
import * as React from 'react'
import type { Ksiega } from '@/lib/archiwum'
import { RODZAJE_KSIAG, DOSTEP_KSIAG, KOLEJNOSC_KSIAG } from '@/lib/ksiegi'

const LINIA = 'border-[#d6d1c6] dark:border-[#4b5563]'
const male = { fontSize: 'calc(13px * var(--font-scale, 1))' }

/** Zakres osi: od pełnej dekady przed najstarszą księgą do pełnej dekady po najmłodszej. */
export function zakresOsi(ks: Ksiega[]): [number, number] {
    const lata = ks.flatMap((k) => k.zakresy.flat())
    if (!lata.length) return [1800, 1950]
    return [Math.floor(Math.min(...lata) / 10) * 10, Math.ceil((Math.max(...lata) + 1) / 10) * 10]
}

/** Podziałka osi: przy krótkim zakresie co 5 lat, dłuższym co 10, długim co 25. */
const krokOsi = (dl: number) => (dl <= 40 ? 5 : dl <= 100 ? 10 : 25)

export function PasekLat({ ksiegi, os }: { ksiegi: Ksiega[]; os?: [number, number] }) {
    const [od, doRoku] = os ?? zakresOsi(ksiegi)
    const dl = doRoku - od
    const rodzaje = KOLEJNOSC_KSIAG.filter((r) => ksiegi.some((k) => k.rodzaje.includes(r) && k.zakresy.length))
    if (!rodzaje.length) return null
    const krok = krokOsi(dl)
    const kreski: number[] = []
    for (let r = Math.ceil(od / krok) * krok; r <= doRoku; r += krok) kreski.push(r)
    const proc = (r: number) => `${((r - od) / dl) * 100}%`
    // jedna siatka dla wszystkich wierszy – podpisy w kolumnie o szerokości najdłuższego, paski zawsze w jednej linii
    return (
        <div className="pasek-lat" role="img" aria-label={`zachowane roczniki ksiąg w latach ${od}–${doRoku}`}>
            {rodzaje.map((r) => (
                <React.Fragment key={r}>
                    <span className="pasek-lat-podpis">{RODZAJE_KSIAG[r]}</span>
                    <div className="pasek-lat-os">
                        {kreski.map((x) => <span key={x} className="pasek-lat-kreska" style={{ left: proc(x) }} />)}
                        {ksiegi
                            .filter((k) => k.rodzaje.includes(r))
                            .flatMap((k) => k.zakresy.map((z, i) => (
                                <span
                                    key={`${k.id}-${i}`}
                                    title={`${RODZAJE_KSIAG[r]}: ${z[0] === z[1] ? z[0] : `${z[0]}–${z[1]}`}`}
                                    className="pasek-lat-odcinek"
                                    style={{ left: proc(z[0]), width: `max(3px, calc(${((z[1] - z[0] + 1) / dl) * 100}% - 1px))`, opacity: k.dostep === 'zaginione' ? 0.25 : undefined }}
                                />
                            )))}
                    </div>
                </React.Fragment>
            ))}
            <span className="pasek-lat-podpis pasek-lat-objasnienie">zachowane roczniki</span>
            <div className="pasek-lat-lata">
                {kreski.map((x) => <span key={x} style={{ left: proc(x), transform: x === od ? 'none' : x === doRoku ? 'translateX(-100%)' : 'translateX(-50%)' }}>{x}</span>)}
            </div>
        </div>
    )
}

const ileTomow = (n: number) => `${n} ${n === 1 ? 'tom' : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 12 || n % 100 > 14) ? 'tomy' : 'tomów'}`

function Odnosnik({ href, children }: { href: string; children: React.ReactNode }) {
    return <a href={href} target="_blank" rel="noopener noreferrer">{children} ↗</a>
}

export function TabelaKsiag({ ksiegi, nazwyMiejsc }: { ksiegi: Ksiega[]; /** id wsi → nazwa, do „dotyczy: …” */ nazwyMiejsc?: Record<string, string> }) {
    if (!ksiegi.length) return null
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse" style={{ fontSize: 'calc(14px * var(--font-scale, 1))', tableLayout: 'fixed', minWidth: '34rem' }}>
                <colgroup><col style={{ width: '22%' }} /><col style={{ width: '30%' }} /><col style={{ width: '28%' }} /><col style={{ width: '20%' }} /></colgroup>
                <thead>
                    <tr className={`border-b ${LINIA} text-left text-gray-600 dark:text-gray-400`} style={male}>
                        <th className="font-normal py-1 pr-3">rodzaj</th>
                        <th className="font-normal py-1 pr-3">lata</th>
                        <th className="font-normal py-1 pr-3">gdzie i sygnatura</th>
                        <th className="font-normal py-1">dostęp</th>
                    </tr>
                </thead>
                <tbody>
                    {ksiegi.map((k) => (
                        <React.Fragment key={k.id}>
                        <tr className={`${k.jednostki.length ? '' : 'border-b '}border-[#e7e2d8] dark:border-[#374151] align-top`}>
                            <td className="py-1.5 pr-3">
                                {k.rodzaje.map((r) => RODZAJE_KSIAG[r] ?? r).join(', ')}
                                {k.miejsca.length > 0 && <span className="block text-gray-500" style={male}>dotyczy: {k.miejsca.map((m) => nazwyMiejsc?.[m] ?? m).join(', ')}</span>}
                            </td>
                            <td className="py-1.5 pr-3">
                                <span className="font-bold">{k.lata}</span>
                                {(k.braki || k.jezyk) && <span className="block text-gray-500" style={male}>{[k.braki, k.jezyk].filter(Boolean).join(' · ')}</span>}
                            </td>
                            <td className="py-1.5 pr-3">
                                {k.gdzie || <span className="text-gray-500">—</span>}
                                {k.sygnatura && <span className="block text-gray-500" style={male}>{k.sygnatura}</span>}
                            </td>
                            <td className="py-1.5">
                                <span className="flex flex-wrap" style={{ gap: '2px 10px' }}>
                                    {k.skany && <Odnosnik href={k.skany}>skany</Odnosnik>}
                                    {k.indeks && <Odnosnik href={k.indeks}>indeks</Odnosnik>}
                                    {!k.skany && !k.indeks && <span className="text-gray-500">{DOSTEP_KSIAG[k.dostep] ?? k.dostep}</span>}
                                </span>
                            </td>
                        </tr>
                        {k.jednostki.length > 0 && (
                            <tr className="border-b border-[#e7e2d8] dark:border-[#374151]">
                                <td colSpan={4} className="pb-2">
                                    <details className="ksiega-tomy" style={male}>
                                        <summary>{ileTomow(k.jednostki.length)}: roczniki, sygnatury, skany</summary>
                                        <ul>
                                            {k.jednostki.map((j, i) => (
                                                <li key={i}>
                                                    <b>{j.lata}</b>
                                                    {j.sygnatura && <span className="text-gray-500"> {j.sygnatura}</span>}
                                                    {j.skany && <> <Odnosnik href={j.skany}>skany</Odnosnik></>}
                                                    {j.uwagi && <span className="block text-gray-500">{j.uwagi}</span>}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                </td>
                            </tr>
                        )}
                        </React.Fragment>
                    ))}
                </tbody>
            </table>
        </div>
    )
}
