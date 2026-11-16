import type { Metadata } from 'next'
import PoleSzukania from '../../components/PoleSzukania'
import { Link } from 'next-view-transitions'
import { hasla, poziomCzytelnika, RODZAJE_HASEL } from '@/lib/archiwum'
import { normalizuj } from '@/lib/tekst'
import { Strona, TytulStrony } from '../../components/Uklad'
import Komunikat from '../../components/Komunikat'
import { ZglosPoprawke } from '../../components/Karta'
import SpisBiblioteki from '../SpisBiblioteki'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'słownik · biblioteka · odniepamieci.pl' }

export default async function Slownik({ searchParams }: { searchParams: Promise<{ q?: string; rodzaj?: string }> }) {
    const { q = '', rodzaj = '' } = await searchParams
    const wszystkie = await hasla(await poziomCzytelnika())
    const zap = normalizuj(q.trim())
    const lista = wszystkie.filter((h) => (!rodzaj || h.rodzaj === rodzaj) && (!zap || [h.haslo, ...h.formy, h.znaczenie].some((t) => normalizuj(t).includes(zap))))
    const litery = new Map<string, typeof lista>()
    for (const h of lista) { const l = h.haslo.slice(0, 1).toLocaleUpperCase('pl'); if (!litery.has(l)) litery.set(l, []); litery.get(l)!.push(h) }
    const href = (r: string) => `/biblioteka/slownik${r || q ? '?' : ''}${[r && `rodzaj=${r}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&')}`
    return (
        <Strona uklad="pelna">
            <TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}>słownik</TytulStrony>
            <SpisBiblioteki wybrany="slownik" />
            <p className="leading-relaxed text-[var(--tekst-opis)]" style={{ fontSize: 'calc(16px * var(--font-scale, 1))', margin: 0 }}>
                Dawne pojęcia, urzędy, miary i słowa z miejscowej gwary, które pojawiają się w dokumentach i wspomnieniach – każde ze źródłem znaczenia.
            </p>
            <div className="flex flex-wrap items-center" style={{ gap: 8 }}>
                <PoleSzukania action="/biblioteka/slownik" defaultValue={q} placeholder="hasło, znaczenie" ukryte={{ rodzaj }} style={{ minWidth: 260 }} />
                {/* P7D-3 (AUD-03): rodzaj hasła jako pastylki – jak wyznania w katalogu ksiąg i rodzaje w wyszukiwarce */}
                <div className="flex flex-wrap filtr-pastylki" style={{ gap: 7 }} role="group" aria-label="rodzaj hasła">
                    {[['', 'wszystkie'], ...Object.entries(RODZAJE_HASEL)].map(([id, n]) => (
                        <Link key={id} href={href(id)} className="szukaj-filtr" aria-current={rodzaj === id ? 'true' : undefined}>{rodzaj === id ? <b>{n}</b> : n}</Link>
                    ))}
                </div>
            </div>
            {wszystkie.length === 0 && <Komunikat rodzaj="pusto">Słownik jest w przygotowaniu – hasła pojawią się po dodaniu w panelu.</Komunikat>}
            {wszystkie.length > 0 && lista.length === 0 && <Komunikat rodzaj="pusto">Nic nie znaleziono – zmień frazę albo rodzaj hasła.</Komunikat>}
            {[...litery].map(([l, L]) => (
                <section key={l} className="flex flex-col" style={{ gap: 4 }}>
                    <h2 className="font-bold" style={{ fontSize: 'calc(18px * var(--font-scale, 1))' }}>{l}</h2>
                    <dl style={{ margin: 0 }}>
                        {L.map((h) => (
                            <div key={h.id} id={h.id} className="lista-pozycja flex flex-col scroll-mt-6" style={{ gap: 4 }}>
                                <dt className="flex flex-wrap items-baseline" style={{ gap: 10 }}>
                                    <b style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>{h.haslo}</b>
                                    <span className="text-[var(--tekst-etykieta)]" style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>{RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj}</span>
                                </dt>
                                <dd style={{ margin: 0, fontSize: 'calc(15px * var(--font-scale, 1))', whiteSpace: 'pre-line' }}>{h.znaczenie}</dd>
                                {h.przyklad && <dd className="text-[var(--tekst-opis)] italic" style={{ margin: 0, fontSize: 'calc(14px * var(--font-scale, 1))', whiteSpace: 'pre-line' }}>{h.przyklad}</dd>}
                                {h.zrodlo && <dd className="text-[var(--tekst-etykieta)]" style={{ margin: 0, fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>źródło: {h.zrodlo}</dd>}
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
            <ZglosPoprawke adres="/biblioteka/slownik" tytul="słownik" pytanie="Znasz słowo, którego tu brakuje, albo inne jego znaczenie?" />
        </Strona>
    )
}
