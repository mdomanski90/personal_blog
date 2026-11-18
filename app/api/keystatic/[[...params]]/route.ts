import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';
import { poZapisieTresci } from '@/lib/katalog/dane';
import { blokadaZapisu } from '@/lib/panel/operacje';
import { odczytajZadanie, przedZapisemKeystatic } from '@/lib/panel/historia';
import { opisPlikuZTytulem } from '@/lib/panel/historia-adresy';
import { zapiszOstatnie } from '@/lib/panel/praca';

const obsluga = makeRouteHandler({ config });

export const GET = obsluga.GET;

const tekst = (t: string, status: number) => new Response(t, { status, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });

// KAT-01: po zapisie treści w Keystatic (tryb local: POST …/update) – numery katalogowe dla nowych pozycji publicznych.
// P5 (IMP-08): w trakcie operacji (import, zmiana zbiorcza) albo po jej przerwaniu zapis ręczny czeka – 423 z komunikatem,
// zamiast wyścigu z importem o ten sam plik.
// P6a (PNL-10): przed zapisem – poprzednia wersja zmienianych plików do content/_historia, usuwane pliki do content/_kosz
// (bez kopii w koszu usunięcie jest odrzucane – 503); po udanym zapisie – „ostatnio edytowane” na pulpicie.
export async function POST(req: Request) {
    const zapis = new URL(req.url).pathname.endsWith('/update');
    if (!zapis) return obsluga.POST(req);
    const blokada = await blokadaZapisu();
    if (blokada) return tekst(blokada, 423);
    const zadanie = odczytajZadanie(await req.clone().json().catch(() => null));
    if (zadanie) {
        const p = await przedZapisemKeystatic(zadanie, { opis: async (rel) => (await opisPlikuZTytulem(process.cwd(), rel.replace(/^content\//, ''))).nazwa });
        if (p.odrzuc) return tekst(p.odrzuc, 503);
        for (const o of p.ostrzezenia) console.error(`[historia] ${o}`);
    }
    const r = await obsluga.POST(req);
    if (r.ok) {
        await poZapisieTresci();
        if (zadanie) await zapiszOstatnie(zadanie.additions.map((a) => a.path).filter((x) => !zadanie.deletions.some((d) => d.path === x))).catch(() => {});
    }
    return r;
}
