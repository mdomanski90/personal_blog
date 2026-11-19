'use client'
// P7b (TER-01): „w terenie” – start: moje plany z postępem i „nowe miejsce” (plansza „plany (start)”).
// P7b-2 (TER-06): przy planie „pobierz do pracy bez internetu (N MB)” / „dostępny bez internetu ✓”; bez sieci lista z telefonu.
import * as React from 'react'
import Link from 'next/link'
import { Check } from 'lucide-react'
import { rozmiar } from '@/lib/teren/kolejka'
import { odmiana } from '@/lib/tekst'
import { pobierzPlan, planyWTelefonie, useZmianyPamieci, type PlanWTelefonie } from './pamiec'
import { Blad, kiedy, useStart } from './wspolne'

type Plan = { slug: string; tytul: string; geo: boolean; groby: number; sprawdzone: number; bezZdjecia: number; bajty?: number }
type Dane = { konto: string; imie: string; mozna: { plany: boolean; miejsca: boolean }; plany: Plan[] }

export default function Start() {
    const { dane, blad, zTelefonu } = useStart<Dane>()
    const [wTelefonie, ustawWTelefonie] = React.useState<Map<string, PlanWTelefonie>>(new Map())
    const [pobieram, ustawPobieram] = React.useState('')
    const [kom, ustawKom] = React.useState('')
    const wczytaj = React.useCallback(() => {
        planyWTelefonie().then((L) => ustawWTelefonie(new Map(L.filter((p) => !dane || p.konto === dane.konto).map((p) => [p.slug, p])))).catch(() => {})
    }, [dane])
    React.useEffect(() => wczytaj(), [wczytaj])
    useZmianyPamieci(wczytaj)
    const pobierz = async (p: Plan) => {
        ustawPobieram(p.slug); ustawKom('')
        try { const r = await pobierzPlan(p.slug); ustawKom(`„${p.tytul}” jest w telefonie (${rozmiar(r.bajty)}) – możesz pracować bez internetu.`) }
        catch (b) { ustawKom(b instanceof Error && b.message !== 'Failed to fetch' ? b.message : 'Nie udało się pobrać planu – potrzebny jest internet.') }
        finally { ustawPobieram('') }
    }
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>w terenie</h1>
                {dane && <span className="pn-maly">{dane.imie}{zTelefonu && ` · lista z telefonu (${kiedy(zTelefonu)})`}</span>}
            </header>
            {blad && <Blad tekst={blad} />}
            {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
            {kom && <div className="tr-kom" role="status">{kom}</div>}
            {dane?.mozna.plany && (
                <section className="pn-karta tr-karta" aria-labelledby="tr-plany">
                    <h2 id="tr-plany">moje plany</h2>
                    {dane.plany.length === 0 && <p className="pn-szary">Nie masz jeszcze przydzielonych planów. Poproś administratora, żeby dodał je na karcie twojego konta.</p>}
                    {dane.plany.map((p) => {
                        const t = wTelefonie.get(p.slug)
                        return (
                            <div key={p.slug} className="tr-plan-wiersz">
                                <Link href={`/keystatic/teren/plan/${p.slug}`} className="tr-plan">
                                    <b>{p.tytul}</b>
                                    <span className="pn-maly">{odmiana(p.groby, ['grób', 'groby', 'grobów'])} · sprawdzone {p.sprawdzone} · bez zdjęcia {p.bezZdjecia}</span>
                                    <progress className="tr-postep" max={Math.max(1, p.groby)} value={p.sprawdzone} aria-label={`sprawdzone ${p.sprawdzone} z ${p.groby}`} />
                                    {!p.geo && <span className="pn-maly">Ten plan nie ma jeszcze punktów położenia – nie pokaże, gdzie stoisz.</span>}
                                </Link>
                                {t
                                    ? <span className="tr-pobrany"><Check aria-hidden />dostępny bez internetu ({rozmiar(t.bajty)}, pobrany {kiedy(t.pobrano)})</span>
                                    : zTelefonu
                                        ? <span className="pn-maly">Niepobrany – do otwarcia potrzebny jest internet.</span>
                                        : <div className="pn-rzad"><button type="button" className="pn-btn" disabled={!!pobieram} onClick={() => pobierz(p)}>{pobieram === p.slug ? 'pobieram…' : `pobierz do pracy bez internetu${p.bajty ? ` (${rozmiar(p.bajty)})` : ''}`}</button></div>}
                            </div>
                        )
                    })}
                </section>
            )}
            {dane?.mozna.miejsca && (
                <section className="pn-karta tr-karta" aria-labelledby="tr-nowe">
                    <h2 id="tr-nowe">nowe miejsce</h2>
                    <p className="pn-szary">Krzyż przy drodze, stary grób w lesie, ślad po kapliczce? Zrób zdjęcie i zapisz – położenie zostanie dodane automatycznie.</p>
                    <div className="pn-rzad"><Link href="/keystatic/teren/nowe" className="pn-btn pn-btn-gl">+ nowe miejsce</Link></div>
                </section>
            )}
            {dane && !dane.mozna.plany && !dane.mozna.miejsca && <p className="pn-szary">Twoje konto nie ma jeszcze uprawnień do pracy w terenie – poproś administratora.</p>}
        </>
    )
}
