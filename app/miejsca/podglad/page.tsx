import type { Metadata } from 'next'
import { miejsca, poziomCzytelnika } from '@/lib/archiwum'
import { SWIATYNIE, WYZNANIA, tarczaMiejsca, tarczaSwiatyni, type RodzajSwiatyni, type Wyznanie } from '@/lib/tarcze'
import { Sekcja, Strona, TytulStrony } from '../../components/Uklad'
import MapaWektorLeniwa from '../../components/MapaWektorLeniwa'
import MapaSvg from '../../components/MapaSvg'
import type { PunktTarczy } from '../../components/MapaWektor'

// Strona robocza do porównania dwóch podkładów mapy – bez odnośnika w menu, poza wyszukiwarkami.
export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'porównanie map · odniepamieci.pl', robots: { index: false, follow: false } }

function Znak({ html }: { html: string }) {
    return <span style={{ display: 'inline-flex' }} dangerouslySetInnerHTML={{ __html: html }} />
}

export default async function PodgladMap() {
    const lista = await miejsca(await poziomCzytelnika())
    const punkty: PunktTarczy[] = lista
        .filter((m) => m.wspolrzedne)
        .map((m) => ({ id: m.id, nazwa: m.nazwa, rodzaj: m.rodzaj, wyznanie: m.wyznanie, lat: m.wspolrzedne![0], lng: m.wspolrzedne![1], przyblizone: m.przyblizone }))

    const pozycja = { fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 } as const

    return (
        <Strona szeroka>
            <TytulStrony sciezka={[{ tekst: 'miejsca', href: '/miejsca' }]}>porównanie map</TytulStrony>
            <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 14 }}>
                strona robocza: te same miejscowości na dwóch podkładach. wyznanie wsi ustawiasz w panelu (Miejsca → „Wyznanie mieszkańców przed 1875”) – do tego czasu wieś ma tarczę z kropką.
            </p>

            <Sekcja tytul="legenda">
                <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(13rem, 1fr))', gap: '6px 16px' }}>
                    <span style={pozycja}><Znak html={tarczaMiejsca('miasto', '', 'miasto', 26)} /> miasto</span>
                    {(Object.keys(WYZNANIA) as Exclude<Wyznanie, ''>[]).map((w) => (
                        <span key={w} style={pozycja}><Znak html={tarczaMiejsca('wies', w, WYZNANIA[w], 26)} /> {WYZNANIA[w]}</span>
                    ))}
                    <span style={pozycja}><Znak html={tarczaMiejsca('wies', '', 'wyznanie nieopisane', 26)} /> wyznanie nieopisane</span>
                    {(Object.keys(SWIATYNIE) as RodzajSwiatyni[]).map((r) => (
                        <span key={r} style={pozycja}><Znak html={tarczaSwiatyni(r, SWIATYNIE[r], 28)} /> {SWIATYNIE[r]}</span>
                    ))}
                    <span style={pozycja}><Znak html={tarczaSwiatyni('cerkiew-unicka', 'nieistniejąca', 28, false)} /> nieistniejąca</span>
                </div>
            </Sekcja>

            <Sekcja tytul="A · mapa wektorowa (MapLibre + OpenFreeMap)">
                <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>
                    przybliżanie i przesuwanie (na komputerze z ctrl + kółko), drogi, rzeki i lasy z całej Polski, kafelki z zewnętrznego serwera.
                </p>
                <MapaWektorLeniwa punkty={punkty} />
            </Sekcja>

            <Sekcja tytul="B · własna mapa SVG">
                <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 13 }}>
                    tylko ta okolica, rysowana z pliku na serwerze; bez przybliżania, ale wszystko u ciebie i bez JavaScriptu.
                </p>
                <MapaSvg punkty={punkty} />
            </Sekcja>
        </Strona>
    )
}
