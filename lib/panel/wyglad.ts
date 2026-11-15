/** P6C: Globalny akcent redakcyjny. Wybór zapisujemy poza kodem; brak pliku = dotychczasowy fiolet. */
import fs from 'node:fs/promises'
import path from 'node:path'
import { randomBytes } from 'node:crypto'

export const AKCENT_DOMYSLNY = '#4c3cc4'
export const PRESETY_AKCENTU = [AKCENT_DOMYSLNY, '#155e75', '#166534', '#7f1d1d', '#92400e', '#1e40af'] as const
const plik = () => path.join(process.cwd(), 'content', '_panel', 'wyglad.json')
export const prawidlowyHex = (v: unknown): v is string => typeof v === 'string' && /^#[0-9a-fA-F]{6}$/.test(v)
export const normalizujAkcent = (v: unknown): string => prawidlowyHex(v) ? v.toLowerCase() : AKCENT_DOMYSLNY

function rgb(hex: string): [number, number, number] {
    return [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16)) as [number, number, number]
}
function hex(k: number[]): string { return `#${k.map(x => Math.max(0, Math.min(255, Math.round(x))).toString(16).padStart(2, '0')).join('')}` }
function mieszaj(a: string, b: string, t: number): string {
    const aa = rgb(a), bb = rgb(b)
    return hex(aa.map((v, i) => v * (1 - t) + bb[i] * t))
}
export function luminancja(k: string): number {
    const a = rgb(k).map(c => { const v = c / 255; return v <= 0.04045 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4 })
    return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2]
}
export function kontrast(a: string, b: string): number {
    const x = luminancja(a), y = luminancja(b)
    return (Math.max(x, y) + 0.05) / (Math.min(x, y) + 0.05)
}
function dostosuj(akcent: string, tlo: string, cel: string, minimalny = 4.5): string {
    if (kontrast(akcent, tlo) >= minimalny) return akcent
    for (let t = 0.01; t <= 1.001; t += 0.01) {
        const nowy = mieszaj(akcent, cel, t)
        if (kontrast(nowy, tlo) >= minimalny) return nowy
    }
    return cel
}
export function koloryAkcentu(wybrany: string) {
    const bazowy = normalizujAkcent(wybrany)
    const jasny = dostosuj(bazowy, '#fbfaf7', '#090909')
    const ciemny = bazowy === AKCENT_DOMYSLNY ? '#a597ff' : dostosuj(bazowy, '#15171a', '#ffffff')
    return { wybrany: bazowy, jasny, ciemny, kontrastJasny: kontrast(jasny, '#fbfaf7'), kontrastCiemny: kontrast(ciemny, '#15171a') }
}

export async function wczytajAkcent(): Promise<string> {
    try {
        const dane = JSON.parse(await fs.readFile(plik(), 'utf8')) as { akcent?: unknown }
        return normalizujAkcent(dane.akcent)
    } catch { return AKCENT_DOMYSLNY }
}
export async function zapiszAkcent(wartosc: string): Promise<void> {
    if (!prawidlowyHex(wartosc)) throw new Error('Nieprawidłowy kolor: oczekiwany #RRGGBB')
    const target = plik()
    // P6B już wymaga folderu content/_panel z uprawnieniami blog:blog. Nie zmieniamy praw innych treści.
    await fs.mkdir(path.dirname(target), { recursive: true, mode: 0o750 })
    const tmp = `${target}.${randomBytes(6).toString('hex')}.tmp`
    try {
        await fs.writeFile(tmp, JSON.stringify({ akcent: normalizujAkcent(wartosc) }, null, 2) + '\n', { mode: 0o640, flag: 'wx' })
        await fs.rename(tmp, target)
    } finally { await fs.unlink(tmp).catch(() => {}) }
}

/** CSS jest dostarczany osobną, niecache'owaną trasą. Nie wymaga przebudowy Next.js po zmianie. */
export function cssAkcentu(wybrany: string): string {
    const { jasny, ciemny } = koloryAkcentu(wybrany)
    const zestaw = (kolor: string, kontrastTla: string, alpha: string) => `
    --link:${kolor};--primary:${kolor};--ring:${kolor};--accent-foreground:${kolor};
    --sidebar-primary:${kolor};--sidebar-accent-foreground:${kolor};--sidebar-ring:${kolor};
    --pl-akcent:${kolor};--pl-akcent-tlo:${alpha};--p6-akcent:${kolor};--primary-foreground:${kontrastTla};`
    return `/* odniepamieci.pl · akcent zapisany w panelu administracyjnym */
html:not(.dark){${zestaw(jasny, '#fbfaf7', `color-mix(in srgb,${jasny} 16%,transparent)`)}}
html.dark{${zestaw(ciemny, '#15171a', `color-mix(in srgb,${ciemny} 22%,transparent)`)}}
.odp .naglowek-rzeki{color:var(--link)}
.odp .drzewo .dr-karta:focus-visible,.odp .drzewo .dr-narzedzia button:focus-visible{outline-color:var(--link)}
.odp .osoby-krag[aria-current=true]{border-color:var(--link)}
.odp .osoby-krag[aria-current=true] b,.odp .szukaj-filtr[aria-current=true]{color:var(--link)}
.odp .szukaj-filtr[aria-current=true]{border-color:var(--link)}
.odp .dok-miniatury button[aria-current=true]{outline-color:var(--link)}
.odp .dok-obj-ramka,.odp .dok-obj-kreska{stroke:var(--link)}
.odp .dok-obj-kreska.kropka,.odp .dok-obj-znak circle{fill:var(--link)}
.odp .dok-obj-notka.aktywna{border-color:var(--link);box-shadow:0 0 0 1px var(--link) inset}
.odp .dok-obj-nr{background:var(--link);color:var(--primary-foreground)}
` 
}
