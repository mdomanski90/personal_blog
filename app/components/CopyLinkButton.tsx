'use client'

import { useState } from 'react'
import { Check } from 'lucide-react'
import { Toggle } from "@/components/ui/toggle"

interface CopyLinkButtonProps {
    /** Ścieżka strony, np. „/wpisy/niepamiec”. */
    sciezka: string
}

export default function CopyLinkButton({ sciezka }: CopyLinkButtonProps) {
    const [copied, setCopied] = useState(false)

    const handleCopy = async () => {
        const url = `${window.location.origin}${sciezka}`

        try {
            await navigator.clipboard.writeText(url)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        } catch (err) {
            console.error('Błąd kopiowania:', err)
        }
    }

    return (
        <Toggle
            aria-label="Kopiuj link"
            size="sm"
            variant="outline"
            pressed={copied}
            onPressedChange={handleCopy}
            className="lowercase data-[state=on]:bg-muted data-[state=on]:text-primary"
            style={{
                height: 'calc(35px * var(--font-scale, 1))',
                fontSize: 'calc(16px * var(--font-scale, 1))',
            }}
        >
            {copied ? (
                <>
                    <Check className="w-3.5 h-3.5 mr-1" />
                    skopiowano
                </>
            ) : (
                'kopiuj link'
            )}
        </Toggle>
    )
}
