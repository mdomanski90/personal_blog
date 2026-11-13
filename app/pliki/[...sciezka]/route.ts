import fs from 'node:fs'
import path from 'node:path'
import { Readable } from 'node:stream'
import sharp from 'sharp'
import { material, obiekt, poziomCzytelnika } from '@/lib/archiwum'
import { ID_MATERIALU, NAZWA_STRONY, katalogStron, stronyMaterialu } from '@/lib/strony-materialow'
import { ADRES_PLIKOW, KATALOG_PLIKOW, mimePliku } from '@/lib/pliki'

// Pliki materiałów: /pliki/<materiał>/<plik>. Wydawane tylko, gdy czytelnik widzi materiał
// (inaczej 404 – nie zdradzamy, że plik istnieje). Obsługuje Range (przewijanie nagrań i filmów).

export const dynamic = 'force-dynamic'

const nieMa = () => new Response('Nie znaleziono', { status: 404, headers: { 'Content-Type': 'text/plain; charset=utf-8' } })

export async function GET(req: Request, { params }: { params: Promise<{ sciezka: string[] }> }) {
    const { sciezka } = await params
    if (sciezka[0] === 'obiekty') return zdjecieObiektu(req, sciezka)
    if (sciezka[0] === 'strony') return stronaMaterialu(req, sciezka)
    if (sciezka[0] === 'osoby') return portretOsoby(req, sciezka)
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

/** Fotografie obiektów: /pliki/obiekty/<obiekt>/…; ?w=480|1200|1800 – pomniejszona kopia WebP (bez danych EXIF/GPS). */
async function zdjecieObiektu(req: Request, sciezka: string[]): Promise<Response> {
    if (sciezka.length < 3 || !sciezka.every((x) => /^[\w-]+(\.[\w-]+)*$/.test(x))) return nieMa()
    const o = await obiekt(sciezka[1], await poziomCzytelnika())
    const adres = `${ADRES_PLIKOW}${sciezka.join('/')}`
    if (!o || !o.zdjecia.some((z) => z.plik === adres)) return nieMa()
    const katalog = path.resolve(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW)
    const plik = path.resolve(/*turbopackIgnore: true*/ katalog, ...sciezka)
    if (!plik.startsWith(katalog + path.sep)) return nieMa()
    const publiczny = o.widocznosc === 'publiczne'
    const cache = publiczny ? 'public, max-age=86400' : 'private, no-store'
    const w = Number(new URL(req.url).searchParams.get('w'))
    try {
        if ([480, 1200, 1800].includes(w)) {
            const bufor = await sharp(plik).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
            return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })
        }
        // oryginał też bez metadanych (GPS z telefonu)
        const bufor = await sharp(plik).rotate().toBuffer()
        return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': mimePliku(plik), 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })
    } catch { return nieMa() }
}

/** Strony skanów materiałów: /pliki/strony/<materiał>/<plik>; ?w=160|480|1200|2400 – pomniejszona kopia WebP, bez metadanych. */
async function stronaMaterialu(req: Request, sciezka: string[]): Promise<Response> {
    if (sciezka.length !== 3) return nieMa()
    const [, id, nazwa] = sciezka
    if (!ID_MATERIALU.test(id) || !NAZWA_STRONY.test(nazwa)) return nieMa()
    const m = await material(id, await poziomCzytelnika())
    if (!m || !stronyMaterialu(id).some((s) => s.plik === nazwa)) return nieMa()
    const plik = path.join(/*turbopackIgnore: true*/ katalogStron(id), nazwa)
    const cache = m.widocznosc === 'publiczne' ? 'public, max-age=86400' : 'private, no-store'
    const w = Number(new URL(req.url).searchParams.get('w'))
    try {
        if ([160, 480, 1200, 2400].includes(w)) {
            const bufor = await sharp(plik).rotate().resize({ width: w, withoutEnlargement: true }).webp({ quality: w >= 2400 ? 86 : 80 }).toBuffer()
            return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff' } })
        }
        const bufor = await sharp(plik).rotate().toBuffer()
        return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': mimePliku(plik), 'Cache-Control': cache, 'X-Content-Type-Options': 'nosniff', 'Content-Disposition': `inline; filename="${id}-${nazwa}"` } })
    } catch { return nieMa() }
}

/** Zdjęcie osoby: /pliki/osoby/<id>/<plik>?w=480|1200 – tylko gdy czytelnik widzi kartę osoby. */
async function portretOsoby(req: Request, sciezka: string[]): Promise<Response> {
    if (sciezka.length !== 3) return nieMa()
    const [, id, nazwa] = sciezka
    const { stanOsob } = await import('@/lib/osoby/dane')
    const { ID_OSOBY, NAZWA_PORTRETU } = await import('@/lib/osoby/model')
    if (!ID_OSOBY.test(id) || !NAZWA_PORTRETU.test(nazwa)) return nieMa()
    const s = await stanOsob()
    const o = s.drzewo.osoby.get(id)
    const poziom = await poziomCzytelnika()
    const w = s.widocznosc(id)
    const widac = w === 'publiczne' || (w === 'bliscy' && poziom !== 'publiczne') || (w === 'ja' && poziom === 'ja')
    if (!o || !widac || o.portret?.plik !== nazwa) return nieMa()
    const plik = path.join(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW, 'osoby', id, nazwa)
    const szer = Number(new URL(req.url).searchParams.get('w'))
    try {
        const obraz = sharp(plik).rotate()
        const bufor = [480, 1200].includes(szer) ? await obraz.resize({ width: szer, withoutEnlargement: true }).webp({ quality: 82 }).toBuffer() : await obraz.webp({ quality: 88 }).toBuffer()
        return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': w === 'publiczne' ? 'public, max-age=86400' : 'private, no-store', 'X-Content-Type-Options': 'nosniff' } })
    } catch { return nieMa() }
}
