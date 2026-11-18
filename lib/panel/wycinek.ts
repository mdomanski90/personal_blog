// P6a wg plansz: skrót różnicy do jednego wiersza (szuflada historii) – bez zależności, używany też w przeglądarce.
export type Fragment = { t: '=' | '-' | '+'; s: string }

/**
 * Plansza funkcji 4: skrót zmiany do jednego wiersza – kilka słów przed pierwszą zmianą, zmiany, kilka słów po ostatniej,
 * reszta jako „…”; całość najwyżej `maks` znaków. Zwraca fragmenty i informację, czy coś obcięto na początku / końcu.
 */
export function wycinek(fr: Fragment[], przed = 4, po = 3, maks = 90): { fragmenty: Fragment[]; pocz: boolean; kon: boolean } {
    const zm = fr.map((f, i) => (f.t === '=' ? -1 : i)).filter((i) => i >= 0)
    if (!zm.length) return { fragmenty: [], pocz: false, kon: false }
    const a = zm[0], b = zm[zm.length - 1]
    const slowa = (s: string) => s.split(/(\s+)/).filter((x) => x !== '')
    const out: Fragment[] = []
    let pocz = false, kon = false
    if (a > 0) {
        const w = slowa(fr[a - 1].s), ile = przed * 2
        pocz = w.length > ile
        out.push({ t: '=', s: w.slice(-ile).join('').replace(/^\s+/, '') })
    }
    for (let i = a; i <= b; i++) {
        const f = fr[i]
        if (f.t !== '=') { out.push({ ...f }); continue }
        const w = slowa(f.s)
        out.push({ t: '=', s: w.length > po * 4 ? `${w.slice(0, po * 2).join('')} … ${w.slice(-po * 2).join('')}` : f.s })
    }
    if (b < fr.length - 1) {
        const w = slowa(fr[b + 1].s), ile = po * 2
        kon = w.length > ile
        out.push({ t: '=', s: w.slice(0, ile).join('').replace(/\s+$/, '') })
    }
    // limit długości – obcinamy od końca (zmiana zostaje widoczna)
    let n = 0
    const wyn: Fragment[] = []
    for (const f of out) {
        if (n + f.s.length <= maks) { wyn.push(f); n += f.s.length; continue }
        const reszta = Math.max(0, maks - n)
        if (reszta > 0) wyn.push({ ...f, s: f.s.slice(0, reszta).replace(/\s+\S*$/, '') })
        kon = true
        break
    }
    const ost = wyn[wyn.length - 1]
    if (ost) wyn[wyn.length - 1] = { ...ost, s: ost.s.replace(/\s+$/, '') }
    return { fragmenty: wyn.filter((f) => f.s !== ''), pocz, kon }
}
