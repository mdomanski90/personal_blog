import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Link } from 'next-view-transitions'
import { Sekcja, Strona, TytulStrony } from '../components/Uklad'
import { poziomCzytelnika } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'

export const metadata: Metadata = { title: 'biblioteka · odniepamieci.pl' }

export default async function Biblioteka() {
    const ilePublikacji = (await publikacje(await poziomCzytelnika())).length // PACZKA5_2026
    return (
        <Strona>
            <TytulStrony><TytulDzialu dzial="biblioteka" domyslny="biblioteka" /></TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p><WstepTekst dzial="biblioteka" domyslny={"Książki, artykuły i opracowania o historii Łosic, Olszanki, Międzyrzeca i okolicznych wsi – o unitach, kasacie unii, bieżeństwie i ludziach tego terenu – z opisem, gdzie je znaleźć, i odnośnikami do wersji cyfrowych."} /></p>
                {ilePublikacji === 0 && <p className="text-gray-600 dark:text-gray-400">Spis książek i artykułów jest w przygotowaniu — nie ma jeszcze opublikowanych pozycji.</p>}
            </div>
            <Sekcja tytul="publikacje">
                <p><Link href="/biblioteka/publikacje" className="font-bold">książki, artykuły, prasa i opracowania →</Link>
                   <span className="block ot-drobne">{ilePublikacji ? `${ilePublikacji} opublikowanych pozycji` : 'katalog jest w przygotowaniu'}</span>
                </p>
            </Sekcja>
            <Sekcja tytul="źródła">
                <p style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                    <Link href="/biblioteka/ksiegi" className="font-bold">księgi metrykalne →</Link>
                    <span className="block text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>które roczniki się zachowały, gdzie są przechowywane, gdzie obejrzeć skany i indeksy</span>
                </p>
                <p style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                    <Link href="/parafie" className="font-bold">parafie i urzędy →</Link>
                    <span className="block text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>historia instytucji, należące do nich miejscowości, obiekty i księgi</span>
                </p>
                <p style={{ fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                    <Link href="/biblioteka/slownik" className="font-bold">słownik →</Link>
                    <span className="block text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(14px * var(--font-scale, 1))' }}>dawne pojęcia, urzędy, miary i słowa z miejscowej gwary – ze źródłem znaczenia</span>
                </p>
            </Sekcja>
        </Strona>
    )
}
