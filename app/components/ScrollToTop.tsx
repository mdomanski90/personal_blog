'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { przewin } from '@/lib/ruch'

export default function ScrollToTop() {
    const [isVisible, setIsVisible] = useState(false)

    useEffect(() => {
        const toggleVisibility = () => {
            // Sprawdzamy scrolla na oknie LUB na elemencie root (HTML)
            const scrolled = window.scrollY || document.documentElement.scrollTop;

            if (scrolled > 300) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        // Dodajemy listener z opcją passive dla lepszej wydajności
        window.addEventListener('scroll', toggleVisibility, { passive: true })

        return () => window.removeEventListener('scroll', toggleVisibility)
    }, [])

    const scrollToTop = () => {
        // 5A: płynnie, przy ograniczeniu ruchu – skok
        przewin(window, { top: 0 })
    }

    // Dodaj to, żeby upewnić się, że nie ma problemów z hydracją (Next.js)
    const [mounted, setMounted] = useState(false);
    useEffect(() => setMounted(true), []);
    if (!mounted) return null;

    if (!isVisible) return null

    return (
        <Button
            onClick={scrollToTop}
            variant="outline"
            size="icon"
            className="przycisk-do-gory fixed bottom-8 right-8 rounded-sm lowercase z-[100] shadow-lg"
            style={{
                width: '48px',
                height: '48px',
                fontSize: 'calc(20px * var(--font-scale, 1))',
                fontWeight: '700',
                backgroundColor: 'var(--background)', // Upewnij się, że nie jest przezroczysty
            }}
            aria-label="Powrót na górę"
        >
            ↑
        </Button>
    )
}