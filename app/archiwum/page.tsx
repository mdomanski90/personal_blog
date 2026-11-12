import type { Metadata } from 'next'
import { Link } from 'next-view-transitions'
import { archiwum, materialy, miejsca, poziomCzytelnika, tematy, type FiltrArchiwum } from '@/lib/archiwum'
import { RODZAJE_MATERIALOW } from '@/lib/materialy'
import { odmiana } from '@/lib/tekst'
import { RAMKA, Strona, TytulStrony } from '../components/Uklad'
import ListaMaterialow from '../components/ListaMaterialow'

export const dynamic = 'force-dynamic'
export const metadata: Metadata = { title: 'archiwum · odniepamieci.pl' }

const rok = (s: string | undefined) => (s && /^-?\d{1,4}$/.test(s) ? Number(s) : undefined)

export default async function Archiwum({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
    const sp = await searchParams
    const poziom = await poziomCzytelnika()
    const filtr: FiltrArchiwum = { rodzaj: sp.rodzaj || undefined, miejsce: sp.miejsce || undefined, temat: sp.temat || undefined, od: rok(sp.od), do: rok(sp.do) }
    const lista = await archiwum(poziom, filtr)
    const wszystkie = await materialy(poziom)
    // w listach wyboru tylko to, co występuje w materiałach
    const uzyteMiejsca = new Set(wszystkie.flatMap((m) => m.miejsca))
    const uzyteTematy = new Set(wszystkie.flatMap((m) => m.tematy))
    const uzyteRodzaje = new Set(wszystkie.map((m) => m.rodzaj))
    const opcjeMiejsc = (await miejsca(poziom)).filter((m) => uzyteMiejsca.has(m.id))
    const opcjeTematow = (await tematy(poziom)).filter((t) => uzyteTematy.has(t.id))
    const aktywny = Object.values(filtr).some((v) => v !== undefined)
    const pole = { fontSize: 'calc(14px * var(--font-scale, 1))', height: 'calc(30px * var(--font-scale, 1))', padding: '0 8px', borderRadius: 7 }
    const etykieta = 'flex flex-col lowercase text-gray-600 dark:text-gray-400'

    return (
        <Strona>
            <TytulStrony>archiwum</TytulStrony>
            <p className="text-gray-600 dark:text-gray-400" style={{ fontSize: 'calc(15px * var(--font-scale, 1))' }}>
                dokumenty, akty metrykalne, zdjęcia, nagrania i mapy – z opisem, pochodzeniem i powiązaniami z miejscami i tematami.
            </p>
            {wszystkie.length > 0 && (
                <form method="get" action="/archiwum" className="flex flex-wrap items-end" style={{ gap: 10, fontSize: 'calc(12px * var(--font-scale, 1))' }}>
                    <label className={etykieta} style={{ gap: 3 }}>
                        rodzaj
                        <select name="rodzaj" defaultValue={filtr.rodzaj ?? ''} className={`${RAMKA} bg-transparent text-current`} style={pole}>
                            <option value="">wszystkie</option>
                            {Object.entries(RODZAJE_MATERIALOW).filter(([k]) => uzyteRodzaje.has(k)).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                        </select>
                    </label>
                    {opcjeMiejsc.length > 0 && (
                        <label className={etykieta} style={{ gap: 3 }}>
                            miejsce
                            <select name="miejsce" defaultValue={filtr.miejsce ?? ''} className={`${RAMKA} bg-transparent text-current`} style={pole}>
                                <option value="">wszystkie</option>
                                {opcjeMiejsc.map((m) => <option key={m.id} value={m.id}>{m.nazwa}</option>)}
                            </select>
                        </label>
                    )}
                    {opcjeTematow.length > 0 && (
                        <label className={etykieta} style={{ gap: 3 }}>
                            temat
                            <select name="temat" defaultValue={filtr.temat ?? ''} className={`${RAMKA} bg-transparent text-current`} style={pole}>
                                <option value="">wszystkie</option>
                                {opcjeTematow.map((t) => <option key={t.id} value={t.id}>{t.nazwa}</option>)}
                            </select>
                        </label>
                    )}
                    <label className={etykieta} style={{ gap: 3 }}>
                        od roku
                        <input name="od" inputMode="numeric" defaultValue={sp.od ?? ''} placeholder="1750" className={`${RAMKA} bg-transparent text-current`} style={{ ...pole, width: '6rem' }} />
                    </label>
                    <label className={etykieta} style={{ gap: 3 }}>
                        do roku
                        <input name="do" inputMode="numeric" defaultValue={sp.do ?? ''} placeholder="1918" className={`${RAMKA} bg-transparent text-current`} style={{ ...pole, width: '6rem' }} />
                    </label>
                    <button type="submit" className={`${RAMKA} bg-muted cursor-pointer lowercase text-current`} style={pole}>filtruj</button>
                    {aktywny && <Link href="/archiwum" className="lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))', paddingBottom: 6 }}>wyczyść</Link>}
                </form>
            )}
            {wszystkie.length > 0 && (
                <p className="text-gray-500 lowercase" style={{ fontSize: 'calc(13px * var(--font-scale, 1))' }}>
                    {odmiana(lista.length, ['materiał', 'materiały', 'materiałów'])}{aktywny ? ` z ${wszystkie.length}` : ''}
                </p>
            )}
            <ListaMaterialow materialy={lista} />
        </Strona>
    )
}
