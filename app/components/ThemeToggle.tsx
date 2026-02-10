"use client"
import * as React from "react"
import { Sun, Moon } from "lucide-react"
import { useTheme } from "next-themes"
import { Button } from "../../components/ui/button"

const FONT_SIZES = [14, 16, 18, 20, 22]
const DEFAULT_SIZE = 18

export default function ThemeToggle() {
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = React.useState(false)
    const [fontSize, setFontSize] = React.useState(DEFAULT_SIZE)

    React.useEffect(() => {
        setMounted(true)
        const saved = localStorage.getItem('blog-font-size')
        if (saved) {
            const size = parseInt(saved)
            setFontSize(size)
            updateProperties(size)
        } else {
            updateProperties(DEFAULT_SIZE)
        }
    }, [])

    const updateProperties = (size: number) => {
        if (typeof window === 'undefined') return;

        // 1. Ustawiamy zmienne CSS
        document.documentElement.style.setProperty('--blog-font-size', `${size}px`)
        document.documentElement.style.setProperty('--font-scale', String(size / 18))

        // 2. Wysyłamy serię sygnałów do Shuffle.js
        // Robimy to kilka razy (w odstępach), aby "nadążyć" za zmianą rozmiaru w przeglądarce
        const delays = [10, 100, 300, 600];
        delays.forEach(delay => {
            setTimeout(() => {
                window.dispatchEvent(new CustomEvent('blog:font-changed'));
                window.dispatchEvent(new Event('resize'));
            }, delay);
        });
    }

    const changeFontSize = (direction: 'up' | 'down') => {
        const currentIndex = FONT_SIZES.indexOf(fontSize)
        const newIndex = direction === 'up'
            ? Math.min(currentIndex + 1, FONT_SIZES.length - 1)
            : Math.max(currentIndex - 1, 0)
        const newSize = FONT_SIZES[newIndex]

        setFontSize(newSize)
        localStorage.setItem('blog-font-size', String(newSize))
        updateProperties(newSize)
    }

    if (!mounted) return <div style={{ height: 48, width: 160 }} />

    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Button
                variant="outline"
                size="default"
                onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
                style={{ height: 48, width: 48, minWidth: 48 }}
                className="rounded-sm"
            >
                <Sun className="h-5 w-5 rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0" />
                <Moon className="absolute h-5 w-5 rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100" />
                <span className="sr-only">Toggle theme</span>
            </Button>
            <Button
                variant="outline"
                size="default"
                onClick={() => changeFontSize('down')}
                disabled={fontSize === FONT_SIZES[0]}
                style={{ height: 48, width: 48, minWidth: 48, fontSize: 16, fontWeight: 700 }}
                className="rounded-sm"
            >
                A−
            </Button>
            <Button
                variant="outline"
                size="default"
                onClick={() => changeFontSize('up')}
                disabled={fontSize === FONT_SIZES[FONT_SIZES.length - 1]}
                style={{ height: 48, width: 48, minWidth: 48, fontSize: 16, fontWeight: 700 }}
                className="rounded-sm"
            >
                A+
            </Button>
        </div>
    )
}