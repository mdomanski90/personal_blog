// P5 (PD-05): IIIF Presentation 3.0 – manifest materiału publicznego ze stronami skanów (z objaśnieniami publicznymi)
// i kolekcja IIIF zbioru. Bez serwera obrazów (Image API): każde płótno ma pełny plik strony (jak /pliki/strony/…).
// Wyłącznie poziom „publiczne” – manifest jest dla innych przeglądarek i bibliotek, nie dla zalogowanych.
// Funkcje czyste (bez fs) – dane i wymiary podaje trasa.

export const KONTEKST_IIIF = 'http://iiif.io/api/presentation/3/context.json'
const pl = (t: string) => ({ pl: [t] })

/** IIIF wymaga adresu licencji (Creative Commons / rightsstatements.org); tekstowe „CC BY 4.0” → adres, inne – brak (zostają w metadanych). */
export function adresLicencji(prawa: string): string | null {
    const t = prawa.trim()
    if (/^https?:\/\/(creativecommons\.org|rightsstatements\.org)\//.test(t)) return t.replace(/^https:/, 'http:')
    if (/^(CC0|CC\s*0)\b/i.test(t)) return 'http://creativecommons.org/publicdomain/zero/1.0/'
    if (/domena publiczna|public domain/i.test(t)) return 'http://creativecommons.org/publicdomain/mark/1.0/'
    const m = /^CC[\s-]+(BY(?:[\s-]+(?:NC|ND|SA))*)[\s-]+(\d\.\d)\b/i.exec(t)
    return m ? `http://creativecommons.org/licenses/${m[1].toLowerCase().replace(/[\s-]+/g, '-')}/${m[2]}/` : null
}

/** `objasnienia` – adnotacje W3C tej strony (już z celem = adres płótna), tylko publiczne. */
export interface StronaIIIF { obraz: string; format: string; szer: number; wys: number; podpis?: string; objasnienia?: unknown[] }
export interface MaterialIIIF {
    id: string; nazwa: string; czas?: string; tworca?: string; sygnatura?: string; przechowywanie?: string; prawa?: string; zrodlo?: string
}

export function manifestMaterialu(baza: string, m: MaterialIIIF, strony: StronaIIIF[]) {
    const id = `${baza}/archiwum/${m.id}/manifest.json`
    const metadane = ([['czas', m.czas], ['autor / wytwórca', m.tworca], ['sygnatura', m.sygnatura], ['miejsce przechowywania', m.przechowywanie], ['prawa', m.prawa]] as const)
        .filter(([, v]) => v && v.trim()).map(([k, v]) => ({ label: pl(k), value: pl(v!.trim()) }))
    const licencja = m.prawa ? adresLicencji(m.prawa) : null
    return {
        '@context': KONTEKST_IIIF, id, type: 'Manifest', label: pl(m.nazwa),
        ...(metadane.length ? { metadata: metadane } : {}),
        requiredStatement: { label: pl('źródło'), value: pl(['odniepamieci.pl', m.zrodlo?.trim()].filter(Boolean).join(' · ')) },
        ...(licencja ? { rights: licencja } : {}),
        homepage: [{ id: `${baza}/archiwum/${m.id}`, type: 'Text', label: pl(m.nazwa), format: 'text/html', language: ['pl'] }],
        provider: [{ id: `${baza}/o-projekcie`, type: 'Agent', label: pl('odniepamieci.pl'), homepage: [{ id: baza, type: 'Text', label: pl('odniepamieci.pl'), format: 'text/html' }] }],
        items: strony.map((s, i) => {
            const plotno = `${baza}/archiwum/${m.id}/iiif/plotno/${i + 1}`
            return {
                id: plotno, type: 'Canvas', label: pl(s.podpis?.trim() || `strona ${i + 1}`), width: s.szer, height: s.wys,
                items: [{ id: `${plotno}/strona`, type: 'AnnotationPage', items: [{
                    id: `${plotno}/obraz`, type: 'Annotation', motivation: 'painting', target: plotno,
                    body: { id: s.obraz, type: 'Image', format: s.format, width: s.szer, height: s.wys },
                }] }],
                ...(s.objasnienia?.length ? { annotations: [{ id: `${plotno}/objasnienia`, type: 'AnnotationPage', items: s.objasnienia }] } : {}),
            }
        }),
    }
}

export function kolekcjaZbioru(baza: string, z: { id: string; nazwa: string }, materialy: { id: string; nazwa: string }[]) {
    return {
        '@context': KONTEKST_IIIF, id: `${baza}/archiwum/zbiory/${z.id}/iiif.json`, type: 'Collection', label: pl(z.nazwa),
        homepage: [{ id: `${baza}/archiwum/zbiory/${z.id}`, type: 'Text', label: pl(z.nazwa), format: 'text/html' }],
        items: materialy.map((m) => ({ id: `${baza}/archiwum/${m.id}/manifest.json`, type: 'Manifest', label: pl(m.nazwa) })),
    }
}

export const FORMAT_OBRAZU: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif', tif: 'image/tiff', tiff: 'image/tiff' }
