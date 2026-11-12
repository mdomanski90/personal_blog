// Odczyt położenia GPS i daty z danych EXIF zdjęcia JPEG (w przeglądarce, bez bibliotek).

export interface DaneZdjecia { lat?: number; lon?: number; data?: string }

export function odczytajExif(buf: ArrayBuffer): DaneZdjecia {
    const v = new DataView(buf)
    if (v.byteLength < 4 || v.getUint16(0) !== 0xffd8) return {}
    let o = 2
    while (o + 4 < v.byteLength) {
        const znacznik = v.getUint16(o), dl = v.getUint16(o + 2)
        if (znacznik === 0xffe1 && v.getUint32(o + 4) === 0x45786966) return tiff(v, o + 10)
        if ((znacznik & 0xff00) !== 0xff00) break
        o += 2 + dl
    }
    return {}
}

function tiff(v: DataView, start: number): DaneZdjecia {
    const le = v.getUint16(start) === 0x4949
    const u16 = (p: number) => v.getUint16(start + p, le), u32 = (p: number) => v.getUint32(start + p, le)
    const ifd = (p: number) => {
        const n = u16(p), wpisy = new Map<number, { typ: number; ile: number; wart: number }>()
        for (let i = 0; i < n; i++) { const e = p + 2 + i * 12; wpisy.set(u16(e), { typ: u16(e + 2), ile: u32(e + 4), wart: e + 8 }) }
        return wpisy
    }
    const wymierne = (w: { ile: number; wart: number }) => {
        const p = u32(w.wart - 0), wyn: number[] = []
        for (let i = 0; i < w.ile; i++) { const lic = u32(p + i * 8), mian = u32(p + i * 8 + 4); wyn.push(mian ? lic / mian : 0) }
        return wyn
    }
    const tekst = (w: { ile: number; wart: number }) => {
        const p = w.ile > 4 ? u32(w.wart) : w.wart
        let s = ''
        for (let i = 0; i < w.ile - 1; i++) s += String.fromCharCode(v.getUint8(start + p + i))
        return s
    }
    const wyn: DaneZdjecia = {}
    try {
        const ifd0 = ifd(u32(4))
        const exifPtr = ifd0.get(0x8769)
        if (exifPtr) { const ex = ifd(u32(exifPtr.wart)); const d = ex.get(0x9003); if (d) wyn.data = tekst(d).replace(/^(\d{4}):(\d\d):(\d\d)/, '$1-$2-$3') }
        const gpsPtr = ifd0.get(0x8825)
        if (gpsPtr) {
            const g = ifd(u32(gpsPtr.wart))
            const latRef = g.get(1), lat = g.get(2), lonRef = g.get(3), lon = g.get(4)
            if (lat && lon) {
                const st = (r: number[]) => r[0] + (r[1] ?? 0) / 60 + (r[2] ?? 0) / 3600
                let la = st(wymierne(lat)), lo = st(wymierne(lon))
                if (latRef && String.fromCharCode(v.getUint8(start + latRef.wart)) === 'S') la = -la
                if (lonRef && String.fromCharCode(v.getUint8(start + lonRef.wart)) === 'W') lo = -lo
                if (la || lo) { wyn.lat = la; wyn.lon = lo }
            }
        }
    } catch { /* uszkodzone EXIF – bez położenia */ }
    return wyn
}
