import { poziomCzytelnika, ksiegi, parafie, hasla } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import SpisDzialow, { type Dzial } from '../archiwum/SpisDzialow'

/**
 * P7D-1 (AUD-01): biblioteka działa jak archiwum – spis działów z liczbami pozycji.
 * Na stronie biblioteki pełny; na podstronach zwinięty do wybranego działu z przyciskiem „wszystkie działy”.
 */
export default async function SpisBiblioteki({ wybrany = '' }: { wybrany?: string }) {
    const poziom = await poziomCzytelnika()
    const [p, k, pa, h] = await Promise.all([publikacje(poziom), ksiegi(poziom), parafie(), hasla(poziom)])
    const dzialy: Dzial[] = [
        { klucz: 'publikacje', nazwa: 'publikacje i opracowania', href: '/biblioteka/publikacje', liczba: p.length },
        { klucz: 'ksiegi', nazwa: 'księgi metrykalne', href: '/biblioteka/ksiegi', liczba: k.length },
        { klucz: 'parafie', nazwa: 'parafie i urzędy', href: '/parafie', liczba: pa.length },
        { klucz: 'slownik', nazwa: 'słownik', href: '/biblioteka/slownik', liczba: h.length },
    ]
    return <SpisDzialow dzialy={dzialy} wybrany={wybrany} etykieta="działy biblioteki" zwiniety={!!wybrany} />
}
