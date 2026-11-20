// Panel administracyjny (/keystatic/panel): podsumowanie, wyszukiwarka, zgłoszenia, kosz, stan serwera.
// Tylko odczyt plików strony i drobne zapisy w content/ (stan zgłoszeń, przywracanie z kosza).
// P7c (KON-08): funkcje odczytu przyjmują `widzi` (konto widzi „tylko ja” – lib/konta/straz.ts widziTylkoJa); bez tego
// pozycje „tylko ja” (treści, plany, elementy planów, osoby, kosz) nie trafiają do wyniku ani do liczników (zasada 1.6).
import { wczytajZnacznik } from './kopia'
import { brakujaceKatalogi } from './katalogi'
import { LISTY } from './listy-konfig'
import { wczytajKolekcje } from './listy'
import { wczytajPrace, type Praca, type PozycjaPracy } from './praca'
import { doKosza, listaKoszaTresci, pozycjaKoszaTylkoJa, przywrocZKoszaTresci, usunZKoszaTresci } from './historia'
import { kontrolaCzytnikiem } from './historia-adresy'
import { stronaZAdresuKeystatic } from './menu'
import type { RodzajKat } from '../katalog/model'
import { numerKat, poZapisieTresci } from '../katalog/dane'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { randomBytes } from 'node:crypto'
import { hasla, ksiegi, materialy, miejsca, obiekty, opowiesci, parafie, tematy } from '../archiwum'
import { listaKoszaPlikow, listaPlanow, listaZgloszen, przywrocPlikZKosza, usunPlikZKosza, wczytajUstawienia, wyczyscKoszPlikow, type Zgloszenie } from '../plany/dane'
import { katalog, typGrobu } from '../plany/typy'
import { etapElementu } from '../plany/statusy'
import { stanOsob, sladImportu } from '../osoby/dane'
import { lataZycia, nazwaOsoby } from '../osoby/model'
import { ostrzezeniaWgOsob } from '../osoby/serwer'
import { listaZgloszenStrony, RODZAJE_ZGLOSZEN, type ZgloszenieStrony } from '../zgloszenia'
import { etykietaBraku } from '../wspoltworz-reguly'
import { logowanieWlaczone } from '../sesja'
import { opisTechniczny } from './zmiany'
import { ukryteDla, ukrytaSciezka, ukrytyAdresPanelu, ukrytyKlucz, widocznoscPliku, type UkrytePozycje } from '../konta/tylko-ja'

const CONTENT = () => path.join(process.cwd(), 'content')
const ID_ZGL = /^\d+-[0-9a-f]+$/

async function zapiszAtomowo(plik: string, dane: string) {
    await fs.promises.mkdir(path.dirname(plik), { recursive: true })
    const tmp = `${plik}.${randomBytes(4).toString('hex')}.tmp`
    await fs.promises.writeFile(tmp, dane)
    await fs.promises.rename(tmp, plik)
}

// ---------- adresy w panelu ----------
export const KS = {
    wpis: (id: string) => `/keystatic/collection/posts/item/${id}`,
    kolekcja: (k: string, id?: string) => (id ? `/keystatic/collection/${k}/item/${id}` : `/keystatic/collection/${k}`),
    plan: (slug: string, el?: string) => `/keystatic/plany/${slug}${el ? `?el=${encodeURIComponent(el)}` : ''}`,
    osoba: (id: string) => `/keystatic/osoby/${id}`,
}

/** Adres strony publicznej → miejsce poprawki w panelu. */
export function doPoprawy(adres: string): string | null {
    const m = adres.match(/^\/(osoby|plany|miejsca|tematy|wpisy|obiekty|archiwum)\/([\w-]+)/)
    if (!m) return null
    const [, r, id] = m
    if (r === 'osoby') return KS.osoba(id)
    if (r === 'plany') return KS.plan(id)
    if (r === 'wpisy') return KS.wpis(id)
    return KS.kolekcja(r === 'archiwum' ? 'materialy' : r, id)
}

// ---------- zgłoszenia ----------
export type StanZgloszenia = 'nowe' | 'odlozone' | 'zalatwione' | 'odrzucone'
export const STANY_ZGLOSZEN: StanZgloszenia[] = ['nowe', 'odlozone', 'zalatwione', 'odrzucone']
type Dopiski = { stan?: StanZgloszenia; notatka?: string; zmieniono?: string }

export interface ZgloszeniePanelu {
    id: string
    zrodlo: 'strona' | 'plan'
    rodzaj: string
    tytul: string
    adres: string | null
    doPoprawy: string | null
    tresc: string
    kontakt: string
    data: string
    stan: StanZgloszenia
    notatka: string
    /** WSP-03: rodzaj braku (etykieta) i zgoda na podpis w „opracował(a)” */
    brak?: string
    podpis?: boolean
}

const czeka = (s: StanZgloszenia) => s === 'nowe' || s === 'odlozone'

