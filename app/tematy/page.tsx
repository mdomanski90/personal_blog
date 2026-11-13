import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { materialy, materialyDla, opowiesciDlaTematu, osCzasu, poziomCzytelnika, rozwiazOdnosniki, RODZAJE_TEMATOW, RODZAJE_MATERIALOW, tematy } from '@/lib/archiwum'
import { kluczSortowania } from '@/lib/edtf'
import OsCzasu, { type PozycjaOsi } from '../components/OsCzasu'
import { formatujEdtf } from '@/lib/edtf'
import { zajawka } from '@/lib/markdoc'
import { Kreski, Sekcja, Strona, TytulStrony } from '../components/Uklad'

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
    const zakladka = (id: 'lista' | 'os', tekst: string) => (
        <Link href={id === 'os' ? '/tematy?widok=os' : '/tematy'} className={`border border-[#d6d1c6] dark:border-[#4b5563] lowercase !no-underline text-current ${widok === id ? 'bg-muted font-bold' : ''}`}
            style={{ margin: '0 0 0 -1px', height: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', display: 'inline-flex', alignItems: 'center', fontSize: 'calc(14px * var(--font-scale, 1))' }}>{tekst}</Link>
    )

    return (
        <Strona>
            <TytulStrony>tematy</TytulStrony>
            <div className="flex w-fit" style={{ paddingLeft: 1 }}>{zakladka('lista', 'lista')}{zakladka('os', 'oś czasu')}</div>
            {lista.length === 0 && <p className="text-gray-500 italic lowercase">brak opublikowanych tematów.</p>}

            {widok === 'os' && <OsCzasu pozycje={pozycje} />}

            {widok === 'lista' && lista.length > 0 && (
                <Sekcja tytul="wszystkie tematy">
                    <ul className="flex flex-col border-t border-[#e7e2d8] dark:border-[#374151]">
                        {lista.map((t) => (
                            <li key={t.id} className="flex flex-col gap-1 py-3 border-b border-[#e7e2d8] dark:border-[#374151]">
                                <div className="flex flex-wrap items-baseline gap-x-3">
                                    <Link href={`/tematy/${t.id}`} className="font-bold" style={{ fontSize: 'calc(17px * var(--font-scale, 1))' }}>{t.nazwa}</Link>
                                    <span className="text-gray-500" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                                        {[RODZAJE_TEMATOW[t.rodzaj] ?? t.rodzaj, t.czas ? formatujEdtf(t.czas) : ''].filter(Boolean).join(' · ')}
                                    </span>
                                </div>
                                {t.opis && <p className="text-gray-700 dark:text-gray-300" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>{zajawka(t.opis, 160, rozwiaz)}</p>}
                            </li>
                        ))}
                    </ul>
                </Sekcja>
            )}

            {widok === 'lista' && os.length > 0 && (
                <>
                    <Kreski />
                    <Sekcja tytul="w skrócie – oś czasu" id="os-czasu">
                        <ol className="border-l-2 border-[#d6d1c6] dark:border-[#4b5563] ml-1">
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
