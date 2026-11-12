import Markdoc, { Tag, type Node, type Config, type RenderableTreeNode, type RenderableTreeNodes } from '@markdoc/markdoc'
import { bezNawiasow, ODNOSNIK, tekstOdnosnika, type Rozwiaz } from './odnosniki'
import { typPliku } from './pliki'

// Wspólne renderowanie treści Markdoc (wpisy, opisy miejsc i tematów).
// Obrazki: miniatura WebP z katalogu thumbs/ (tworzy ją skrypt generate-thumbs przy buildzie),
// pełna wersja pod data-zoom-src dla powiększenia.

const KATALOGI_OBRAZOW = ['posts', 'miejsca', 'obiekty', 'tematy', 'materialy', 'o-projekcie']

function miniatura(src: string): string {
    for (const k of KATALOGI_OBRAZOW) {
        const przedrostek = `/images/${k}/`
        if (src.startsWith(przedrostek) && !src.startsWith(`${przedrostek}thumbs/`)) {
            return (przedrostek + 'thumbs/' + src.slice(przedrostek.length)).replace(/\.\w+$/, '.webp')
        }
    }
    return src
}

// ---------- wyróżnione fragmenty (komponenty z panelu: zrodlo, dwujezyczne, kolumna) ----------

const RODZAJE_ZRODLA: Record<string, string> = {
    transkrypcja: 'transkrypcja', tlumaczenie: 'tłumaczenie', cytat: 'cytat', oryginal: 'oryginał',
}

