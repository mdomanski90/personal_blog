// Łatka 21.11 (podgląd linku, decyzje 21.11): obrazek 1200 × 630 dla komunikatorów – skan / zdjęcie karty na jasnym tle,
// obok tytuł, linia (dział · rodzaj · rok) i emblemat serwisu; bez obrazu – spokojna wizytówka serwisu (zamiast kolorowej kapliczki).
// Czcionka: JetBrains Mono jak na stronie (lib/og/*.ttf, SIL OFL 1.1 – OFL-JetBrainsMono.txt). Tylko pozycje publiczne – komunikatory
// pobierają podgląd bez logowania; obraz czytany z dysku dopiero, gdy pozycja jest widoczna dla czytelnika niezalogowanego.
import fs from 'node:fs/promises'
import path from 'node:path'
import { ImageResponse } from 'next/og'
import { KRESKI, RAMA } from '../emblemat-dane'

export const ROZMIAR_OG = { width: 1200, height: 630 }
export const TYP_OG = 'image/jpeg'
export const ALT_OG = 'odniepamieci.pl – społeczne archiwum pamięci lokalnej'

const PAPIER = '#fbfaf6', TLO_SKANU = '#efebe2', LINIA = '#d9d2c3', TEKST = '#1c1b18', SZARY = '#6b665c', AKCENT = '#4a3ab8'

async function czcionki() {
    const k = path.join(/*turbopackIgnore: true*/ process.cwd(), 'lib', 'og')
    const [r, b] = await Promise.all([
        fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ k, 'JetBrainsMono-Regular.ttf')),
        fs.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ k, 'JetBrainsMono-Bold.ttf')),
    ])
    return [
        { name: 'JetBrains Mono', data: r, weight: 400 as const, style: 'normal' as const },
        { name: 'JetBrains Mono', data: b, weight: 700 as const, style: 'normal' as const },
    ]
}

/** Emblemat serwisu (ten sam rysunek co w nagłówku strony – lib/emblemat-dane.ts) jako SVG bez napisu; napis „KAPLICZKA W OLSZANCE”
 *  dokłada szablon czcionką JetBrains Mono (napisy w obrazie SVG nie mają tu czcionek). */
function emblemat(): string {
    const kreski = KRESKI.map((k) => `<path d="${k.d}"${k.g ? ` transform="${k.g}"` : ''} stroke-width="${k.w ?? 1.4}"/>`).join('')
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 104" fill="none" stroke="${TEKST}" stroke-linecap="round" stroke-linejoin="round"><path d="${RAMA}" stroke-width="2"/>${kreski}</svg>`
    return `data:image/svg+xml;base64,${Buffer.from(svg).toString('base64')}`
}

