'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

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
        window.scrollTo({
            top: 0,
            behavior: 'smooth'
        })
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
            className="fixed bottom-8 right-8 rounded-sm font-mono lowercase z-[100] shadow-lg"
            style={{
                width: '48px',
                height: '48px',
                fontSize: '20px',
                fontWeight: '700',
                backgroundColor: 'var(--background)', // Upewnij się, że nie jest przezroczysty
            }}
            aria-label="Powrót na górę"
        >
            ↑
        </Button>
    )
}