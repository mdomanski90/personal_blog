import type { Metadata } from 'next'
import { TytulDzialu, WstepDzialu, WstepTekst } from '@/app/components/WstepDzialu'
import { Strona, TytulStrony } from '../components/Uklad'
import SpisBiblioteki from './SpisBiblioteki'

export const metadata: Metadata = { title: 'biblioteka · odniepamieci.pl' }

export default async function Biblioteka() {
    return (
        <Strona>
            <TytulStrony><TytulDzialu dzial="biblioteka" domyslny="biblioteka" /></TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p><WstepTekst dzial="biblioteka" domyslny={"Książki, artykuły i opracowania o historii Łosic, Olszanki, Międzyrzeca i okolicznych wsi – o unitach, kasacie unii, bieżeństwie i ludziach tego terenu – z opisem, gdzie je znaleźć, i odnośnikami do wersji cyfrowych."} /></p>
            </div>
            <SpisBiblioteki />
            <dl className="bib-opisy">
                <div><dt>publikacje i opracowania</dt><dd>książki, artykuły, prasa i opracowania – z opisem, gdzie je znaleźć</dd></div>
                <div><dt>księgi metrykalne</dt><dd>które roczniki się zachowały, gdzie są przechowywane, gdzie obejrzeć skany i indeksy</dd></div>
                <div><dt>parafie i urzędy</dt><dd>historia instytucji, należące do nich miejscowości, obiekty i księgi</dd></div>
                <div><dt>słownik</dt><dd>dawne pojęcia, urzędy, miary i słowa z miejscowej gwary – ze źródłem znaczenia</dd></div>
            </dl>
        </Strona>
    )
}