export async function zgloszeniaPanelu(widzi = true): Promise<ZgloszeniePanelu[]> {
    const [s0, p0, plany, u] = await Promise.all([listaZgloszenStrony(), listaZgloszen(), listaPlanow(), ukryteDla(widzi)])
    const ukryteEl = new Set(widzi ? [] : plany.flatMap((x) => x.elementy.filter((e) => e.widocznosc === 'ja').map((e) => `${x.slug}/${e.id}`)))
    const s = (s0 as ZgloszenieStrony[]).filter((z) => !z.adres || !ukrytyAdresPanelu(doPoprawy(z.adres), u))
    const p = (p0 as Zgloszenie[]).filter((z) => !ukrytyKlucz('plany', z.plan, u) && !ukryteEl.has(`${z.plan}/${z.element}`))
    const tytulPlanu = new Map(plany.map((x) => [x.slug, x]))
    const zS = (s as (ZgloszenieStrony & Dopiski)[]).map((z): ZgloszeniePanelu => ({
        id: z.id, zrodlo: 'strona', rodzaj: RODZAJE_ZGLOSZEN[z.rodzaj] ?? z.rodzaj, tytul: z.tytul || z.adres, adres: z.adres || null,
        doPoprawy: z.adres ? doPoprawy(z.adres) : null, tresc: z.tresc, kontakt: z.kontakt, data: z.data, stan: z.stan ?? 'nowe', notatka: z.notatka ?? '',
        ...(z.brak ? { brak: etykietaBraku(z.brak) } : {}), ...(z.podpis ? { podpis: true } : {}),
    }))
    const zP = (p as (Zgloszenie & Dopiski)[]).map((z): ZgloszeniePanelu => {
        const pl = tytulPlanu.get(z.plan)
        return {
            id: z.id, zrodlo: 'plan', rodzaj: z.rodzaj === 'informacja' ? 'grób: informacja od czytelnika' : 'grób: prośba o usunięcie albo poprawka', tytul: `${pl?.tytul ?? z.plan}${z.opisElementu ? ` · ${z.opisElementu}` : ''}`,
            adres: pl && pl.widocznosc !== 'ja' ? `/plany/${z.plan}?grob=${encodeURIComponent(z.element)}` : null,
            doPoprawy: KS.plan(z.plan, z.element), tresc: z.tresc, kontakt: z.kontakt, data: z.data, stan: z.stan ?? 'nowe', notatka: z.notatka ?? '',
        }
    })
    return [...zS, ...zP].sort((a, b) => b.data.localeCompare(a.data))
}

/** P7c (KON-08): czy zgłoszenie jest dla tego konta (zgłoszenia o pozycjach „tylko ja” – tylko dla roli administratora). */
export async function zgloszenieWidoczne(zrodlo: string, id: string, widzi: boolean): Promise<boolean> {
    return widzi || (await zgloszeniaPanelu(false)).some((z) => z.zrodlo === zrodlo && z.id === id)
}

const plikZgloszenia = (zrodlo: string, id: string) => {
    if (!ID_ZGL.test(id)) return null
    if (zrodlo === 'strona') return path.join(CONTENT(), 'zgloszenia', `${id}.json`)
    if (zrodlo === 'plan') return path.join(CONTENT(), 'plany', '_zgloszenia', `${id}.json`)
    return null
}

export async function zmienZgloszenie(zrodlo: string, id: string, zm: { stan?: string; notatka?: string }): Promise<boolean> {
    const plik = plikZgloszenia(zrodlo, id)
    if (!plik) return false
    let z: Record<string, unknown>
    try { z = JSON.parse(await fs.promises.readFile(plik, 'utf8')) } catch { return false }
    if (zm.stan !== undefined) {
        if (!STANY_ZGLOSZEN.includes(zm.stan as StanZgloszenia)) return false
        z.stan = zm.stan
    }
    if (zm.notatka !== undefined) z.notatka = String(zm.notatka).slice(0, 5000)
    z.zmieniono = new Date().toISOString()
    await zapiszAtomowo(plik, JSON.stringify(z, null, 1))
    return true
}

/** P6a (zasada 2.5): usunięte zgłoszenie trafia do kosza treści (content/_kosz), nie znika od razu. Błąd → komunikat, plik zostaje. */
export async function usunZgloszeniePanelu(zrodlo: string, id: string): Promise<string | null> {
    const plik = plikZgloszenia(zrodlo, id)
    if (!plik) return 'złe zgłoszenie'
    try { await doKosza(process.cwd(), [path.relative(process.cwd(), plik).split(path.sep).join('/')], `zgłoszenie ${zrodlo === 'plan' ? 'do planu' : 'ze strony'} z ${id.split('-')[0] ? new Date(+id.split('-')[0]).toLocaleDateString('pl-PL') : id}`, true) }
    catch (e) { return e instanceof Error ? e.message : String(e) }
    return null
}

// ---------- plany: postęp ----------
export interface PostepPlanu {
    slug: string; tytul: string; widocznosc: string; zmieniono: string; geo: number
    grobow: number; sprawdzone: number; zNapisem: number; zeZdjeciem: number
}

