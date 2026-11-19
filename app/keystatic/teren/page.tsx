'use client'
// P7b (TER-01): „w terenie” – start: moje plany z postępem i „nowe miejsce” (plansza „plany (start)”).
import Link from 'next/link'
import { odmiana } from '@/lib/tekst'
import { Blad, useTeren } from './wspolne'

type Plan = { slug: string; tytul: string; geo: boolean; groby: number; sprawdzone: number; bezZdjecia: number }
type Dane = { imie: string; mozna: { plany: boolean; miejsca: boolean }; plany: Plan[] }

export default function Start() {
    const { dane, blad } = useTeren<Dane>('/api/keystatic/teren')
    return (
        <>
            <header className="pn-kol pn-kol-wasko">
                <h1>w terenie</h1>
                {dane && <span className="pn-maly">{dane.imie}</span>}
            </header>
            {blad && <Blad tekst={blad} />}
            {!dane && !blad && <span className="pn-szary">wczytuję…</span>}
            {dane?.mozna.plany && (
                <section className="pn-karta tr-karta" aria-labelledby="tr-plany">
                    <h2 id="tr-plany">moje plany</h2>
                    {dane.plany.length === 0 && <p className="pn-szary">Nie masz jeszcze przydzielonych planów. Poproś administratora, żeby dodał je na karcie twojego konta.</p>}
                    {dane.plany.map((p) => (
                        <Link key={p.slug} href={`/keystatic/teren/plan/${p.slug}`} className="tr-plan">
                            <b>{p.tytul}</b>
                            <span className="pn-maly">{odmiana(p.groby, ['grób', 'groby', 'grobów'])} · sprawdzone {p.sprawdzone} · bez zdjęcia {p.bezZdjecia}</span>
                            <progress className="tr-postep" max={Math.max(1, p.groby)} value={p.sprawdzone} aria-label={`sprawdzone ${p.sprawdzone} z ${p.groby}`} />
                            {!p.geo && <span className="pn-maly">Ten plan nie ma jeszcze punktów położenia – nie pokaże, gdzie stoisz.</span>}
                        </Link>
                    ))}
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
