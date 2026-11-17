'use client'

import { useEffect } from 'react'
import mediumZoom from 'medium-zoom'
import { przywrocFokus } from '@/lib/ruch'

/**
 * Powiększanie ilustracji wpisów (PD-06; PhotoSwipe usunięty w 5A – medium-zoom wystarcza).
 * Etap R: obraz dostępny z klawiatury – Tab do obrazu, Enter albo spacja otwiera powiększenie, Esc zamyka (biblioteka);
 * po zamknięciu fokus wraca na obraz (zasada 5.3).
 */
export default function ImageZoom() {
    useEffect(() => {
        const wybor = '.post-content img:not([data-dokument-img])'
        const zoom = mediumZoom(wybor, {
            margin: 24,
            background: 'rgba(0, 0, 0, 0.85)',
        })
        const obrazy = [...document.querySelectorAll<HTMLImageElement>(wybor)]
        const klawisz = (e: KeyboardEvent) => {
            if (e.key !== 'Enter' && e.key !== ' ') return
            e.preventDefault()
            zoom.open({ target: e.currentTarget as HTMLImageElement })
        }
        zoom.on('closed', (e) => { przywrocFokus(e.target as HTMLElement) })
        for (const img of obrazy) {
            img.tabIndex = 0
            img.setAttribute('role', 'button')
            img.setAttribute('aria-label', `powiększ ilustrację${img.alt ? `: ${img.alt}` : ''}`)
            img.addEventListener('keydown', klawisz)
        }
        return () => {
            zoom.detach()
            for (const img of obrazy) img.removeEventListener('keydown', klawisz)
        }
    }, [])

    return null
}
