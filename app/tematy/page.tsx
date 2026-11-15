import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { materialy, materialyDla, opowiesciDlaTematu, osCzasu, poziomCzytelnika, rozwiazOdnosniki, RODZAJE_TEMATOW, RODZAJE_MATERIALOW, tematy } from '@/lib/archiwum'
import { kluczSortowania } from '@/lib/edtf'
import OsCzasu, { type PozycjaOsi } from '../components/OsCzasu'
import { formatujEdtf } from '@/lib/edtf'
import { zajawka } from '@/lib/markdoc'
import { Kreski, Sekcja, Strona, TytulStrony } from '../components/Uklad'
import Komunikat from '../components/Komunikat'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'tematy · odniepamieci.pl' }

export default async function Tematy({ searchParams }: { searchParams: Promise<{ widok?: string }> }) {
    const widok = (await searchParams).widok === 'os' ? 'os' : 'lista'
    const poziom = await poziomCzytelnika()
    const lista = await tematy(poziom)
    const rozwiaz = await rozwiazOdnosniki(poziom)
    const os = await osCzasu(poziom)
    const liczba = (n: number, f: [string, string, string]) => (n === 1 ? `1 ${f[0]}` : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? `${n} ${f[1]}` : `${n} ${f[2]}`)
    const pozycje: PozycjaOsi[] = []
    if (widok === 'os') {
        for (const t of os) {
            const w = (await opowiesciDlaTematu(t.id, poziom)).length, mat = (await materialyDla('temat', t.id, poziom)).length
            pozycje.push({
                id: t.id, nazwa: t.nazwa, href: `/tematy/${t.id}`, rodzaj: t.rodzaj === 'zjawisko' ? 'zjawisko' : 'wydarzenie', klucz: kluczSortowania(t.czas), data: formatujEdtf(t.czas),
                opis: t.opis ? zajawka(t.opis, 120, rozwiaz) : undefined,
                meta: [RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, w ? liczba(w, ['wpis', 'wpisy', 'wpisów']) : '', mat ? liczba(mat, ['materiał', 'materiały', 'materiałów']) : ''].filter(Boolean).join(' · '),
            })
        }
        for (const m of await materialy(poziom)) {
            if (!m.czas) continue
            pozycje.push({ id: m.id, nazwa: m.nazwa, href: `/archiwum/${m.id}`, rodzaj: 'material', klucz: kluczSortowania(m.czas), data: formatujEdtf(m.czas), meta: `materiał · ${RODZAJE_MATERIALOW[m.rodzaj] ?? m.rodzaj}` })
        }
    }
    return (
        <Strona>
            <TytulStrony><TytulDzialu dzial="tematy" domyslny="tematy" /></TytulStrony>
            <WstepDzialu dzial="tematy" className="ot-drobne" />
            {/* P7D-3 (AUD-03): przełącznik widoku jak w katalogu ksiąg (k-seg) */}
            <nav className="k-seg" aria-label="widok tematów">
                <Link href="/tematy" aria-current={widok === 'lista' ? 'page' : undefined}>lista</Link>
                <Link href="/tematy?widok=os" aria-current={widok === 'os' ? 'page' : undefined}>oś czasu</Link>
            </nav>
            {lista.length === 0 && <Komunikat rodzaj="pusto">Nie ma jeszcze opublikowanych tematów.</Komunikat>}

            {widok === 'os' && <OsCzasu pozycje={pozycje} />}

            {widok === 'lista' && lista.length > 0 && (
                <Sekcja tytul="wszystkie tematy">
                    <ul className="lista-pozycji">
                        {lista.map((t) => (
                            <li key={t.id} className="lista-pozycja">
                                <div className="flex flex-wrap items-baseline gap-x-3">
                                    <Link href={`/tematy/${t.id}`} className="lista-tytul">{t.nazwa}</Link>
                                    <span className="lista-linia">
                                        {[RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, t.czas ? formatujEdtf(t.czas) : ''].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                                {t.opis && <p className="lista-opis">{zajawka(t.opis, 160, rozwiaz)}</p>}
                            </li>
                        ))}
                    </ul>
                </Sekcja>
            )}

            {widok === 'lista' && os.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="w skrócie – oś czasu" id="os-czasu">
                        <ol className="os-linia ml-1">
                            {os.map((t) => (
                                <li key={t.id} className="flex flex-wrap gap-x-4 py-1 pl-4" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                                    <span className="font-bold" style={{ minWidth: '7rem' }}>{formatujEdtf(t.czas)}</span>
                                    <Link href={`/tematy/${t.id}`}>{t.nazwa}</Link>
                                </li>
                            ))}
                        </ol>
                    </Sekcja>
                </>
            )}
        </Strona>
    )
}
