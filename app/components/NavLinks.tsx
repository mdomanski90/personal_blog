'use client'

import { Link } from 'next-view-transitions'
import { usePathname } from 'next/navigation'

export default function NavLinks() {
    const pathname = usePathname()

    const navLinkStyle = {
        fontSize: '14px',
        fontWeight: '400',
        height: '25px',
        padding: '0 10px',
        display: 'flex',
        alignItems: 'center',
        textTransform: 'lowercase' as const,
    }

    const activeNavLinkStyle = {
        ...navLinkStyle,
        fontWeight: '700',
    }

    return (
        <nav className="flex items-center border border-[#d1d5db] dark:border-[#4b5563] w-fit">
            <Link
                href="/"
                style={pathname === '/' ? activeNavLinkStyle : navLinkStyle}
                className={pathname === '/'
                    ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline'
                    : 'text-current whitespace-nowrap !no-underline hover:opacity-80 transition-opacity'}
            >
                strona główna
            </Link>
            <Link
                href="/kontakt"
                style={pathname === '/kontakt' ? activeNavLinkStyle : navLinkStyle}
                className={pathname === '/kontakt'
                    ? 'bg-muted text-accent-foreground whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563]'
                    : 'text-current whitespace-nowrap !no-underline border-l border-[#d1d5db] dark:border-[#4b5563] hover:opacity-80 transition-opacity'}
            >
                kontakt
            </Link>
        </nav>
    )
}
