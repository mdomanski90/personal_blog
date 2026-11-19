'use client'

import { useState } from 'react'
import { odkoduj, PRZYCISK_ADRESU } from '@/lib/email-ochrona'

/**
 * Adres kontaktowy chroniony przed botami (OPS-08, 19.11): w HTML i danych strony tylko zakodowany (lib/email-ochrona),
 * widoczny po kliknięciu „pokaż adres e-mail”. Etap R (decyzja 17.11): adres z ustawień – pole „adres e-mail do kontaktu”
 * w singletonie „O projekcie” (adresKontaktowy()); wywołujący przekazuje zakoduj(adres).
 */
export default function EmailLink({ k }: { k: string }) {
    const [adres, ustawAdres] = useState<string | null>(null)
    if (!adres) return <button type="button" className="email-pokaz k-btn k-btn--s" data-adres-wlasny onClick={() => ustawAdres(odkoduj(k))}>{PRZYCISK_ADRESU}</button>
    return <a href={`mailto:${adres}`} autoFocus>{adres}</a>
}