export async function postepPlanow(widzi = true): Promise<PostepPlanu[]> {
    const [plany, ust] = await Promise.all([listaPlanow(), wczytajUstawienia()])
    const typy = katalog(ust)
    return plany.filter((p) => widzi || p.widocznosc !== 'ja').map((p) => {
        const g = p.elementy.filter((e) => typGrobu(typy.get(e.typ)) && (widzi || e.widocznosc !== 'ja'))
        return {
            slug: p.slug, tytul: p.tytul, widocznosc: p.widocznosc, zmieniono: p.zmieniono, geo: p.geo.length, grobow: g.length,
            sprawdzone: g.filter((e) => etapElementu(e) === 'sprawdzony').length,
            zNapisem: g.filter((e) => e.napis?.trim() || e.opis?.trim() || e.osoby?.some((o) => o.nazwa.trim()) || e.nazwa?.trim()).length,
            zeZdjeciem: g.filter((e) => e.zdjecia?.length).length,
        }
    }).sort((a, b) => b.zmieniono.localeCompare(a.zmieniono))
}

// ---------- treści ----------
type Poz = { id: string; nazwa: string; widocznosc: string }
async function tresci(widzi = true) {
    const poz = widzi ? 'ja' : 'bliscy'
    const [w, m, t, o, mat, h, k, p] = await Promise.all([opowiesci(poz), miejsca(poz), tematy(poz), obiekty(poz), materialy(poz), hasla(poz), ksiegi(poz), parafie()])
    const z = (L: { id: string; nazwa?: string; tytul?: string; haslo?: string; widocznosc?: string }[]): Poz[] => L.map((x) => ({ id: x.id, nazwa: x.nazwa ?? x.tytul ?? x.haslo ?? x.id, widocznosc: x.widocznosc ?? 'publiczne' }))
    return {
        posts: { nazwa: 'wpisy', L: z(w) }, miejsca: { nazwa: 'miejsca', L: z(m) }, tematy: { nazwa: 'tematy', L: z(t) }, obiekty: { nazwa: 'obiekty', L: z(o) },
        materialy: { nazwa: 'materiały', L: z(mat) }, ksiegi: { nazwa: 'księgi', L: z(k) }, parafie: { nazwa: 'parafie', L: z(p) }, hasla: { nazwa: 'hasła słownika', L: z(h) },
    }
}

// ---------- ostatnie zmiany (czas zmiany plików w content/) ----------
interface Zmiana { opis: string; href: string | null; czas: string }

async function plikiTresci(kat: string, glebokosc = 3, wyn: { p: string; czas: number }[] = []) {
    let wpisy: fs.Dirent[] = []
    try { wpisy = await fs.promises.readdir(kat, { withFileTypes: true }) } catch { return wyn }
    for (const w of wpisy) {
        if (w.name.startsWith('.') || w.name === '_kosz' || w.name === '_operacje' || w.name === '_historia' || w.name.endsWith('.tmp')) continue
        const p = path.join(kat, w.name)
        if (w.isDirectory()) { if (glebokosc > 0) await plikiTresci(p, glebokosc - 1, wyn) }
        else { try { wyn.push({ p, czas: (await fs.promises.stat(p)).mtimeMs }) } catch { /* zniknął */ } }
    }
    return wyn
}

// ---------- stan serwera ----------
export interface StanSerwera {
    dziala: number; node: string; commit: string | null; zbudowano: string | null
    dysk: { wolne: number; calosc: number } | null; pamiec: { wolna: number; calosc: number }
    archiwum: { bajty: number; pliki: number; ucieto: boolean }
    restart: boolean; kopia: string | null; kopiaSerwer: string | null; logowanieBliskich: boolean
}

export async function commit(): Promise<string | null> {
    try {
        const git = path.join(process.cwd(), '.git')
        const head = (await fs.promises.readFile(path.join(git, 'HEAD'), 'utf8')).trim()
        if (!head.startsWith('ref: ')) return head.slice(0, 7)
        const ref = head.slice(5)
        try { return (await fs.promises.readFile(path.join(/*turbopackIgnore: true*/ git, ref), 'utf8')).trim().slice(0, 7) } catch { /* spakowane */ }
        const packed = await fs.promises.readFile(path.join(git, 'packed-refs'), 'utf8')
        const l = packed.split('\n').find((x) => x.endsWith(` ${ref}`))
        return l ? l.slice(0, 7) : null
    } catch { return null }
}

async function rozmiar(kat: string, limit = 50000) {
    let bajty = 0, pliki = 0, ucieto = false
    const stos = [kat]
    while (stos.length) {
        const k = stos.pop()!
        let wpisy: fs.Dirent[] = []
        try { wpisy = await fs.promises.readdir(k, { withFileTypes: true }) } catch { continue }
        for (const w of wpisy) {
            const p = path.join(k, w.name)
            if (w.isDirectory()) stos.push(p)
            else if (w.isFile()) { try { bajty += (await fs.promises.stat(p)).size; pliki++ } catch { /* nic */ } }
            if (pliki >= limit) { ucieto = true; return { bajty, pliki, ucieto } }
        }
    }
    return { bajty, pliki, ucieto }
}

const istnieje = (p: string) => fs.promises.access(p).then(() => true, () => false)

/** Znacznik węzła domowego (gdy powstanie). Kopie z panelu: content/_panel/kopia.json (lib/panel/kopia.ts). */
const PLIK_KOPII = () => process.env.PLIK_KOPII || '/var/lib/blog-kopia/ostatnia'

