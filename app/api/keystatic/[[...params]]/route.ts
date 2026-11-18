import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';
import { poZapisieTresci } from '@/lib/katalog/dane';
import { blokadaZapisu } from '@/lib/panel/operacje';

const obsluga = makeRouteHandler({ config });

export const GET = obsluga.GET;

// KAT-01: po zapisie treści w Keystatic (tryb local: POST …/update) – numery katalogowe dla nowych pozycji publicznych.
// P5 (IMP-08): w trakcie operacji (import, zmiana zbiorcza) albo po jej przerwaniu zapis ręczny czeka – 423 z komunikatem,
// zamiast wyścigu z importem o ten sam plik.
export async function POST(req: Request) {
    const zapis = new URL(req.url).pathname.endsWith('/update');
    if (zapis) {
        const blokada = await blokadaZapisu();
        if (blokada) return new Response(blokada, { status: 423, headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
    }
    const r = await obsluga.POST(req);
    if (r.ok && zapis) await poZapisieTresci();
    return r;
}
