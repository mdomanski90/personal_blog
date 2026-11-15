import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { poziomCzytelnika, szukaj, type RodzajWyniku } from '@/lib/archiwum'
import { krotszeZapytanie } from '@/lib/szukanie'
import PoleSzukania from '../components/PoleSzukania'
import { Strona, TytulStrony } from '../components/Uklad'
import { odmiana } from '@/lib/tekst'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'szukaj · odniepamieci.pl', robots: { index: false } }

const GRUPY: { r: RodzajWyniku; nazwa: [string, string, string] }[] = [
    { r: 'miejsce', nazwa: ['miejscowość', 'miejscowości', 'miejscowości'] },
    { r: 'osoba', nazwa: ['osoba', 'osoby', 'osób'] },
    { r: 'wpis', nazwa: ['wpis', 'wpisy', 'wpisów'] },
    { r: 'materiał', nazwa: ['materiał', 'materiały', 'materiałów'] },
    { r: 'publikacja', nazwa: ['publikacja', 'publikacje', 'publikacji'] },
    { r: 'zbiór', nazwa: ['zbiór', 'zbiory', 'zbiorów'] }, // PACZKA5_2026
    { r: 'księga', nazwa: ['księga', 'księgi', 'ksiąg'] },
    { r: 'parafia', nazwa: ['parafia / urząd', 'parafie / urzędy', 'parafii / urzędów'] },
    { r: 'hasło', nazwa: ['hasło', 'hasła', 'haseł'] },
    { r: 'obiekt', nazwa: ['obiekt', 'obiekty', 'obiektów'] },
    { r: 'temat', nazwa: ['temat', 'tematy', 'tematów'] },
]
const male = { fontSize: 'calc(13px * var(--font-scale, 1))' }

export default async function Szukaj({ searchParams }: { searchParams: Promise<{ q?: string | string[]; rodzaj?: string }> }) {
    const sp = await searchParams
    const q = (Array.isArray(sp.q) ? sp.q[0] : sp.q ?? '').slice(0, 100).trim()
    const wszystkie = q ? await szukaj(q, await poziomCzytelnika()) : []
    const rodzaj = GRUPY.find((g) => g.r === sp.rodzaj)?.r
    const wyniki = rodzaj ? wszystkie.filter((w) => w.rodzaj === rodzaj) : wszystkie
    const ile = (r: RodzajWyniku) => wszystkie.filter((w) => w.rodzaj === r).length
    const adres = (r?: RodzajWyniku) => `/szukaj?q=${encodeURIComponent(q)}${r ? `&rodzaj=${encodeURIComponent(r)}` : ''}`
    const krotsze = q && !wszystkie.length ? krotszeZapytanie(q) : null

    return (
        <Strona>
            <TytulStrony>szukaj</TytulStrony>
            <PoleSzukania action="/szukaj" defaultValue={q} placeholder="nazwa wsi, nazwisko, temat…" style={{ maxWidth: 560 }} />
            {!q && <p className="text-[var(--tekst-opis)]">Wpisz nazwę miejscowości, nazwisko albo temat. Polskie znaki nie są potrzebne, a słowo może być w dowolnej formie – „w Olszance”, „bieżeństwa”.</p>}
            {q && wszystkie.length > 0 && (
                <nav aria-label="rodzaj wyników" className="flex flex-wrap items-center" style={{ gap: '6px 8px', ...male }}>
                    <Link href={adres()} aria-current={!rodzaj ? 'true' : undefined} className="szukaj-filtr">wszystko · {wszystkie.length}</Link>
                    {GRUPY.filter((g) => ile(g.r)).map((g) => (
                        <Link key={g.r} href={adres(g.r)} aria-current={rodzaj === g.r ? 'true' : undefined} className="szukaj-filtr">{odmiana(ile(g.r), g.nazwa)}</Link>
                    ))}
                </nav>
            )}
            {q && !wszystkie.length && (
                <div className="k-kom k-kom--pusto" role="status">
                    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className="k-kom-ikona"><circle cx="8.5" cy="8.5" r="6" /><path d="M13 13l5 5" /></svg>
                    <div className="k-kom-tresc">
                    <p className="k-kom-tytul">„{q}” – nic nie znaleziono.</p>
                    <ul className="flex flex-col text-[var(--tekst-opis)]" style={{ gap: 4, margin: 0, paddingLeft: '1.1rem', ...male }}>
                        {krotsze && <li>spróbuj krótszego zapytania: <Link href={`/szukaj?q=${encodeURIComponent(krotsze)}`}>{krotsze}</Link></li>}
                        <li>sprawdź pisownię albo wpisz inny wariant nazwy (np. dawną nazwę wsi, nazwisko panieńskie)</li>
                        <li>osoby z drzewa: <Link href={`/osoby?krag=wszystkie&q=${encodeURIComponent(q)}`}>szukaj w dziale osoby</Link> · miejscowości: <Link href="/miejsca">mapa i spis</Link> · księgi metrykalne: <Link href="/biblioteka/ksiegi">spis ksiąg</Link></li>
                        <li>archiwum jest w opracowaniu – brak wyniku nie znaczy, że o tym nic nie ma</li>
                    </ul>
                    </div>
                </div>
            )}
            {wyniki.length > 0 && (
                <ul className="flex flex-col border-t border-[var(--linia-podzialu)]" style={{ margin: 0, padding: 0, listStyle: 'none' }}>
                    {wyniki.map((w) => (
                        <li key={`${w.rodzaj}:${w.id}`} className="flex flex-col py-3 border-b border-[var(--linia-podzialu)]" style={{ gap: 4 }}>
                            <div className="flex flex-wrap items-baseline" style={{ gap: '2px 10px' }}>
                                <span className={`szukaj-rodzaj szukaj-${w.rodzaj === 'materiał' ? 'material' : w.rodzaj}`}>{w.etykieta}</span>
                                <Link href={w.adres} className="font-bold" style={{ fontSize: 'calc(17px * var(--font-scale, 1))' }}>{w.tytul}</Link>
                            </div>
                            {w.przez && <span className="text-[var(--tekst-opis)]" style={male}>powiązane z: {w.przez}</span>}
                            {w.fragment && <p className="text-[var(--tekst-opis)]" style={{ fontSize: 'calc(15px * var(--font-scale, 1))', margin: 0 }}>{w.fragment}</p>}
                        </li>
                    ))}
                </ul>
            )}
        </Strona>
    )
}
