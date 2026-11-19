import fs from 'node:fs/promises'
import path from 'node:path'
import { brakDostepu } from '@/lib/plany/dane'
import { wczytajKregi } from '@/lib/kregi'
import { logowanieWlaczone } from '@/lib/sesja'
import { KonfliktKont, OdmowaKont, wczytajKonta, zmienKonta } from '@/lib/konta/dane'
import { UPRAWNIENIA, definicjeRol, jestRola, jestUprawnieniem, opisZakresu, uprawnieniaZRol, type Konto, type KluczRoli, type PlikKont, type Uprawnienie } from '@/lib/konta/model'
import { BladPocketId, kodJednorazowy, urzadzenia, usunOsobe, usunUrzadzenie, zalozOsobe } from '@/lib/konta/pocket-id'
import { kodQr } from '@/lib/konta/qr'
import { konfiguracjaKont, ktoTeraz } from '@/lib/konta/straz'
import { DNI_ZAPROSZENIA, skrotKodu } from '@/lib/konta/zaproszenia'
import { listaOperacji, NAZWY_OPERACJI } from '@/lib/panel/operacje'

// P7a (KON-01): konta i dostęp – tylko administrator (lib/konta/model.ts uprawnieniaTrasy: „konta, kopie, ustawienia”).
// GET            lista kont, role, kręgi
// GET ?id=       karta konta: uprawnienia z roli i odstępstwa, urządzenia (klucze dostępu z Pocket ID), ostatnie działania
// POST {akcja}   zapros · zapisz · zablokuj · odblokuj · wyloguj · nowy-link · usun-urzadzenie · usun · role
export const dynamic = 'force-dynamic'
const BEZ_CACHE = { 'Cache-Control': 'no-store' }
const odp = (d: unknown, status = 200) => Response.json(d, { status, headers: BEZ_CACHE })
const blad = (b: string, status = 400) => odp({ blad: b }, status)

const tekst = (x: unknown, maks: number) => (typeof x === 'string' ? x.trim().slice(0, maks) : '')
const role = (x: unknown): KluczRoli[] => (Array.isArray(x) ? [...new Set(x.filter(jestRola))] : [])
const upr = (x: unknown): Uprawnienie[] => (Array.isArray(x) ? [...new Set(x.filter(jestUprawnieniem))] : [])
const napisy = (x: unknown) => (Array.isArray(x) ? [...new Set(x.filter((v): v is string => typeof v === 'string' && !!v.trim()).map((v) => v.trim().slice(0, 120)))] : [])
const EMAIL = /^[^\s@]+@[^\s@]+\.[a-z]{2,}$/i

async function nazwyKregow(): Promise<Record<string, string>> {
    return Object.fromEntries((await wczytajKregi()).kregi.map((k) => [k.id, k.nazwa]))
}

function skrotKonta(k: Konto, plik: PlikKont, kregi: Record<string, string>, ja: string | undefined) {
    return { id: k.id, imie: k.imie, email: k.email ?? null, role: k.role, odstepstwa: k.dodane.length + k.odebrane.length, zakres: opisZakresu(k, definicjeRol(plik), kregi),
        ostatnio: k.ostatnio ?? null, stan: k.stan, zaproszenieDo: k.zaproszenie?.do ?? null, zablokowano: k.zablokowano ?? null, ty: k.id === ja }
}

