import { poziomCzytelnika, ksiegi, hasla } from '@/lib/archiwum'
import { publikacje } from '@/lib/paczka5'
import { DZIALY_BIBLIOTEKI } from '@/lib/biblioteka'
import { adresFiltrow, type Parametry } from '@/lib/adres-filtrow'
import SpisDzialow, { type Dzial } from '../archiwum/SpisDzialow'

/**
 * P7D-1 (AUD-01): biblioteka działa jak archiwum – spis działów z liczbami pozycji.
 * Odbiór 16.11: dział filtruje listę na stronie biblioteki (`/biblioteka?dzial=…`, z zachowaniem pozostałych filtrów),
 * jak dział archiwum; pierwszy wiersz – „wszystkie pozycje”. Na podstronach spis zwinięty do wybranego działu.
 */
export default async function SpisBiblioteki({ wybrany = '', sp = {}, zwiniety = !!wybrany }: { wybrany?: string; sp?: Parametry; zwiniety?: boolean }) {
    const poziom = await poziomCzytelnika()
    const [p, k, h] = await Promise.all([publikacje(poziom), ksiegi(poziom), hasla(poziom)])
    const liczby: Record<string, number> = { publikacje: p.length, ksiegi: k.length, slownik: h.length }
    const href = (dzial: string) => adresFiltrow('/biblioteka', sp, { ustaw: { dzial } })
    const dzialy: Dzial[] = [
        { klucz: 'wszystkie', nazwa: 'wszystkie pozycje', href: href(''), liczba: p.length + k.length + h.length },
        ...DZIALY_BIBLIOTEKI.map((d) => ({ klucz: d.klucz, nazwa: d.nazwa, href: href(d.klucz), liczba: liczby[d.klucz] })),
    ]
    return <SpisDzialow dzialy={dzialy} wybrany={wybrany || 'wszystkie'} etykieta="działy biblioteki" zwiniety={zwiniety} />
}
