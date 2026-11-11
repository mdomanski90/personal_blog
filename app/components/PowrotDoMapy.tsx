import { Link } from 'next-view-transitions'

/** „← mapa” – powrót na stronę miejsc; mapa pamięta ostatni widok (przybliżenie, rok granic). */
export default function PowrotDoMapy() {
    return (
        <Link
            href="/miejsca"
            className="border border-[#d1d5db] dark:border-[#4b5563] lowercase whitespace-nowrap !no-underline text-current hover:bg-muted transition-colors inline-flex items-center"
            style={{ fontSize: 'calc(14px * var(--font-scale, 1))', minHeight: 'calc(28px * var(--font-scale, 1))', padding: '0 10px', borderRadius: '7px' }}
        >
            ← mapa
        </Link>
    )
}
