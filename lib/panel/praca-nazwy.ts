// P6a (PNL-08): nazwa pozycji panelu po ludzku dla „przypnij” – wpis Keystatic, osoba, plan; inaczej ścieżka.
import { opisPlikuZTytulem, plikDlaAdresu } from './historia-adresy'

export async function nazwaDlaAdresu(href: string): Promise<string> {
    const sc = href.split('?')[0]
    const plik = plikDlaAdresu(sc)
    if (plik) return (await opisPlikuZTytulem(process.cwd(), plik)).nazwa
    let m = /^\/keystatic\/osoby\/([\w-]+)$/.exec(sc)
    if (m) {
        const { stanOsob } = await import('../osoby/dane')
        const { nazwaOsoby } = await import('../osoby/model')
        const o = (await stanOsob()).drzewo.osoby.get(m[1])
        return o ? `osoba „${nazwaOsoby(o)}”` : `osoba ${m[1]}`
    }
    m = /^\/keystatic\/plany\/([\w-]+)$/.exec(sc)
    if (m && m[1] !== 'typy') {
        const { wczytajPlan } = await import('../plany/dane')
        const p = await wczytajPlan(m[1]).catch(() => null)
        return p ? `plan „${p.tytul}”` : `plan ${m[1]}`
    }
    m = /^\/keystatic\/panel\/lista\/([\w-]+)$/.exec(sc)
    if (m) return `lista: ${m[1]}`
    return sc.replace(/^\/keystatic\/?/, '') || 'pulpit'
}