export async function stanSerwera(): Promise<StanSerwera> {
    let dysk: StanSerwera['dysk'] = null
    try { const s = await fs.promises.statfs(process.cwd()); dysk = { wolne: s.bavail * s.bsize, calosc: s.blocks * s.bsize } } catch { /* brak statfs */ }
    let zbudowano: string | null = null
    try { zbudowano = (await fs.promises.stat(path.join(process.cwd(), '.next', 'BUILD_ID'))).mtime.toISOString() } catch { /* dev */ }
    let kopia: string | null = null
    try { kopia = (await fs.promises.readFile(/*turbopackIgnore: true*/ PLIK_KOPII(), 'utf8')).trim().slice(0, 40) || null } catch { /* brak kopii */ }
    // kopia poza serwerem = węzeł domowy albo pobranie z panelu na komputer – liczy się nowsza
    const zn = await wczytajZnacznik()
    if (zn.komputer?.czas && (!kopia || Date.parse(zn.komputer.czas) > Date.parse(kopia))) kopia = zn.komputer.czas
    return {
        dziala: Math.round(process.uptime()), node: process.version, commit: await commit(), zbudowano, dysk,
        pamiec: { wolna: os.freemem(), calosc: os.totalmem() },
        archiwum: await rozmiar(path.join(process.cwd(), 'pliki-archiwum')),
        restart: (await istnieje('/run/reboot-required')) || (await istnieje('/var/run/reboot-required')),
        kopia, kopiaSerwer: zn.serwer?.czas ?? null, logowanieBliskich: logowanieWlaczone(),
    }
}

