'use client'

import { useState } from 'react'

interface CopyLinkButtonProps {
    /** Ścieżka strony, np. „/wpisy/niepamiec”. */
    sciezka: string
}

/** Obramowany przycisk w stylu wyszukiwarki i przełącznika motywu. */
export default function CopyLinkButton({ sciezka }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        try {
            await navigator.clipboard.writeText(`${window.location.origin}${sciezka}`)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Błąd kopiowania:', err)
        }
    }

    return (
        <button
            type="button"
            onClick={handleCopy}
            aria-label="kopiuj link do tej strony"
            className={`kopiuj-link border border-[#d6d1c6] dark:border-[#4b5563] lowercase whitespace-nowrap cursor-pointer transition-colors ${copied ? 'bg-muted text-accent-foreground' : 'bg-transparent text-current hover:bg-muted'}`}
            style={{
                fontFamily: 'inherit',
                fontSize: 'calc(14px * var(--font-scale, 1))',
                minHeight: 'calc(28px * var(--font-scale, 1))',
                padding: '0 10px',
                borderRadius: '7px',
            }}
        >
            {!copied && <svg width="13" height="13" viewBox="0 0 16 16" aria-hidden="true"><path d="M6.5 9.5l3-3M7 4.5l1.2-1.2a2.6 2.6 0 0 1 3.7 3.7L10.7 8.2M9 11.5l-1.2 1.2a2.6 2.6 0 0 1-3.7-3.7L5.3 7.8" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" /></svg>}
            {copied ? 'skopiowano ✓' : 'kopiuj link'}
        </button>
    )
}
