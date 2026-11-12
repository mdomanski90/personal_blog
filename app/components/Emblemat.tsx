// Emblemat: kapliczka w Olszance w owalu (na podstawie obrazka M. Domańskiego).
// Kreski „rysują się” raz, przy pełnym wczytaniu strony (nagłówek nie jest
// montowany ponownie przy przejściach między stronami). Bez animacji przy
// prefers-reduced-motion. Kolor = currentColor, więc działa w trybie ciemnym.

type Kreska = { d: string; w?: number; o: number; t?: number; g?: string }

// Grupy powiększone wokół podstawy, żeby scena wypełniała owal.
const KAP = 'translate(40 78) scale(1.3) translate(-40 -75)'
const LEWO = 'translate(20 78) scale(1.15) translate(-20 -72)'
const PRAWO = 'translate(61 78) scale(1.15) translate(-62 -72)'

// o – opóźnienie (s), t – czas rysowania (s), w – grubość (przed skalowaniem grupy)
const KRESKI: Kreska[] = [
    // owal
    { d: 'M40 2a38 50 0 1 0 0.01 0z', w: 2, o: 0, t: 1.1 },
    // kapliczka: cokół, korpus dolny z wnęką, gzyms, korpus górny z wnęką łukową, gzyms, daszek, krzyż
    { d: 'M30.5 75v-4h19v4', g: KAP, w: 1.3, o: 0.6 },
    { d: 'M32.5 71V59.5h15V71', g: KAP, w: 1.3, o: 0.75 },
    { d: 'M37 62.5h6V68h-6z', g: KAP, w: 0.9, o: 0.95, t: 0.4 },
    { d: 'M30.5 59.5V57h19v2.5z', g: KAP, w: 1.3, o: 1.0, t: 0.5 },
    { d: 'M33 57V41h14v16', g: KAP, w: 1.3, o: 1.1 },
    { d: 'M37 54v-8a3 3 0 0 1 6 0v8z', g: KAP, w: 0.9, o: 1.25, t: 0.5 },
    { d: 'M31 41v-2h18v2', g: KAP, w: 1.3, o: 1.3, t: 0.4 },
    { d: 'M30 39l10-7 10 7', g: KAP, w: 1.3, o: 1.4, t: 0.5 },
    { d: 'M40 32v-8M37 27h6', g: KAP, w: 1.3, o: 1.6, t: 0.4 },
    // ziemia
    { d: 'M11 78h16.6M52.4 78H69', w: 1.4, o: 1.4, t: 0.5 },
    // kościół po lewej
    { d: 'M14 72v-6h8.5v6M13 66l3-3.5h6.5', g: LEWO, w: 1.1, o: 1.7, t: 0.5 },
    { d: 'M22.5 72V60.5h3.5V72M22.5 60.5l1.75-5 1.75 5M24.25 55.5V52.5M23.2 53.6h2.1', g: LEWO, w: 1.1, o: 1.9, t: 0.5 },
    // cerkiew na wzgórzu po prawej
    { d: 'M55 72q7-7.5 13-3', g: PRAWO, w: 1.1, o: 1.7, t: 0.4 },
    { d: 'M57 69v-5h9v5M56 64l2.5-2.5h6l2.5 2.5M59.5 61.5V59h4v2.5M59.5 59q2-4.5 4 0M61.5 54.5v-3M60.4 52.6h2.2', g: PRAWO, w: 1.1, o: 1.9, t: 0.6 },
    // rzeka
    { d: 'M17 84c8-3 13 4 20 2s10 4 22 3', w: 1.2, o: 2.0, t: 0.7 },
    { d: 'M24 90c5-1.5 9 2 14 1s7 2 14 1.5', w: 0.8, o: 2.2, t: 0.6 },
    // ptaki
    { d: 'M51 24q1.6-1.6 3.2 0q1.6-1.6 3.2 0M58 19.5q1.3-1.3 2.6 0q1.3-1.3 2.6 0', w: 0.9, o: 2.3, t: 0.4 },
]

export default function Emblemat({ rozmiar = 56, animacja = true }: { rozmiar?: number; animacja?: boolean }) {
    return (
        <svg
            viewBox="0 0 80 104"
            width={Math.round((rozmiar * 80) / 104)}
            height={rozmiar}
            className={animacja ? 'emblemat emblemat-rysuj' : 'emblemat'}
            fill="none"
            stroke="currentColor"
            strokeLinecap="round"
            strokeLinejoin="round"
            role="img"
            aria-label="kapliczka w Olszance"
        >
            {KRESKI.map((k, i) => (
                <path
                    key={i}
                    d={k.d}
                    transform={k.g}
                    pathLength={1}
                    strokeWidth={k.w ?? 1.4}
                    style={{ animationDelay: `${k.o}s`, animationDuration: `${k.t ?? 0.6}s` } as React.CSSProperties}
                />
            ))}
        </svg>
    )
}
