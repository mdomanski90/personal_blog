import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { brakDostepu } from '@/lib/plany/dane'
import { material } from '@/lib/archiwum'
import { ID_MATERIALU, NAZWA_STRONY, adresStrony, katalogStron, stronyMaterialu, zapiszStrony, type StronaMaterialu } from '@/lib/strony-materialow'

// Strony materiału w panelu: lista, dodanie pliku (po jednym na żądanie – panel wysyła kilka po kolei),
// nowa kolejność / podpisy / usunięcie stron.
export const dynamic = 'force-dynamic'

const MAKS = 60 * 1024 * 1024

async function sprawdz(req: Request, params: Promise<{ id: string }>) {
    const b = brakDostepu(req); if (b) return { b }
    const { id } = await params
    if (!ID_MATERIALU.test(id)) return { b: Response.json({ blad: 'zły identyfikator' }, { status: 400 }) }
    const m = await material(id, 'ja')
    if (!m) return { b: Response.json({ blad: 'Nie ma takiego materiału – najpierw załóż go w Keystatic i zapisz.' }, { status: 404 }) }
    return { id, m }
}

const lista = (id: string) => stronyMaterialu(id).map((s) => ({ ...s, adres: adresStrony(id, s.plik) }))

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const r = await sprawdz(req, params); if (r.b) return r.b
    // ?podglad=<plik> – miniatura dla panelu (bez względu na widoczność materiału; panel jest za hasłem)
    const q = new URL(req.url).searchParams
    const podglad = q.get('podglad')
    if (podglad) {
        if (!NAZWA_STRONY.test(podglad) || !stronyMaterialu(r.id!).some((s) => s.plik === podglad)) return new Response('Nie znaleziono', { status: 404 })
        try {
            const bufor = await sharp(path.join(/*turbopackIgnore: true*/ katalogStron(r.id!), podglad)).rotate().resize({ width: 480, withoutEnlargement: true }).webp({ quality: 78 }).toBuffer()
            return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } })
        } catch { return new Response('Nie znaleziono', { status: 404 }) }
    }
    return Response.json({ id: r.id, nazwa: r.m!.nazwa, plik: r.m!.plik, widocznosc: r.m!.widocznosc, strony: lista(r.id!) })
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const r = await sprawdz(req, params); if (r.b) return r.b
    const id = r.id!
    const f = (await req.formData().catch(() => null))?.get('plik')
    if (!(f instanceof File)) return Response.json({ blad: 'brak pliku' }, { status: 400 })
    if (f.size > MAKS) return Response.json({ blad: 'Plik większy niż 60 MB.' }, { status: 413 })
    const wejscie = Buffer.from(await f.arrayBuffer())
    let meta: Awaited<ReturnType<ReturnType<typeof sharp>["metadata"]>>
    try { meta = await sharp(wejscie).metadata() } catch { return Response.json({ blad: `„${f.name}” to nie jest obraz (JPG, PNG, WebP, TIFF).` }, { status: 400 }) }
    // JPG/PNG/WebP zostają jak są; TIFF i inne – na JPG (przeglądarki nie pokazują TIFF)
    const roz = meta.format === 'jpeg' ? 'jpg' : meta.format === 'png' ? 'png' : meta.format === 'webp' ? 'webp' : 'jpg'
    const dane = roz === 'jpg' && meta.format !== 'jpeg' ? await sharp(wejscie).rotate().jpeg({ quality: 92 }).toBuffer() : wejscie
    const nazwa = `s-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.${roz}`
    await fs.promises.mkdir(katalogStron(id), { recursive: true })
    await fs.promises.writeFile(path.join(/*turbopackIgnore: true*/ katalogStron(id), nazwa), dane)
    await zapiszStrony(id, [...stronyMaterialu(id), { plik: nazwa }])
    return Response.json({ strony: lista(id) })
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const r = await sprawdz(req, params); if (r.b) return r.b
    const id = r.id!
    const d = (await req.json().catch(() => null)) as { strony?: StronaMaterialu[] } | null
    if (!Array.isArray(d?.strony)) return Response.json({ blad: 'brak danych' }, { status: 400 })
    const obecne = new Set(stronyMaterialu(id).map((s) => s.plik))
    const nowe = d!.strony.filter((s) => s && NAZWA_STRONY.test(s.plik) && obecne.has(s.plik)).map((s) => ({ plik: s.plik, ...(s.podpis?.trim() ? { podpis: String(s.podpis).trim().slice(0, 200) } : {}) }))
    // strony usunięte z listy – plik do kosza materiału (pliki-archiwum/strony/<id>/_kosz)
    const zostaja = new Set(nowe.map((s) => s.plik))
    for (const p of obecne) {
        if (zostaja.has(p)) continue
        await fs.promises.mkdir(path.join(/*turbopackIgnore: true*/ katalogStron(id), '_kosz'), { recursive: true })
        await fs.promises.rename(path.join(/*turbopackIgnore: true*/ katalogStron(id), p), path.join(/*turbopackIgnore: true*/ katalogStron(id), '_kosz', p)).catch(() => {})
    }
    await zapiszStrony(id, nowe)
    return Response.json({ strony: lista(id) })
}
