import fs from 'node:fs'
import path from 'node:path'
import * as React from 'react'
import { doSvg } from '@/lib/plany/svg-tekst'
import { katalog } from '@/lib/plany/typy'
import { jednostka } from '@/lib/plany/model'
import { wczytajUstawienia } from '@/lib/plany/dane'
import { nieMa, planDlaCzytelnika } from '@/lib/plany/serwer'
import { kadr, RysunekPlanu, Wzory } from '@/app/components/plan/Rysunek'
import { regulyPlanu } from '@/lib/plany/styl-svg'

// Podgląd planu jako obraz SVG (np. w panelu po kliknięciu plakietki na mapie). Kolory z globals.css wstawione do pliku,
// żeby obraz wyglądał tak samo poza stroną (tryb ciemny według ustawień systemu).
export const dynamic = 'force-dynamic'

// PH-23: ?motyw=jasny|ciemny – miniatura w motywie strony (przełącznik strony, nie ustawienie systemu)
const zmienne: Record<string, string> = {}
function kolory(motyw: string): string {
    if (zmienne[motyw]) return zmienne[motyw]
    const css = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')
    const blok = (sel: string) => {
        const re = new RegExp(`${sel.replace('.', '\\.')}\\s*\\{([^}]*--pl-papier[^}]*)\\}`)
        return css.match(re)?.[1] ?? ''
    }
    // + reguły klas .pl-* rysunku (bez nich np. obszar trafienia .pl-traf jest czarny – odbiór 17.11)
    zmienne[motyw] = (motyw === 'jasny' ? `:root{${blok(':root')}}`
        : motyw === 'ciemny' ? `:root{${blok(':root')}}:root{${blok('.dark')}}`
        : `:root{${blok(':root')}}@media (prefers-color-scheme: dark){:root{${blok('.dark')}}}`) + '\n' + regulyPlanu(css)
    return zmienne[motyw]
}

export async function GET(req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    if (!w) return nieMa()
    const u = await wczytajUstawienia(), typy = katalog(u)
    const { plan } = w
    const k = kadr(plan), prefix = `pg-${plan.slug}`
    const svg = doSvg(
        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: k.join(' '), width: 640, height: Math.round((640 * k[3]) / k[2]) },
            React.createElement('style', null, kolory(({ jasny: 'jasny', ciemny: 'ciemny' } as Record<string, string>)[new URL(req.url).searchParams.get('motyw') ?? ''] ?? '')),
            React.createElement('rect', { x: k[0], y: k[1], width: k[2], height: k[3], style: { fill: 'var(--pl-papier)' } }),
            React.createElement('defs', null, React.createElement(Wzory, { prefix, u: jednostka(plan) })),
            React.createElement(RysunekPlanu, { plan, o: { prefix, typy, ukryteTypy: new Set(u.ukryteTypy) } }),
        ),
    )
    return new Response(svg, { headers: { 'Content-Type': 'image/svg+xml; charset=utf-8', 'Cache-Control': w.poziom === 'publiczne' && plan.widocznosc === 'publiczne' ? 'public, max-age=600' : 'private, no-store' } })
}
