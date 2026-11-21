import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';
import { poZapisieTresci } from '@/lib/katalog/dane';
import { blokadaZapisu } from '@/lib/panel/operacje';
import { odczytajZadanie, przedZapisemKeystatic } from '@/lib/panel/historia';
import { etykietyPol, opisPlikuZTytulem } from '@/lib/panel/historia-adresy';
import { zapiszOstatnie } from '@/lib/panel/praca';
import { brakPrawaZapisu, komunikatPrawa } from '@/lib/panel/prawa-zapisu';
import { komunikatUsuwanychPlikow, usuwanePlikiBezZastepstwa } from '@/lib/panel/straz-plikow';
import { kontaWlaczone, odmowaKonta, odpowiedzZamknietego, panelZamkniety, zalogowany } from '@/lib/konta/straz';
import { odmowaZapisuTresci } from '@/lib/konta/zapis-tresci';
import { widziTylkoJaZadanie } from '@/lib/konta/straz';
import { ukrytaSciezka, ukrytePozycje, zapomnijUkryte } from '@/lib/konta/tylko-ja';

const obsluga = makeRouteHandler({ config });

// P7a (KON-01): odczyt treści w Keystatic tylko dla konta z dostępem do panelu (gdy konta są włączone).
export async function GET(req: Request) {
    // KON-07: bez hasła nginx i bez kont ta trasa nie miałaby żadnej kontroli – wtedy panel jest zamknięty
    if (panelZamkniety()) return odpowiedzZamknietego();
    const odmowa = kontaWlaczone() ? odmowaKonta(req, ['panel']) : null;
    if (odmowa) return odmowa;
    if (widziTylkoJaZadanie(req)) return obsluga.GET(req);
    return odczytBezTylkoJa(req);
}

// P7c (KON-08): konto bez roli administratora nie dostaje pozycji „tylko ja” – lista plików (tree) bez nich i ich plików,
// treść (blob/<sha>/<ścieżka>) – 404, jakby pliku nie było. Zapis takich pozycji i tak odrzuca ocenZapis (lib/konta/model.ts).
async function odczytBezTylkoJa(req: Request): Promise<Response> {
    const czesci = new URL(req.url).pathname.replace(/^\/api\/keystatic\/?/, '').split('/').filter(Boolean).map(decodeURIComponent);
    const u = await ukrytePozycje();
    if (czesci[0] === 'blob' && ukrytaSciezka(czesci.slice(2).join('/'), u)) return new Response('Not Found', { status: 404 });
    const r = await obsluga.GET(req);
    if (czesci.join('/') !== 'tree' || !r.ok) return r;
    return bezUkrytychWDrzewie(r);
}

async function bezUkrytychWDrzewie(r: Response): Promise<Response> {
    const u = await ukrytePozycje();
    if (!u.sciezki.length) return r;
    const wpisy = (await r.json()) as { path: string }[];
    const h = new Headers(r.headers); h.delete('content-length');
    return new Response(JSON.stringify(Array.isArray(wpisy) ? wpisy.filter((w) => !ukrytaSciezka(w.path, u)) : wpisy), { status: r.status, headers: h });
}

const tekst = (t: string, status: number) => new Response(t, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// KAT-01: po zapisie treści w Keystatic (tryb local: POST …/update) – numery katalogowe dla nowych pozycji publicznych.
// P5 (IMP-08): w trakcie operacji (import, zmiana zbiorcza) albo po jej przerwaniu zapis ręczny czeka – 423 z komunikatem,
// zamiast wyścigu z importem o ten sam plik.
// P6a (PNL-10): przed zapisem – poprzednia wersja zmienianych plików do content/_historia, usuwane pliki do content/_kosz
// (bez kopii w koszu usunięcie jest odrzucane – 503); po udanym zapisie – „ostatnio edytowane” na pulpicie.
export async function POST(req: Request) {
    const zapis = new URL(req.url).pathname.endsWith('/update');
    // P7a (KON-01): konto z dostępem do panelu; przy zapisie każdy plik sprawdzany względem uprawnień (dział, usuwanie,
    // „tylko ja”, publikowanie, zakres miejscowości) – odmowa zatrzymuje cały zapis z komunikatem prostym językiem.
    if (panelZamkniety()) return odpowiedzZamknietego();
    const odmowa = kontaWlaczone() ? odmowaKonta(req, ['panel']) : null;
    if (odmowa) return odmowa;
    if (!zapis) return obsluga.POST(req);
    const blokada = await blokadaZapisu();
    if (blokada) return tekst(blokada, 423);
    const zadanie = odczytajZadanie(await req.clone().json().catch(() => null));
    let pola: Record<string, string[]> = {};
    const kto = kontaWlaczone() ? zalogowany(req) : null;
    if (kontaWlaczone() && (!zadanie || !kto)) return tekst('Zapis wstrzymany – nie udało się odczytać żądania. Nic nie zmieniono.', 400);
    if (zadanie && kto) {
        const brakUprawnien = await odmowaZapisuTresci(kto, zadanie);
        if (brakUprawnien) return tekst(brakUprawnien, 403);
    }
    if (zadanie) {
        // łatka 21.11 (bezpiecznik plików): zapis, który skasowałby plik pozycji bez wgrania następcy – odrzucony w całości
        const bezNastepcy = usuwanePlikiBezZastepstwa(zadanie);
        if (bezNastepcy.length) return tekst(komunikatUsuwanychPlikow(bezNastepcy), 409);
        const brak = await brakPrawaZapisu(process.cwd(), zadanie.additions.map((a) => a.path), zadanie.deletions.map((d) => d.path));
        if (brak.length) return tekst(komunikatPrawa(brak), 503);
        const p = await przedZapisemKeystatic(zadanie, { opis: async (rel) => (await opisPlikuZTytulem(process.cwd(), rel.replace(/^content\//, ''))).nazwa, etykiety: etykietyPol });
        if (p.odrzuc) return tekst(p.odrzuc, 503);
        for (const o of p.ostrzezenia) console.error(`[historia] ${o}`);
        pola = p.pola;
    }
    const r = await obsluga.POST(req);
    if (r.ok) {
        zapomnijUkryte();
        await poZapisieTresci();
        if (zadanie) await zapiszOstatnie(zadanie.additions.map((a) => a.path).filter((x) => !zadanie.deletions.some((d) => d.path === x)), process.cwd(), pola).catch(() => {});
        // P7c (KON-08): po zapisie Keystatic odsyła całą listę plików – bez pozycji „tylko ja” dla konta bez roli administratora
        if (!widziTylkoJaZadanie(req)) return bezUkrytychWDrzewie(r);
    }
    return r;
}
