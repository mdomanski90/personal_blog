'use client'

import { useEffect, useState } from 'react'

/**
 * Adres składany w przeglądarce, żeby nie było go w HTML strony (części przychodzą osobno, bez „@”).
 * Etap R (decyzja 17.11): adres z ustawień – pole „adres e-mail do kontaktu” w singletonie „O projekcie” (adresKontaktowy()).
 */
export default function EmailLink({ u, d }: { u: string; d: string }) {
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        setEmail(`${u}@${d}`)
    }, [u, d])

    if (!email) {
        return <span className="text-[var(--tekst-etykieta)]">[adres pojawi się po załadowaniu strony]</span>
    }

    return <a href={`mailto:${email}`}>{email}</a>
}