// [...] albo [Z Boże] – uzupełnienia i luki w tekście źródła; pomija odnośniki [[…]]
const UZUPELNIENIE = /(?<!\[)\[(?!\[)[^\[\]]*\](?!\])/g

function przygasUzupelnienia(n: RenderableTreeNode): RenderableTreeNode | RenderableTreeNode[] {
    if (typeof n === 'string') {
        const czesci: RenderableTreeNode[] = []
        let ostatni = 0
        for (const m of n.matchAll(UZUPELNIENIE)) {
            if (m.index! > ostatni) czesci.push(n.slice(ostatni, m.index))
            czesci.push(new Tag('span', { class: 'uzupelnienie' }, [m[0]]))
            ostatni = m.index! + m[0].length
        }
        if (!czesci.length) return n
        if (ostatni < n.length) czesci.push(n.slice(ostatni))
        return czesci
    }
    if (Tag.isTag(n)) return new Tag(n.name, n.attributes, n.children.flatMap((c) => przygasUzupelnienia(c)))
    return n
}

function tresc(node: Node, cfg: Config): RenderableTreeNode[] {
    const dzieci = node.transformChildren(cfg) as RenderableTreeNodes
    const lista = Array.isArray(dzieci) ? dzieci : [dzieci]
    return [new Tag('div', { class: 'zrodlo-tresc' }, lista.flatMap((c) => przygasUzupelnienia(c)))]
}

function naglowek(lewa: string, prawa?: string): Tag {
    const czesci: RenderableTreeNode[] = [new Tag('span', { class: 'zrodlo-rodzaj' }, [lewa])]
    if (prawa) czesci.push(new Tag('span', { class: 'zrodlo-opis' }, [prawa]))
    return new Tag('div', { class: 'zrodlo-naglowek' }, czesci)
}

/** Czy w węźle nie ma żadnego tekstu, obrazka ani innego elementu z treścią. */
function pusty(node: Node): boolean {
    for (const n of node.walk()) {
        if (n.type === 'text' && String(n.attributes.content ?? '').trim()) return false
        if (n.type === 'image' || n.type === 'tag' || n.type === 'code' || n.type === 'fence' || n.type === 'table') return false
    }
    return true
}

const config: Config = {
    tags: {
        zrodlo: {
            render: 'div',
            attributes: { rodzaj: { type: String }, opis: { type: String } },
            transform(node, cfg) {
                const rodzaj = String(node.attributes.rodzaj ?? 'transkrypcja')
                return new Tag('figure', { class: `zrodlo zrodlo-${rodzaj}` }, [
                    naglowek(RODZAJE_ZRODLA[rodzaj] ?? rodzaj, node.attributes.opis || undefined),
                    ...tresc(node, cfg),
                ])
            },
        },
        dwujezyczne: {
            render: 'div',
            attributes: { opis: { type: String } },
            transform(node, cfg) {
                const opis = node.attributes.opis
                const kolumny = node.transformChildren(cfg) as RenderableTreeNode[]
                return new Tag('figure', { class: 'zrodlo zrodlo-dwujezyczne' }, [
                    ...(opis ? [new Tag('div', { class: 'zrodlo-naglowek' }, [new Tag('span', { class: 'zrodlo-opis' }, [opis])])] : []),
                    new Tag('div', { class: 'zrodlo-kolumny' }, kolumny),
                ])
            },
        },
        // materiał z archiwum wstawiony w tekst – na razie znacznik; treść wstawia naHtml (zna widoczność)
        material: {
            render: 'figure',
            selfClosing: true,
            attributes: { id: { type: String }, podpis: { type: String } },
            transform(node) {
                return new Tag('figure', { 'data-material': String(node.attributes.id ?? ''), 'data-podpis': String(node.attributes.podpis ?? '') }, [])
            },
        },
        // drzewo osoby z działu „osoby” – treść wstawia naHtml (zna widoczność czytelnika)
        drzewo: {
            render: 'figure',
            selfClosing: true,
            attributes: { osoba: { type: String }, wstecz: { type: Number }, naprzod: { type: Number }, zakres: { type: String } },
            transform(node) {
                const a = node.attributes
                return new Tag('figure', { 'data-drzewo': String(a.osoba ?? ''), 'data-wstecz': String(a.wstecz ?? 2), 'data-naprzod': String(a.naprzod ?? 1), 'data-zakres': String(a.zakres ?? 'malzonkowie') }, [])
            },
        },
        kolumna: {
            render: 'div',
            attributes: { etykieta: { type: String } },
            transform(node, cfg) {
                const etykieta = node.attributes.etykieta
                return new Tag('div', { class: 'zrodlo-kolumna' }, [...(etykieta ? [naglowek(etykieta)] : []), ...tresc(node, cfg)])
            },
        },
    },
    nodes: {
        image: {
            render: 'img',
            attributes: { src: { type: String }, alt: { type: String }, title: { type: String } },
            transform(node) {
                const src = String(node.attributes.src || '')
                return new Tag('img', {
                    src: miniatura(src),
                    'data-zoom-src': src,
                    alt: node.attributes.alt || '',
                    title: node.attributes.title || '',
                    loading: 'lazy',
                    decoding: 'async',
                    class: 'rounded-none w-full cursor-zoom-in',
                })
            },
        },
        // puste cytaty (np. same znaki „>” zostawione w tekście, także zagnieżdżone) pomijamy –
        // inaczej na stronie zostają puste szare ramki jedna w drugiej
        blockquote: {
            render: 'blockquote',
            transform(node, cfg) {
                if (pusty(node)) return null
                return new Tag('blockquote', {}, node.transformChildren(cfg))
            },
        },
        table: {
            render: 'table',
            transform(node, cfg) {
                return new Tag('div', { class: 'overflow-x-auto' }, [new Tag('table', {}, node.transformChildren(cfg))])
            },
        },
    },
}

// ---------- materiały wstawione w tekst ----------

export interface MaterialWstawki {
    id: string
    nazwa: string
    rodzaj: string
    plik: string | null
}

/** Podgląd materiału: obraz (z powiększeniem), odtwarzacz, PDF albo odnośnik – i podpis z linkiem do archiwum. */
export function wstawkaMaterialu(m: MaterialWstawki, podpis?: string): Tag {
    const adres = `/archiwum/${m.id}`
    const typ = typPliku(m.plik)
    const podglad: RenderableTreeNode[] = []
    if (m.plik && typ === 'obraz') {
        podglad.push(new Tag('img', { src: m.plik, 'data-zoom-src': m.plik, alt: podpis || m.nazwa, loading: 'lazy', decoding: 'async', class: 'rounded-none w-full cursor-zoom-in' }))
    } else if (m.plik && typ === 'dzwiek') {
        podglad.push(new Tag('audio', { controls: true, preload: 'none', src: m.plik, class: 'w-full' }))
    } else if (m.plik && typ === 'film') {
        podglad.push(new Tag('video', { controls: true, preload: 'metadata', src: m.plik, class: 'w-full' }))
    }
    const opis: RenderableTreeNode[] = [new Tag('a', { href: adres }, [podpis || m.nazwa])]
    if (m.plik && (typ === 'pdf' || typ === 'inny')) opis.push(' · ', new Tag('a', { href: m.plik }, [typ === 'pdf' ? 'otwórz PDF' : 'otwórz plik']))
    return new Tag('figure', { class: 'material-wstawka' }, [...podglad, new Tag('figcaption', {}, opis)])
}

// ---------- odnośniki [[…]] ----------

const BEZ_ODNOSNIKOW = new Set(['a', 'code', 'pre'])

/** Zamienia [[…]] w tekście na linki (albo zwykły tekst, gdy celu nie ma lub jest niewidoczny). */
export interface KontekstTresci {
    rozwiaz?: Rozwiaz
    /** materiał po identyfikatorze – null, gdy go nie ma albo czytelnik go nie widzi */
    material?: (id: string) => MaterialWstawki | null
    /** drzewo osoby – null, gdy jej nie ma albo czytelnik jej nie widzi */
    drzewo?: (id: string, op: { wstecz: number; naprzod: number; zakres: 'linia' | 'malzonkowie' | 'rodzenstwo' }) => RenderableTreeNode | null
}

function wstawOdnosniki(n: RenderableTreeNode, k: KontekstTresci): RenderableTreeNode | RenderableTreeNode[] {
    const rozwiaz = k.rozwiaz
    if (typeof n === 'string') {
        if (!n.includes('[[')) return n
        const czesci: RenderableTreeNode[] = []
        let ostatni = 0
        for (const m of n.matchAll(ODNOSNIK)) {
            if (m.index! > ostatni) czesci.push(n.slice(ostatni, m.index))
            const cel = rozwiaz?.(m[1]) ?? null
            const tekst = tekstOdnosnika(cel, m[1], m[2])
            czesci.push(cel ? new Tag('a', { href: cel.adres, class: 'odnosnik', title: cel.nazwa }, [tekst]) : tekst)
            ostatni = m.index! + m[0].length
        }
        if (ostatni < n.length) czesci.push(n.slice(ostatni))
        return czesci
    }
    if (!Tag.isTag(n) || BEZ_ODNOSNIKOW.has(n.name)) return n
    if (n.name === 'figure' && 'data-drzewo' in n.attributes) {
        const a = n.attributes
        const z = String(a['data-zakres'])
        const t = k.drzewo?.(String(a['data-drzewo']), { wstecz: Number(a['data-wstecz']) || 0, naprzod: Number(a['data-naprzod']) || 0, zakres: z === 'linia' || z === 'rodzenstwo' ? z : 'malzonkowie' })
        return t ?? []
    }
    if (n.name === 'figure' && 'data-material' in n.attributes) {
        const m = k.material?.(String(n.attributes['data-material']))
        return m ? wstawkaMaterialu(m, String(n.attributes['data-podpis'] || '') || undefined) : []
    }
    // tekst bywa podzielony na kilka sąsiednich kawałków – sklejamy, żeby [[…]] był w jednym
    const sklejone: RenderableTreeNode[] = []
    for (const c of n.children) {
        const ost = sklejone[sklejone.length - 1]
        if (typeof c === 'string' && typeof ost === 'string') sklejone[sklejone.length - 1] = ost + c
        else sklejone.push(c)
    }
    return new Tag(n.name, n.attributes, sklejone.flatMap((c) => wstawOdnosniki(c, k)))
}

/**
 * Treść do HTML. Kontekst (z lib/archiwum: kontekstTresci) zamienia [[…]] na linki i wstawia materiały;
 * bez niego odnośniki zostają zwykłym tekstem, a materiały się nie pokazują.
 */
export function naHtml(node: Node | null | undefined, kontekst?: KontekstTresci | Rozwiaz): string {
    if (!node) return ''
    const k: KontekstTresci = typeof kontekst === 'function' ? { rozwiaz: kontekst } : (kontekst ?? {})
    const drzewo = Markdoc.transform(node, config)
    const wynik = wstawOdnosniki(drzewo, k)
    return Markdoc.renderers.html(wynik as RenderableTreeNodes)
}

/** Sam tekst (bez znaczników) – do wyszukiwarki i zajawek. */
export function naTekst(node: Node | null | undefined): string {
    if (!node) return ''
    const czesci: string[] = []
    for (const n of node.walk()) {
        if (n.type === 'text' && typeof n.attributes.content === 'string') czesci.push(n.attributes.content)
        if (n.type === 'softbreak' || n.type === 'hardbreak') czesci.push(' ')
        // granice bloków (także komórek tabel), żeby tekst z sąsiednich miejsc się nie sklejał
        if (['paragraph', 'heading', 'item', 'blockquote', 'table', 'tr', 'th', 'td', 'fence', 'hr'].includes(n.type)) czesci.push('\n')
    }
    return czesci.join('').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()
}

/** Pierwszy akapit skrócony do ok. `dlugosc` znaków. */
export function zajawka(node: Node | null | undefined, dlugosc = 220, rozwiaz?: Rozwiaz): string {
    const caly = bezNawiasow(naTekst(node), rozwiaz)
    const tekst = caly.split('\n').find((l) => l.trim().length > 40) ?? caly
    if (tekst.length <= dlugosc) return tekst
    return tekst.slice(0, dlugosc).replace(/\s+\S*$/, '') + '…'
}

/**
 * Rozdziela treść materiału: wyróżnione transkrypcje, tłumaczenia i oryginały (znacznik „zrodlo”) idą obok skanu,
 * reszta zostaje opisem pod spodem.
 */
export function rozdzielZrodla(node: Node | null | undefined): { transkrypcja: Node | null; tlumaczenie: Node | null; oryginal: Node | null; reszta: Node | null } {
    const pusty = { transkrypcja: null, tlumaczenie: null, oryginal: null, reszta: node ?? null }
    if (!node || !Array.isArray(node.children)) return pusty
    const wg: Record<string, Node[]> = { transkrypcja: [], tlumaczenie: [], oryginal: [] }
    const reszta: Node[] = []
    for (const c of node.children) {
        const r = c.type === 'tag' && c.tag === 'zrodlo' ? String(c.attributes?.rodzaj ?? '') : ''
        if (r in wg) wg[r].push(c)
        else reszta.push(c)
    }
    const dok = (L: Node[]) => (L.length ? new Markdoc.Ast.Node('document', {}, L) : null)
    return { transkrypcja: dok(wg.transkrypcja), tlumaczenie: dok(wg.tlumaczenie), oryginal: dok(wg.oryginal), reszta: dok(reszta) }
}
