import { brakDostepu } from '@/lib/plany/dane'
import { importujGedcom } from '@/lib/osoby/gedcom'
import { sladImportu, stanOsob, zapiszImport, zapiszOsobe } from '@/lib/osoby/dane'
import { polacz } from '@/lib/osoby/relacje'
import { idZNazwy, poprawOsobe, ID_OSOBY } from '@/lib/osoby/model'
import { miejscaDoDopasowania, ostrzezeniaWgOsob, skrot } from '@/lib/osoby/serwer'
import { porownajPl } from '@/lib/tekst'

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
        ostrzezenia: [...ostrz].flatMap(([id, t]) => t.map((tekst) => ({ osoba: id, tekst }))).slice(0, 300),
        miejsca: (await miejscaDoDopasowania()).map((m) => ({ id: m.id, nazwa: m.nazwa })),
    })
}

const MAKS = 60 * 1024 * 1024

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = await req.json().catch(() => null)
    try {
        if (d?.akcja === 'podglad' || d?.akcja === 'import') {
            const tekst = String(d.gedcom ?? '')
            if (!tekst.trim() || tekst.length > MAKS) return Response.json({ blad: 'Pusty albo za duży plik.' }, { status: 400 })
            if (!/^\s*0\s+HEAD/m.test(tekst.slice(0, 2000))) return Response.json({ blad: 'To nie wygląda na plik GEDCOM (brak nagłówka „0 HEAD”).' }, { status: 400 })
            const wynik = importujGedcom(tekst, await miejscaDoDopasowania())
            if (d.akcja === 'podglad') return Response.json({ podsumowanie: wynik.podsumowanie })
            const slad = await sladImportu()
            if (slad && d.potwierdzenie !== 'ZASTĄP') return Response.json({ blad: `Drzewo zostało już wczytane (${new Date(slad.data).toLocaleDateString('pl-PL', { timeZone: 'Europe/Warsaw' })}). Ponowny import zastąpiłby zmiany z panelu – wpisz ZASTĄP, jeśli naprawdę tego chcesz.` }, { status: 409 })
            const p = wynik.podsumowanie
            await zapiszImport(wynik.drzewo, { data: new Date().toISOString(), plik: String(d.plik ?? '').slice(0, 200), podsumowanie: { osoby: p.osoby, rodziny: p.rodziny, zdarzenia: p.zdarzenia, zrodla: p.zrodla, cytaty: p.cytaty, multimedia: p.multimedia } })
            return Response.json({ podsumowanie: p, zapisano: true })
        }
        if (d?.akcja === 'nowa') {
            const s = await stanOsob()
            const imiona = String(d.imiona ?? '').trim(), nazwisko = String(d.nazwisko ?? '').trim()
            if (!imiona && !nazwisko) return Response.json({ blad: 'Podaj imię albo nazwisko.' }, { status: 400 })
            const id = idZNazwy(imiona || 'osoba', nazwisko, null, (x) => s.drzewo.osoby.has(x))
            const o = await zapiszOsobe(poprawOsobe({ id, imiona, nazwisko, plec: d.plec, zdarzenia: [], zyje: 'auto', widocznosc: 'auto', wersja: 0 }))
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
