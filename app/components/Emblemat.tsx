// Emblemat: kapliczka w Olszance w ramie-łuku (na podstawie obrazka M. Domańskiego).
// Przy pełnym wczytaniu strony (nagłówek nie jest montowany ponownie przy przejściach między stronami)
// rysuje się sama rama-łuk, a potem cała zawartość spokojnie pojawia się naraz. Bez animacji przy
// prefers-reduced-motion. Kolor = currentColor, więc działa w trybie ciemnym.

type Kreska = { d: string; w?: number; g?: string }

// Współrzędne w viewBox 80×104. Kapliczka w kształcie z obrazu „Kapliczka
// w Olszance” (dwuspadowy daszek, smukły słup), z detalami ze zdjęcia: wysoka
// nisza z półokrągłym naświetlem i figurą, gzyms, niższa szersza część
// z kwadratową wnęką za szybą, cokół z tabliczką. Rysowana w małej skali i powiększona (KAP).
// Za nią kościół (lewo) i cerkiew (prawo) na wzgórzach; od każdej świątyni
// płynie strumień, oba schodzą się za kapliczką (dwa wyznania, jedna wiara). Pod linią ziemi napis „kapliczka w Olszance”.

const KAP = 'translate(40 80) scale(1.3) translate(-40 -75)'
const LEWO = 'translate(-1 0)'

// w – grubość (w KAP przed skalowaniem)
// rama w kształcie łuku (jak nisza kapliczki) – jedyny element rysowany kreską
const RAMA = 'M2 102V40a38 38 0 0 1 76 0v62z'

const KRESKI: Kreska[] = [
    // kapliczka, od cokołu do krzyża
    { d: 'M31.5 75v-4.5h17V75M34.5 71.6h11v2.3h-11z', g: KAP, w: 1.2 },
    { d: 'M31 70.5l1-1.5h16l1 1.5z', g: KAP, w: 1.1 },
    { d: 'M32 69V59h16v10', g: KAP, w: 1.2 },
    { d: 'M36.8 60.8h6.4v6.4h-6.4zM37.8 61.8h4.4v4.4h-4.4zM38.6 65.2l2.2-2.2', g: KAP, w: 0.7 },
    { d: 'M30.8 59l1.4-2.5h15.6l1.4 2.5z', g: KAP, w: 1.2 },
    { d: 'M33.5 56.5V37h13v19.5', g: KAP, w: 1.2 },
    { d: 'M36.8 53.5V44a3.2 3.2 0 0 1 6.4 0v9.5zM36.8 44h6.4M40 44v-3.2M40 44l-2.3-2.3M40 44l2.3-2.3', g: KAP, w: 0.7 },
    { d: 'M38.7 52.5q.15-4.2.8-6q.5-.7 1 0q.65 1.8.8 6zM40 46.6a.7.7 0 1 0 0-1.4a.7.7 0 1 0 0 1.4', g: KAP, w: 0.6 },
    { d: 'M31.8 37v-2h16.4v2', g: KAP, w: 1.2 },
    { d: 'M31 35l9-8.5 9 8.5z', g: KAP, w: 1.2 },
    { d: 'M40 26.5v-8M37.2 21.3h5.6', g: KAP, w: 1.2 },
    // wzgórza za kapliczką
    { d: 'M2 64.5q3.5-5.5 8.5-6H28.4', w: 1.1 },
    { d: 'M51.6 58.5q2.2-3 4.4-3.5h13q2.5 0 5 1.5q2 1 4 2.5', w: 1.1 },
    // kościół po lewej: nawa, wieża z iglicą
    { d: 'M11 58.5V53h12v5.5M10 53l3-3.5h10M14 56.5v-2M17 56.5v-2M20 56.5v-2', g: LEWO, w: 1.1 },
    { d: 'M23 58.5V46h4v12.5M23 46l2-5 2 5M25 41v-3.2M24 39h2M24.3 52v-1.8a.7.7 0 0 1 1.4 0V52', g: LEWO, w: 1.1 },
    // cerkiew na wzgórzu po prawej: zrąb, dach okapowy, wyższa kondygnacja, dach, cebulka, krzyż
    { d: 'M57.5 55v-6h11v6M55.5 49l3-3h9l3 3M60 46v-4h6v4M59 42l4-3.5 4 3.5', w: 1.1 },
    { d: 'M61.6 38.5c-.5-2 .6-3 1.4-4.3c.8 1.3 1.9 2.3 1.4 4.3zM63 34.2V31M61.8 32.2h2.4', w: 1.0 },
    // strumienie od świątyń, schodzą się za kapliczką
    { d: 'M16 60.5c-3 2 1 3.5 4 4s6 1.5 4 3.5 2 3 5.6 3', w: 1.0 },
    { d: 'M60 56.5c3 2-1 3.5-4 4s-6 1.5-4 3.5-.5 3-1.6 3', w: 1.0 },
    // ziemia
    { d: 'M2 80h76', w: 1.3 },
    // ptaki
    { d: 'M51.5 18q1.6-1.6 3.2 0q1.6-1.6 3.2 0M57 13.5q1.3-1.3 2.6 0q1.3-1.3 2.6 0', w: 0.9 },
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
            <path className="emblemat-rama" d={RAMA} pathLength={1} strokeWidth={2} />
            <g className="emblemat-tresc">
                {KRESKI.map((k, i) => (
                    <path key={i} d={k.d} transform={k.g} strokeWidth={k.w ?? 1.4} />
                ))}
                <text fill="currentColor" stroke="none" fontSize={5} fontWeight={700} letterSpacing={0.6} textAnchor="middle" aria-hidden="true">
                    <tspan x={40} y={89.5}>KAPLICZKA</tspan>
                    <tspan x={40} y={95.7}>W OLSZANCE</tspan>
                </text>
            </g>
        </svg>
    )
}
