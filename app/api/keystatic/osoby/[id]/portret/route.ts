import fs from 'node:fs'
import path from 'node:path'
import crypto from 'node:crypto'
import sharp from 'sharp'
import { brakDostepu } from '@/lib/plany/dane'
import { stanOsob } from '@/lib/osoby/dane'
import { NAZWA_PORTRETU } from '@/lib/osoby/model'
import { KATALOG_PLIKOW } from '@/lib/pliki'

// Zdjęcie osoby: zapis pliku (panel osoby ustawia potem pole „portret” i zapisuje kartę) oraz podgląd dla panelu.
export const dynamic = 'force-dynamic'

const katalog = (id: string) => path.join(/*turbopackIgnore: true*/ process.cwd(), KATALOG_PLIKOW, 'osoby', id)

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    if (!(await stanOsob()).drzewo.osoby.has(id)) return Response.json({ blad: 'Nie ma takiej osoby.' }, { status: 404 })
    const f = (await req.formData().catch(() => null))?.get('plik')
    if (!(f instanceof File)) return Response.json({ blad: 'brak pliku' }, { status: 400 })
    if (f.size > 40 * 1024 * 1024) return Response.json({ blad: 'Plik większy niż 40 MB.' }, { status: 413 })
    let dane: Buffer
    try { dane = await sharp(Buffer.from(await f.arrayBuffer())).rotate().resize({ width: 2000, height: 2000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 88 }).toBuffer() } catch { return Response.json({ blad: 'To nie jest obraz.' }, { status: 400 }) }
    const plik = `portret-${Date.now().toString(36)}-${crypto.randomBytes(3).toString('hex')}.jpg`
    await fs.promises.mkdir(katalog(id), { recursive: true })
    await fs.promises.writeFile(path.join(/*turbopackIgnore: true*/ katalog(id), plik), dane)
    return Response.json({ plik })
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
    const b = brakDostepu(req); if (b) return b
    const { id } = await params
    const plik = new URL(req.url).searchParams.get('plik') ?? ''
    if (!NAZWA_PORTRETU.test(plik) || !(await stanOsob()).drzewo.osoby.has(id)) return new Response('Nie znaleziono', { status: 404 })
    try {
        const bufor = await sharp(path.join(/*turbopackIgnore: true*/ katalog(id), plik)).resize({ width: 480, withoutEnlargement: true }).webp({ quality: 80 }).toBuffer()
        return new Response(new Uint8Array(bufor), { headers: { 'Content-Type': 'image/webp', 'Cache-Control': 'private, max-age=3600' } })
    } catch { return new Response('Nie znaleziono', { status: 404 }) }
}