/** Ostatnie działania konta: ostatnio edytowane pozycje (plik „wróć do pracy” tej osoby) i operacje z jej podpisem. */
async function dzialania(id: string): Promise<{ opis: string; czas: string }[]> {
    const wyn: { opis: string; czas: string }[] = []
    try {
        const p = path.join(/*turbopackIgnore: true*/ process.cwd(), 'content', '_panel', `praca-${id.replace(/[^A-Za-z0-9_-]/g, '').slice(0, 80)}.json`)
        const j = JSON.parse(await fs.readFile(p, 'utf8')) as { ostatnie?: { nazwa?: string; czas?: string; zmiany?: string[] }[] }
        for (const x of j.ostatnie ?? []) if (x.nazwa && x.czas) wyn.push({ opis: `${x.nazwa}${x.zmiany?.length ? ` – ${x.zmiany.join(', ')}` : ''}`, czas: x.czas })
    } catch { /* jeszcze nic nie edytowano */ }
    for (const m of (await listaOperacji().catch(() => [])).filter((x) => x.kto === id).slice(0, 10))
        wyn.push({ opis: `${NAZWY_OPERACJI[m.rodzaj] ?? m.rodzaj}${m.administrator ? ' (jako administrator)' : ''}: ${m.opis}`.slice(0, 200), czas: m.zakonczono ?? m.utworzono })
    return wyn.sort((a, b) => b.czas.localeCompare(a.czas)).slice(0, 12)
}

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const k = konfiguracjaKont()
    const plik = wczytajKonta(), kregi = await nazwyKregow(), roleDef = definicjeRol(plik), ja = ktoTeraz()?.id
    const id = new URL(req.url).searchParams.get('id')
    if (!id) {
        return odp({
            wersja: plik.wersja, konta: plik.konta.map((x) => skrotKonta(x, plik, kregi, ja)), role: roleDef, uprawnienia: UPRAWNIENIA,
            kregi: Object.entries(kregi).map(([kid, nazwa]) => ({ id: kid, nazwa })), bliscy: { wlaczone: logowanieWlaczone() },
            usluga: { wlaczona: !!k, kluczApi: !!k?.kluczApi },
        })
    }
    const konto = plik.konta.find((x) => x.id === id)
    if (!konto) return blad('Nie ma takiego konta.', 404)
    let urz: Awaited<ReturnType<typeof urzadzenia>> | null = null, uwaga: string | null = null
    try { urz = k ? await urzadzenia(k, id) : null } catch (e) { uwaga = e instanceof BladPocketId ? e.message : 'Nie udało się odczytać urządzeń.' }
    return odp({ wersja: plik.wersja, konto: { ...konto, zaproszenie: undefined, zaproszenieDo: konto.zaproszenie?.do ?? null, ty: konto.id === ja },
        zRol: [...uprawnieniaZRol(konto, roleDef)], role: roleDef, uprawnienia: UPRAWNIENIA, kregi: Object.entries(kregi).map(([kid, nazwa]) => ({ id: kid, nazwa })),
        urzadzenia: urz, uwagaUrzadzen: uwaga, dzialania: await dzialania(id) })
}