// ---------- podsumowanie na pulpit ----------
export async function podsumowanie(widzi = true) {
    const [zg, plany, tr, s, imp, serwer, u] = await Promise.all([zgloszeniaPanelu(widzi), postepPlanow(widzi), tresci(widzi), stanOsob(), sladImportu(), stanSerwera(), ukryteDla(widzi)])
    const osobaWidoczna = (id: string) => widzi || s.widocznosc(id) !== 'ja'
    const osobyUwagi = ostrzezeniaWgOsob(s)

    const nazwy = new Map<string, Zmiana['opis']>()
    const hrefy = new Map<string, string>()
    const ETYK: Record<string, string> = { posts: 'wpis', miejsca: 'miejsce', tematy: 'temat', obiekty: 'obiekt', materialy: 'materiał', ksiegi: 'księga', parafie: 'parafia', hasla: 'hasło' }
    for (const [k, v] of Object.entries(tr)) for (const x of v.L) { nazwy.set(`${k}/${x.id}`, `${ETYK[k]} „${x.nazwa}”`); hrefy.set(`${k}/${x.id}`, k === 'posts' ? KS.wpis(x.id) : KS.kolekcja(k, x.id)) }
    const planyM = new Map(plany.map((p) => [p.slug, p.tytul]))
    const pliki = (await plikiTresci(CONTENT())).sort((a, b) => b.czas - a.czas)
    const zmiany: Zmiana[] = []
    const byly = new Set<string>()
    for (const f of pliki) {
        if (zmiany.length >= 10) break
        const rel = path.relative(CONTENT(), f.p).split(path.sep)
        if (ukrytaSciezka(rel.join('/'), u)) continue
        let opis = rel.join('/'), href: string | null = null, klucz = opis
        const stem = (x: string) => x.replace(/\.(mdoc|md|json|yaml)$/, '')
        const tech = opisTechniczny(rel)
        if (tech?.pomin) continue
        if (tech) { opis = tech.opis; href = tech.href; klucz = tech.klucz }
        else if (rel[0] === 'plany' && rel.length === 2 && rel[1].endsWith('.json') && !rel[1].startsWith('_')) { const sl = stem(rel[1]); opis = `plan „${planyM.get(sl) ?? sl}”`; href = KS.plan(sl) }
        else if (rel[0] === 'plany' && rel[1] === '_zgloszenia') { opis = 'zgłoszenie do planu'; href = '/keystatic/panel/zgloszenia'; klucz = 'zgl-plan' }
        else if (rel[0] === 'zgloszenia') { opis = 'zgłoszenie ze strony'; href = '/keystatic/panel/zgloszenia'; klucz = 'zgl-strona' }
        else if (rel[0] === 'osoby' && rel.length === 2 && !rel[1].startsWith('_')) { const id = stem(rel[1]); const o = s.drzewo.osoby.get(id); opis = `osoba „${o ? nazwaOsoby(o) : id}”`; href = KS.osoba(id) }
        else if (rel[0] === 'osoby') { opis = 'drzewo (rodziny, źródła)'; href = '/keystatic/osoby'; klucz = 'osoby-inne' }
        else if (rel[0] === 'o-projekcie.mdoc' || rel[0] === 'o-projekcie.szkic.mdoc') { opis = 'strona „o projekcie”'; href = '/keystatic/singleton/oProjekcie' }
        else if (rel.length >= 2) { const k = `${rel[0]}/${stem(rel[1])}`; if (nazwy.has(k)) { opis = nazwy.get(k)!; href = hrefy.get(k)!; klucz = k } }
        if (byly.has(klucz)) continue
        byly.add(klucz)
        zmiany.push({ opis, href, czas: new Date(f.czas).toISOString() })
    }

    const szkice = Object.entries(tr).map(([k, v]) => ({ k, nazwa: v.nazwa, n: v.L.filter((x) => x.widocznosc === 'ja').length })).filter((x) => x.n)
    // P6a (ADM-11): szkice ze wszystkich kolekcji z widocznością (dawniej 8 – bez zbiorów i publikacji; biogramy i zespoły nie mają widoczności)
    for (const k of Object.keys(LISTY).filter((x) => widzi && LISTY[x].widocznosc && !(x in tr))) {
        const n = (await wczytajKolekcje(k).catch(() => ({ wpisy: [] }))).wpisy.filter((w) => w.dane.visibility === 'ja').length
        if (n) szkice.push({ k, nazwa: LISTY[k].nazwa, n })
    }
    const planySzkice = plany.filter((p) => p.widocznosc === 'ja').length
    const oProjekcieSzkic = widzi && await istnieje(path.join(CONTENT(), 'o-projekcie.szkic.mdoc'))
    const osobyW = [...s.drzewo.osoby.keys()].filter(osobaWidoczna)

    const uwagi: { tekst: string; ostrz: boolean; href: string }[] = []
    const dniOdKopii = serwer.kopia ? (Date.now() - Date.parse(serwer.kopia)) / 864e5 : Infinity
    if (!serwer.kopia) uwagi.push({ tekst: 'brak kopii zapasowej poza serwerem', ostrz: true, href: '/keystatic/panel/system' })
    else if (dniOdKopii > 3) uwagi.push({ tekst: `ostatnia kopia zapasowa ${Math.floor(dniOdKopii)} dni temu`, ostrz: true, href: '/keystatic/panel/system' })
    const brak = await brakujaceKatalogi()
    if (brak.length) uwagi.push({ tekst: `brak katalogu ${brak.map((k) => `content/${k}`).join(', ')} z prawem zapisu – operacje, historia i kosz nie działają (komenda: kopie → ostatnie operacje)`, ostrz: true, href: '/keystatic/panel/operacje' })
    if (serwer.restart) uwagi.push({ tekst: 'serwer czeka na restart (aktualizacje systemu)', ostrz: true, href: '/keystatic/panel/system' })
    if (serwer.dysk && serwer.dysk.wolne / serwer.dysk.calosc < 0.15) uwagi.push({ tekst: 'mało miejsca na dysku', ostrz: true, href: '/keystatic/panel/system' })
    for (const p of plany) if (p.geo < 2) uwagi.push({ tekst: `plan „${p.tytul}” bez punktów geo – nie ma go na mapie ani trybu „w terenie”`, ostrz: false, href: KS.plan(p.slug) })

    return {
        zgloszenia: { czeka: zg.filter((z) => czeka(z.stan)).length, nowe: zg.filter((z) => z.stan === 'nowe').length },
        plany,
        osoby: { liczba: osobyW.length, doSprawdzenia: [...osobyUwagi.keys()].filter(osobaWidoczna).length, zyjace: osobyW.filter((id) => s.zyje(id)).length, import: imp ? { data: imp.data } : null },
        tresci: Object.fromEntries(Object.entries(tr).map(([k, v]) => [k, { nazwa: v.nazwa, n: v.L.length, szkice: v.L.filter((x) => x.widocznosc === 'ja').length }])),
        szkice: { pierwsza: szkice[0]?.k, razem: szkice.reduce((a, x) => a + x.n, 0) + planySzkice + (oProjekcieSzkic ? 1 : 0), lista: [...szkice.map((x) => `${x.nazwa} ${x.n}`), ...(planySzkice ? [`plany ${planySzkice}`] : []), ...(oProjekcieSzkic ? ['„o projekcie”'] : [])] },
        oProjekcieSzkic,
        zmiany,
        uwagi,
        praca: await pracaZOpisem(u),
        serwer: { commit: serwer.commit, zbudowano: serwer.zbudowano },
    }
}

