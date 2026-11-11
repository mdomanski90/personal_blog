"use client"
import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"

const FONT_SIZES = [14, 16, 18, 20, 22]
const DEFAULT_SIZE = 18
const ZDARZENIE = 'odp:rozmiar-czcionki'

const RAMKA = 'border-[#d1d5db] dark:border-[#4b5563]'

// Ten sam wygląd co menu i wyszukiwarka: obramowane segmenty, czcionka strony.
// Kolory, tło i obramowanie w klasach (styl wpisany w element miałby pierwszeństwo przed hover/disabled).
const segment: React.CSSProperties = {
    fontSize: '14px',
    fontWeight: 700,
    height: '28px',
    minWidth: '36px',
    padding: '0 10px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontFamily: 'inherit',
}

function ustawRozmiar(size: number) {
    document.documentElement.style.setProperty('--blog-font-size', `${size}px`)
    document.documentElement.style.setProperty('--font-scale', String(size / 18))
}

export default function ThemeToggle() {
    const { resolvedTheme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [fontSize, setFontSize] = React.useState(DEFAULT_SIZE)

    React.useEffect(() => {
        setMounted(true)
        let size = DEFAULT_SIZE
        try {
            const zapisany = parseInt(localStorage.getItem('blog-font-size') ?? '')
            if (FONT_SIZES.includes(zapisany)) size = zapisany
        } catch {}
        setFontSize(size)
        ustawRozmiar(size)
        // przyciski są w nagłówku dwa razy (komputer / telefon) – trzymamy je w zgodzie
        const naZmiane = (e: Event) => setFontSize((e as CustomEvent<number>).detail)
        window.addEventListener(ZDARZENIE, naZmiane)
        return () => window.removeEventListener(ZDARZENIE, naZmiane)
    }, [])

    const zmienRozmiar = (kierunek: 1 | -1) => {
        const i = FONT_SIZES.indexOf(fontSize)
        const nowy = FONT_SIZES[Math.min(Math.max(i + kierunek, 0), FONT_SIZES.length - 1)]
        setFontSize(nowy)
        try { localStorage.setItem('blog-font-size', String(nowy)) } catch {}
        ustawRozmiar(nowy)
        window.dispatchEvent(new CustomEvent(ZDARZENIE, { detail: nowy }))
    }

    // Rezerwujemy miejsce, żeby nagłówek nie skakał przed wczytaniem.
    if (!mounted) return <div style={{ height: 30, width: 130 }} />

    const ciemny = resolvedTheme === 'dark'
    const najmniejszy = fontSize === FONT_SIZES[0]
    const najwiekszy = fontSize === FONT_SIZES[FONT_SIZES.length - 1]
    const klasa = (wylaczony = false) =>
        `border-0 bg-transparent ${wylaczony ? 'text-gray-400 dark:text-gray-600 cursor-default' : 'text-current cursor-pointer hover:bg-muted transition-colors'}`

    return (
        <div className={`flex items-stretch overflow-hidden border ${RAMKA}`} style={{ borderRadius: '7px' }}>
            <button
                type="button"
                onClick={() => setTheme(ciemny ? 'light' : 'dark')}
                style={segment}
                className={klasa()}
                aria-label={ciemny ? 'jasny motyw' : 'ciemny motyw'}
                title={ciemny ? 'jasny motyw' : 'ciemny motyw'}
            >
                {ciemny ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
                type="button"
                onClick={() => zmienRozmiar(-1)}
                disabled={najmniejszy}
                style={segment}
                className={`border-l ${RAMKA} ${klasa(najmniejszy)}`}
                aria-label="mniejsza czcionka"
                title="mniejsza czcionka"
            >
                A−
            </button>
            <button
                type="button"
                onClick={() => zmienRozmiar(1)}
                disabled={najwiekszy}
                style={segment}
                className={`border-l ${RAMKA} ${klasa(najwiekszy)}`}
                aria-label="większa czcionka"
                title="większa czcionka"
            >
                A+
            </button>
        </div>
    )
}