function linkZaproszenia(strona: string, kod: string, dni: number) {
    const adres = `${strona}/zaproszenie/${kod}`
    return { link: adres, qr: kodQr(adres), do: new Date(Date.now() + dni * 864e5).toISOString() }
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const k = konfiguracjaKont()
    if (!k) return blad('Konta nie są jeszcze włączone na serwerze (npm run konta:przygotuj).', 503)
    const d = (await req.json().catch(() => null)) as Record<string, unknown> | null
    if (!d || typeof d.akcja !== 'string') return blad('Złe dane.')
    const wersja = typeof d.wersja === 'number' ? d.wersja : undefined
    const id = tekst(d.id, 100)
    const autor = ktoTeraz()
    const dziennik = (co: string) => console.log(`[konta] ${autor?.id ?? '?'} ${co}`)
    try {
        if (d.akcja === 'zapros') {
            const imie = tekst(d.imie, 80), email = tekst(d.email, 120), r = role(d.role)
            if (imie.length < 2) return blad('Podaj imię i nazwisko (albo samo imię).')
            if (email && !EMAIL.test(email)) return blad('Adres e-mail wygląda na niepełny – popraw go albo zostaw puste.')
            if (!r.length) return blad('Wybierz rolę.')
            const dni = Math.min(31, Math.max(1, Number(d.dni) || DNI_ZAPROSZENIA))
            const osoba = await zalozOsobe(k, imie, email || undefined)
            let kod: string
            try { kod = await kodJednorazowy(k, osoba.id, dni * 24) } catch (e) { await usunOsobe(k, osoba.id).catch(() => {}); throw e }
            const z = linkZaproszenia(k.strona, kod, dni)
            try {
                zmienKonta((p) => { p.konta.push({ id: osoba.id, imie, ...(email ? { email } : {}), uzytkownik: osoba.username, role: r, dodane: upr(d.dodane).filter((u) => u !== 'administracja'), odebrane: upr(d.odebrane),
                    zakres: { kregi: napisy((d.zakres as Record<string, unknown> | undefined)?.kregi), miejsca: napisy((d.zakres as Record<string, unknown> | undefined)?.miejsca) }, stan: 'zaproszony', utworzono: new Date().toISOString(),
                    ...(autor ? { zaprosil: autor.id } : {}), zaproszenie: { skrot: skrotKodu(kod), do: z.do } }); return p }, { wersja })
            } catch (e) { await usunOsobe(k, osoba.id).catch(() => {}); throw e }
            dziennik(`zaprosił konto ${osoba.id} (role: ${r.join(', ')})`)
            return odp({ ok: true, imie, ...z })
        }
        if (d.akcja === 'role') {
            const zmiany = (d.role && typeof d.role === 'object' ? d.role : {}) as Record<string, { nazwa?: unknown; opis?: unknown; uprawnienia?: unknown }>
            zmienKonta((p) => { for (const [kl, z] of Object.entries(zmiany)) if (jestRola(kl)) p.role[kl] = { ...(tekst(z.nazwa, 60) ? { nazwa: tekst(z.nazwa, 60) } : {}), opis: tekst(z.opis, 200), ...(kl !== 'administrator' && Array.isArray(z.uprawnienia) ? { uprawnienia: upr(z.uprawnienia) } : {}) }; return p }, { wersja })
            dziennik('zmienił ustawienia ról')
            return odp({ ok: true })
        }
        const konto = wczytajKonta().konta.find((x) => x.id === id)
        if (!konto) return blad('Nie ma takiego konta.', 404)
        const zmien = (f: (x: Konto) => void) => zmienKonta((p) => { const x = p.konta.find((y) => y.id === id); if (x) f(x); return p }, { wersja })
        switch (d.akcja) {
            case 'zapisz': {
                const r = role(d.role), imie = tekst(d.imie, 80), email = tekst(d.email, 120)
                if (email && !EMAIL.test(email)) return blad('Adres e-mail wygląda na niepełny – popraw go albo zostaw puste.')
                zmien((x) => {
                    if (Array.isArray(d.role)) x.role = r
                    if (Array.isArray(d.dodane)) x.dodane = upr(d.dodane).filter((u) => u !== 'administracja')
                    if (Array.isArray(d.odebrane)) x.odebrane = upr(d.odebrane)
                    if (d.zakres && typeof d.zakres === 'object') x.zakres = { kregi: napisy((d.zakres as Record<string, unknown>).kregi), miejsca: napisy((d.zakres as Record<string, unknown>).miejsca) }
                    if (imie.length >= 2) x.imie = imie
                    if (typeof d.email === 'string') { if (email) x.email = email; else delete x.email }
                })
                dziennik(`zmienił uprawnienia konta ${id}`)
                return odp({ ok: true })
            }
            case 'zablokuj': zmien((x) => { x.stan = 'zablokowany'; x.zablokowano = new Date().toISOString(); x.sesjeOd = x.zablokowano; delete x.zaproszenie }); dziennik(`zablokował konto ${id}`); return odp({ ok: true })
            case 'odblokuj': zmien((x) => { x.stan = x.ostatnio ? 'aktywny' : 'zaproszony'; delete x.zablokowano }); dziennik(`odblokował konto ${id}`); return odp({ ok: true })
            case 'wyloguj': zmien((x) => { x.sesjeOd = new Date().toISOString() }); dziennik(`wylogował konto ${id} ze wszystkich urządzeń`); return odp({ ok: true })
            case 'nowy-link': {
                if (konto.stan === 'zablokowany') return blad('Konto jest zablokowane – najpierw je odblokuj.')
                const kod = await kodJednorazowy(k, id, DNI_ZAPROSZENIA * 24)
                const z = linkZaproszenia(k.strona, kod, DNI_ZAPROSZENIA)
                zmien((x) => { x.zaproszenie = { skrot: skrotKodu(kod), do: z.do } })
                dziennik(`utworzył nowy link dla konta ${id}`)
                return odp({ ok: true, imie: konto.imie, ...z })
            }
            case 'usun-urzadzenie': await usunUrzadzenie(k, id, tekst(d.urzadzenie, 100)); dziennik(`usunął urządzenie konta ${id}`); return odp({ ok: true })
            case 'usun': {
                zmienKonta((p) => { p.konta = p.konta.filter((x) => x.id !== id); return p }, { wersja })
                // konto w usłudze logowania usuwamy po udanej zmianie listy; błąd tutaj nie przywraca dostępu (lista już go nie zawiera)
                const uwaga = await usunOsobe(k, id).then(() => null, (e: Error) => e.message)
                dziennik(`usunął konto ${id}`)
                return odp({ ok: true, uwaga })
            }
            default: return blad('Nieznana akcja.')
        }
    } catch (e) {
        if (e instanceof KonfliktKont) return blad(e.message, 409)
        if (e instanceof OdmowaKont) return blad(e.message, 409)
        if (e instanceof BladPocketId) return blad(e.message, 502)
        console.error(`[konta] ${(e as Error).message}`)
        return blad('Nie udało się zapisać zmiany.', 500)
    }
}
