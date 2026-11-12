// Emblemat: kapliczka w Olszance w owalu (na podstawie obrazka M. Domańskiego).
// Kreski „rysują się” raz, przy pełnym wczytaniu strony (nagłówek nie jest
// montowany ponownie przy przejściach między stronami). Bez animacji przy
// prefers-reduced-motion. Kolor = currentColor, więc działa w trybie ciemnym.

type Kreska = { d: string; w?: number; o: number; t?: number; g?: string }

// Współrzędne w viewBox 80×104. Kapliczka według zdjęcia (Olszanka): krzyż,
// płaski daszek z okapem, fryz, wysoka nisza z półokrągłym naświetlem i figurą,
// gzyms, niższa szersza część z kwadratową wnęką, cokół. Za nią kościół (lewo)
// i cerkiew (prawo) na wzgórzach; od każdej świątyni płynie strumień, oba
// schodzą się za kapliczką (dwa wyznania, jedna wiara – jak na obrazie).

// o – opóźnienie (s), t – czas rysowania (s), w – grubość
const KRESKI: Kreska[] = [
    // owal
    { d: 'M40 2a38 50 0 1 0 0.01 0z', w: 2, o: 0, t: 1.1 },
    // kapliczka, od cokołu do krzyża
    { d: 'M30 80v-5h20v5', w: 1.5, o: 0.55, t: 0.4 },
    { d: 'M29 75v-2h22v2', w: 1.5, o: 0.65, t: 0.35 },
    { d: 'M30.5 73V60h19v13', w: 1.5, o: 0.75, t: 0.5 },
    { d: 'M35 63h10v7.5H35zM37 65h6v3.5h-6z', w: 0.9, o: 0.95, t: 0.5 },
    { d: 'M29 60l2-3h18l2 3z', w: 1.5, o: 1.0, t: 0.45 },
    { d: 'M32.5 57V30h15v27', w: 1.5, o: 1.1, t: 0.55 },
    { d: 'M35.5 54V37.5a4.5 4.5 0 0 1 9 0V54zM35.5 37.5h9M40 37.5V33M40 37.5l-3.2-3.2M40 37.5l3.2-3.2', w: 0.9, o: 1.3, t: 0.6 },
    { d: 'M38.2 52q.2-5 1-7.6q.8-.9 1.6 0q.8 2.6 1 7.6zM40 43.3a1.1 1.1 0 1 0 0-2.2a1.1 1.1 0 1 0 0 2.2', w: 0.8, o: 1.55, t: 0.4 },
    { d: 'M31.5 30L29 25.5h22L48.5 30', w: 1.5, o: 1.5, t: 0.4 },
    { d: 'M27 25.5h26M27 25.5l4-5.5h18l4 5.5', w: 1.5, o: 1.6, t: 0.45 },
    { d: 'M40 20V8.5M36.5 12.5h7', w: 1.5, o: 1.8, t: 0.4 },
    // wzgórza za kapliczką
    { d: 'M4 63q3-4 6.5-4.5H29', w: 1.1, o: 1.7, t: 0.5 },
    { d: 'M51 58.5q2.5-3 5-3.5h13q2.5 0 5 1.5', w: 1.1, o: 1.7, t: 0.5 },
    // kościół po lewej: nawa, wieża z iglicą
    { d: 'M11 58.5V53h12v5.5M10 53l3-3.5h10M14 56.5v-2M17 56.5v-2M20 56.5v-2', w: 1.1, o: 1.9, t: 0.5 },
    { d: 'M23 58.5V46h4v12.5M23 46l2-5 2 5M25 41v-3.2M24 39h2M24.3 52v-1.8a.7.7 0 0 1 1.4 0V52', w: 1.1, o: 2.0, t: 0.5 },
    // cerkiew na wzgórzu po prawej: zrąb, dach okapowy, wyższa kondygnacja, dach, cebulka, krzyż
    { d: 'M57.5 55v-6h11v6M55.5 49l3-3h9l3 3M60 46v-4h6v4M59 42l4-3.5 4 3.5', w: 1.1, o: 1.9, t: 0.6 },
    { d: 'M61.6 38.5c-.5-2 .6-3 1.4-4.3c.8 1.3 1.9 2.3 1.4 4.3zM63 34.2V31M61.8 32.2h2.4', w: 1.0, o: 2.15, t: 0.4 },
    // strumienie od świątyń, schodzą się za kapliczką
    { d: 'M16 60.5c-3 2 1 3.5 4 4s6 1.5 4 3.5 2 3 6.5 3', w: 1.0, o: 2.2, t: 0.7 },
    { d: 'M60 56.5c3 2-1 3.5-4 4s-6 1.5-4 3.5-2 3-2.5 3', w: 1.0, o: 2.2, t: 0.7 },
    // ziemia i zboże na pierwszym planie
    { d: 'M9 80h21M50 80h21', w: 1.3, o: 1.5, t: 0.4 },
    { d: 'M14 85l-.8-2.6M18.5 85l.6-2.8M23 85l-.8-2.6M27.5 85l.6-2.8M52.5 85l-.6-2.8M57 85l.8-2.6M61.5 85l-.6-2.8M66 85l.8-2.6M20 90l-.8-2.6M24.5 90l.6-2.8M29 90l-.8-2.6M33.5 90l.6-2.8M38 90l-.8-2.6M42.5 90l.6-2.8M47 90l-.8-2.6M51.5 90l.6-2.8M56 90l-.8-2.6M60.5 90l.6-2.8', w: 0.7, o: 2.5, t: 0.4 },
    // ptaki
    { d: 'M51.5 18q1.6-1.6 3.2 0q1.6-1.6 3.2 0M57 13.5q1.3-1.3 2.6 0q1.3-1.3 2.6 0', w: 0.9, o: 2.6, t: 0.4 },
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
