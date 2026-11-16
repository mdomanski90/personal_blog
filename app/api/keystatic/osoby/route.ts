import { brakDostepu } from '@/lib/plany/dane'
import { importujGedcom } from '@/lib/osoby/gedcom'
import { idOsobRecznych, sladImportu, stanOsob, zapiszImport, zapiszOsobe } from '@/lib/osoby/dane'
import { polacz } from '@/lib/osoby/relacje'
import { idZNazwy, noweIdZdarzenia, poprawOsobe, ID_OSOBY, type Zdarzenie } from '@/lib/osoby/model'
import { czyPoprawnaEdtf, rokPoczatku } from '@/lib/edtf'
import { doSprawdzeniaZycia, miejscaDoDopasowania, ostrzezeniaWgOsob, skrot } from '@/lib/osoby/serwer'
import { porownajPl } from '@/lib/tekst'
import { zNadaniemNumerow } from '@/lib/katalog/dane'

// Panel osób: lista, import z GEDCOM (podgląd i zapis, jednorazowy), nowa osoba.
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const s = await stanOsob()
    const ostrz = ostrzezeniaWgOsob(s)
    const osoby = [...s.drzewo.osoby.values()].map((o) => skrot(s, o, ostrz.get(o.id)?.length ?? 0))
        .sort((a, b) => porownajPl(a.nazwisko, b.nazwisko) || porownajPl(a.imiona, b.imiona))
    return Response.json({
        osoby,
        import: await sladImportu(),
        doSprawdzeniaZycia: doSprawdzeniaZycia(s),
        ostrzezenia: [...ostrz].flatMap(([id, t]) => t.map((tekst) => ({ osoba: id, tekst }))).slice(0, 300),
        miejsca: (await miejscaDoDopasowania()).map((m) => ({ id: m.id, nazwa: m.nazwa })),
    })
}

const MAKS = 60 * 1024 * 1024

// KAT-01: po udanym zapisie – numery katalogowe dla nowych pozycji publicznych
export const POST = zNadaniemNumerow(zapiszPOST)

async function zapiszPOST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = await req.json().catch(() => null)
    try {
        if (d?.akcja === 'podglad' || d?.akcja === 'import') {
            const tekst = String(d.gedcom ?? '')
            if (!tekst.trim() || tekst.length > MAKS) return Response.json({ blad: 'Pusty albo za duży plik.' }, { status: 400 })
            if (!/^\s*0\s+HEAD/m.test(tekst.slice(0, 2000))) return Response.json({ blad: 'To nie wygląda na plik GEDCOM (brak nagłówka „0 HEAD”).' }, { status: 400 })
            const reczne = idOsobRecznych((await stanOsob()).drzewo)
            const wynik = importujGedcom(tekst, await miejscaDoDopasowania(), reczne)
            if (d.akcja === 'podglad') return Response.json({ podsumowanie: wynik.podsumowanie, zachowaneReczne: reczne.size })
            const slad = await sladImportu()
            if (slad && d.potwierdzenie !== 'ZASTĄP') return Response.json({ blad: `Drzewo zostało już wczytane (${new Date(slad.data).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}). Ponowny import zastąpiłby zmiany z panelu – wpisz ZASTĄP, jeśli naprawdę tego chcesz.` }, { status: 409 })
            const p = wynik.podsumowanie
            // zaznaczeni w podglądzie jako zmarli (95–104 lata bez daty zgonu)
            const zmarli = new Set<string>((Array.isArray(d.zmarli) ? d.zmarli : []).map(String))
            for (const id of zmarli) { const o = wynik.drzewo.osoby.get(id); if (o) o.zyje = 'nie' }
            const zachowane = await zapiszImport(wynik.drzewo, { data: new Date().toISOString(), plik: String(d.plik ?? '').slice(0, 200), podsumowanie: { osoby: p.osoby, rodziny: p.rodziny, zdarzenia: p.zdarzenia, zrodla: p.zrodla, cytaty: p.cytaty, multimedia: p.multimedia } })
            return Response.json({ podsumowanie: p, zapisano: true, zachowane })
        }
        // szybkie oznaczenie z listy „czy jeszcze żyją?”: nie żyje / żyje (lista zawiera wtedy tylko osoby „tak” 105+)
        if (d?.akcja === 'zyje') {
            const s = await stanOsob()
            const ids: string[] = (Array.isArray(d.ids) ? d.ids : [d.id]).map(String).filter((x: string) => ID_OSOBY.test(x) && s.drzewo.osoby.has(x)).slice(0, 2000)
            const zyje = d.zyje === 'tak' ? 'tak' : 'nie'
            for (const id of ids) {
                const o = s.drzewo.osoby.get(id)!
                await zapiszOsobe(poprawOsobe({ ...o, zyje }), o.wersja)
            }
            return Response.json({ zmieniono: ids.length })
        }
        if (d?.akcja === 'nowa') {
            const s = await stanOsob()
            const imiona = String(d.imiona ?? '').trim(), nazwisko = String(d.nazwisko ?? '').trim()
            if (!imiona && !nazwisko) return Response.json({ blad: 'Podaj imię albo nazwisko.' }, { status: 400 })
            // z planu cmentarza (etap 1, PD-01): osoba z grobu bez karty – daty z grobu, nie żyje, uwaga do przejrzenia
            const zGrobu = d.zGrobu && typeof d.zGrobu.plan === 'string' ? { plan: String(d.zGrobu.plan).slice(0, 80), grob: String(d.zGrobu.grob ?? '').slice(0, 40) } : null
            const zdarzenia = zGrobu ? zdarzeniaZGrobu(d.ur, d.zm) : []
            const rok = rokPoczatku(zdarzenia.find((z) => z.rodzaj === 'urodzenie')?.data) ?? null
            const id = idZNazwy(imiona || 'osoba', nazwisko, rok, (x) => s.drzewo.osoby.has(x))
            const o = await zapiszOsobe(poprawOsobe({
                id, imiona, nazwisko, plec: d.plec, zdarzenia, zyje: zGrobu ? 'nie' : 'auto', widocznosc: 'auto', wersja: 0,
                ...(zGrobu ? { uwagi: [`karta utworzona z planu „${zGrobu.plan}” (grób ${zGrobu.grob}) – uzupełnij dane i rodzinę`] } : {}),
            }))
            // od razu w rodzinie: jako rodzic, dziecko albo małżonek wskazanej osoby
            const do_ = String(d.relacja?.do ?? '')
            if (ID_OSOBY.test(do_) && s.drzewo.osoby.has(do_)) await polacz(o.id, do_, d.relacja.jako, d.relacja.rodzina)
            return Response.json({ id: o.id })
        }
    } catch (e) {
        console.error('osoby:', e)
        return Response.json({ blad: e instanceof Error ? e.message : String(e) }, { status: 500 })
    }
    return Response.json({ blad: 'nieznane polecenie' }, { status: 400 })
}

/** Daty z grobu (np. „1880”, „1931-03-12”) jako zdarzenia; zapis, którego nie da się odczytać, zostaje jako tekst. */
function zdarzeniaZGrobu(ur: unknown, zm: unknown): Zdarzenie[] {
    const L: Zdarzenie[] = []
    for (const [rodzaj, v] of [['urodzenie', ur], ['zgon', zm]] as const) {
        const t = String(v ?? '').trim().slice(0, 40)
        if (!t) continue
        L.push({ id: noweIdZdarzenia(), rodzaj, ...(czyPoprawnaEdtf(t) ? { data: t } : { dataTekst: t }), opis: 'z napisu na grobie' })
    }
    return L
}
