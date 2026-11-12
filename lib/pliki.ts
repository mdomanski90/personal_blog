// Pliki materiałów archiwum: leżą w katalogu pliki-archiwum/ (poza public/, nie trafiają do repozytorium)
// i są wydawane przez /pliki/[materiał]/[plik] dopiero po sprawdzeniu widoczności materiału.

export const KATALOG_PLIKOW = 'pliki-archiwum'
export const ADRES_PLIKOW = '/pliki/'

export type TypPliku = 'obraz' | 'dzwiek' | 'film' | 'pdf' | 'inny'

const TYPY: Record<string, { typ: TypPliku; mime: string }> = {
    jpg: { typ: 'obraz', mime: 'image/jpeg' },
    jpeg: { typ: 'obraz', mime: 'image/jpeg' },
    png: { typ: 'obraz', mime: 'image/png' },
    webp: { typ: 'obraz', mime: 'image/webp' },
    gif: { typ: 'obraz', mime: 'image/gif' },
    avif: { typ: 'obraz', mime: 'image/avif' },
    mp3: { typ: 'dzwiek', mime: 'audio/mpeg' },
    m4a: { typ: 'dzwiek', mime: 'audio/mp4' },
    ogg: { typ: 'dzwiek', mime: 'audio/ogg' },
    opus: { typ: 'dzwiek', mime: 'audio/ogg' },
    wav: { typ: 'dzwiek', mime: 'audio/wav' },
    flac: { typ: 'dzwiek', mime: 'audio/flac' },
    mp4: { typ: 'film', mime: 'video/mp4' },
    webm: { typ: 'film', mime: 'video/webm' },
    mov: { typ: 'film', mime: 'video/quicktime' },
    pdf: { typ: 'pdf', mime: 'application/pdf' },
    txt: { typ: 'inny', mime: 'text/plain; charset=utf-8' },
}

const rozszerzenie = (plik: string) => (plik.match(/\.([a-z0-9]+)$/i)?.[1] ?? '').toLowerCase()

export function typPliku(plik: string | null | undefined): TypPliku | null {
    if (!plik) return null
    return TYPY[rozszerzenie(plik)]?.typ ?? 'inny'
}

export function mimePliku(plik: string): string {
    return TYPY[rozszerzenie(plik)]?.mime ?? 'application/octet-stream'
}
