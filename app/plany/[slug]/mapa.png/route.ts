import fs from 'node:fs'
import path from 'node:path'
import * as React from 'react'
import { doSvg } from '@/lib/plany/svg-tekst'
import { katalog } from '@/lib/plany/typy'
import { jednostka } from '@/lib/plany/model'
import { wczytajPlan, wczytajUstawienia } from '@/lib/plany/dane'
import { nieMa, planDlaCzytelnika } from '@/lib/plany/serwer'
import { kadr, RysunekPlanu, Wzory } from '@/app/components/plan/Rysunek'

// Obraz planu (PNG, przezroczyste tło) do nałożenia na mapę według punktów geo. Kolory jasne wstawione wprost
// (biblioteka rysująca PNG nie zna zmiennych CSS). Bez obrotu – położenie wyznaczają punkty geo.
export const dynamic = 'force-dynamic'

let kolory: Map<string, string> | null = null
function zmienne(): Map<string, string> {
    if (kolory) return kolory
    const css = fs.readFileSync(path.join(process.cwd(), 'app', 'globals.css'), 'utf8')
    const blok = css.match(/:root\s*\{([^}]*--pl-papier[^}]*)\}/)?.[1] ?? ''
    kolory = new Map([...blok.matchAll(/--(pl-[\w-]+)\s*:\s*([^;]+);/g)].map((m) => [m[1], m[2].trim()]))
    return kolory
}

export async function GET(_req: Request, { params }: { params: Promise<{ slug: string }> }) {
    const { slug } = await params
    const w = await planDlaCzytelnika(slug)
    // punkty geo z pliku planu (czytelnikowi ich nie wydajemy – obraz i tak leży na mapie w tym miejscu)
    if (!w || ((await wczytajPlan(slug))?.geo.length ?? 0) < 2) return nieMa()
    const u = await wczytajUstawienia(), typy = katalog(u)
    const plan = { ...w.plan, obrot: 0 }
    const k = kadr(plan), prefix = `mp-${plan.slug}`
    const szer = 2048, wys = Math.max(1, Math.round((szer * k[3]) / k[2]))
    let svg = doSvg(
        React.createElement('svg', { xmlns: 'http://www.w3.org/2000/svg', viewBox: k.join(' '), width: szer, height: wys },
            React.createElement('defs', null, React.createElement(Wzory, { prefix, u: jednostka(plan) })),
            React.createElement(RysunekPlanu, { plan, o: { prefix, typy, ukryteTypy: new Set(u.ukryteTypy) } }),
        ),
    )
    const z = zmienne()
    svg = svg.replace(/var\(--(pl-[\w-]+)\)/g, (_, n) => z.get(n) ?? '#888')
    const sharp = (await import('sharp')).default
    const png = await sharp(Buffer.from(svg), { density: 72, limitInputPixels: 100_000_000 }).png({ compressionLevel: 9 }).toBuffer()
    const publiczny = w.poziom === 'publiczne' && w.plan.widocznosc === 'publiczne'
    return new Response(new Uint8Array(png), { headers: { 'Content-Type': 'image/png', 'Cache-Control': publiczny ? 'public, max-age=600' : 'private, no-store' } })
}