// ---------- „wróć do pracy” wg planszy: rodzaj przypiętych i liczba pozycji zapisanego widoku ----------
const RODZAJ_ADRESU: [RegExp, string][] = [[/^\/keystatic\/osoby\//, 'osoba'], [/^\/keystatic\/plany\//, 'plan'], [/^\/keystatic\/singleton\//, 'ustawienie']]
/** Liczba pozycji listy panelu dla adresu widoku (?q=…&f.<pole>=…) – te same reguły co filtr listy (lista/[kolekcja]/page.tsx). */
export async function liczbaWidoku(href: string, u?: UkrytePozycje): Promise<number | null> {
    const m = /^\/keystatic\/panel\/lista\/([\w-]+)(?:\?(.*))?$/.exec(href)
    if (!m || !LISTY[m[1]]) return null
    const q = new URLSearchParams(m[2] ?? '')
    const { wpisy, nieczytelne } = await wczytajKolekcje(m[1]).catch(() => ({ wpisy: [] as { slug: string; dane: Record<string, unknown> }[], nieczytelne: [] as unknown[] }))
    const norm = (x: string) => x.toLocaleLowerCase('pl').normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/ł/g, 'l')
    const lista = (v: unknown): string[] => (Array.isArray(v) ? v.map((x) => (typeof x === 'string' ? x : typeof x === 'object' && x && 'name' in x ? String((x as { name: unknown }).name) : '')) : v == null || v === '' ? [] : [typeof v === 'object' && 'name' in (v as object) ? String((v as { name: unknown }).name) : String(v)])
    if (q.get('f.title') === '__nieczytelne') return nieczytelne.length
    const t = norm(q.get('q') ?? '')
    return wpisy.filter((w) => {
        if (u && ukrytyKlucz(m[1], w.slug, u)) return false
        if (t && !norm(`${w.slug} ${Object.values(w.dane).map((v) => lista(v).join(' ')).join(' ')}`).includes(t)) return false
        for (const [k, v] of q) {
            if (!k.startsWith('f.') || !v) continue
            const wart = lista(w.dane[k.slice(2)])
            if (v === '__brak' ? wart.length > 0 : !wart.includes(v)) return false
        }
        return true
    }).length
}
async function pracaZOpisem(u?: UkrytePozycje) {
    const p0 = await wczytajPrace()
    const p = u ? ukryjWPracy(p0, u) : p0
    const rodzaj = (h: string) => RODZAJ_ADRESU.find(([r]) => r.test(h))?.[1] ?? ETYKIETY[/\/collection\/([\w-]+)\//.exec(h)?.[1] ?? ''] ?? ''
    return {
        ...p,
        przypiete: p.przypiete.map((x) => ({ ...x, rodzaj: x.rodzaj ?? rodzaj(x.href) })),
        widoki: await Promise.all(p.widoki.map(async (x) => ({ ...x, liczba: await liczbaWidoku(x.href, u) }))),
    }
}
/** P7c (KON-08): „wróć do pracy” bez pozycji „tylko ja” (przypięte, ostatnie) – wspólne z trasą panel/praca. */
export function ukryjWPracy(p: Praca, u: UkrytePozycje): Praca {
    if (!u.klucze.size) return p
    const f = (L: PozycjaPracy[]) => L.filter((x) => !ukrytyAdresPanelu(x.href, u))
    return { ...p, ostatnie: f(p.ostatnie), przypiete: f(p.przypiete), widoki: f(p.widoki) }
}

// ---------- wyszukiwarka panelu / paleta Ctrl+K (P6a, PNL-07) ----------
export type GrupaIndeksu = 'osoby' | 'tresci' | 'plany' | 'zgloszenia'
/** t – tytuł, typ – rodzaj, href – edycja w panelu, strona – strona publiczna (gdy pozycja nie jest „tylko ja”), nr – numer katalogowy. */
export interface PozycjaIndeksu { t: string; typ: string; href: string; d?: string; grupa?: GrupaIndeksu; strona?: string; nr?: string }

const RODZAJ_KAT: Record<string, RodzajKat> = { posts: 'wpis', miejsca: 'miejsce', obiekty: 'obiekt', tematy: 'temat', materialy: 'material', parafie: 'instytucja', zbiory: 'zbior', publikacje: 'publikacja' }
const ETYKIETY: Record<string, string> = { posts: 'wpis', miejsca: 'miejsce', tematy: 'temat', obiekty: 'obiekt', materialy: 'materiał', ksiegi: 'księga', parafie: 'instytucja', hasla: 'hasło', zbiory: 'zbiór', publikacje: 'publikacja', biogramy: 'biogram', zespoly: 'zespół' }

export async function indeksPanelu(widzi = true): Promise<PozycjaIndeksu[]> {
    const [tr, plany0, s, zg] = await Promise.all([tresci(widzi), listaPlanow(), stanOsob(), zgloszeniaPanelu(widzi)])
    const plany = plany0.filter((p) => widzi || p.widocznosc !== 'ja')
    const wyn: PozycjaIndeksu[] = []
    const dodajTresc = (k: string, x: Poz) => {
        const href = k === 'posts' ? KS.wpis(x.id) : KS.kolekcja(k, x.id)
        const strona = x.widocznosc !== 'ja' ? stronaZAdresuKeystatic(href) ?? undefined : undefined
        const nr = RODZAJ_KAT[k] ? numerKat(RODZAJ_KAT[k], x.id) ?? undefined : undefined
        wyn.push({ t: x.nazwa, typ: ETYKIETY[k] ?? k, href, grupa: 'tresci', d: x.widocznosc === 'ja' ? 'szkic' : undefined, ...(strona ? { strona } : {}), ...(nr ? { nr } : {}) })
    }
    for (const [k, v] of Object.entries(tr)) for (const x of v.L) dodajTresc(k, x)
    // kolekcje spoza tresci(): zbiory, publikacje, biogramy, zespoły (odczyt plików jak lista panelu)
    for (const k of ['zbiory', 'publikacje', 'biogramy', 'zespoly']) {
        for (const w of (await wczytajKolekcje(k).catch(() => ({ wpisy: [] as { slug: string; dane: Record<string, unknown> }[] }))).wpisy)
            if (widzi || w.dane.visibility !== 'ja') dodajTresc(k, { id: w.slug, nazwa: tytulWpisu(w.dane.title) || w.slug, widocznosc: String(w.dane.visibility ?? 'publiczne') })
    }
    for (const p of plany) {
        const nr = numerKat('plan', p.slug) ?? undefined
        wyn.push({ t: p.tytul, typ: 'plan', href: KS.plan(p.slug), grupa: 'plany', d: p.widocznosc === 'ja' ? 'szkic' : undefined, ...(p.widocznosc !== 'ja' ? { strona: `/plany/${p.slug}` } : {}), ...(nr ? { nr } : {}) })
    }
    for (const o of s.drzewo.osoby.values()) {
        if (!widzi && s.widocznosc(o.id) === 'ja') continue
        const nr = numerKat('osoba', o.id) ?? undefined
        const lata = lataZycia(o)
        wyn.push({ t: nazwaOsoby(o), typ: 'osoba', href: KS.osoba(o.id), grupa: 'osoby', d: lata ? `ok. ${lata}` : s.lata.get(o.id) ? `ok. ${s.lata.get(o.id)}` : undefined, ...(s.widocznosc(o.id) !== 'ja' ? { strona: `/osoby/${o.id}` } : {}), ...(nr ? { nr } : {}) })
    }
    // zgłoszenia czekające (nowe, odłożone) – prowadzą do miejsca poprawki albo listy zgłoszeń
    // plansza: „„drugi od lewej to chyba mój pradziadek…”” · rozpoznanie · List o arendzie · nowe (rodzaj · tytuł · stan)
    for (const z of zg.filter((x) => czeka(x.stan))) {
        const tresc = z.tresc.replace(/\s+/g, ' ').trim()
        wyn.push({ t: tresc ? `„${tresc.slice(0, 60)}${tresc.length > 60 ? '…' : ''}”` : z.tytul, typ: z.rodzaj, href: z.doPoprawy ?? '/keystatic/panel/zgloszenia', grupa: 'zgloszenia',
            d: `${z.tytul} · ${z.stan === 'odlozone' ? 'odłożone' : 'nowe'}`, ...(z.adres ? { strona: z.adres } : {}) })
    }
    return wyn
}
/** Tytuł z pola Keystatic: tekst albo { name, slug } (pole nazwy z identyfikatorem). */
const tytulWpisu = (t: unknown): string => (typeof t === 'string' ? t : t && typeof t === 'object' && typeof (t as { name?: unknown }).name === 'string' ? (t as { name: string }).name : '')

// ---------- kosz ----------
export interface PozycjaKosza { rodzaj: 'plan' | 'osoba' | 'rodzina' | 'import' | 'plik' | 'tresc'; plik: string; nazwa: string; czas: string; wygasa?: string | null }

const KOSZE = { plan: () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'plany', '_kosz'), osoby: () => path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', 'osoby', '_kosz') }
const PLIK_KOSZA = /^[\w.-]+-\d{12,}\.json$/

export async function kosz(widzi = true): Promise<PozycjaKosza[]> {
    const wyn: PozycjaKosza[] = []
    const u = await ukryteDla(widzi)
    const ukrytyJson = async (plik: string) => !widzi && widocznoscPliku(plik, await fs.promises.readFile(plik, 'utf8').catch(() => '')) === 'ja'
    const czytaj = async (kat: string) => { try { return await fs.promises.readdir(kat, { withFileTypes: true }) } catch { return [] } }
    for (const w of await czytaj(KOSZE.plan())) {
        if (!w.isFile() || !PLIK_KOSZA.test(w.name)) continue
        if (await ukrytyJson(path.join(/*turbopackIgnore: true*/ KOSZE.plan(), w.name))) continue
        let nazwa = w.name.replace(/-\d+\.json$/, '')
        try { nazwa = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KOSZE.plan(), w.name), 'utf8')).tytul || nazwa } catch { /* nic */ }
        wyn.push({ rodzaj: 'plan', plik: w.name, nazwa, czas: new Date(+w.name.match(/-(\d+)\.json$/)![1]).toISOString() })
    }
    for (const w of await czytaj(KOSZE.osoby())) {
        if (w.isDirectory() && w.name.startsWith('przed-importem-')) { wyn.push({ rodzaj: 'import', plik: w.name, nazwa: 'drzewo sprzed ponownego importu', czas: new Date(+w.name.slice(15)).toISOString() }); continue }
        if (!w.isFile() || !PLIK_KOSZA.test(w.name)) continue
        const czas = new Date(+w.name.match(/-(\d+)\.json$/)![1]).toISOString()
        if (!w.name.startsWith('rodzina-') && await ukrytyJson(path.join(/*turbopackIgnore: true*/ KOSZE.osoby(), w.name))) continue
        if (w.name.startsWith('rodzina-')) { wyn.push({ rodzaj: 'rodzina', plik: w.name, nazwa: w.name.replace(/^rodzina-|-\d+\.json$/g, ''), czas }); continue }
        let nazwa = w.name.replace(/-\d+\.json$/, '')
        try { const o = JSON.parse(await fs.promises.readFile(/*turbopackIgnore: true*/ path.join(/*turbopackIgnore: true*/ KOSZE.osoby(), w.name), 'utf8')); nazwa = nazwaOsoby(o) || nazwa } catch { /* nic */ }
        wyn.push({ rodzaj: 'osoba', plik: w.name, nazwa, czas })
    }
    // podkłady i zdjęcia planów (30 dni, potem znikają same)
    await wyczyscKoszPlikow()
    for (const k of await listaKoszaPlikow()) if (!ukrytyKlucz('plany', k.slug, u)) wyn.push({ rodzaj: 'plik', plik: k.nazwa, nazwa: `${k.slug}: ${k.plik}`, czas: k.czas })
    // P6a (PNL-10): treści usunięte w Keystatic i usunięte zgłoszenia (content/_kosz)
    for (const k of await listaKoszaTresci()) if (widzi || !(await pozycjaKoszaTylkoJa(k, u))) wyn.push({ rodzaj: 'tresc', plik: k.id, nazwa: k.opis + (k.pliki.length > 1 ? ` (${k.pliki.length} pliki)` : ''), czas: k.czas, wygasa: k.wygasa })
    return wyn.sort((a, b) => b.czas.localeCompare(a.czas))
}

