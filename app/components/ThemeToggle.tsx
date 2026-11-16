"use client"
import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { flushSync } from "react-dom"
import { zmienZWygaszeniem } from "@/lib/ruch"

const FONT_SIZES = [14, 16, 18, 20, 22]
const DEFAULT_SIZE = 18
const ZDARZENIE = 'odp:rozmiar-czcionki'


// P7A-2: grupa kontrolek rozmiaru S (k-grupa w globals.css); na telefonie 44 px.

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

    return (
        <div className="k-grupa" role="group" aria-label="motyw i rozmiar pisma">
            <button
                type="button"
                // 5A: motyw jednym wygaszeniem całej strony (jak przejście stron); bez ruchu – od razu
                onClick={() => zmienZWygaszeniem(() => flushSync(() => setTheme(ciemny ? 'light' : 'dark')))}
                aria-label={ciemny ? 'jasny motyw' : 'ciemny motyw'}
                title={ciemny ? 'jasny motyw' : 'ciemny motyw'}
            >
                {ciemny ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <button
                type="button"
                onClick={() => zmienRozmiar(-1)}
                disabled={najmniejszy}
                aria-label="mniejsza czcionka"
                title="mniejsza czcionka"
            >
                A−
            </button>
            <button
                type="button"
                onClick={() => zmienRozmiar(1)}
                disabled={najwiekszy}
                aria-label="większa czcionka"
                title="większa czcionka"
            >
                A+
            </button>
        </div>
    )
}
