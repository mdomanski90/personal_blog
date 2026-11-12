import { miejsca, obiekty } from '@/lib/archiwum'
import { brakDostepu, listaPlanow, listaZgloszen, wczytajPlan, wczytajUstawienia, zapiszObraz, zapiszPlan } from '@/lib/plany/dane'
import { nowyPlan, popraw, SLUG, type Plan } from '@/lib/plany/model'

// Lista planów (z miejscami i obiektami do wyboru), nowy plan, import pliku planu (z osadzonym podkładem).
export const dynamic = 'force-dynamic'

export async function GET(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const plany = await listaPlanow()
    return Response.json({
        plany: plany.map((p) => ({ slug: p.slug, tytul: p.tytul, widocznosc: p.widocznosc, miejsce: p.miejsce, obiekt: p.obiekt, elementow: p.elementy.length, zmieniono: p.zmieniono })),
        miejsca: (await miejsca('ja')).map((m) => ({ id: m.id, nazwa: m.nazwa })),
        obiekty: (await obiekty('ja')).map((o) => ({ id: o.id, nazwa: o.nazwa, miejsce: o.miejsce })),
        zgloszenia: (await listaZgloszen()).length,
        ustawienia: await wczytajUstawienia(),
    })
}

export async function POST(req: Request) {
    const b = brakDostepu(req); if (b) return b
    const d = await req.json().catch(() => null)
    if (d?.akcja === 'nowy') {
        const slug = String(d.slug ?? '')
        if (!SLUG.test(slug)) return Response.json({ blad: 'Identyfikator: małe litery, cyfry i myślniki.' }, { status: 400 })
        if (await wczytajPlan(slug)) return Response.json({ blad: 'Plan o takim identyfikatorze już jest.' }, { status: 409 })
        const p = nowyPlan(slug, String(d.tytul || slug))
        if (typeof d.miejsce === 'string' && SLUG.test(d.miejsce)) p.miejsce = d.miejsce
        return Response.json(await zapiszPlan(p))
    }
    if (d?.akcja === 'import' && d.plan && typeof d.plan === 'object') {
        const wej = d.plan as Plan & { podklady: (Plan['podklady'][number] & { dane?: string })[] }
        let slug = String(d.slug || wej.slug || '')
        if (!SLUG.test(slug)) return Response.json({ blad: 'Plik nie ma poprawnego identyfikatora planu.' }, { status: 400 })
        if ((await wczytajPlan(slug)) && !d.nadpisz) return Response.json({ blad: `Plan „${slug}” już jest. Zaznacz „zastąp”, żeby go nadpisać.` }, { status: 409 })
        try {
            return Response.json(await importuj(slug, wej))
        } catch (e) {
            // np. brak uprawnień do zapisu w content/plany albo pliki-archiwum/plany
            const kod = (e as NodeJS.ErrnoException)?.code
            const sciezka = (e as NodeJS.ErrnoException)?.path
            console.error('import planu:', e)
            return Response.json({ blad: kod === 'EACCES' || kod === 'EPERM' ? `Serwer nie może zapisać pliku (brak uprawnień): ${sciezka ?? ''}` : `Nie udało się zapisać planu: ${e instanceof Error ? e.message : String(e)}` }, { status: 500 })
        }
    }
    return Response.json({ blad: 'nieznane polecenie' }, { status: 400 })
}

async function importuj(slug: string, wej: Plan & { podklady: (Plan['podklady'][number] & { dane?: string })[] }) {
    {
        const podklady = []
        for (const p of wej.podklady ?? []) {
            if (p.dane && /^data:image\/(jpeg|png|webp);base64,/.test(p.dane)) {
                const roz = p.dane.slice(11, p.dane.indexOf(';')).replace('jpeg', 'jpg')
                const z = await zapiszObraz(slug, Buffer.from(p.dane.split(',')[1], 'base64'), `podklad.${roz}`, 'podklad')
                const { dane: _d, ...reszta } = p
                podklady.push({ ...reszta, plik: z.plik, szer: z.szer || p.szer, wys: z.wys || p.wys })
            } else if (p.plik) podklady.push(p)
        }
        const plan = popraw({ ...wej, slug, podklady })
        return zapiszPlan(plan)
    }
}
