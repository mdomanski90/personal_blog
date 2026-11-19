'use client'

// OPS-08 (19.11): „pokaż adres e-mail” – po kliknięciu przycisk zamienia się w odnośnik mailto (fokus przechodzi na odnośnik).
// Przyciski wstawia naHtml (adresy w treści) i EmailLink (adres kontaktowy); adres zakodowany w data-k (lib/email-ochrona).

import { useEffect } from 'react'
import { odkoduj } from '@/lib/email-ochrona'

export function pokazAdres(b: HTMLElement) {
    const adres = odkoduj(b.dataset.k ?? '')
    if (!adres.includes('@')) return
    const a = document.createElement('a')
    a.href = `mailto:${adres}`
    a.textContent = adres
    b.replaceWith(a)
    a.focus()
}

export default function UkryteAdresy() {
    useEffect(() => {
        const klik = (e: MouseEvent) => {
            const b = (e.target as Element | null)?.closest?.<HTMLElement>('button.email-pokaz[data-k]')
            if (b && !b.closest('[data-adres-wlasny]')) pokazAdres(b)
        }
        document.addEventListener('click', klik)
        return () => document.removeEventListener('click', klik)
    }, [])
    return null
}
