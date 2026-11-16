import { Link } from 'next-view-transitions'
import { odmiana } from '@/lib/tekst'

export interface PozycjaSpisuMiejsc { id: string; nazwa: string; wpisy?: number; obiekty?: number; materialy?: number }

/**
 * JW-12: spis miejscowości jak „wsie gminy” – nazwa-odnośnik, liczniki po prawej (puste pominięte), linia podziału,
 * kolumny min. 22rem. Jeden wzorzec dla karty gminy i katalogu miejsc (zamiast siatki komórek SiatkaMiejsc).
 */
export default function SpisMiejscowosci({ pozycje, pusto = 'jeszcze bez wpisów' }: { pozycje: PozycjaSpisuMiejsc[]; pusto?: string }) {
    if (!pozycje.length) return null
    return (
        <ul className="spis-miejsc">
            {pozycje.map((w) => {
                const meta = [
                    w.wpisy ? odmiana(w.wpisy, ['wpis', 'wpisy', 'wpisów']) : '',
                    w.obiekty ? odmiana(w.obiekty, ['obiekt', 'obiekty', 'obiektów']) : '',
                    w.materialy ? odmiana(w.materialy, ['materiał', 'materiały', 'materiałów']) : '',
                ].filter(Boolean).join(' · ')
                return (
                    <li key={w.id} className="spis-miejsc-wiersz">
                        <Link href={`/miejsca/${w.id}`} className="odn">{w.nazwa}</Link>
                        <span className="ot-drobne">{meta || pusto}</span>
                    </li>
                )
            })}
        </ul>
    )
}
