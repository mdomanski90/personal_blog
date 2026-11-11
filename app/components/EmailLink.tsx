'use client'

import { useEffect, useState } from 'react'

// Adres składany w przeglądarce, żeby nie było go w HTML strony.
const USER = 'odniepamieci.dice072'
const DOMAIN = 'passfwd.com'

export default function EmailLink() {
    const [email, setEmail] = useState<string | null>(null)

    useEffect(() => {
        setEmail(`${USER}@${DOMAIN}`)
    }, [])

    if (!email) {
        return <span className="text-gray-500">[adres pojawi się po załadowaniu strony]</span>
    }

    return <a href={`mailto:${email}`}>{email}</a>
}
