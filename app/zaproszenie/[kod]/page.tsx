import type { Metadata } from 'next'
import { wczytajKonta } from '@/lib/konta/dane'
import { definicjeRol, opisMozesz, uprawnieniaKonta, maTeren } from '@/lib/konta/model'
import { adresPolaczenia } from '@/lib/konta/pocket-id'
import { konfiguracjaKont } from '@/lib/konta/straz'
import { kontoZKodu } from '@/lib/konta/zaproszenia'
import Komunikat from '../../components/Komunikat'
import { Sekcja, Strona, TytulStrony } from '../../components/Uklad'
import Polacz from './Polacz'

// P7a (KON-01): strona z zaproszenia („witaj”) – prostym językiem: kto zaprasza, co będzie można robić, jak połączyć urządzenie.
// Kod z adresu jest jedynym sekretem (w pliku kont leży tylko jego skrót); strona nie jest indeksowana i nie przekazuje adresu dalej.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'zaproszenie · odniepamieci.pl', robots: { index: false, follow: false }, referrer: 'no-referrer' }

const dataSlownie = (iso: string) => new Date(iso).toLocaleDateString('pl-PL', { day: 'numeric', month: 'long', timeZone: 'Europe/Warsaw' })

export default async function Zaproszenie({ params }: { params: Promise<{ kod: string }> }) {
    const { kod } = await params
    const k = konfiguracjaKont()
    const plik = wczytajKonta()
    const konto = k ? kontoZKodu(plik, kod) : null
    if (!k || !konto) {
        return (
            <Strona>
                <TytulStrony>zaproszenie</TytulStrony>
                <Komunikat rodzaj="uwaga" tytul="ten link już nie działa">
                    <p>Link z zaproszenia jest jednorazowy i ważny tylko kilka dni. Poproś osobę, która Cię zaprosiła, o nowy. Jeśli Twoje urządzenie jest już połączone – po prostu <a href="/zaloguj">zaloguj się</a>.</p>
                </Komunikat>
            </Strona>
        )
    }
    const imie = konto.imie.split(' ')[0]
    const zaprasza = plik.konta.find((x) => x.id === konto.zaprosil)?.imie.split(' ')[0]
    const u = uprawnieniaKonta({ ...konto, stan: 'aktywny' }, definicjeRol(plik))
    const panel = u.has('panel') || maTeren(u) // P7b: konto terenowe też „pomaga” – pracuje w „w terenie”
    const nowe = konto.stan === 'zaproszony'
    return (
        <Strona>
            <TytulStrony bezOkruszkow>witaj, {imie}</TytulStrony>
            <p className="konto-opis">
                {nowe ? `${zaprasza ?? 'Redakcja'} zaprasza Cię ${panel ? 'do pomocy przy odniepamieci.pl' : 'do czytania treści „dla bliskich” na odniepamieci.pl'}. Będzie można: ${opisMozesz(u)}.` : 'To link do połączenia kolejnego urządzenia z Twoim kontem.'}{' '}
                Link jest ważny do {dataSlownie(konto.zaproszenie!.do)}.
            </p>
            <Sekcja tytul="jak to działa">
                <ol className="konto-kroki">
                    <li><b>Połącz to urządzenie</b><span>Kliknij przycisk poniżej. Telefon albo komputer poprosi o to, czym zwykle go odblokowujesz: odcisk palca, twarz albo PIN. Nie wymyślasz żadnego hasła.</span></li>
                    <li><b>Logowanie później</b><span>Kliknij „zaloguj” i odblokuj urządzenie tak jak zwykle. Drugie urządzenie (np. laptop) dodasz w „moje konto”.</span></li>
                    {panel
                        ? <li><b>Praca</b><span>Widzisz tylko swoje działy. Każda zmiana jest podpisana Twoim imieniem i zawsze da się ją cofnąć.</span></li>
                        : <li><b>Czytanie</b><span>Po zalogowaniu widzisz też materiały przeznaczone dla rodziny i bliskich.</span></li>}
                </ol>
            </Sekcja>
            <Polacz kod={kod} adres={adresPolaczenia(k, kod)} />
            <p className="konto-drobne">Twój odcisk palca, twarz i PIN nie opuszczają urządzenia – nie widzi ich ani ta strona, ani administrator. Strona zapamiętuje tylko imię, e-mail i daty logowania. Nic do Ciebie nie wysyła i nikomu niczego nie przekazuje.</p>
        </Strona>
    )
}