/** Przywraca plik z kosza na dawne miejsce (tylko gdy tam nic nie ma). */
/** P7c (KON-08): czy pozycja kosza jest dla tego konta (konto bez roli administratora nie rusza pozycji „tylko ja”). */
export async function pozycjaKoszaWidoczna(rodzaj: string, plik: string, widzi: boolean): Promise<boolean> {
    return widzi || (await kosz(false)).some((k) => k.rodzaj === rodzaj && k.plik === plik)
}

export async function przywrocZKosza(rodzaj: string, plik: string): Promise<string | null> {
    if (rodzaj === 'plik') return przywrocPlikZKosza(plik)
    if (rodzaj === 'tresc') {
        try {
            const m = (await listaKoszaTresci()).find((k) => k.id === plik)
            const b = await przywrocZKoszaTresci(plik, { sprawdz: kontrolaCzytnikiem(process.cwd(), (m?.pliki ?? []).filter((p) => p.sciezka.startsWith('content/')).map((p) => p.sciezka.slice(8))) })
            if (!b) await poZapisieTresci()
            return b
        } catch (e) { return e instanceof Error ? e.message : String(e) }
    }
    if (!PLIK_KOSZA.test(plik)) return 'zła nazwa pliku'
    const id = plik.replace(/-\d+\.json$/, '')
    let zr: string, cel: string
    if (rodzaj === 'plan') { zr = path.join(/*turbopackIgnore: true*/ KOSZE.plan(), plik); cel = path.join(CONTENT(), 'plany', `${id}.json`) }
    else if (rodzaj === 'osoba') { zr = path.join(/*turbopackIgnore: true*/ KOSZE.osoby(), plik); cel = path.join(CONTENT(), 'osoby', `${id}.json`) }
    else if (rodzaj === 'rodzina') { zr = path.join(/*turbopackIgnore: true*/ KOSZE.osoby(), plik); cel = path.join(CONTENT(), 'osoby', '_rodziny', `${id.replace(/^rodzina-/, '')}.json`) }
    else return 'tego nie da się przywrócić z panelu'
    if (!(await istnieje(zr))) return 'nie ma już tego pliku'
    if (await istnieje(cel)) return 'pod tym adresem jest już inna pozycja – najpierw ją przenieś albo zmień nazwę'
    await fs.promises.mkdir(path.dirname(cel), { recursive: true })
    await fs.promises.rename(zr, cel)
    return null
}

