import type { Metadata } from 'next'
import { Strona, TytulStrony } from '../components/Uklad'

export const metadata: Metadata = { title: 'biblioteka · odniepamieci.pl' }

export default function Biblioteka() {
    return (
        <Strona>
            <TytulStrony>biblioteka</TytulStrony>
            <div className="flex flex-col leading-relaxed" style={{ gap: '0.8rem', fontSize: 'calc(16px * var(--font-scale, 1))' }}>
                <p>Książki, artykuły i opracowania o historii Łosic, Olszanki, Międzyrzeca i okolicznych wsi – o unitach, kasacie unii, bieżeństwie i ludziach tego terenu – z opisem, gdzie je znaleźć, i odnośnikami do wersji cyfrowych.</p>
                <p className="text-gray-600 dark:text-gray-400">Ten dział jest w przygotowaniu – spis pojawi się po podłączeniu bibliografii.</p>
            </div>
        </Strona>
    )
}
