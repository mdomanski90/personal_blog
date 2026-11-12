import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { hasla, poziomCzytelnika, RODZAJE_HASEL } from '@/lib/archiwum'
import { normalizuj } from '@/lib/tekst'
import { Strona, TytulStrony } from '../../components/Uklad'
import Zgloszenie from '../../components/Zgloszenie'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'słownik · biblioteka · odniepamieci.pl' }

const segment = 'border border-[#d1d5db] dark:border-[#4b5563] lowercase !no-underline text-current'

export default async function Slownik({ searchParams }: { searchParams: Promise<{ q?: string; rodzaj?: string }> }) {
    const { q = '', rodzaj = '' } = await searchParams
    const wszystkie = await hasla(await poziomCzytelnika())
    const zap = normalizuj(q.trim())
    const lista = wszystkie.filter((h) => (!rodzaj || h.rodzaj === rodzaj) && (!zap || [h.haslo, ...h.formy, h.znaczenie].some((t) => normalizuj(t).includes(zap))))
    const litery = new Map<string, typeof lista>()
    for (const h of lista) { const l = h.haslo.slice(0, 1).toLocaleUpperCase('pl'); if (!litery.has(l)) litery.set(l, []); litery.get(l)!.push(h) }
    const href = (r: string) => `/biblioteka/slownik${r || q ? '?' : ''}${[r && `rodzaj=${r}`, q && `q=${encodeURIComponent(q)}`].filter(Boolean).join('&')}`
    return (
        <Strona>
            <TytulStrony sciezka={[{ tekst: 'biblioteka', href: '/biblioteka' }]}>słownik</TytulStrony>
            <p className="leading-relaxed text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(16px * var(--font-scale, 1))', margin: 0 }}>
                Dawne pojęcia, urzędy, miary i słowa z miejscowej gwary, które pojawiają się w dokumentach i wspomnieniach – każde ze źródłem znaczenia.
            </p>
            <form action="/biblioteka/slownik" className="flex flex-wrap items-center" style={{ gap: 8 }}>
                {rodzaj && <input type="hidden" name="rodzaj" value={rodzaj} />}
                <input name="q" defaultValue={q} placeholder="szukaj hasła" className="border border-[#d1d5db] dark:border-[#4b5563] rounded-[7px] bg-transparent text-current" style={{ height: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', font: 'inherit', fontSize: 'calc(14px * var(--font-scale, 1))', minWidth: 220 }} />
                <div className="flex flex-wrap w-fit" style={{ paddingLeft: 1 }}>
                    {[['', 'wszystkie'], ...Object.entries(RODZAJE_HASEL)].map(([id, n]) => (
                        <Link key={id} href={href(id)} className={`${segment} ${rodzaj === id ? 'bg-muted font-bold' : ''}`} style={{ margin: '0 0 0 -1px', height: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', display: 'inline-flex', alignItems: 'center', fontSize: 'calc(13px * var(--font-scale, 1))' }}>{n}</Link>
                    ))}
                </div>
            </form>
            {wszystkie.length === 0 && <p className="text-gray-500">Słownik jest w przygotowaniu – hasła pojawią się po dodaniu w panelu.</p>}
            {wszystkie.length > 0 && lista.length === 0 && <p className="text-gray-500">Nic nie znaleziono.</p>}
            {[...litery].map(([l, L]) => (
                <section key={l} className="flex flex-col" style={{ gap: 4 }}>
                    <h2 className="font-bold" style={{ fontSize: 'calc(18px * var(--font-scale, 1))' }}>{l}</h2>
                    <dl style={{ margin: 0 }}>
                        {L.map((h) => (
                            <div key={h.id} id={h.id} className="border-b border-[#e5e7eb] dark:border-[#374151] py-3 flex flex-col scroll-mt-6" style={{ gap: 4 }}>
                                <dt className="flex flex-wrap items-baseline" style={{ gap: 10 }}>
                                    <b style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>{h.haslo}</b>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>{RODZAJE_HASEL[h.rodzaj] ?? h.rodzaj}</span>
                                </dt>
                                <dd style={{ margin: 0, fontSize: 'calc(15px * var(--font-scale, 1))', whiteSpace: 'pre-line' }}>{h.znaczenie}</dd>
                                {h.przyklad && <dd className="text-gray-700 dark:text-gray-300 italic" style={{ margin: 0, fontSize: 'calc(14px * var(--font-scale, 1))', whiteSpace: 'pre-line' }}>{h.przyklad}</dd>}
                                {h.zrodlo && <dd className="text-gray-500" style={{ margin: 0, fontSize: 'calc(12.5px * var(--font-scale, 1))' }}>źródło: {h.zrodlo}</dd>}
                            </div>
                        ))}
                    </dl>
                </section>
            ))}
            <div className="border-t border-[#e5e7eb] dark:border-[#374151] flex flex-wrap items-center" style={{ paddingTop: '1rem', gap: '0.6rem 1rem' }}>
                <span className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>Znasz słowo, którego tu brakuje, albo inne jego znaczenie?</span>
                <Zgloszenie rodzaj="poprawka" adres="/biblioteka/slownik" tytul="słownik" />
            </div>
        </Strona>
    )
}