export async function usunZKosza(rodzaj: string, plik: string): Promise<string | null> {
    if (rodzaj === 'plik') return usunPlikZKosza(plik)
    if (rodzaj === 'tresc') return usunZKoszaTresci(plik)
    if (!PLIK_KOSZA.test(plik)) return 'zła nazwa pliku'
    const kat = rodzaj === 'plan' ? KOSZE.plan() : rodzaj === 'osoba' || rodzaj === 'rodzina' ? KOSZE.osoby() : null
    if (!kat) return 'tego nie da się usunąć z panelu'
    await fs.promises.unlink(path.join(kat, plik)).catch(() => {})
    return null
}

// ---------- eksport dla Omeka (pliki z ostatniego budowania) ----------
const OMEKA = () => path.join(process.cwd(), 'eksport', 'omeka')
export async function plikiOmeka(): Promise<{ nazwa: string; bajty: number; czas: string }[]> {
    try {
        const L = await fs.promises.readdir(OMEKA())
        const wyn = []
        for (const n of L) if (/^[\w-]+\.csv$/.test(n)) { const st = await fs.promises.stat(path.join(OMEKA(), n)); wyn.push({ nazwa: n, bajty: st.size, czas: st.mtime.toISOString() }) }
        return wyn.sort((a, b) => a.nazwa.localeCompare(b.nazwa))
    } catch { return [] }
}
export async function plikOmeka(nazwa: string): Promise<Buffer | null> {
    if (!/^[\w-]+\.csv$/.test(nazwa)) return null
    try { return await fs.promises.readFile(path.join(OMEKA(), nazwa)) } catch { return null }
}
