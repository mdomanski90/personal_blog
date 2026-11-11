import Markdoc, { Tag, type Node, type Config } from '@markdoc/markdoc'

// Wspólne renderowanie treści Markdoc (opowieści, opisy miejsc i tematów).
// Obrazki: miniatura WebP z katalogu thumbs/ (tworzy ją skrypt generate-thumbs przy buildzie),
// pełna wersja pod data-zoom-src dla powiększenia.

const KATALOGI_OBRAZOW = ['posts', 'miejsca', 'tematy', 'o-projekcie']

function miniatura(src: string): string {
    for (const k of KATALOGI_OBRAZOW) {
        const przedrostek = `/images/${k}/`
        if (src.startsWith(przedrostek) && !src.startsWith(`${przedrostek}thumbs/`)) {
            return (przedrostek + 'thumbs/' + src.slice(przedrostek.length)).replace(/\.\w+$/, '.webp')
        }
    }
    return src
}

const config: Config = {
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
        if (n.type === 'paragraph' || n.type === 'heading' || n.type === 'item') czesci.push('\n')
    }
    return czesci.join('').replace(/[ \t]+/g, ' ').replace(/\n\s*/g, '\n').trim()
}

/** Pierwszy akapit skrócony do ok. `dlugosc` znaków. */
export function zajawka(node: Node | null | undefined, dlugosc = 220): string {
    const tekst = naTekst(node).split('\n').find((l) => l.trim().length > 40) ?? naTekst(node)
    if (tekst.length <= dlugosc) return tekst
    return tekst.slice(0, dlugosc).replace(/\s+\S*$/, '') + '…'
}
