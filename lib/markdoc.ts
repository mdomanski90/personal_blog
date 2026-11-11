import Markdoc, { Tag, type Node, type Config, type RenderableTreeNode, type RenderableTreeNodes } from '@markdoc/markdoc'

// Wspólne renderowanie treści Markdoc (wpisy, opisy miejsc i tematów).
// Obrazki: miniatura WebP z katalogu thumbs/ (tworzy ją skrypt generate-thumbs przy buildzie),
// pełna wersja pod data-zoom-src dla powiększenia.

const KATALOGI_OBRAZOW = ['posts', 'miejsca', 'obiekty', 'tematy', 'o-projekcie']

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

export function naHtml(node: Node | null | undefined): string {
    if (!node) return ''
    return Markdoc.renderers.html(Markdoc.transform(node, config))
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
export function zajawka(node: Node | null | undefined, dlugosc = 220): string {
    const tekst = naTekst(node).split('\n').find((l) => l.trim().length > 40) ?? naTekst(node)
    if (tekst.length <= dlugosc) return tekst
    return tekst.slice(0, dlugosc).replace(/\s+\S*$/, '') + '…'
}
