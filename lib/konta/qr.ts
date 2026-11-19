// P7a: kod QR linku z zaproszenia jako ścieżka SVG (biblioteka qrcode-generator, poziom korekcji M). Rysuje panel – tokenami kolorów.
import qrcode from 'qrcode-generator'

/** Moduły kodu jako jedna ścieżka SVG w układzie `rozmiar × rozmiar` (z marginesem 4 modułów – wymóg czytników). */
export function kodQr(tekst: string): { rozmiar: number; sciezka: string } {
    const q = qrcode(0, 'M')
    q.addData(tekst)
    q.make()
    const n = q.getModuleCount(), m = 4
    let d = ''
    for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (q.isDark(y, x)) d += `M${x + m} ${y + m}h1v1h-1z`
    return { rozmiar: n + 2 * m, sciezka: d }
}
