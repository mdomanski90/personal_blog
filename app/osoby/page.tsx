import type { Metadata } from 'next'
import { Strona, TytulStrony } from '../components/Uklad'

export const metadata: Metadata = { title: 'osoby · odniepamieci.pl' }

export default function Osoby() {
    return (
        <Strona>
            <TytulStrony>osoby</TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p>Ludzie z tych wsi: przodkowie, sąsiedzi, księża, wójtowie – każdy ze swoją stroną, drzewem przodków i potomków oraz dokumentami, które potwierdzają daty i więzi (akty metrykalne, nagrobki, zdjęcia).</p>
                <p className="text-gray-600 dark:text-gray-400">Ten dział jest w przygotowaniu – osoby pojawią się po wczytaniu drzewa genealogicznego. Dane osób żyjących będą widoczne tylko dla bliskich.</p>
            </div>
        </Strona>
    )
}
