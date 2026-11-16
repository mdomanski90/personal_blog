import * as React from 'react'

/**
 * PH-23: miniatura planu – rysunek planu w wersji dla czytelnika (/plany/<slug>/podglad.svg) w motywie strony:
 * dwa obrazki przełączane klasą motywu (przeglądarka pobiera tylko widoczny – loading="lazy"),
 * albo strona skanu materiału, gdy plan zrekonstruowano ze skanu, który czytelnik widzi.
 */
export default function MiniaturaPlanu({ slug, skan }: { slug: string; skan?: string }) {
    /* eslint-disable @next/next/no-img-element */
    if (skan) return <img src={skan.startsWith('/pliki/strony/') ? `${skan}?w=480` : skan} alt="" loading="lazy" decoding="async" />
    return (
        <>
            <img className="miniatura-planu tylko-jasny" src={`/plany/${slug}/podglad.svg?motyw=jasny`} alt="" loading="lazy" decoding="async" />
            <img className="miniatura-planu tylko-ciemny" src={`/plany/${slug}/podglad.svg?motyw=ciemny`} alt="" loading="lazy" decoding="async" />
        </>
    )
    /* eslint-enable @next/next/no-img-element */
}
