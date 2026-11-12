import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import { material, poziomCzytelnika } from '@/lib/archiwum'
import { ADRES_PLIKOW, KATALOG_PLIKOW, mimePliku } from '@/lib/pliki'

// Pliki materiałów: /pliki/<materiał>/<plik>. Wydawane tylko, gdy czytelnik widzi materiał
// (inaczej 404 – nie zdradzamy, że plik istnieje). Obsługuje Range (przewijanie nagrań i filmów).

export const dynamic = 'force-dynamic'

const nieMa = () => new Response('Nie znaleziono', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(req: Request, { params }: { params: Promise<{ sciezka: string[] }> }) {
    const { sciezka } = await params
    if (sciezka.length !== 2) return nieMa()
    const [id, nazwa] = sciezka
    if (!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(id) || !/^[\w-]+(\.[\w-]+)*$/.test(nazwa)) return nieMa()

    const m = await material(id, await poziomCzytelnika())
    if (!m || m.plik !== `${ADRES_PLIKOW}${id}/${nazwa}`) return nieMa()

    const katalog = path.resolve(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW)
    const plik = path.resolve(/*turbopackIgnore: true*/ katalog, id, nazwa)
    if (!plik.startsWith(katalog + path.sep)) return nieMa()
    let rozmiar: number
    try {
        const st = await fs.promises.stat(plik)
        if (!st.isFile()) return nieMa()
        rozmiar = st.size
    } catch {
        return nieMa()
    }

    const publiczny = m.widocznosc === 'publiczne'
    const naglowki: Record<string, string> = {
        'Content-Type': mimePliku(nazwa),
        'Accept-Ranges': 'bytes',
        'Content-Disposition': `inline; filename="${id}-${nazwa}"`,
        'Cache-Control': publiczny ? 'public, max-age=86400' : 'private, no-store',
        'X-Content-Type-Options': 'nosniff',
    }
    if (!publiczny) naglowki['X-Robots-Tag'] = 'noindex, nofollow'

    const zakres = /^bytes=(\d*)-(\d*)$/.exec(req.headers.get('range') ?? '')
    if (zakres && (zakres[1] || zakres[2])) {
        let start = zakres[1] ? Number(zakres[1]) : rozmiar - Number(zakres[2])
        let koniec = zakres[1] && zakres[2] ? Number(zakres[2]) : rozmiar - 1
        start = Math.max(0, start)
        koniec = Math.min(koniec, rozmiar - 1)
        if (start > koniec || start >= rozmiar) {
            return new Response(null, { status: 416, headers: { ...naglowki, 'Content-Range': `bytes */${rozmiar}` } })
        }
        const strumien = Readable.toWeb(fs.createReadStream(plik, { start, end: koniec })) as ReadableStream
        return new Response(strumien, {
            status: 206,
            headers: { ...naglowki, 'Content-Range': `bytes ${start}-${koniec}/${rozmiar}`, 'Content-Length': String(koniec - start + 1) },
        })
    }
    const strumien = Readable.toWeb(fs.createReadStream(plik)) as ReadableStream
    return new Response(strumien, { headers: { ...naglowki, 'Content-Length': String(rozmiar) } })
}