/** Emblemat o wysokości h z napisem pod linią ziemi (współrzędne napisu jak w Emblemat.tsx: y 89,5 i 95,7 z 104, rozmiar 5). */
function Emblemat({ h }: { h: number }) {
    const s = h / 104, w = Math.round(80 * s)
    const wiersz = (t: string, y: number) => (
        <div style={{ position: 'absolute', left: 0, top: (y - 4.4) * s, width: w, display: 'flex', justifyContent: 'center', fontSize: 5 * s, fontWeight: 700, letterSpacing: 0.6 * s, color: TEKST, lineHeight: 1 }}>{t}</div>
    )
    return (
        <div style={{ position: 'relative', display: 'flex', width: w, height: h }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={emblemat()} width={w} height={h} alt="" />
            {wiersz('KAPLICZKA', 89.5)}
            {wiersz('W OLSZANCE', 95.7)}
        </div>
    )
}

/** Plik z adresu /pliki/… (strona skanu, plik materiału, zdjęcie obiektu) jako pomniejszony JPEG; brak / błąd – undefined. */
export async function obrazPliku(adres: string | null | undefined): Promise<string | undefined> {
    if (!adres || !adres.startsWith('/pliki/')) return undefined
    const wzgledna = decodeURIComponent(adres.slice('/pliki/'.length).split('?')[0])
    if (!wzgledna || wzgledna.split('/').some((c) => !c || c === '.' || c === '..') || !/\.(jpe?g|png|webp|tiff?)$/i.test(wzgledna)) return undefined
    try {
        const sharp = (await import('sharp')).default
        const b = await sharp(path.join(/*turbopackIgnore: true*/ process.cwd(), 'pliki-archiwum', wzgledna)).rotate()
            .resize({ width: 1000, height: 1000, fit: 'inside', withoutEnlargement: true }).jpeg({ quality: 82 }).toBuffer()
        return `data:image/jpeg;base64,${b.toString('base64')}`
    } catch {
        return undefined
    }
}

const skroc = (t: string, n: number) => (t.length <= n ? t : `${t.slice(0, n).replace(/\s+\S*$/, '')}…`)

/** Podgląd karty: obraz (skan / zdjęcie) z lewej, tytuł i linia z prawej. Bez obrazu i bez tytułu – wizytówka serwisu. */
export async function kartaOg(k: { tytul?: string; linia?: string[]; obraz?: string } = {}): Promise<Response> {
    const fonts = await czcionki()
    const marka = (rozmiar: number) => (
        <div style={{ display: 'flex', alignItems: 'center', gap: rozmiar * 0.3 }}>
            <Emblemat h={rozmiar} />
            <div style={{ display: 'flex', fontSize: rozmiar * 0.42, fontWeight: 700, color: TEKST }}>odniepamieci.pl</div>
        </div>
    )
    const stopka = (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ display: 'flex', borderTop: `2px dashed ${LINIA}` }} />
            <div style={{ display: 'flex', fontSize: 22, color: SZARY }}>społeczne archiwum pamięci lokalnej</div>
        </div>
    )
    const tresc = !k.tytul ? (
        // wizytówka serwisu (strony bez własnego obrazka): jasne tło, emblemat, nazwa, podtytuł, okolica
        <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', gap: 34, width: '100%', height: '100%', padding: '70px 96px', background: PAPIER, fontFamily: 'JetBrains Mono' }}>
            {marka(150)}
            <div style={{ display: 'flex', fontSize: 36, color: TEKST }}>społeczne archiwum pamięci lokalnej</div>
            <div style={{ display: 'flex', borderTop: `2px dashed ${LINIA}` }} />
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, fontSize: 26, color: SZARY }}>
                <div style={{ display: 'flex' }}>Olszanka · Łosice · Międzyrzec Podlaski</div>
                <div style={{ display: 'flex' }}>dokumenty, zdjęcia, wspomnienia, ludzie, miejsca</div>
            </div>
        </div>
    ) : (
        <div style={{ display: 'flex', width: '100%', height: '100%', padding: 44, gap: 44, background: PAPIER, fontFamily: 'JetBrains Mono' }}>
            {k.obraz && (
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', width: 540, height: 542, flexShrink: 0, background: TLO_SKANU, border: `1px solid ${LINIA}`, borderRadius: 14 }}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={k.obraz} width={500} height={502} style={{ objectFit: 'contain' }} alt="" />
                </div>
            )}
            <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', flex: 1, minWidth: 0 }}>
                {marka(96)}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
                    {k.linia?.length ? <div style={{ display: 'flex', fontSize: 24, color: AKCENT }}>{skroc(k.linia.join(' · '), k.obraz ? 40 : 70)}</div> : null}
                    <div style={{ display: 'flex', fontSize: k.obraz ? 42 : 56, fontWeight: 700, lineHeight: 1.22, color: TEKST }}>{skroc(k.tytul, k.obraz ? 96 : 120)}</div>
                </div>
                {stopka}
            </div>
        </div>
    )
    // JPEG zamiast PNG: zdjęcie / skan w PNG potrafi mieć kilkaset kB, a komunikatory (np. WhatsApp) większych obrazków nie pokazują
    const png = Buffer.from(await new ImageResponse(tresc, { ...ROZMIAR_OG, fonts }).arrayBuffer())
    const sharp = (await import('sharp')).default
    const jpg = await sharp(png).jpeg({ quality: 82, mozjpeg: true }).toBuffer()
    return new Response(new Uint8Array(jpg), { headers: { 'Content-Type': 'image/jpeg', 'Cache-Control': 'public, max-age=600' } })
}
