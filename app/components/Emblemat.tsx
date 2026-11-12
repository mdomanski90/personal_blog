// Emblemat: kapliczka w Olszance w owalu (na podstawie obrazka M. Domańskiego).
// Kreski „rysują się” raz, przy pełnym wczytaniu strony (nagłówek nie jest
// montowany ponownie przy przejściach między stronami). Bez animacji przy
// prefers-reduced-motion. Kolor = currentColor, więc działa w trybie ciemnym.

type Kreska = { d: string; w?: number; o: number; t?: number; g?: string }

// Współrzędne w viewBox 80×104. Kapliczka w kształcie z obrazu „Kapliczka
// w Olszance” (dwuspadowy daszek, smukły słup), z detalami ze zdjęcia: wysoka
// nisza z półokrągłym naświetlem i figurą, gzyms, niższa szersza część
// z prostokątną wnęką, cokół. Rysowana w małej skali i powiększona (KAP).
// Za nią kościół (lewo) i cerkiew (prawo) na wzgórzach; od każdej świątyni
// płynie strumień, oba schodzą się za kapliczką (dwa wyznania, jedna wiara). Z przodu ścieżka i bruzdy pola.

const KAP = 'translate(40 80) scale(1.3) translate(-40 -75)'
const LEWO = 'translate(-1 0)'

// o – opóźnienie (s), t – czas rysowania (s), w – grubość (w KAP przed skalowaniem)
const KRESKI: Kreska[] = [
    // owal
    { d: 'M40 2a38 50 0 1 0 0.01 0z', w: 2, o: 0, t: 1.1 },
    // kapliczka, od cokołu do krzyża
    { d: 'M30.5 75v-4h19v4', g: KAP, w: 1.2, o: 0.55, t: 0.4 },
    { d: 'M32 71V59h16v12', g: KAP, w: 1.2, o: 0.7, t: 0.5 },
    { d: 'M37.3 61.2h5.4v7.6h-5.4zM38.3 62.2h3.4v5.6h-3.4z', g: KAP, w: 0.7, o: 0.9, t: 0.5 },
    { d: 'M30.8 59l1.4-2.5h15.6l1.4 2.5z', g: KAP, w: 1.2, o: 1.0, t: 0.45 },
    { d: 'M33.5 56.5V37h13v19.5', g: KAP, w: 1.2, o: 1.1, t: 0.55 },
    { d: 'M36.8 53.5V44a3.2 3.2 0 0 1 6.4 0v9.5zM36.8 44h6.4M40 44v-3.2M40 44l-2.3-2.3M40 44l2.3-2.3', g: KAP, w: 0.7, o: 1.3, t: 0.6 },
    { d: 'M38.7 52.5q.15-4.2.8-6q.5-.7 1 0q.65 1.8.8 6zM40 46.6a.7.7 0 1 0 0-1.4a.7.7 0 1 0 0 1.4', g: KAP, w: 0.6, o: 1.55, t: 0.4 },
    { d: 'M31.8 37v-2h16.4v2', g: KAP, w: 1.2, o: 1.5, t: 0.4 },
    { d: 'M31 35l9-8.5 9 8.5z', g: KAP, w: 1.2, o: 1.6, t: 0.5 },
    { d: 'M40 26.5v-8M37.2 21.3h5.6', g: KAP, w: 1.2, o: 1.8, t: 0.4 },
    // wzgórza za kapliczką
    { d: 'M4 63q3-4 6.5-4.5H28.4', w: 1.1, o: 1.7, t: 0.5 },
    { d: 'M51.6 58.5q2.2-3 4.4-3.5h13q2.5 0 5 1.5', w: 1.1, o: 1.7, t: 0.5 },
    // kościół po lewej: nawa, wieża z iglicą
    { d: 'M11 58.5V53h12v5.5M10 53l3-3.5h10M14 56.5v-2M17 56.5v-2M20 56.5v-2', g: LEWO, w: 1.1, o: 1.9, t: 0.5 },
    { d: 'M23 58.5V46h4v12.5M23 46l2-5 2 5M25 41v-3.2M24 39h2M24.3 52v-1.8a.7.7 0 0 1 1.4 0V52', g: LEWO, w: 1.1, o: 2.0, t: 0.5 },
    // cerkiew na wzgórzu po prawej: zrąb, dach okapowy, wyższa kondygnacja, dach, cebulka, krzyż
    { d: 'M57.5 55v-6h11v6M55.5 49l3-3h9l3 3M60 46v-4h6v4M59 42l4-3.5 4 3.5', w: 1.1, o: 1.9, t: 0.6 },
    { d: 'M61.6 38.5c-.5-2 .6-3 1.4-4.3c.8 1.3 1.9 2.3 1.4 4.3zM63 34.2V31M61.8 32.2h2.4', w: 1.0, o: 2.15, t: 0.4 },
    // strumienie od świątyń, schodzą się za kapliczką
    { d: 'M16 60.5c-3 2 1 3.5 4 4s6 1.5 4 3.5 2 3 5.6 3', w: 1.0, o: 2.2, t: 0.7 },
    { d: 'M60 56.5c3 2-1 3.5-4 4s-6 1.5-4 3.5-.5 3-1.6 3', w: 1.0, o: 2.2, t: 0.7 },
    // ziemia, ścieżka do kapliczki, bruzdy pola zbiegające się ku kapliczce
    { d: 'M8 80h21.2M50.8 80H72', w: 1.3, o: 1.5, t: 0.4 },
    { d: 'M29.2 80l-3 17.5M50.8 80l3 17.5', w: 1.1, o: 2.3, t: 0.5 },
    { d: 'M27 80.2q-7 2.3-14.6 6.6M27.8 80.4q-5 4.5-9.6 12.2M28.6 80.6q-2.6 6-4.4 15', w: 0.75, o: 2.45, t: 0.5 },
    { d: 'M53 80.2q7 2.3 14.6 6.6M52.2 80.4q5 4.5 9.6 12.2M51.4 80.6q2.6 6 4.4 15', w: 0.75, o: 2.45, t: 0.5 },
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
