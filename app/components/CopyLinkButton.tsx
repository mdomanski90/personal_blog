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
            className={`border border-[#d6d1c6] dark:border-[#4b5563] lowercase whitespace-nowrap cursor-pointer transition-colors ${copied ? 'bg-muted text-accent-foreground' : 'bg-transparent text-current hover:bg-muted'}`}
            style={{
                fontFamily: 'inherit',
                fontSize: 'calc(14px * var(--font-scale, 1))',
                minHeight: 'calc(28px * var(--font-scale, 1))',
                padding: '0 10px',
                borderRadius: '7px',
            }}
        >
            {copied ? 'skopiowano ✓' : 'kopiuj link'}
        </button>
    )
}
