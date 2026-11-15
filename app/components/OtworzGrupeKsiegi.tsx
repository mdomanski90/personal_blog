'use client'

import { useEffect } from 'react'

/** Po wejściu z wyszukiwarki lub dawnego odnośnika otwieramy grupę zawierającą kotwicę. */
export default function OtworzGrupeKsiegi({ idParafii }: { idParafii: string[] }) {
    useEffect(() => {
        const pokaz = () => {
            let id: string
            try { id = decodeURIComponent(window.location.hash.slice(1)) } catch { return }
            if (!id) return
            const cel = document.getElementById(id)
            if (!cel) {
                // Zachowanie starych linków „/biblioteka/ksiegi#slug-parafii”.
                if (idParafii.includes(id) && new URL(window.location.href).searchParams.get('widok') !== 'parafie') {
                    const adres = new URL(window.location.href)
                    adres.searchParams.set('widok', 'parafie')
                    window.location.replace(adres.toString())
                }
                return
            }
            const grupa = cel instanceof HTMLDetailsElement ? cel : cel.closest('details')
            if (grupa && !grupa.open) grupa.open = true
            window.requestAnimationFrame(() => cel.scrollIntoView({ block: 'start' }))
        }
        pokaz()
        window.addEventListener('hashchange', pokaz)
        return () => window.removeEventListener('hashchange', pokaz)
    }, [idParafii])
    return null
}
