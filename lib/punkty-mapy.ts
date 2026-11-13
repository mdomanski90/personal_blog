// Zamiana miejsc i obiektów na punkty mapy (wspólne dla strony „miejsca” i stron miejscowości).

import type { Miejsce, Obiekt } from './archiwum'
import { OBSZARY } from './archiwum'
import type { PunktMapy } from '../app/components/MapaMiejsc'

export function punktyMapy(miejsca: Miejsce[], obiekty: Obiekt[]): PunktMapy[] {
    // obiekty przypisane do wsi – plakietka z liczbą przy oddalonej mapie (tylko publiczne)
    const wWsi = new Map<string, { nazwa: string; href: string }[]>()
    for (const o of obiekty) {
        if (!o.miejsce || o.widocznosc !== 'publiczne') continue
        const l = wWsi.get(o.miejsce) ?? []
        l.push({ nazwa: o.nazwa, href: `/obiekty/${o.id}` })
        wWsi.set(o.miejsce, l)
    }
    return [
        ...miejsca
            .filter((m) => m.wspolrzedne && !OBSZARY.includes(m.rodzaj))
            .map((m) => ({
                id: m.id, nazwa: m.nazwa, href: `/miejsca/${m.id}`, typ: 'miejsce' as const, rodzaj: m.rodzaj,
                wyznanie: m.wyznanie, przyblizone: m.przyblizone, lat: m.wspolrzedne![0], lng: m.wspolrzedne![1],
                obiekty: wWsi.get(m.id),
            })),
        ...obiekty
            .filter((o) => o.wspolrzedne)
            .map((o) => ({
                id: o.id, nazwa: o.nazwa, href: `/obiekty/${o.id}`, typ: 'obiekt' as const, rodzaj: o.rodzaj,
                istnieje: o.istnieje, przyblizone: o.przyblizone, lat: o.wspolrzedne![0], lng: o.wspolrzedne![1],
            })),
    ]
}
