// Inwentarz ksiąg metrykalnych: pasek lat (które roczniki zachowały się dla danego
// rodzaju ksiąg) i tabela z miejscem przechowania, sygnaturą i odnośnikami.
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

export function PasekLat({ ksiegi, os }: { ksiegi: Ksiega[]; os?: [number, number] }) {
    const [od, doRoku] = os ?? zakresOsi(ksiegi)
    const dl = doRoku - od
    const rodzaje = KOLEJNOSC_KSIAG.filter((r) => ksiegi.some((k) => k.rodzaje.includes(r) && k.zakresy.length))
    if (!rodzaje.length) return null
    const kreski: number[] = []
    for (let r = Math.ceil(od / 25) * 25; r <= doRoku; r += 25) kreski.push(r)
    const proc = (r: number) => `${((r - od) / dl) * 100}%`
    return (
        <div className="flex flex-col" style={{ gap: 4 }} role="img" aria-label={`zachowane roczniki ksiąg w latach ${od}–${doRoku}`}>
            {rodzaje.map((r) => (
                <div key={r} className="grid items-center" style={{ gridTemplateColumns: '9rem minmax(0, 1fr)', gap: 12 }}>
                    <span className="text-gray-600 dark:text-gray-400 truncate" style={male}>{RODZAJE_KSIAG[r]}</span>
                    <div className={`relative h-3 border-b ${LINIA}`}>
                        {ksiegi
                            .filter((k) => k.rodzaje.includes(r))
                            .flatMap((k) => k.zakresy.map((z, i) => (
                                <span
                                    key={`${k.id}-${i}`}
                                    title={`${RODZAJE_KSIAG[r]}: ${z[0] === z[1] ? z[0] : `${z[0]}–${z[1]}`}`}
                                    className="absolute bottom-0 bg-current"
                                    style={{ left: proc(z[0]), width: `max(2px, ${((z[1] - z[0] + 1) / dl) * 100}%)`, height: 8, opacity: k.dostep === 'zaginione' ? 0.25 : 0.75 }}
                                />
                            )))}
                    </div>
                </div>
            ))}
            <div className="grid" style={{ gridTemplateColumns: '9rem minmax(0, 1fr)', gap: 12 }}>
                <span />
                <div className="relative text-gray-500" style={{ height: 16, fontSize: 'calc(11px * var(--font-scale, 1))' }}>
                    {kreski.map((r) => (
                        <span key={r} className="absolute" style={{ left: proc(r), transform: 'translateX(-50%)' }}>{r}</span>
                    ))}
                </div>
            </div>
        </div>
    )
}

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
                        <tr key={k.id} className="border-b border-[#e7e2d8] dark:border-[#374151] align-top">
                            <td className="py-1.5 pr-3">
                                {k.rodzaje.map((r) => RODZAJE_KSIAG[r] ?? r).join(', ')}
                                {k.miejsca.length > 0 && <span className="block text-gray-500" style={male}>dotyczy: {k.miejsca.map((m) => nazwyMiejsc?.[m] ?? m).join(', ')}</span>}
                            </td>
                            <td className="py-1.5 pr-3">
                                <span className="font-bold">{k.lata}</span>
                                {(k.braki || k.jezyk) && <span className="block text-gray-500" style={male}>{[k.braki, k.jezyk].filter(Boolean).join(' · ')}</span>}
                                {k.jednostki.length > 0 && (
                                    <details className="ksiega-tomy" style={male}>
                                        <summary>{k.jednostki.length} {k.jednostki.length === 1 ? 'tom' : k.jednostki.length % 10 >= 2 && k.jednostki.length % 10 <= 4 && (k.jednostki.length % 100 < 12 || k.jednostki.length % 100 > 14) ? 'tomy' : 'tomów'}</summary>
                                        <ul>
                                            {k.jednostki.map((j, i) => (
                                                <li key={i}>
                                                    <b>{j.lata}</b>
                                                    {j.sygnatura && <span className="text-gray-500"> · {j.sygnatura}</span>}
                                                    {j.uwagi && <span className="text-gray-500"> · {j.uwagi}</span>}
                                                    {j.skany && <> · <Odnosnik href={j.skany}>skany</Odnosnik></>}
                                                </li>
                                            ))}
                                        </ul>
                                    </details>
                                )}
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
                    ))}
                </tbody>
            </table>
        </div>
    )
}
