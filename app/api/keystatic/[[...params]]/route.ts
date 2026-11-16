import { makeRouteHandler } from '@keystatic/next/route-handler';
import config from '../../../../keystatic.config';
import { poZapisieTresci } from '@/lib/katalog/dane';

const obsluga = makeRouteHandler({ config });

export const GET = obsluga.GET;

// KAT-01: po zapisie treści w Keystatic (tryb local: POST …/update) – numery katalogowe dla nowych pozycji publicznych
export async function POST(req: Request) {
    const r = await obsluga.POST(req);
    if (r.ok && new URL(req.url).pathname.endsWith('/update')) await poZapisieTresci();
    return r;
}
